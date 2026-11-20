// Beta 2.2, Entrega C: envío de notificaciones de punta a punta contra Supabase LOCAL, con un
// servidor FALSO de Expo (no sale nada a internet). Prueba la cola, el despertar automático
// (pg_net), reintentos, tokens inválidos, recibos, que no haya duplicados y que nada personal viaje
// en el texto.
//
// Requisitos (solo en local):
//   - Edge Functions servidas con: npx supabase functions serve --env-file <archivo> donde el archivo tiene
//       CRON_SECRET=secreto-local-de-pruebas
//       EXPO_PUSH_URL=http://host.docker.internal:9099/send
//       EXPO_RECEIPTS_URL=http://host.docker.internal:9099/receipts
//   - En el Vault LOCAL: zipa_funciones_url = http://supabase_kong_zipa-lo-tiene:8000/functions/v1
//                        zipa_cron_secreto  = secreto-local-de-pruebas
// Uso: BETA2=<ruta del repositorio> node pruebas/auditoria/beta-2-2-notificaciones.js [salida.json]
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { execSync } = require('child_process');
const W = process.env.BETA2;
const { createClient } = require(W + '/node_modules/@supabase/supabase-js');
const st = JSON.parse(execSync('npx supabase status -o json', { cwd: W }).toString());
if (!/127\.0\.0\.1|localhost/.test(st.API_URL)) throw new Error('Solo contra Supabase local');
const svc = createClient(st.API_URL, st.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const psql = (sql) => execSync('docker exec -i supabase_db_zipa-lo-tiene psql -U postgres -tA', { input: sql }).toString().trim();
const SECRETO = 'secreto-local-de-pruebas';
const FUNCION = `${st.API_URL}/functions/v1/enviar-notificaciones`;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Servidor falso de Expo ----------
const recibidos = []; // { to, title, body, data, channelId, ticket }
const peticiones = []; // proyectos de cada petición a /send
let caido = false;
let caidoNegocios = false; // falla solo el proyecto de negocios
let n = 0;
// Como en Expo: cada token pertenece a un proyecto (aquí se marca en el token: «resto» = negocios,
// «cliente» = clientes) y una petición con tokens de dos proyectos se rechaza entera.
const proyectoDe = (token) => (/resto|duena/.test(token) ? 'negocios' : 'clientes');
const ticketsMalosRecibo = new Set();
const servidor = http.createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (c) => { cuerpo += c; });
  req.on('end', () => {
    const responder = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.url === '/send') {
      if (caido) return responder(503, { errors: [{ code: 'INTERNAL_SERVER_ERROR' }] });
      const mensajes = JSON.parse(cuerpo);
      const proyectos = [...new Set(mensajes.map((m) => proyectoDe(m.to)))];
      peticiones.push(proyectos);
      if (proyectos.length > 1) return responder(400, { errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS', message: 'All push notification messages in the same request must be for the same project' }] });
      if (caidoNegocios && proyectos[0] === 'negocios') return responder(503, { errors: [{ code: 'INTERNAL_SERVER_ERROR' }] });
      const data = mensajes.map((m) => {
        if (/malo/.test(m.to)) return { status: 'error', message: 'no registrado', details: { error: 'DeviceNotRegistered' } };
        const id = `tk-${++n}`;
        if (/recibo/.test(m.to)) ticketsMalosRecibo.add(id);
        recibidos.push({ ...m, ticket: id });
        return { status: 'ok', id };
      });
      return responder(200, { data });
    }
    if (req.url === '/receipts') {
      const { ids } = JSON.parse(cuerpo);
      const data = Object.fromEntries(ids.map((id) => [id, ticketsMalosRecibo.has(id) ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { status: 'ok' }]));
      return responder(200, { data });
    }
    responder(404, {});
  });
});

