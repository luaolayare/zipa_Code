// Auditoría general Beta 2.2 (P1): reproduce si la función de envío mezcla avisos de los DOS proyectos de Expo
// (clientes y negocios) en una misma petición. Expo rechaza esas peticiones completas
// Uso: BETA2=<repositorio> node pruebas/auditoria/auditoria-2-2-repro-proyectos-expo.js (con functions serve y el archivo de entorno de pruebas, ver beta-2-2-notificaciones.js)
// (PUSH_TOO_MANY_EXPERIENCE_IDS). Solo Supabase local + servidor falso de Expo que aplica esa regla.
const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');
const W = process.env.BETA2;
const { createClient } = require(W + '/node_modules/@supabase/supabase-js');
const st = JSON.parse(execSync('npx supabase status -o json', { cwd: W }).toString());
if (!/127\.0\.0\.1|localhost/.test(st.API_URL)) throw new Error('Solo local');
const svc = createClient(st.API_URL, st.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const psql = (sql) => execSync('docker exec -i supabase_db_zipa-lo-tiene psql -U postgres -tA', { input: sql }).toString().trim();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let caido = true;
const peticiones = [];
const srv = http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => { b += c; });
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url !== '/send') { res.end(JSON.stringify({ data: {} })); return; }
    if (caido) { res.statusCode = 503; res.end('{}'); return; }
    const m = JSON.parse(b);
    // El "proyecto" de cada token se marca en el token: [cli-…] = clientes, [neg-…] = negocios.
    const proyectos = new Set(m.map((x) => (x.to.includes('[cli-') ? 'clientes' : 'negocios')));
    peticiones.push({ mensajes: m.length, proyectos: [...proyectos] });
    if (proyectos.size > 1) { res.statusCode = 400; res.end(JSON.stringify({ errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS', message: 'All push notification messages in the same request must be for the same project' }] })); return; }
    res.end(JSON.stringify({ data: m.map(() => ({ status: 'ok', id: crypto.randomUUID() })) }));
  });
});

(async () => {
  await new Promise((r) => srv.listen(9099, '0.0.0.0', r));
  const t = Date.now();
  const usuario = async (alias) => {
    const email = `${alias}${t}@local.test`;
    const { data } = await svc.auth.admin.createUser({ email, password: 'secreta123', email_confirm: true });
    const c = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email, password: 'secreta123' });
    return { id: data.user.id, c };
  };
  const hora = (d, h) => { const x = new Date(`${new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)}T00:00:00-05:00`); x.setUTCDate(x.getUTCDate() + d); return `${x.toISOString().slice(0, 10)}T${h}:00-05:00`; };
  const duena = await usuario('repro-duena');
  const cli = await usuario('repro-cli');
  const { data: b } = await svc.from('businesses').insert({ owner_id: duena.id, name: `Repro ${t % 10000}`, type: 'establecido', subcategory_id: 'parrillas', address: 'Calle 1', status: 'publicado' }).select('id').single();
  await duena.c.rpc('guardar_config_reservas', { p_business: b.id, p_enabled: true, p_max_party: 8, p_min_notice_minutes: 60, p_max_advance_days: 30, p_response_hours: 24, p_slot_minutes: 30, p_instructions: null, p_windows: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d, starts: '00:00', ends: '23:00' })), p_blocked: [] });
  await duena.c.rpc('registrar_token_push', { p_token: `ExponentPushToken[neg-${t}]`, p_app: 'negocios', p_platform: 'android' });
  await cli.c.rpc('registrar_token_push', { p_token: `ExponentPushToken[cli-${t}]`, p_app: 'clientes', p_platform: 'android' });

  // Con Expo "caído", quedan en cola a la vez: el aviso al restaurante (nueva) y el aviso al cliente (confirmada).
  const r = (await cli.c.rpc('solicitar_reserva', { p_business: b.id, p_starts_at: hora(2, '12:00'), p_party: 2, p_name: 'Repro', p_whatsapp: '3001234567', p_table: null, p_notes: null, p_items: [], p_idempotency: crypto.randomUUID() })).data;
  await duena.c.rpc('confirmar_reserva', { p_id: r.id });
  await espera(4000);
  caido = false;
  psql(`update notifications set next_attempt_at = now() where reservation_id = '${r.id}' and status = 'pendiente'`);
  const res = await fetch(`${st.API_URL}/functions/v1/enviar-notificaciones`, { method: 'POST', headers: { 'x-zipa-cron': 'secreto-local-de-pruebas', 'Content-Type': 'application/json' }, body: '{}' });
  await res.text();
  await espera(1500);
  const estados = psql(`select string_agg(kind || '=' || status || coalesce(' (' || last_error || ')', ''), ', ' order by id) from notifications where reservation_id = '${r.id}'`);
  console.log('Peticiones a Expo después de restablecerse:', JSON.stringify(peticiones));
  console.log('Estado de los avisos:', estados);
  console.log(peticiones.some((p) => p.proyectos.length > 1) ? 'RESULTADO: SE REPRODUCE (lote con los dos proyectos rechazado)' : 'RESULTADO: no se reproduce');
  srv.close();
  process.exit(0);
})().catch((e) => { console.error(e); srv.close(); process.exit(1); });
