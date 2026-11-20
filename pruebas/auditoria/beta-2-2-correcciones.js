// Beta 2.2, correcciones prioritarias: P4 (bandeja con más de 300 solicitudes) en el navegador,
// contra Supabase LOCAL (negocios en 8084). P1 se prueba en beta-2-2-notificaciones.js (N-12 a N-15)
// y en auditoria-2-2-repro-proyectos-expo.js; P13 con Jest (correcciones-2-2-test.ts) y en celular.
// Uso: BETA2=<ruta del repositorio> node pruebas/auditoria/beta-2-2-correcciones.js <capturas>
const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const W = process.env.BETA2;
const { createClient } = require(W + '/node_modules/@supabase/supabase-js');
const st = JSON.parse(execSync('npx supabase status -o json', { cwd: W }).toString());
if (!/127\.0\.0\.1|localhost/.test(st.API_URL)) throw new Error('Solo contra Supabase local');
const svc = createClient(st.API_URL, st.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const psql = (sql) => execSync('docker exec -i supabase_db_zipa-lo-tiene psql -U postgres -tA', { input: sql }).toString().trim();

(async () => {
  const [out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const t = Date.now();
  const R = [];
  const ok = (id, prueba, cond, detalle = '') => R.push({ id, prueba, resultado: cond ? 'OK' : 'FALLA', detalle: String(detalle).slice(0, 300) });
  const cuenta = async (alias) => {
    const email = `${alias}${t}@local.test`;
    const { data } = await svc.auth.admin.createUser({ email, password: 'secreta123', email_confirm: true, user_metadata: { full_name: alias } });
    const c = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email, password: 'secreta123' });
    return { id: data.user.id, email, c };
  };
  const hora = (dias, hhmm) => { const d = new Date(`${new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)}T00:00:00-05:00`); d.setUTCDate(d.getUTCDate() + dias); return `${d.toISOString().slice(0, 10)}T${hhmm}:00-05:00`; };

  const duena = await cuenta('p4-duena');
  const cli = await cuenta('p4-cli');
  const { data: b } = await svc.from('businesses').insert({ owner_id: duena.id, name: `Asadero Historial ${t % 10000}`, type: 'establecido', subcategory_id: 'parrillas', address: 'Calle 9', status: 'publicado' }).select('id').single();
  await duena.c.rpc('guardar_config_reservas', { p_business: b.id, p_enabled: true, p_max_party: 8, p_min_notice_minutes: 60, p_max_advance_days: 30, p_response_hours: 24, p_slot_minutes: 30, p_instructions: null, p_windows: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d, starts: '00:00', ends: '23:00' })), p_blocked: [] });

  // 320 solicitudes ANTIGUAS (historial de meses): 200 finalizadas y 120 canceladas, más una confirmada
  // que ya pasó (debe aparecer en Finalizadas para marcar la asistencia). Directo en la base (simula el pasado).
  const sfx = String(t % 100000).padStart(5, '0');
  psql(`
    insert into reservations (code, business_id, customer_id, starts_at, party_size, contact_name, contact_whatsapp, status, cancelled_by, respond_by, idempotency_key, created_at)
    select 'R-' || translate(upper(substr(md5('${sfx}' || g), 1, 6)), '01', 'QW'), '${b.id}', '${cli.id}', now() - make_interval(days => 400 - g),
           2, 'Cliente Antiguo', '573001234567',
           case when g <= 200 then 'finalizada' else 'cancelada' end,
           case when g <= 200 then null else 'cliente' end,
           now() - make_interval(days => 401 - g), gen_random_uuid(), now() - make_interval(days => 402 - g)
    from generate_series(1, 320) g;
    insert into reservations (code, business_id, customer_id, starts_at, party_size, contact_name, contact_whatsapp, status, respond_by, idempotency_key, created_at, decided_at)
    values ('R-' || translate(upper(substr(md5('pasada${sfx}'), 1, 6)), '01', 'QW'), '${b.id}', '${cli.id}', now() - interval '1 day', 3, 'Cliente Pasado', '573001234567', 'confirmada', now() - interval '2 days', gen_random_uuid(), now() - interval '3 days', now() - interval '2 days');
  `);
  const viejas = Number(psql(`select count(*) from reservations where business_id = '${b.id}'`));
  // Y lo NUEVO, por la app: 2 pendientes y 1 confirmada próxima.
  const pedir = async (dias, h) => (await cli.c.rpc('solicitar_reserva', { p_business: b.id, p_starts_at: hora(dias, h), p_party: 2, p_name: 'Cliente Nuevo', p_whatsapp: '3009998877', p_table: null, p_notes: null, p_items: [], p_idempotency: crypto.randomUUID() })).data;
  const p1 = await pedir(2, '12:00');
  const p2 = await pedir(3, '12:00');
  const c1 = await pedir(4, '12:00');
  await duena.c.rpc('confirmar_reserva', { p_id: c1.id });

  // El problema original: la consulta anterior (300, de la más vieja a la más nueva) NO traía las nuevas.
  const vieja = await duena.c.from('reservations').select('id').eq('business_id', b.id).order('starts_at').limit(300);
  const ids = new Set((vieja.data ?? []).map((x) => x.id));
  ok('P4-0', 'Con la consulta anterior, las solicitudes nuevas quedaban fuera de la bandeja (el problema existía)', viejas === 321 && !ids.has(p1.id) && !ids.has(p2.id), `total ${viejas + 3}, nuevas en la consulta vieja: ${ids.has(p1.id)}, ${ids.has(p2.id)}`);

  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const errores = [];
  const p = await (await br.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 })).newPage();
  p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
  p.on('console', (m) => { if (m.type() === 'error' && !/GO_BACK|Failed to load resource/.test(m.text())) errores.push(m.text().slice(0, 160)); });
  const vis = (l) => l.filter({ visible: true }).first();
  const filas = () => p.getByRole('button', { name: /^Solicitud R-/ }).filter({ visible: true }).count();
  await p.goto('http://localhost:8084/', { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(3500);
  await vis(p.getByText('Ya tengo cuenta')).click(); await p.waitForTimeout(800);
  await vis(p.getByLabel('Correo electrónico', { exact: true })).fill(duena.email);
  await vis(p.getByLabel('Contraseña', { exact: true })).fill('secreta123');
  await vis(p.getByText('Entrar', { exact: true })).click(); await p.waitForTimeout(5000);
  const panel = await p.getByText('2 por responder', { exact: true }).count();
  ok('P4-1', 'El panel cuenta las 2 pendientes aunque haya más de 300 solicitudes', panel > 0, '');

  await vis(p.getByText('Ver solicitudes', { exact: true })).click(); await p.waitForTimeout(4000);
  const pestañas = {
    pendientes: await p.getByRole('radio', { name: 'Pendientes (2)' }).count(),
    confirmadas: await p.getByRole('radio', { name: 'Confirmadas (1)' }).count(),
    finalizadas: await p.getByRole('radio', { name: 'Finalizadas (201)' }).count(),
    canceladas: await p.getByRole('radio', { name: 'Canceladas (120)' }).count(),
  };
  const enPendientes = { p1: await p.getByRole('button', { name: new RegExp(`^Solicitud ${p1.code}`) }).count(), p2: await p.getByRole('button', { name: new RegExp(`^Solicitud ${p2.code}`) }).count(), filas: await filas() };
  await p.screenshot({ path: `${out}/q1-bandeja-pendientes.png`, fullPage: true });
  ok('P4-2', 'Con 324 solicitudes, la bandeja abre en Pendientes con las 2 nuevas y las cantidades correctas en cada pestaña', Object.values(pestañas).every(Boolean) && enPendientes.p1 && enPendientes.p2 && enPendientes.filas === 2, JSON.stringify({ pestañas, enPendientes }));

  await vis(p.getByRole('radio', { name: /^Finalizadas/ })).click(); await p.waitForTimeout(3000);
  const pagina1 = await filas();
  const pasada = await p.getByText('Ya pasó la hora: marca si el cliente llegó', { exact: true }).count();
  const primeras = await p.getByRole('button', { name: /^Solicitud R-/ }).filter({ visible: true }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  await vis(p.getByText('Ver más', { exact: true })).click(); await p.waitForTimeout(3000);
  const pagina2 = await filas();
  const todas = await p.getByRole('button', { name: /^Solicitud R-/ }).filter({ visible: true }).evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || '').split(',')[0]));
  ok('P4-3', 'Finalizadas: 30 por página, la confirmada que ya pasó aparece primero para marcar asistencia, y «Ver más» trae 30 más sin repetir', pagina1 === 30 && pasada === 1 && pagina2 === 60 && new Set(todas).size === 60 && /Cliente Pasado/.test(primeras[0] ?? ''),
    JSON.stringify({ pagina1, pasada, pagina2, unicas: new Set(todas).size, primera: primeras[0] }));
  await p.screenshot({ path: `${out}/q2-bandeja-finalizadas-ver-mas.png`, fullPage: false });

  await vis(p.getByRole('radio', { name: /^Confirmadas/ })).click(); await p.waitForTimeout(2500);
  const conf = { fila: await p.getByRole('button', { name: new RegExp(`^Solicitud ${c1.code}`) }).count(), total: await filas() };
  ok('P4-4', 'Confirmadas muestra solo la próxima (la que ya pasó está en Finalizadas)', conf.fila === 1 && conf.total === 1, JSON.stringify(conf));

  // Cambiar rápido de pestaña no mezcla listas.
  await vis(p.getByRole('radio', { name: /^Canceladas/ })).click();
  await vis(p.getByRole('radio', { name: /^Pendientes/ })).click(); await p.waitForTimeout(3000);
  const tras = { filas: await filas(), p1: await p.getByRole('button', { name: new RegExp(`^Solicitud ${p1.code}`) }).count() };
  ok('P4-5', 'Cambiar rápido de pestaña no mezcla resultados (Pendientes vuelve a mostrar solo las 2)', tras.filas === 2 && tras.p1 === 1, JSON.stringify(tras));

  await br.close();
  ok('P4-6', 'Sin errores de consola', errores.length === 0, JSON.stringify(errores));
  for (const r of R) console.log(`${r.resultado} ${r.id} ${r.prueba}${r.resultado === 'OK' ? '' : ' → ' + r.detalle}`);
  fs.writeFileSync(`${out}/correcciones.json`, JSON.stringify({ fecha: new Date().toISOString(), resultados: R, erroresConsola: errores }, null, 2));
  process.exit(R.every((r) => r.resultado === 'OK') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
