// Beta 2.2, Entrega B: concurrencia e idempotencia de las reservas con peticiones SIMULTÁNEAS reales
// a la API (cada cliente con su sesión), contra Supabase LOCAL. No usa la interfaz.
// Uso: BETA2=<ruta del repositorio> node pruebas/auditoria/beta-2-2-reservas-concurrencia.js [salida.json]
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const W = process.env.BETA2;
const { createClient } = require(W + '/node_modules/@supabase/supabase-js');
const st = JSON.parse(execSync('npx supabase status -o json', { cwd: W }).toString());
if (!/127\.0\.0\.1|localhost/.test(st.API_URL)) throw new Error('Solo contra Supabase local');
const svc = createClient(st.API_URL, st.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const psql = (sql) => execSync('docker exec -i supabase_db_zipa-lo-tiene psql -U postgres -tA', { input: sql }).toString().trim();

const t = Date.now();
const R = [];
const ok = (id, prueba, cond, detalle = '') => R.push({ id, prueba, resultado: cond ? 'OK' : 'FALLA', detalle: String(detalle).slice(0, 300) });

async function usuario(alias) {
  const email = `${alias}${t}@local.test`;
  const { data, error } = await svc.auth.admin.createUser({ email, password: 'secreta123', email_confirm: true, user_metadata: { full_name: alias } });
  if (error) throw error;
  const c = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
  const s = await c.auth.signInWithPassword({ email, password: 'secreta123' });
  if (s.error) throw s.error;
  return { id: data.user.id, c };
}
// Hora local de Bogotá (UTC-5, sin horario de verano) dentro de `dias` días.
const hora = (dias, hhmm) => {
  const hoy = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
  const d = new Date(`${hoy}T00:00:00-05:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return `${d.toISOString().slice(0, 10)}T${hhmm}:00-05:00`;
};

(async () => {
  const duena = await usuario('conc-duena');
  const cliente = await usuario('conc-cliente');
  // Segundo cliente para los últimos casos: el primero llega al límite de 10 solicitudes en 24 h.
  const cliente2 = await usuario('conc-cliente2');
  // Otra sesión de la misma dueña (dos celulares del mismo restaurante).
  const duena2 = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
  await duena2.auth.signInWithPassword({ email: `conc-duena${t}@local.test`, password: 'secreta123' });
  const { data: b, error: be } = await svc.from('businesses').insert({ owner_id: duena.id, name: `Asadero Concurrencia ${t % 10000}`, type: 'establecido', subcategory_id: 'parrillas', address: 'Calle 5', status: 'publicado' }).select('id').single();
  if (be) throw be;
  const cfg = await duena.c.rpc('guardar_config_reservas', {
    p_business: b.id, p_enabled: true, p_max_party: 10, p_min_notice_minutes: 60, p_max_advance_days: 30, p_response_hours: 24, p_slot_minutes: 30,
    p_instructions: null, p_windows: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d, starts: '00:00', ends: '23:30' })), p_blocked: [],
  });
  if (cfg.error) throw cfg.error;
  const pedir = (cuando, clave, c = cliente.c) => c.rpc('solicitar_reserva', {
    p_business: b.id, p_starts_at: cuando, p_party: 2, p_name: 'Cliente Concurrencia', p_whatsapp: '3009998877', p_table: null, p_notes: null, p_items: [], p_idempotency: clave,
  });
  const filas = (where) => Number(psql(`select count(*) from reservations where business_id = '${b.id}' ${where}`));

  // 1. Cinco reintentos simultáneos con la misma clave: una sola solicitud.
  const clave = crypto.randomUUID();
  const r1 = await Promise.all(Array.from({ length: 5 }, () => pedir(hora(2, '12:00'), clave)));
  const ids = new Set(r1.map((r) => r.data?.id));
  ok('RC-1', '5 envíos simultáneos con la misma clave crean una sola solicitud y todos reciben la misma', r1.every((r) => !r.error) && ids.size === 1 && filas(`and starts_at = '${hora(2, '12:00')}'`) === 1, JSON.stringify(r1.map((r) => r.error?.message ?? r.data?.repetida)));

  // 2. Doble toque sin la misma clave (dos claves distintas, misma hora): solo una pasa.
  const r2 = await Promise.all([pedir(hora(2, '13:00'), crypto.randomUUID()), pedir(hora(2, '13:00'), crypto.randomUUID())]);
  ok('RC-2', 'Dos solicitudes simultáneas para la misma hora (claves distintas): solo una se crea', r2.filter((r) => !r.error).length === 1 && filas(`and starts_at = '${hora(2, '13:00')}'`) === 1, JSON.stringify(r2.map((r) => r.error?.message ?? 'creada')));

  // 3. Confirmar y rechazar a la vez desde dos celulares del restaurante, 8 veces: siempre gana uno solo.
  let carreras = 0; const detalle = [];
  for (let i = 0; i < 8; i++) {
    // Se libera el cupo de 3 pendientes cancelando antes las anteriores, si hiciera falta.
    const p = await pedir(hora(3 + i, '19:00'), crypto.randomUUID());
    if (p.error) { detalle.push('pedir: ' + p.error.message); continue; }
    const id = p.data.id;
    const [conf, rech] = await Promise.all([
      duena.c.rpc('confirmar_reserva', { p_id: id }),
      duena2.rpc('rechazar_reserva', { p_id: id, p_reason: 'sin_mesas', p_note: null }),
    ]);
    const ganadores = [conf, rech].filter((r) => !r.error).length;
    const estado = psql(`select status from reservations where id = '${id}'`);
    const eventos = Number(psql(`select count(*) from reservation_events where reservation_id = '${id}'`));
    const esperado = conf.error ? 'rechazada' : 'confirmada';
    if (ganadores === 1 && estado === esperado && eventos === 2) carreras++;
    detalle.push(`${estado}/${ganadores}/${eventos}${conf.error ? ' c:' + conf.error.message : ''}${rech.error ? ' r:' + rech.error.message : ''}`);
    // Deja el cupo libre para la siguiente vuelta.
    if (estado === 'confirmada') await cliente.c.rpc('cancelar_reserva', { p_id: id, p_reason: null });
  }
  ok('RC-3', 'Confirmar y rechazar al mismo tiempo (8 veces): exactamente una gana, el estado coincide y el historial tiene 2 eventos', carreras === 8, detalle.join(' | '));

  // 4. Cliente cancela y restaurante cancela una reserva confirmada al mismo tiempo: una sola cancelación.
  const p4 = await pedir(hora(12, '12:00'), crypto.randomUUID(), cliente2.c);
  await duena.c.rpc('confirmar_reserva', { p_id: p4.data.id });
  const r4 = await Promise.all([
    cliente2.c.rpc('cancelar_reserva', { p_id: p4.data.id, p_reason: null }),
    duena.c.rpc('cancelar_reserva', { p_id: p4.data.id, p_reason: 'Cerramos por mantenimiento' }),
  ]);
  const ev4 = Number(psql(`select count(*) from reservation_events where reservation_id = '${p4.data.id}' and to_status = 'cancelada'`));
  ok('RC-4', 'Cancelación simultánea de cliente y restaurante: una sola gana y queda un solo evento de cancelación', r4.filter((r) => !r.error).length === 1 && ev4 === 1, JSON.stringify(r4.map((r) => r.error?.message ?? 'cancelada')));

  // 5. Expiración mientras el restaurante confirma: nunca queda confirmada y vencida a la vez.
  const p5 = await pedir(hora(13, '12:00'), crypto.randomUUID(), cliente2.c);
  psql(`update reservations set respond_by = now() + interval '300 milliseconds' where id = '${p5.data.id}'`);
  await new Promise((r) => setTimeout(r, 350));
  const [c5, e5] = await Promise.all([duena.c.rpc('confirmar_reserva', { p_id: p5.data.id }), svc.rpc('expirar_reservas')]);
  const estado5 = psql(`select status from reservations where id = '${p5.data.id}'`);
  const ev5 = psql(`select string_agg(to_status, ',' order by id) from reservation_events where reservation_id = '${p5.data.id}'`);
  ok('RC-5', 'Confirmar después del plazo mientras corre la expiración: queda vencida, no confirmada, con historial coherente', !!c5.error && estado5 === 'expirada' && ev5 === 'pendiente,expirada', JSON.stringify({ confirmar: c5.error?.message ?? 'ok', expiradas: e5.data, estado5, ev5 }));
  // Y una segunda corrida no hace nada (idempotente).
  const e5b = await svc.rpc('expirar_reservas');
  ok('RC-6', 'La expiración es idempotente: correrla otra vez no cambia nada', e5b.data === 0 || !psql(`select 1 from reservation_events where reservation_id = '${p5.data.id}' and to_status = 'expirada' offset 1`), JSON.stringify(e5b));

  // 7. Límite diario: el primer cliente ya hizo 10 solicitudes hoy.
  const e8 = await pedir(hora(20, '12:00'), crypto.randomUUID());
  ok('RC-8', 'Después de 10 solicitudes en 24 horas, la siguiente se rechaza (protección contra envíos masivos)', /muchas solicitudes/.test(e8.error?.message ?? ''), e8.error?.message ?? 'se creó');

  // 7. Las apps no pueden correr la expiración.
  const e7 = await cliente.c.rpc('expirar_reservas');
  ok('RC-7', 'Un usuario de la app no puede ejecutar la expiración', !!e7.error, e7.error?.message ?? 'se ejecutó');

  for (const r of R) console.log(`${r.resultado} ${r.id} ${r.prueba}${r.resultado === 'OK' ? '' : ' → ' + r.detalle}`);
  const out = process.argv[2];
  if (out) fs.writeFileSync(out, JSON.stringify({ fecha: new Date().toISOString(), resultados: R }, null, 2));
  process.exit(R.every((r) => r.resultado === 'OK') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
