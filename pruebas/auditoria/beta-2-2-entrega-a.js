// Beta 2.2, Entrega A (emprendimientos), en el navegador contra Supabase LOCAL (8083, 8084 y 3001).
// Uso: BETA2=... node pruebas/auditoria/beta-2-2-entrega-a.js <capturas> <foto.png>
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
function base32(s) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; const out = []; for (const c of s.replace(/=+$/, '').toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, '0'); for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
function totp(secret) { const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000))); const h = crypto.createHmac('sha1', base32(secret)).update(ctr).digest(); const o = h[h.length - 1] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0'); }

(async () => {
  const [out, FOTO] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const t = Date.now();
  const sfx = t % 10000;
  const R = [];
  const ok = (id, prueba, cond, detalle = '') => R.push({ id, prueba, resultado: cond ? 'OK' : 'FALLA', detalle: String(detalle).slice(0, 260) });
  const mk = async (alias) => (await svc.auth.admin.createUser({ email: `${alias}${t}@local.test`, password: 'secreta123', email_confirm: true, user_metadata: { full_name: alias } })).data.user;

  // Datos: una heladería publicada (con un producto con foto) y una cafetería sin redes.
  const dh = await mk('helado');
  const dc = await mk('cafe');
  const admin = await mk('admin');
  psql(`insert into admin_users (user_id, role) values ('${admin.id}', 'admin')`);
  const { data: bh } = await svc.from('businesses').insert({ owner_id: dh.id, name: `Helados Sal ${sfx}`, type: 'emprendimiento', subcategory_id: 'heladerias', address: 'Calle 2', whatsapp: '3001112233', status: 'publicado' }).select('id').single();
  const { data: bc } = await svc.from('businesses').insert({ owner_id: dc.id, name: `Café Salinas ${sfx}`, type: 'emprendimiento', subcategory_id: 'cafeterias', address: 'Calle 1', status: 'publicado' }).select('id').single();
  const ruta = `${dh.id}/a-${t}.png`;
  const up = await svc.storage.from('productos').upload(ruta, fs.readFileSync(FOTO), { contentType: 'image/png' });
  if (up.error) throw new Error('foto: ' + up.error.message);
  const fotoUrl = svc.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
  const ins = await svc.from('products').insert({ business_id: bh.id, name: `Cono doble ${sfx}`, price_cop: 7000, photo_url: fotoUrl, photo_label: 'Cono de dos bolas', available: true }).select('id').single();
  if (ins.error) throw new Error('producto: ' + ins.error.message);
  await svc.from('product_photos').insert({ product_id: ins.data.id, url: fotoUrl, label: 'De cerca', position: 1 });

  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const errores = [];
  const nueva = async (w = 390) => {
    const ctx = await br.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
    // Las redes sociales no se abren de verdad: solo se registra a dónde iba cada enlace.
    await ctx.route(/instagram\.com|facebook\.com|tiktok\.com|heladossal\.com/, (r) => r.fulfill({ status: 200, body: 'ok' }));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
    p.on('console', (m) => { if (m.type() === 'error' && !/GO_BACK|Failed to load resource/.test(m.text())) errores.push(m.text().slice(0, 160)); });
    return p;
  };
  const vis = (p, l) => l.filter({ visible: true }).first();
  const cuenta = (p, s, o) => p.getByText(s, o).filter({ visible: true }).count();
  const shot = (p, n, full = true) => p.screenshot({ path: `${out}/${n}.png`, fullPage: full });
  const entrar = async (p, email) => {
    await p.goto('http://localhost:8084/', { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(3500);
    await vis(p, p.getByText('Ya tengo cuenta')).click(); await p.waitForTimeout(800);
    await vis(p, p.getByLabel('Correo electrónico', { exact: true })).fill(email);
    await vis(p, p.getByLabel('Contraseña', { exact: true })).fill('secreta123');
    await vis(p, p.getByText('Entrar', { exact: true })).click(); await p.waitForTimeout(5000);
  };
  const links = () => JSON.parse(psql(`select coalesce(json_agg(l), '[]') from business_links l where business_id = '${bh.id}'`));

  // ---------- Negocios: «Contacto y entregas» ----------
  let p = await nueva();
  await entrar(p, dh.email);
  const panelAntes = { seccion: await cuenta(p, 'Contacto y entregas', { exact: true }), sinRedes: await cuenta(p, 'Sin redes', { exact: true }), sinEntregas: await cuenta(p, 'Sin indicar', { exact: true }) };
  ok('A-1', 'Panel: aparece «Contacto y entregas», vacío al inicio', panelAntes.seccion && panelAntes.sinRedes && panelAntes.sinEntregas, JSON.stringify(panelAntes));

  await vis(p, p.getByLabel('Editar contacto y entregas')).click(); await p.waitForTimeout(3000);
  // Primero un enlace peligroso: debe mostrarse el error y no guardarse nada.
  await vis(p, p.getByLabel('Sitio web', { exact: true })).fill('javascript:alert(1)');
  await vis(p, p.getByText('Guardar', { exact: true })).click(); await p.waitForTimeout(1500);
  const errorWeb = await cuenta(p, /Escribe la dirección de tu sitio web/);
  ok('A-2', 'Un enlace peligroso (javascript:) se rechaza con un mensaje y no se guarda', errorWeb > 0 && links().length === 0, JSON.stringify({ errorWeb, filas: links().length }));

  await vis(p, p.getByLabel('Instagram', { exact: true })).fill('@helados.sal');
  await vis(p, p.getByLabel('Sitio web', { exact: true })).fill('http://www.HeladosSal.com/');
  await vis(p, p.getByRole('checkbox', { name: 'Atención presencial' })).click();
  await vis(p, p.getByRole('checkbox', { name: 'Envíos nacionales' })).click();
  await vis(p, p.getByRole('checkbox', { name: 'Domicilio local' })).click();
  await vis(p, p.getByLabel('Condiciones (opcional)', { exact: true })).fill('Domicilio   gratis en el centro.');
  await shot(p, 'a1-contacto-y-entregas');
  await vis(p, p.getByText('Guardar', { exact: true })).click(); await p.waitForTimeout(4000);
  const fila = links()[0] ?? {};
  ok('A-3', 'Se guardan normalizados: https, sin «www.», modalidades en orden y condiciones sin espacios de más',
    fila.instagram === 'https://www.instagram.com/helados.sal' && fila.website === 'https://heladossal.com' && fila.facebook === null && fila.tiktok === null
    && JSON.stringify(fila.delivery_modes) === JSON.stringify(['presencial', 'domicilio_local', 'envios_nacionales']) && fila.delivery_note === 'Domicilio gratis en el centro.', JSON.stringify(fila));
  const panelDespues = { redes: await cuenta(p, 'Instagram, Sitio web', { exact: true }), entregas: await cuenta(p, 'Atención presencial · Domicilio local · Envíos nacionales', { exact: true }) };
  await shot(p, 'a2-panel-contacto');
  ok('A-4', 'El panel resume las redes y las entregas guardadas', panelDespues.redes && panelDespues.entregas, JSON.stringify(panelDespues));
  const negocioSigue = psql(`select status from businesses where id = '${bh.id}'`);
  ok('A-5', 'Guardar contacto y entregas no devuelve el negocio a revisión', negocioSigue === 'publicado', negocioSigue);

  // ---------- Negocios: ayuda de categorías ----------
  await vis(p, p.getByLabel('Editar los datos del negocio')).click(); await p.waitForTimeout(3500);
  const ayudaCerrada = (await cuenta(p, /Café empacado/)) === 0;
  await vis(p, p.getByText('¿No sabes cuál elegir? Mira ejemplos')).click(); await p.waitForTimeout(800);
  const ayuda = { cerrada: ayudaCerrada, pregunta: await cuenta(p, '¿Qué vendes principalmente?', { exact: true }), empacado: await cuenta(p, /Café empacado.*Emprendimiento \/ Productos locales/), preparado: await cuenta(p, /Café preparado.*Restaurante \/ Cafeterías/), artesanias: await cuenta(p, /Artesanías → Emprendimiento \/ Artesanías/) };
  await shot(p, 'a3-ayuda-categorias');
  ok('A-6', 'Ayuda «¿Qué vendes principalmente?»: plegada y con los ejemplos de café empacado, café preparado y artesanías', ayuda.cerrada && ayuda.pregunta && ayuda.empacado && ayuda.preparado && ayuda.artesanias, JSON.stringify(ayuda));
  const clasif = psql(`select subcategory_id from businesses where id = '${bh.id}'`);
  ok('A-7', 'Abrir la ayuda no cambia la clasificación del negocio', clasif === 'heladerias', clasif);

  // ---------- Clientes: ficha ----------
  p = await nueva();
  // Linking.openURL en la web llama a window.open: se registra la dirección sin abrir nada.
  await p.addInitScript(() => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(String(u)); return null; }; });
  await p.goto(`http://localhost:8083/negocio/${bh.id}`, { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(5000);
  const ficha = {
    instagram: await p.getByRole('link', { name: /^Instagram: @helados\.sal$/ }).count(),
    web: await p.getByRole('link', { name: /^Sitio web: heladossal\.com$/ }).count(),
    sinFacebook: (await p.getByRole('link', { name: /^Facebook/ }).count()) === 0,
    sinTiktok: (await p.getByRole('link', { name: /^TikTok/ }).count()) === 0,
    entregas: await cuenta(p, 'Atención presencial · Domicilio local · Envíos nacionales', { exact: true }),
    nota: await cuenta(p, 'Domicilio gratis en el centro.', { exact: true }),
    whatsapp: await p.getByRole('link', { name: /^WhatsApp/ }).count(),
  };
  await vis(p, p.getByRole('link', { name: /^Instagram/ })).click(); await p.waitForTimeout(1000);
  const abiertos = await p.evaluate(() => window.__abiertas);
  await shot(p, 'a4-ficha-redes-entregas');
  ok('A-8', 'Clientes: solo las redes configuradas, las entregas en una línea, las condiciones y WhatsApp sigue', Object.values(ficha).every(Boolean), JSON.stringify(ficha));
  ok('A-9', 'Tocar Instagram abre el enlace https normalizado', abiertos.some((u) => u.startsWith('https://www.instagram.com/helados.sal')), abiertos.join(' | '));

  await p.goto(`http://localhost:8083/negocio/${bc.id}`, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const sinNada = { redes: await p.getByRole('link', { name: /^(Instagram|Facebook|TikTok|Sitio web):/ }).count(), entregas: await cuenta(p, /Atención presencial|Domicilio local|Envíos/) };
  ok('A-10', 'Un negocio sin «Contacto y entregas» no muestra ese bloque', sinNada.redes === 0 && sinNada.entregas === 0, JSON.stringify(sinNada));

  // ---------- Clientes: foto ampliada ----------
  await p.goto(`http://localhost:8083/producto/${ins.data.id}`, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  await vis(p, p.getByRole('button', { name: /Cono de dos bolas\. Toca para ampliar/ })).click(); await p.waitForTimeout(1500);
  const visor = { cerrar: await p.getByLabel('Cerrar fotos').count(), contador: await cuenta(p, '1 de 2', { exact: true }), pista: await cuenta(p, 'Toca + para acercar', { exact: true }) };
  await shot(p, 'a5-foto-ampliada', false);
  await vis(p, p.getByLabel('Acercar', { exact: true })).click(); await p.waitForTimeout(1000);
  const zoom2 = await cuenta(p, '2x · arrastra para mover', { exact: true });
  const imgAncho = await p.evaluate(() => Math.max(...[...document.querySelectorAll('img')].map((i) => i.getBoundingClientRect().width)));
  await shot(p, 'a6-foto-acercada', false);
  await vis(p, p.getByLabel('Cerrar fotos')).click(); await p.waitForTimeout(1000);
  const cerrado = (await p.getByLabel('Cerrar fotos').count()) === 0;
  ok('A-11', 'Clientes: tocar la foto la abre a pantalla completa, acerca a 2x y se cierra', visor.cerrar && visor.contador && visor.pista && zoom2 && imgAncho >= 700 && cerrado, JSON.stringify({ visor, zoom2, imgAncho, cerrado }));

  // ---------- Panel del equipo: enlaces como texto ----------
  p = await nueva(1280);
  await p.goto('http://localhost:3001/entrar', { waitUntil: 'networkidle', timeout: 300000 });
  await p.fill('#email', admin.email); await p.fill('#password', 'secreta123'); await p.click('button:has-text("Entrar")');
  await p.waitForURL('**/verificar', { timeout: 60000 }); await p.waitForTimeout(2500);
  const sec = (await p.textContent('[data-testid="totp-secret"]')).trim();
  await p.fill('#code', totp(sec)); await p.click('button:has-text("Verificar")');
  await p.waitForURL('http://localhost:3001/', { timeout: 60000 });
  await p.goto(`http://localhost:3001/negocios/${bh.id}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const panelEquipo = {
    instagram: await p.locator('code', { hasText: 'https://www.instagram.com/helados.sal' }).count(),
    web: await p.locator('code', { hasText: 'https://heladossal.com' }).count(),
    sinEnlaceClicable: (await p.locator('a[href*="heladossal.com"]').count()) === 0,
    entregas: await p.getByText('Atención presencial · Domicilio local · Envíos nacionales').count(),
  };
  await shot(p, 'a7-panel-equipo-contacto');
  ok('A-12', 'Panel del equipo: ve las redes como texto (para revisar el dominio sin abrirlo) y las entregas', Object.values(panelEquipo).every(Boolean), JSON.stringify(panelEquipo));

  await br.close();
  for (const r of R) console.log(`${r.resultado} ${r.id} ${r.prueba} ${r.resultado === 'OK' ? '' : r.detalle}`);
  console.log('errores de consola:', JSON.stringify(errores));
  fs.writeFileSync(`${out}/entrega-a.json`, JSON.stringify({ fecha: new Date().toISOString(), resultados: R, erroresConsola: errores }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
