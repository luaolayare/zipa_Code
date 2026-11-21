// Rediseño de tipografía y espacios: capturas de las 5 pantallas principales de la app de clientes
// (Inicio, Negocio, Producto, Reservar y Mi reserva) a 390 de ancho, contra Supabase LOCAL.
// Siembra (una sola vez, solo en local) un negocio de muestra parecido a los bocetos: «Arepas Mamá Inés».
// Uso: BETA2=<repositorio> NODE_PATH=<playwright> node pruebas/diseno/capturas-clientes.js <carpeta> [estado.json]
const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const W = process.env.BETA2;
const { createClient } = require(W + '/node_modules/@supabase/supabase-js');
const st = JSON.parse(execSync('npx supabase status -o json', { cwd: W }).toString());
if (!/127\.0\.0\.1|localhost/.test(st.API_URL)) throw new Error('Solo contra Supabase local');
const svc = createClient(st.API_URL, st.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = () => createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } });
const PASS = 'secreta123';

async function cuenta(email, nombre) {
  const { data } = await svc.auth.admin.createUser({ email, password: PASS, email_confirm: true, user_metadata: { full_name: nombre } });
  let id = data?.user?.id;
  if (!id) { const { data: l } = await svc.auth.admin.listUsers({ perPage: 1000 }); id = l.users.find((u) => u.email === email).id; }
  const c = anon();
  await c.auth.signInWithPassword({ email, password: PASS });
  return { id, email, c };
}
const hora = (dias, hhmm) => { const d = new Date(`${new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)}T00:00:00-05:00`); d.setUTCDate(d.getUTCDate() + dias); return `${d.toISOString().slice(0, 10)}T${hhmm}:00-05:00`; };

async function sembrar(archivo) {
  if (fs.existsSync(archivo)) {
    const s = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    const { data } = await svc.from('reservations').select('status').eq('id', s.reserva).maybeSingle();
    if (data?.status === 'pendiente') return s;
  }
  const duena = await cuenta('diseno-duena@local.test', 'Inés Rodríguez');
  const cli = await cuenta('diseno-cliente@local.test', 'Lucía Gómez');
  let { data: b } = await svc.from('businesses').select('id').eq('owner_id', duena.id).maybeSingle();
  if (!b) {
    ({ data: b } = await svc.from('businesses').insert({ owner_id: duena.id, name: 'Arepas Mamá Inés', type: 'establecido', category: 'comer', subcategory_id: 'comida_tipica', address: 'Calle 5 # 3-21, centro histórico', hours: 'Todos los días, 7 a. m. a 8 p. m.', whatsapp: '3001234567', specialty: 'Arepas boyacenses y desayunos', status: 'publicado' }).select('id').single().then((r) => { if (r.error) throw r.error; return r; }));
    const platos = [
      ['Arepa boyacense con queso', 9500, 'Arepa dulce de maíz pelado, rellena de cuajada fresca y asada en budare. Receta de la casa desde 1998.'],
      ['Changua de la casa', 14000, 'Con almojábana y pan tostado'],
      ['Desayuno santafereño', 18000, 'Tamal, chocolate y queso'],
    ];
    await svc.from('products').insert(platos.map(([name, price_cop, description], i) => ({ business_id: b.id, name, price_cop, description, section: 'Desayunos', sort_order: i, available: true })));
    const textos = ['Las mejores arepas de Zipaquirá, la cuajada es fresquísima.', 'Atención muy amable y el chocolate delicioso.', 'Buen desayuno antes de ir a la Catedral de Sal.'];
    for (let i = 0; i < textos.length; i++) {
      const r = await cuenta(`diseno-resena${i}@local.test`, ['Andrés Rojas', 'Camila Pérez', 'Jorge Díaz'][i]);
      await svc.from('reviews').insert({ business_id: b.id, user_id: r.id, stars: i === 2 ? 4 : 5, text: textos[i], visited: true });
    }
    await svc.from('featured_placements').insert({ business_id: b.id, starts_at: new Date(Date.now() - 864e5).toISOString(), ends_at: new Date(Date.now() + 90 * 864e5).toISOString(), position: 1 });
    await duena.c.rpc('guardar_config_reservas', { p_business: b.id, p_enabled: true, p_max_party: 8, p_min_notice_minutes: 60, p_max_advance_days: 30, p_response_hours: 24, p_slot_minutes: 30, p_instructions: null, p_windows: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d, starts: '07:00', ends: '20:00' })), p_blocked: [] });
  }
  const { data: prods } = await svc.from('products').select('id').eq('business_id', b.id).order('sort_order').limit(1);
  const { data: r, error } = await cli.c.rpc('solicitar_reserva', { p_business: b.id, p_starts_at: hora(3, '13:00'), p_party: 4, p_name: 'Lucía Gómez', p_whatsapp: '3009998877', p_table: 'Terraza', p_notes: 'Llegamos con un bebé', p_items: [], p_idempotency: crypto.randomUUID() });
  if (error) throw error;
  const s = { negocio: b.id, producto: prods[0].id, reserva: r.id, cliente: cli.email };
  fs.writeFileSync(archivo, JSON.stringify(s, null, 2));
  return s;
}

(async () => {
  const [out, estado = `${out}/../estado-capturas.json`] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const s = await sembrar(estado);
  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const p = await (await br.newContext({ viewport: { width: 390, height: 1900 }, deviceScaleFactor: 2 })).newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
  const vis = (l) => l.filter({ visible: true }).first();
  await p.goto('http://localhost:8083/login', { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(3500);
  await vis(p.getByLabel('Correo electrónico', { exact: true })).fill(s.cliente);
  await vis(p.getByLabel('Contraseña', { exact: true })).fill(PASS);
  await vis(p.getByText('Entrar', { exact: true })).click(); await p.waitForTimeout(4000);
  const pantallas = [
    ['1-inicio', '/explorar'],
    ['2-negocio', `/negocio/${s.negocio}`],
    ['3-producto', `/producto/${s.producto}`],
    ['4-reservar', `/reservar/${s.negocio}`],
    ['5-mi-reserva', `/reserva/${s.reserva}`],
  ];
  for (const [nombre, ruta] of pantallas) {
    await p.goto(`http://localhost:8083${ruta}`, { waitUntil: 'load' }); await p.waitForTimeout(4500);
    await p.screenshot({ path: `${out}/${nombre}.png`, fullPage: true });
    console.log('captura', nombre);
  }
  await br.close();
  console.log(errores.length ? `ERRORES: ${JSON.stringify(errores)}` : 'sin errores de página');
})().catch((e) => { console.error(e); process.exit(1); });
