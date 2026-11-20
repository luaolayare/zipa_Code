// Beta 2.2, Entrega D: prueba integral de punta a punta con las TRES apps y el servidor completo,
// contra Supabase LOCAL. Cliente pide → el restaurante recibe el aviso → abre el detalle desde el aviso
// → confirma → el cliente recibe el aviso y lo ve en «Mis reservas» → cancela → el restaurante recibe
// el aviso → el equipo ve las cifras en el panel → una solicitud sin respuesta vence SOLA (pg_cron).
// Los avisos llegan a un servidor FALSO de Expo (no sale nada a internet).
//
// Requisitos: los mismos de beta-2-2-notificaciones.js (functions serve con el archivo de entorno de
// pruebas y los secretos de prueba en el Vault local) y las apps web en 8083, 8084 y el panel en 3001.
// Uso: BETA2=<ruta del repositorio> node pruebas/auditoria/beta-2-2-integral.js <capturas>
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('playwright-core');
const W = process.env.BETA2;
const { createClient } = require(W + '/node_modules/@supabase/supabase-js');
const st = JSON.parse(execSync('npx supabase status -o json', { cwd: W }).toString());
if (!/127\.0\.0\.1|localhost/.test(st.API_URL)) throw new Error('Solo contra Supabase local');
const svc = createClient(st.API_URL, st.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const psql = (sql) => execSync('docker exec -i supabase_db_zipa-lo-tiene psql -U postgres -tA', { input: sql }).toString().trim();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
function base32(s) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; const out = []; for (const c of s.replace(/=+$/, '').toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, '0'); for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
function totp(secret) { const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000))); const h = crypto.createHmac('sha1', base32(secret)).update(ctr).digest(); const o = h[h.length - 1] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0'); }

// Servidor falso de Expo.
const avisos = [];
const peticiones = [];
const servidor = http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => { b += c; });
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (req.url === '/send') {
      const m = JSON.parse(b);
      // Como en Expo: una petición con tokens de los dos proyectos (clientes y negocios) se rechaza entera.
      const proyectos = new Set(m.map((x) => (x.to.includes('integral-duena') ? 'negocios' : 'clientes')));
      peticiones.push([...proyectos]);
      if (proyectos.size > 1) { res.statusCode = 400; res.end(JSON.stringify({ errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }] })); return; }
      res.end(JSON.stringify({ data: m.map((x) => { avisos.push(x); return { status: 'ok', id: crypto.randomUUID() }; }) }));
    } else res.end(JSON.stringify({ data: Object.fromEntries((JSON.parse(b).ids ?? []).map((id) => [id, { status: 'ok' }])) }));
  });
});

