// Beta 2.2, Entrega C (bandeja y contacto), en el navegador contra Supabase LOCAL (clientes 8083,
// negocios 8084). Las notificaciones push en sí se prueban en beta-2-2-notificaciones.js (servidor) y
// en un celular real (no existen en la web).
// Uso: BETA2=<ruta del repositorio> node pruebas/auditoria/beta-2-2-entrega-c.js <capturas>
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
  const sesion = async (alias, nombre) => {
    const email = `${alias}${t}@local.test`;
    const { data } = await svc.auth.admin.createUser({ email, password: 'secreta123', email_confirm: true, user_metadata: { full_name: nombre } });
    const c = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email, password: 'secreta123' });
    return { id: data.user.id, email, c };
  };
  const hora = (dias, hhmm) => {
    const d = new Date(`${new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)}T00:00:00-05:00`);
    d.setUTCDate(d.getUTCDate() + dias);
    return `${d.toISOString().slice(0, 10)}T${hhmm}:00-05:00`;
  };

  // Datos: restaurante con reservas y una solicitud en cada estado.
  const duena = await sesion('bandeja', 'Dueña Bandeja');
  const cli = await sesion('bandejacli', 'Lucía Cliente');
  const nombre = `Asadero Bandeja ${t % 10000}`;
  const { data: b } = await svc.from('businesses').insert({ owner_id: duena.id, name: nombre, type: 'establecido', subcategory_id: 'parrillas', address: 'Calle 6', whatsapp: '300 111 2233', status: 'publicado' }).select('id').single();
  await duena.c.rpc('guardar_config_reservas', { p_business: b.id, p_enabled: true, p_max_party: 10, p_min_notice_minutes: 60, p_max_advance_days: 30, p_response_hours: 24, p_slot_minutes: 30, p_instructions: null, p_windows: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d, starts: '00:00', ends: '23:30' })), p_blocked: [] });
  const pedir = async (dias, h, notas) => (await cli.c.rpc('solicitar_reserva', { p_business: b.id, p_starts_at: hora(dias, h), p_party: 4, p_name: 'Lucía Cliente', p_whatsapp: '3205556677', p_table: 'Terraza', p_notes: notas, p_items: [], p_idempotency: crypto.randomUUID() })).data;
  const pend = await pedir(2, '19:00', 'Llegamos con un bebé');
  const conf = await pedir(3, '13:00', null);
  const rech = await pedir(4, '13:00', null);
  await duena.c.rpc('confirmar_reserva', { p_id: conf.id });
  await duena.c.rpc('rechazar_reserva', { p_id: rech.id, p_reason: 'sin_mesas', p_note: null });
  const canc = await pedir(5, '13:00', null);
  await cli.c.rpc('cancelar_reserva', { p_id: canc.id, p_reason: null });
  const venc = await pedir(6, '13:00', null);
  psql(`update reservations set respond_by = now() - interval '1 minute' where id = '${venc.id}'`);
  psql('select public.expirar_reservas()');
  const fin = await pedir(7, '13:00', null);
  await duena.c.rpc('confirmar_reserva', { p_id: fin.id });
  psql(`update reservations set starts_at = now() - interval '2 hours' where id = '${fin.id}'`);
  await duena.c.rpc('marcar_asistencia', { p_id: fin.id, p_asistio: true });

  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const errores = [];
  const nueva = async () => {
    const p = await (await br.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 })).newPage();
    p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
    p.on('console', (m) => { if (m.type() === 'error' && !/GO_BACK|Failed to load resource/.test(m.text())) errores.push(m.text().slice(0, 160)); });
    p.on('dialog', (d) => d.accept());
    // WhatsApp en la web = window.open: se registra la dirección sin abrir nada.
    await p.addInitScript(() => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(String(u)); return null; }; });
    return p;
  };
  const vis = (p, l) => l.filter({ visible: true }).first();
  const cuenta = (p, s, o) => p.getByText(s, o).filter({ visible: true }).count();
  const shot = (p, n, full = true) => p.screenshot({ path: `${out}/${n}.png`, fullPage: full });

  // ---------- Negocios: bandeja por estados ----------
  const n = await nueva();
  await n.goto('http://localhost:8084/', { waitUntil: 'load', timeout: 300000 }); await n.waitForTimeout(3500);
  await vis(n, n.getByText('Ya tengo cuenta')).click(); await n.waitForTimeout(800);
  await vis(n, n.getByLabel('Correo electrónico', { exact: true })).fill(duena.email);
  await vis(n, n.getByLabel('Contraseña', { exact: true })).fill('secreta123');
  await vis(n, n.getByText('Entrar', { exact: true })).click(); await n.waitForTimeout(5000);
  await vis(n, n.getByText('Ver solicitudes', { exact: true })).click(); await n.waitForTimeout(3500);
  const pestañas = {};
  for (const [nom, cant] of [['Pendientes', 1], ['Confirmadas', 1], ['Rechazadas', 1], ['Canceladas', 1], ['Finalizadas', 1], ['Vencidas', 1]]) pestañas[nom] = await n.getByRole('radio', { name: `${nom} (${cant})` }).count();
  const inicial = { pendiente: await cuenta(n, pend.code, { exact: true }), otra: await cuenta(n, conf.code, { exact: true }), nota: await cuenta(n, '«Llegamos con un bebé»', { exact: true }), avisoPush: await cuenta(n, 'Activar notificaciones', { exact: true }) };
  await shot(n, 'c1-bandeja-pendientes');
  ok('C-1', 'Bandeja con 6 pestañas y sus cantidades; abre en Pendientes con su nota (en la web no se ofrece activar notificaciones)', Object.values(pestañas).every(Boolean) && inicial.pendiente && !inicial.otra && inicial.nota && inicial.avisoPush === 0, JSON.stringify({ pestañas, inicial }));
  const porPestaña = {};
  for (const [nom, codigo] of [['Confirmadas', conf.code], ['Rechazadas', rech.code], ['Canceladas', canc.code], ['Finalizadas', fin.code], ['Vencidas', venc.code]]) {
    await vis(n, n.getByRole('radio', { name: new RegExp(`^${nom}`) })).click(); await n.waitForTimeout(400);
    porPestaña[nom] = (await cuenta(n, codigo, { exact: true })) > 0 && (await cuenta(n, pend.code, { exact: true })) === 0;
  }
  await shot(n, 'c2-bandeja-vencidas');
  ok('C-2', 'Cada pestaña muestra solo las solicitudes de su estado', Object.values(porPestaña).every(Boolean), JSON.stringify(porPestaña));

  // ---------- Contactar al cliente ----------
  await vis(n, n.getByRole('radio', { name: /^Pendientes/ })).click(); await n.waitForTimeout(400);
  await vis(n, n.getByRole('button', { name: new RegExp(`^Solicitud ${pend.code}`) })).click(); await n.waitForTimeout(3500);
  await vis(n, n.getByText('Contactar al cliente', { exact: true })).click(); await n.waitForTimeout(800);
  const campo = vis(n, n.getByLabel('Mensaje para el cliente (puedes cambiarlo)', { exact: true }));
  const prellenado = await campo.inputValue();
  await shot(n, 'c3-contactar-cliente');
  await campo.fill(`${prellenado} ¿Prefieren terraza o salón?`);
  await vis(n, n.getByText('Abrir WhatsApp', { exact: true })).click(); await n.waitForTimeout(800);
  const abiertas = await n.evaluate(() => window.__abiertas);
  const url = abiertas.find((u) => u.startsWith('https://wa.me/')) ?? '';
  const texto = decodeURIComponent((url.split('?text=')[1] ?? '').replace(/\+/g, ' '));
  const sigue = psql(`select status from reservations where id = '${pend.id}'`);
  ok('C-3', 'Mensaje prellenado con el restaurante, el código, la fecha y las personas', prellenado.includes(nombre) && prellenado.includes(pend.code) && /4 personas/.test(prellenado) && /p\. m\./.test(prellenado), prellenado);
  ok('C-4', 'Abre WhatsApp oficial (wa.me) con el número del cliente y el mensaje EDITADO, sin enviar nada ni confirmar la reserva', url.startsWith('https://wa.me/573205556677?text=') && texto.endsWith('¿Prefieren terraza o salón?') && sigue === 'pendiente', JSON.stringify({ url: url.slice(0, 60), sigue }));

  // ---------- Clientes: contactar al restaurante ----------
  const c = await nueva();
  await c.goto('http://localhost:8083/login', { waitUntil: 'load', timeout: 300000 }); await c.waitForTimeout(3500);
  await vis(c, c.getByLabel('Correo electrónico', { exact: true })).fill(cli.email);
  await vis(c, c.getByLabel('Contraseña', { exact: true })).fill('secreta123');
  await vis(c, c.getByText('Entrar', { exact: true })).click(); await c.waitForTimeout(5000);
  await c.goto(`http://localhost:8083/reserva/${conf.id}`, { waitUntil: 'load' }); await c.waitForTimeout(4000);
  const avisoCliente = await cuenta(c, 'Activar notificaciones', { exact: true });
  await vis(c, c.getByText('Contactar al restaurante', { exact: true })).click(); await c.waitForTimeout(800);
  const urlC = (await c.evaluate(() => window.__abiertas)).find((u) => u.startsWith('https://wa.me/')) ?? '';
  await shot(c, 'c4-reserva-cliente');
  ok('C-5', 'El cliente contacta al restaurante por WhatsApp con su código (y en la web no se ofrece activar notificaciones)', urlC.startsWith('https://wa.me/573001112233?text=') && decodeURIComponent(urlC).includes(conf.code) && avisoCliente === 0, urlC.slice(0, 90));

  // ---------- Apertura directa del detalle (como al tocar una notificación) ----------
  await n.goto(`http://localhost:8084/reservas/${rech.id}`, { waitUntil: 'load' }); await n.waitForTimeout(4000);
  ok('C-6', 'La ruta que trae una notificación del restaurante abre el detalle correcto', (await cuenta(n, rech.code, { exact: true })) > 0 && (await cuenta(n, 'No confirmada', { exact: true })) > 0, '');

  await br.close();
  for (const r of R) console.log(`${r.resultado} ${r.id} ${r.prueba}${r.resultado === 'OK' ? '' : ' → ' + r.detalle}`);
  console.log('errores de consola:', JSON.stringify(errores));
  fs.writeFileSync(`${out}/entrega-c.json`, JSON.stringify({ fecha: new Date().toISOString(), resultados: R, erroresConsola: errores }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