const t = Date.now();
const R = [];
const ok = (id, prueba, cond, detalle = '') => R.push({ id, prueba, resultado: cond ? 'OK' : 'FALLA', detalle: String(detalle).slice(0, 300) });
async function usuario(alias) {
  const email = `${alias}${t}@local.test`;
  const { data, error } = await svc.auth.admin.createUser({ email, password: 'secreta123', email_confirm: true, user_metadata: { full_name: alias } });
  if (error) throw error;
  const c = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: 'secreta123' });
  return { id: data.user.id, c };
}
const hora = (dias, hhmm) => {
  const d = new Date(`${new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)}T00:00:00-05:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return `${d.toISOString().slice(0, 10)}T${hhmm}:00-05:00`;
};
const llamar = (secreto) => fetch(FUNCION, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(secreto ? { 'x-zipa-cron': secreto } : {}) }, body: '{}' });
const avisos = (reserva) => JSON.parse(psql(`select coalesce(json_agg(n order by id), '[]') from notifications n where reservation_id = '${reserva}'`));
async function hasta(cond, ms = 20000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (await cond()) return true; await espera(500); }
  return false;
}

(async () => {
  await new Promise((r) => servidor.listen(9099, '0.0.0.0', r));
  const duena = await usuario('push-duena');
  const cliente = await usuario('push-cliente');
  const { data: b } = await svc.from('businesses').insert({ owner_id: duena.id, name: `Asadero Avisos ${t % 10000}`, type: 'establecido', subcategory_id: 'parrillas', address: 'Calle 8', status: 'publicado' }).select('id').single();
  const cfg = await duena.c.rpc('guardar_config_reservas', { p_business: b.id, p_enabled: true, p_max_party: 10, p_min_notice_minutes: 60, p_max_advance_days: 30, p_response_hours: 24, p_slot_minutes: 30, p_instructions: null, p_windows: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d, starts: '00:00', ends: '23:30' })), p_blocked: [] });
  if (cfg.error) throw cfg.error;
  const sfx = t % 100000;
  for (const [c, tok, app] of [[duena.c, `ExponentPushToken[resto-ok-${sfx}]`, 'negocios'], [duena.c, `ExponentPushToken[resto-malo-${sfx}]`, 'negocios'], [cliente.c, `ExponentPushToken[cliente-ok-${sfx}]`, 'clientes'], [cliente.c, `ExponentPushToken[cliente-recibo-${sfx}]`, 'clientes']]) {
    const r = await c.rpc('registrar_token_push', { p_token: tok, p_app: app, p_platform: 'android' });
    if (r.error) throw r.error;
  }
  const pedir = (cuando) => cliente.c.rpc('solicitar_reserva', { p_business: b.id, p_starts_at: cuando, p_party: 2, p_name: 'Marta Secreta', p_whatsapp: '3104445566', p_table: 'Terraza', p_notes: 'Alergia al maní', p_items: [], p_idempotency: crypto.randomUUID() });
  const para = (tok) => recibidos.filter((m) => m.to.includes(tok));

  // N-1: sin el secreto no se puede llamar.
  const [sin, mal] = await Promise.all([llamar(null), llamar('otro-secreto')]);
  ok('N-1', 'La función rechaza llamadas sin el secreto o con uno equivocado (401)', sin.status === 401 && mal.status === 401, `${sin.status} / ${mal.status}`);

  // N-2: nueva solicitud → aviso al restaurante SIN llamar a la función (la despierta la base).
  const r1 = await pedir(hora(2, '12:00'));
  if (r1.error) throw r1.error;
  const llego = await hasta(() => para(`resto-ok-${sfx}`).length === 1);
  const a1 = avisos(r1.data.id)[0] ?? {};
  const m1 = para(`resto-ok-${sfx}`)[0] ?? {};
  const malo = psql(`select active || '|' || coalesce(disabled_reason, '') from push_tokens where token = 'ExponentPushToken[resto-malo-${sfx}]'`);
  ok('N-2', 'Nueva solicitud: el restaurante recibe «Tienes una nueva solicitud de reserva» sin intervención (pg_net), con canal «reservas» y enlace al detalle',
    llego && m1.title === 'Tienes una nueva solicitud de reserva' && m1.channelId === 'reservas' && m1.data?.url === `/reservas/${r1.data.id}` && a1.status === 'enviada', JSON.stringify({ llego, m1, estado: a1.status }));
  ok('N-3', 'El token que Expo dice que no existe (DeviceNotRegistered) queda desactivado', malo === 'false|no_registrado', malo);

  // N-4: confirmar → aviso al cliente, en sus dos dispositivos.
  await duena.c.rpc('confirmar_reserva', { p_id: r1.data.id });
  const llego2 = await hasta(() => para(`cliente-ok-${sfx}`).length === 1 && para(`cliente-recibo-${sfx}`).length === 1);
  const m2 = para(`cliente-ok-${sfx}`)[0] ?? {};
  ok('N-4', 'Confirmar: el cliente recibe «Tu reserva fue confirmada» en sus dispositivos, con enlace a su solicitud', llego2 && m2.title === 'Tu reserva fue confirmada' && m2.data?.url === `/reserva/${r1.data.id}`, JSON.stringify(m2));

  // N-5: nada personal en el texto (nombre, teléfono, observaciones, mesa).
  const textos = recibidos.map((m) => `${m.title} ${m.body} ${JSON.stringify(m.data)}`).join(' | ');
  ok('N-5', 'Ningún aviso lleva el nombre, el teléfono, las observaciones ni la mesa del cliente', !/(Marta|Secreta|3104445566|maní|Terraza)/.test(textos), textos.slice(0, 250));

  // N-6: Expo caído: la reserva funciona igual; el aviso queda pendiente con el error y se reintenta.
  caido = true;
  const r2 = await pedir(hora(3, '12:00'));
  const creada = !r2.error && psql(`select status from reservations where id = '${r2.data.id}'`) === 'pendiente';
  await hasta(() => (avisos(r2.data.id)[0] ?? {}).attempts >= 1 && (avisos(r2.data.id)[0] ?? {}).status === 'pendiente');
  const a2 = avisos(r2.data.id)[0] ?? {};
  ok('N-6', 'Con el servicio de push caído, la solicitud se crea igual y el aviso queda pendiente para reintento (HTTP 503)', creada && a2.status === 'pendiente' && a2.last_error === 'HTTP 503' && new Date(a2.next_attempt_at) > new Date(), JSON.stringify({ creada, status: a2.status, error: a2.last_error, intentos: a2.attempts }));
  caido = false;
  psql(`update notifications set next_attempt_at = now() where id = ${a2.id}`);
  await llamar(SECRETO);
  const a2b = avisos(r2.data.id)[0] ?? {};
  ok('N-7', 'Cuando el servicio vuelve, el reintento lo entrega (sin duplicar)', a2b.status === 'enviada' && a2b.attempts === 2 && para(`resto-ok-${sfx}`).length === 2, JSON.stringify({ status: a2b.status, intentos: a2b.attempts }));

  // N-8: tres llamadas simultáneas con varios avisos en cola: cada aviso llega una sola vez a cada dispositivo.
  caido = true;
  const ids = [];
  for (const h of ['13:00', '14:00', '15:00']) {
    const r = await pedir(hora(4, h)); // máximo 3 pendientes: r2 + 3 = 4 → la última falla, por eso se confirma r2 antes
    if (r.error) { await duena.c.rpc('confirmar_reserva', { p_id: r2.data.id }); const rr = await pedir(hora(4, h)); ids.push(rr.data.id); } else ids.push(r.data.id);
  }
  await espera(1500);
  caido = false;
  psql(`update notifications set next_attempt_at = now() where status = 'pendiente' and reservation_id in (select id from reservations where business_id = '${b.id}')`);
  const antes = recibidos.length;
  await Promise.all([llamar(SECRETO), llamar(SECRETO), llamar(SECRETO)]);
  await hasta(() => JSON.parse(psql(`select count(*) from notifications where status in ('pendiente','enviando') and reservation_id in (select id from reservations where business_id = '${b.id}')`)) === 0, 15000);
  const nuevos = recibidos.slice(antes);
  const claves = nuevos.map((m) => `${m.data?.reservationId}|${m.data?.kind}|${m.to}`);
  const duplicados = claves.length - new Set(claves).size;
  ok('N-8', 'Tres envíos simultáneos sobre la misma cola: ningún aviso se entrega dos veces al mismo dispositivo', duplicados === 0 && nuevos.length >= 3, JSON.stringify({ entregados: nuevos.length, duplicados }));

  // N-9: recibos (15 minutos después): uno dice DeviceNotRegistered → ese token se desactiva.
  psql(`update notification_deliveries set created_at = now() - interval '20 minutes' where ticket_id is not null and receipt_status is null`);
  await llamar(SECRETO);
  const recibo = psql(`select active || '|' || coalesce(disabled_reason, '') from push_tokens where token = 'ExponentPushToken[cliente-recibo-${sfx}]'`);
  const revisados = Number(psql(`select count(*) from notification_deliveries d join notifications n on n.id = d.notification_id join reservations r on r.id = n.reservation_id where r.business_id = '${b.id}' and d.receipt_checked_at is not null`));
  ok('N-9', 'Recibos: se revisan y un DeviceNotRegistered en el recibo desactiva ese token', recibo === 'false|no_registrado' && revisados > 0, JSON.stringify({ recibo, revisados }));

  // N-10: cerrar sesión desactiva el token del dispositivo: el siguiente aviso ya no le llega.
  await cliente.c.rpc('desactivar_token_push', { p_token: `ExponentPushToken[cliente-ok-${sfx}]` });
  const previos = para(`cliente-ok-${sfx}`).length;
  await duena.c.rpc('rechazar_reserva', { p_id: ids[0], p_reason: 'sin_mesas', p_note: null });
  await hasta(() => (avisos(ids[0]).find((a) => a.kind === 'rechazada') ?? {}).status === 'sin_dispositivos');
  const aR = avisos(ids[0]).find((a) => a.kind === 'rechazada') ?? {};
  ok('N-10', 'Después de cerrar sesión, ese dispositivo ya no recibe avisos (el aviso queda «sin_dispositivos» y la solicitud sigue en la app)', para(`cliente-ok-${sfx}`).length === previos && aR.status === 'sin_dispositivos', JSON.stringify({ status: aR.status }));

  // N-12 (regresión P1): avisos de las DOS apps en cola al mismo tiempo se entregan, cada petición con un solo proyecto.
  // El cliente vuelve a activar los avisos en otro celular (los anteriores quedaron desactivados arriba).
  await cliente.c.rpc('registrar_token_push', { p_token: `ExponentPushToken[cliente-nuevo-${sfx}]`, p_app: 'clientes', p_platform: 'android' });
  caido = true;
  const r12 = await pedir(hora(6, '12:00'));
  await duena.c.rpc('confirmar_reserva', { p_id: r12.data.id });
  await hasta(() => avisos(r12.data.id).filter((a) => a.attempts >= 1 && a.status === 'pendiente').length === 2);
  caido = false;
  const antes12 = peticiones.length;
  psql(`update notifications set next_attempt_at = now() where reservation_id = '${r12.data.id}' and status = 'pendiente'`);
  await llamar(SECRETO);
  const a12 = avisos(r12.data.id);
  const pet12 = peticiones.slice(antes12);
  ok('N-12', 'Regresión P1: avisos para el restaurante y para el cliente en cola a la vez se entregan los dos, en peticiones separadas por proyecto',
    a12.length === 2 && a12.every((a) => a.status === 'enviada') && pet12.length >= 2 && pet12.every((p) => p.length === 1),
    JSON.stringify({ estados: a12.map((a) => `${a.kind}=${a.status}${a.last_error ? ' (' + a.last_error + ')' : ''}`), peticiones: pet12 }));

  // N-13 (regresión P1): si falla solo el proyecto de negocios, el aviso al cliente se entrega igual.
  caido = true;
  const r13 = await pedir(hora(7, '12:00'));
  await duena.c.rpc('confirmar_reserva', { p_id: r13.data.id });
  await hasta(() => avisos(r13.data.id).filter((a) => a.attempts >= 1 && a.status === 'pendiente').length === 2);
  caido = false;
  caidoNegocios = true;
  psql(`update notifications set next_attempt_at = now() where reservation_id = '${r13.data.id}' and status = 'pendiente'`);
  await llamar(SECRETO);
  const a13 = avisos(r13.data.id);
  const neg = a13.find((a) => a.kind === 'nueva_solicitud') ?? {};
  const cli = a13.find((a) => a.kind === 'confirmada') ?? {};
  ok('N-13', 'Regresión P1: la falla de un proyecto no afecta al otro (negocios queda en reintento, cliente se entrega)',
    cli.status === 'enviada' && neg.status === 'pendiente' && neg.last_error === 'HTTP 503', JSON.stringify({ negocios: `${neg.status} ${neg.last_error}`, clientes: cli.status }));
  caidoNegocios = false;
  psql(`update notifications set next_attempt_at = now() where id = ${neg.id}`);
  await llamar(SECRETO);
  const neg2 = avisos(r13.data.id).find((a) => a.kind === 'nueva_solicitud') ?? {};
  const deliveries = Number(psql(`select count(*) from notification_deliveries where notification_id = ${cli.id}`));
  ok('N-14', 'Al volver el proyecto de negocios, su aviso se entrega en el reintento y el del cliente no se reenvía (idempotencia)', neg2.status === 'enviada' && neg2.attempts === 3 && deliveries === 1,
    JSON.stringify({ negocios: neg2.status, intentos: neg2.attempts, entregasCliente: deliveries }));
  ok('N-15', 'Ninguna petición a Expo en toda la prueba mezcló proyectos', peticiones.every((p) => p.length === 1), JSON.stringify(peticiones.filter((p) => p.length > 1)));

  // N-11: el log de la función no contiene tokens ni textos.
  const log = execSync('docker logs supabase_edge_runtime_zipa-lo-tiene --since 10m 2>&1').toString();
  ok('N-11', 'El log de la función no tiene tokens, nombres ni teléfonos (solo cuentas)', !/ExponentPushToken|Marta|3104445566/.test(log) && /"envio"/.test(log), log.split('\n').filter((l) => /envio/.test(l)).slice(-1)[0] ?? '');

  servidor.close();
  for (const r of R) console.log(`${r.resultado} ${r.id} ${r.prueba}${r.resultado === 'OK' ? '' : ' → ' + r.detalle}`);
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ fecha: new Date().toISOString(), resultados: R }, null, 2));
  process.exit(R.every((r) => r.resultado === 'OK') ? 0 : 1);
})().catch((e) => { console.error(e); servidor.close(); process.exit(1); });