(async () => {
  const [out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  await new Promise((r) => servidor.listen(9099, '0.0.0.0', r));
  const t = Date.now();
  const sfx = t % 100000;
  const R = [];
  const ok = (id, prueba, cond, detalle = '') => R.push({ id, prueba, resultado: cond ? 'OK' : 'FALLA', detalle: String(detalle).slice(0, 300) });
  const cuentaNueva = async (alias, nombre) => {
    const email = `${alias}${t}@local.test`;
    const { data } = await svc.auth.admin.createUser({ email, password: 'secreta123', email_confirm: true, user_metadata: { full_name: nombre } });
    const c = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email, password: 'secreta123' });
    return { id: data.user.id, email, c };
  };
  const hasta = async (cond, ms = 20000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await cond()) return true; await espera(500); } return false; };
  const hora = (dias, hhmm) => { const d = new Date(`${new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)}T00:00:00-05:00`); d.setUTCDate(d.getUTCDate() + dias); return `${d.toISOString().slice(0, 10)}T${hhmm}:00-05:00`; };

  // Datos: restaurante con reservas activas y un plato; un cliente; alguien del equipo.
  const duena = await cuentaNueva('integral-duena', 'Dueña Integral');
  const cli = await cuentaNueva('integral-cli', 'Valentina Integral');
  const admin = await cuentaNueva('integral-admin', 'Equipo Integral');
  psql(`insert into admin_users (user_id, role) values ('${admin.id}', 'admin')`);
  const nombre = `Fogón Integral ${sfx}`;
  const { data: b } = await svc.from('businesses').insert({ owner_id: duena.id, name: nombre, type: 'establecido', subcategory_id: 'comida_tipica', address: 'Calle 2', whatsapp: '3001112233', status: 'publicado' }).select('id').single();
  await svc.from('products').insert({ business_id: b.id, name: `Cuchuco ${sfx}`, price_cop: 18000, available: true });
  await duena.c.rpc('guardar_config_reservas', { p_business: b.id, p_enabled: true, p_max_party: 8, p_min_notice_minutes: 60, p_max_advance_days: 30, p_response_hours: 24, p_slot_minutes: 30, p_instructions: 'Te escribimos por WhatsApp.', p_windows: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d, starts: '00:00', ends: '23:00' })), p_blocked: [] });
  // Dispositivos (como lo hace la app al activar las notificaciones).
  await duena.c.rpc('registrar_token_push', { p_token: `ExponentPushToken[integral-duena-${sfx}]`, p_app: 'negocios', p_platform: 'android' });
  await cli.c.rpc('registrar_token_push', { p_token: `ExponentPushToken[integral-cli-${sfx}]`, p_app: 'clientes', p_platform: 'ios' });
  const para = (quien, titulo) => avisos.filter((a) => a.to.includes(`integral-${quien}-${sfx}`) && (!titulo || a.title === titulo));

  // Una solicitud que nadie responde: debe vencer SOLA (pg_cron cada 5 minutos).
  const sinRespuesta = (await cli.c.rpc('solicitar_reserva', { p_business: b.id, p_starts_at: hora(9, '13:00'), p_party: 2, p_name: 'Valentina Integral', p_whatsapp: '3205550000', p_table: null, p_notes: null, p_items: [], p_idempotency: crypto.randomUUID() })).data;
  psql(`update reservations set respond_by = now() - interval '1 minute' where id = '${sinRespuesta.id}'`);
  const inicioCron = Date.now();

  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const errores = [];
  const nueva = async (w = 390) => {
    const p = await (await br.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 })).newPage();
    p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
    p.on('console', (m) => { if (m.type() === 'error' && !/GO_BACK|Failed to load resource/.test(m.text())) errores.push(m.text().slice(0, 160)); });
    p.on('dialog', (d) => d.accept());
    return p;
  };
  const vis = (p, l) => l.filter({ visible: true }).first();
  const cuenta = (p, s, o) => p.getByText(s, o).filter({ visible: true }).count();
  const shot = (p, n) => p.screenshot({ path: `${out}/${n}.png`, fullPage: true });

  // 1. El cliente solicita desde la ficha (con sesión).
  const c = await nueva();
  await c.goto('http://localhost:8083/login', { waitUntil: 'load', timeout: 300000 }); await c.waitForTimeout(3500);
  await vis(c, c.getByLabel('Correo electrónico', { exact: true })).fill(cli.email);
  await vis(c, c.getByLabel('Contraseña', { exact: true })).fill('secreta123');
  await vis(c, c.getByText('Entrar', { exact: true })).click(); await c.waitForTimeout(5000);
  await c.goto(`http://localhost:8083/negocio/${b.id}`, { waitUntil: 'load' }); await c.waitForTimeout(5000);
  await vis(c, c.getByRole('link', { name: /^Solicitar reserva/ })).click(); await c.waitForTimeout(4000);
  await vis(c, c.getByRole('radio', { name: 'Mañana' })).click(); await c.waitForTimeout(400);
  await vis(c, c.getByRole('radio', { name: '8:00 p. m.' })).click();
  await vis(c, c.getByLabel('Tu WhatsApp', { exact: true })).fill('320 555 6677');
  await vis(c, c.getByLabel('Observaciones (opcional)', { exact: true })).fill('Es una sorpresa de aniversario');
  await vis(c, c.getByText('Enviar solicitud', { exact: true })).click(); await c.waitForTimeout(4000);
  const r = JSON.parse(psql(`select row_to_json(x) from (select id, code, status from reservations where business_id = '${b.id}' and id <> '${sinRespuesta.id}' order by created_at desc limit 1) x`) || '{}');
  ok('I-1', 'El cliente envía la solicitud desde la ficha y ve su código', r.status === 'pendiente' && (await cuenta(c, r.code, { exact: true })) > 0, JSON.stringify(r));

  // 2. Aviso al restaurante, sin intervención.
  const llego = await hasta(() => para('duena', 'Tienes una nueva solicitud de reserva').some((a) => a.data?.reservationId === r.id));
  const aviso = para('duena', 'Tienes una nueva solicitud de reserva').find((a) => a.data?.reservationId === r.id) ?? {};
  ok('I-2', 'El restaurante recibe el aviso de la nueva solicitud (sin datos personales en el texto)', llego && !/Valentina|3205556677|aniversario/.test(`${aviso.title} ${aviso.body}`), JSON.stringify({ title: aviso.title, body: aviso.body }));

  // 3. El restaurante abre la ruta del aviso (como al tocarlo) y confirma.
  const n = await nueva();
  await n.goto('http://localhost:8084/', { waitUntil: 'load', timeout: 300000 }); await n.waitForTimeout(3500);
  await vis(n, n.getByText('Ya tengo cuenta')).click(); await n.waitForTimeout(800);
  await vis(n, n.getByLabel('Correo electrónico', { exact: true })).fill(duena.email);
  await vis(n, n.getByLabel('Contraseña', { exact: true })).fill('secreta123');
  await vis(n, n.getByText('Entrar', { exact: true })).click(); await n.waitForTimeout(5000);
  await n.goto(`http://localhost:8084${aviso.data?.url ?? '/'}`, { waitUntil: 'load' }); await n.waitForTimeout(4000);
  const detalle = { codigo: await cuenta(n, r.code, { exact: true }), nota: await cuenta(n, 'Es una sorpresa de aniversario', { exact: true }) };
  await vis(n, n.getByText('Confirmar reserva', { exact: true })).click(); await n.waitForTimeout(3000);
  await shot(n, 'i1-restaurante-confirma');
  ok('I-3', 'Desde la ruta del aviso se abre el detalle correcto y el restaurante confirma', detalle.codigo && detalle.nota && psql(`select status from reservations where id = '${r.id}'`) === 'confirmada', JSON.stringify(detalle));

  // 4. Aviso al cliente y lo ve en «Mis reservas».
  const llego2 = await hasta(() => para('cli', 'Tu reserva fue confirmada').some((a) => a.data?.url === `/reserva/${r.id}`));
  await c.goto('http://localhost:8083/mis-reservas', { waitUntil: 'load' }); await c.waitForTimeout(4500);
  await vis(c, c.getByRole('radio', { name: /^Confirmadas/ })).click(); await c.waitForTimeout(500);
  const enLista = await c.getByRole('button', { name: new RegExp(`^Reserva ${r.code}`) }).count();
  await shot(c, 'i2-mis-reservas');
  ok('I-4', 'El cliente recibe «Tu reserva fue confirmada» y la ve en «Mis reservas → Confirmadas»', llego2 && enLista > 0, JSON.stringify({ llego2, enLista }));

  // 5. El cliente cancela y el restaurante recibe el aviso.
  await vis(c, c.getByRole('button', { name: new RegExp(`^Reserva ${r.code}`) })).click(); await c.waitForTimeout(3500);
  await vis(c, c.getByText('Cancelar reserva', { exact: true })).click(); await c.waitForTimeout(3000);
  const llego3 = await hasta(() => para('duena', 'Un cliente canceló su reserva').length > 0);
  ok('I-5', 'El cliente cancela y el restaurante recibe «Un cliente canceló su reserva»', llego3 && psql(`select status || ':' || cancelled_by from reservations where id = '${r.id}'`) === 'cancelada:cliente', '');

  // 6. El equipo ve las cifras en el panel (con MFA) y ningún dato personal.
  const a = await nueva(1280);
  await a.goto('http://localhost:3001/entrar', { waitUntil: 'networkidle', timeout: 300000 });
  await a.fill('#email', admin.email); await a.fill('#password', 'secreta123'); await a.click('button:has-text("Entrar")');
  await a.waitForURL('**/verificar', { timeout: 60000 }); await a.waitForTimeout(2500);
  const sec = (await a.textContent('[data-testid="totp-secret"]')).trim();
  await a.fill('#code', totp(sec)); await a.click('button:has-text("Verificar")');
  await a.waitForURL('http://localhost:3001/', { timeout: 60000 });
  await a.goto('http://localhost:3001/reservas', { waitUntil: 'networkidle' }); await a.waitForTimeout(1500);
  const texto = await a.locator('main').innerText().catch(async () => a.locator('body').innerText());
  const panel = {
    titulo: /Solicitudes de reserva/.test(texto),
    recibidas: /Recibidas/.test(texto),
    // La tabla muestra los 10 con más solicitudes (con datos acumulados, este puede no estar entre ellos).
    restaurantes: /Restaurantes con más solicitudes/.test(texto) && (await a.locator('a[href^="/negocios/"]').count()) > 0,
    respuesta: /Tiempo promedio de respuesta/.test(texto),
    tareas: /Vencimiento de solicitudes/.test(texto) && /Envío de notificaciones/.test(texto),
    sinPersonales: !/(Valentina|3205556677|aniversario|320 555)/.test(texto),
    sinConfirmar: (await a.getByText('Confirmar reserva').count()) === 0,
  };
  await shot(a, 'i3-panel-reservas');
  ok('I-6', 'Panel del equipo (con MFA): cifras, restaurantes, tiempo de respuesta y tareas; sin datos de clientes y sin poder confirmar', Object.values(panel).every(Boolean), JSON.stringify(panel));

  // 7. Vencimiento automático: la solicitud sin respuesta vence sola y el cliente recibe el aviso.
  const vencio = await hasta(() => psql(`select status from reservations where id = '${sinRespuesta.id}'`) === 'expirada', 6.5 * 60 * 1000);
  const llego4 = await hasta(() => para('cli', 'Tu solicitud de reserva venció').some((x) => x.data?.reservationId === sinRespuesta.id), 30000);
  const corrida = psql(`select coalesce(max(d.end_time)::text, '') from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname = 'zipa-expirar-reservas' and d.status = 'succeeded'`);
  ok('I-7', 'Sin ninguna app abierta ni llamada manual, la solicitud vence sola (pg_cron) y el cliente recibe el aviso', vencio && llego4 && !!corrida, JSON.stringify({ vencio, llego4, segundos: Math.round((Date.now() - inicioCron) / 1000), ultimaCorrida: corrida }));

  await br.close();
  servidor.close();
  ok('I-8', 'Sin errores de consola en las tres apps', errores.length === 0, JSON.stringify(errores));
  ok('I-9', 'Ninguna petición a Expo mezcló los proyectos de clientes y negocios (P1)', peticiones.length > 0 && peticiones.every((x) => x.length === 1), JSON.stringify(peticiones));
  for (const x of R) console.log(`${x.resultado} ${x.id} ${x.prueba}${x.resultado === 'OK' ? '' : ' → ' + x.detalle}`);
  fs.writeFileSync(`${out}/integral.json`, JSON.stringify({ fecha: new Date().toISOString(), resultados: R, erroresConsola: errores }, null, 2));
  process.exit(R.every((x) => x.resultado === 'OK') ? 0 : 1);
})().catch((e) => { console.error(e); servidor.close(); process.exit(1); });
