// Rediseño de tipografía y espacios: capturas de la app de negocios (Bienvenida, Registro, Panel,
// Reservas y Detalle de reserva) a 390 de ancho, contra Supabase LOCAL (negocios en 8084).
// Usa el negocio de muestra que siembra capturas-clientes.js (estado-capturas.json) y le agrega, una
// sola vez, otras dos solicitudes (una pendiente y una confirmada) para que la bandeja se vea real.
// Uso: BETA2=<repositorio> NODE_PATH=<playwright> node pruebas/diseno/capturas-negocios.js <carpeta> <estado.json>
const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const W = process.env.BETA2;
const { createClient } = require(W + '/node_modules/@supabase/supabase-js');
const st = JSON.parse(execSync('npx supabase status -o json', { cwd: W }).toString());
if (!/127\.0\.0\.1|localhost/.test(st.API_URL)) throw new Error('Solo contra Supabase local');
const svc = createClient(st.API_URL, st.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = 'secreta123';

async function sesion(email, nombre) {
  await svc.auth.admin.createUser({ email, password: PASS, email_confirm: true, user_metadata: { full_name: nombre } });
  const c = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: PASS });
  return c;
}
const hora = (dias, hhmm) => { const d = new Date(`${new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)}T00:00:00-05:00`); d.setUTCDate(d.getUTCDate() + dias); return `${d.toISOString().slice(0, 10)}T${hhmm}:00-05:00`; };

(async () => {
  const [out, estado] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const s = JSON.parse(fs.readFileSync(estado, 'utf8'));
  const { count } = await svc.from('reservations').select('id', { count: 'exact', head: true }).eq('business_id', s.negocio);
  if ((count ?? 0) < 3) {
    const pedir = async (c, nombre, dias, h, mesa) => (await c.rpc('solicitar_reserva', { p_business: s.negocio, p_starts_at: hora(dias, h), p_party: 2, p_name: nombre, p_whatsapp: '3015556677', p_table: mesa, p_notes: null, p_items: [], p_idempotency: crypto.randomUUID() })).data;
    await pedir(await sesion('diseno-cliente2@local.test', 'Andrés Rojas'), 'Andrés Rojas', 4, '12:30', 'Salón');
    const conf = await pedir(await sesion('diseno-cliente3@local.test', 'Camila Pérez'), 'Camila Pérez', 5, '09:00', null);
    const duena = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
    await duena.auth.signInWithPassword({ email: 'diseno-duena@local.test', password: PASS });
    await duena.rpc('confirmar_reserva', { p_id: conf.id });
  }

  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const errores = [];
  const vis = (p, l) => l.filter({ visible: true }).first();
  const nueva = async () => {
    const p = await (await br.newContext({ viewport: { width: 390, height: 1900 }, deviceScaleFactor: 2 })).newPage();
    p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
    return p;
  };
  const foto = async (p, nombre, ruta) => {
    if (ruta) { await p.goto(`http://localhost:8084${ruta}`, { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(4500); }
    await p.screenshot({ path: `${out}/${nombre}.png`, fullPage: true });
    console.log('captura', nombre);
  };

  // Sin sesión: bienvenida y paso 1 del registro.
  const a = await nueva();
  await foto(a, 'n1-bienvenida', '/');
  await foto(a, 'n6-registro-cuenta', '/registro/cuenta');
  // Pasos 2 a 4 del registro con una cuenta nueva sin negocio (el borrador empieza vacío).
  await sesionWeb(a, `diseno-registro-${Date.now()}@local.test`, true);
  await foto(a, 'n7-registro-datos', '/registro/datos');
  await foto(a, 'n8-registro-verificacion', '/registro/verificacion');
  await foto(a, 'n9-registro-productos', '/registro/productos');

  // La dueña del negocio de muestra: panel, bandeja y detalle.
  const b = await nueva();
  await sesionWeb(b, 'diseno-duena@local.test', false);
  await foto(b, 'n2-panel', '/panel');
  await foto(b, 'n3-reservas', '/reservas');
  await foto(b, 'n4-reserva-detalle', `/reservas/${s.reserva}`);
  await foto(b, 'n5-reservas-configuracion', '/reservas/configuracion');
  if (process.env.SOLO_RESTO || process.env.CON_RESTO) {
    await foto(b, 'n10-negocio-editar', '/negocio/editar');
    await foto(b, 'n11-negocio-contacto', '/negocio/contacto');
    await foto(b, 'n12-producto-editar', `/producto/${s.producto}`);
    await foto(b, 'n13-qr', '/qr');
  }
  await br.close();
  console.log(errores.length ? `ERRORES: ${JSON.stringify(errores)}` : 'sin errores de página');

  async function sesionWeb(p, email, crear) {
    if (crear) await svc.auth.admin.createUser({ email, password: PASS, email_confirm: true, user_metadata: { full_name: 'Persona de prueba' } });
    await p.goto('http://localhost:8084/registro/cuenta?entrar=1', { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(3500);
    await vis(p, p.getByLabel('Correo electrónico', { exact: true })).fill(email);
    await vis(p, p.getByLabel('Contraseña', { exact: true })).fill(PASS);
    await vis(p, p.getByText('Entrar', { exact: true })).click(); await p.waitForTimeout(5000);
  }
})().catch((e) => { console.error(e); process.exit(1); });
