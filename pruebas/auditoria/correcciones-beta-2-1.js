// Beta 2.1: las cinco correcciones en el navegador, contra Supabase LOCAL (8083, 8084 y 3001).
// Uso: BETA2=... node pruebas/auditoria/correcciones-beta-2-1.js <capturas>
const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const fs = require('fs');
const W = process.env.BETA2;
const { createClient } = require(W + '/node_modules/@supabase/supabase-js');
const st = JSON.parse(execSync('npx supabase status -o json', { cwd: W }).toString());
if (!/127\.0\.0\.1|localhost/.test(st.API_URL)) throw new Error('Solo contra Supabase local');
const svc = createClient(st.API_URL, st.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const psql = (sql) => execSync('docker exec -i supabase_db_zipa-lo-tiene psql -U postgres -tA', { input: sql }).toString().trim();

(async () => {
  const [out] = process.argv.slice(2);
  const t = Date.now();
  const sfx = t % 10000;
  const R = [];
  const ok = (id, prueba, cond, detalle = '') => R.push({ id, prueba, resultado: cond ? 'OK' : 'FALLA', detalle: String(detalle).slice(0, 220) });
  const mk = async (alias) => (await svc.auth.admin.createUser({ email: `${alias}${t}@local.test`, password: 'secreta123', email_confirm: true, user_metadata: { full_name: alias } })).data.user;

  // Datos: una cafetería (Restaurantes) y una heladería (Emprendimientos), con un producto sin foto cada una.
  const dc = await mk('cafe');
  const dh = await mk('helado');
  const { data: bc } = await svc.from('businesses').insert({ owner_id: dc.id, name: `Café Salinas ${sfx}`, type: 'emprendimiento', subcategory_id: 'cafeterias', address: 'Calle 1', status: 'publicado' }).select('id, category').single();
  const { data: bh } = await svc.from('businesses').insert({ owner_id: dh.id, name: `Helados Sal ${sfx}`, type: 'emprendimiento', subcategory_id: 'heladerias', address: 'Calle 2', status: 'publicado' }).select('id, category').single();
  const ins = await svc.from('products').insert([{ business_id: bc.id, name: `Capuchino ${sfx}`, price_cop: 6000, section: 'Bebidas', available: true }, { business_id: bh.id, name: `Paleta ${sfx}`, price_cop: 4000, section: null, available: false }]);
  if (ins.error) throw new Error('productos: ' + ins.error.message);
  // 27 negocios con la misma palabra, para la paginación de la búsqueda.
  const token = `zipaq${sfx}`;
  const dueños = await Promise.all(Array.from({ length: 27 }, (_, i) => mk(`p${i}-`)));
  await svc.from('businesses').insert(dueños.map((u, i) => ({ owner_id: u.id, name: `Tienda ${token} ${String(i).padStart(2, '0')}`, type: 'emprendimiento', subcategory_id: 'artesanias', address: 'Calle 9', status: 'publicado' })));

  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const errores = [];
  const nueva = async (w = 390) => {
    const p = await (await br.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 })).newPage();
    p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
    p.on('console', (m) => { if (m.type() === 'error' && !/GO_BACK|Failed to load resource/.test(m.text())) errores.push(m.text().slice(0, 160)); });
    return p;
  };
  const vis = (p, l) => l.filter({ visible: true }).first();
  const cuenta = (p, s, o) => p.getByText(s, o).filter({ visible: true }).count();
  const shot = (p, n, full = true) => p.screenshot({ path: `${out}/${n}.png`, fullPage: full });

  // ---------- 1. Plato / producto en negocios ----------
  const entrar = async (p, email) => {
    await p.goto('http://localhost:8084/', { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(3500);
    await vis(p, p.getByText('Ya tengo cuenta')).click(); await p.waitForTimeout(800);
    await vis(p, p.getByLabel('Correo electrónico', { exact: true })).fill(email);
    await vis(p, p.getByLabel('Contraseña', { exact: true })).fill('secreta123');
    await vis(p, p.getByText('Entrar', { exact: true })).click(); await p.waitForTimeout(5000);
  };
  let p = await nueva();
  await entrar(p, dc.email);
  const panelCafe = { titulo: await cuenta(p, 'Tu menú', { exact: true }), agregar: await p.getByLabel('Agregar plato', { exact: true }).count(), dispo: await cuenta(p, 'Disponible hoy', { exact: true }) };
  await vis(p, p.getByLabel('Agregar plato', { exact: true })).click(); await p.waitForTimeout(3000);
  const editorCafe = { seccionMenu: await cuenta(p, 'Sección del menú', { exact: true }), chips: await p.getByRole('radio', { name: 'Bebidas', exact: true }).count(), dispo: await p.getByRole('switch', { name: 'Disponible hoy' }).count(), boton: await cuenta(p, 'Agregar plato', { exact: true }) };
  await shot(p, 'n1-editor-cafeteria');
  ok('B1-1', 'Cafetería (Restaurantes, categoría vieja cafe_dulces): «Tu menú», «Agregar plato», secciones del menú y «Disponible hoy»', bc.category === 'cafe_dulces' && panelCafe.titulo && panelCafe.agregar && editorCafe.seccionMenu && editorCafe.chips && editorCafe.dispo && editorCafe.boton, JSON.stringify({ categoriaVieja: bc.category, panelCafe, editorCafe }));

  p = await nueva();
  await entrar(p, dh.email);
  const panelHel = { titulo: await cuenta(p, 'Tu catálogo', { exact: true }), agregar: await p.getByLabel('Agregar producto', { exact: true }).count(), agotado: await cuenta(p, 'Agotado', { exact: true }) };
  await shot(p, 'n2-panel-heladeria');
  await vis(p, p.getByLabel('Agregar producto', { exact: true })).click(); await p.waitForTimeout(3000);
  const editorHel = { seccionOpcional: await cuenta(p, 'Sección (opcional)', { exact: true }), sinChips: (await p.getByRole('radio', { name: 'Bebidas', exact: true }).count()) === 0, dispo: await p.getByRole('switch', { name: 'Disponible', exact: true }).count() };
  await shot(p, 'n3-editor-heladeria');
  ok('B1-2', 'Heladería (Emprendimientos): «Tu catálogo», «Agregar producto», sección opcional sin sugerencias de menú y «Disponible»/«Agotado»', panelHel.titulo && panelHel.agregar && panelHel.agotado && editorHel.seccionOpcional && editorHel.sinChips && editorHel.dispo, JSON.stringify({ panelHel, editorHel }));

  // ---------- 1, 2 y 4 en clientes ----------
  p = await nueva();
  await p.goto(`http://localhost:8083/negocio/${bh.id}`, { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(5000);
  const fichaHel = { catalogo: await p.getByRole('heading', { name: 'Catálogo' }).count(), agotado: await cuenta(p, 'Agotado', { exact: true }), sin3D: (await cuenta(p, /en 3D/)) === 0 };
  await shot(p, 'c1-ficha-heladeria');
  ok('B1-3', 'Clientes: la heladería muestra «Catálogo» y «Agotado»', fichaHel.catalogo && fichaHel.agotado, JSON.stringify(fichaHel));
  await p.goto(`http://localhost:8083/negocio/${bc.id}`, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const fichaCafe = { menu: await p.getByRole('heading', { name: 'Menú' }).count(), seccion: await p.getByRole('heading', { name: /Bebidas/i }).count() };
  await shot(p, 'c2-ficha-cafeteria');
  ok('B1-4', 'Clientes: la cafetería muestra «Menú» con sus secciones', fichaCafe.menu && fichaCafe.seccion, JSON.stringify(fichaCafe));

  // Ilustración: helado en la heladería (no taza). Se reconoce por el dibujo del cono (círculos y el cono).
  const prodHel = psql(`select id from products where name = 'Paleta ${sfx}'`);
  await p.goto(`http://localhost:8083/producto/${prodHel}`, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  const dibujoHel = await p.evaluate(() => { const s = document.querySelector('svg[viewBox="0 0 200 144"]'); return s ? { circulos: s.querySelectorAll('circle').length, conoFill: [...s.querySelectorAll('path')].some((x) => x.getAttribute('fill') === '#D9A55B'), taza: [...s.querySelectorAll('path')].some((x) => (x.getAttribute('d') || '').startsWith('M131 70')) } : null; });
  await shot(p, 'c3-producto-heladeria-ilustracion', false);
  ok('B2-1', 'La heladería muestra la ilustración de helado, no la de taza', !!dibujoHel && dibujoHel.conoFill && !dibujoHel.taza, JSON.stringify(dibujoHel));
  const prodCafe = psql(`select id from products where name = 'Capuchino ${sfx}'`);
  await p.goto(`http://localhost:8083/producto/${prodCafe}`, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  const dibujoCafe = await p.evaluate(() => { const s = document.querySelector('svg[viewBox="0 0 200 144"]'); return s ? [...s.querySelectorAll('path')].some((x) => (x.getAttribute('d') || '').startsWith('M131 70')) : null; });
  ok('B2-2', 'La cafetería muestra la taza', dibujoCafe === true);
  const portadas = await (async () => {
    const q = await nueva();
    const color = async (id) => { await q.goto(`http://localhost:8083/negocio/${id}`, { waitUntil: 'load' }); await q.waitForTimeout(3500); return q.evaluate(() => { const colores = new Set([...document.querySelectorAll('div')].map((d) => getComputedStyle(d).backgroundColor)); return { terracota: colores.has('rgb(194, 56, 27)'), petroleo: colores.has('rgb(15, 110, 110)') }; }); };
    return { cafeteria: await color(bc.id), heladeria: await color(bh.id) };
  })();
  ok('B2-3', 'Portada por categoría principal: cafetería terracota (Restaurantes) y heladería verde petróleo (Emprendimientos)', portadas.cafeteria.terracota && !portadas.cafeteria.petroleo && portadas.heladeria.petroleo && !portadas.heladeria.terracota, JSON.stringify(portadas));
  ok('B4-1', 'El producto sin modelo no ofrece «Ver en 3D»', (await cuenta(p, 'Ver en 3D')) === 0);

  // ---------- 3. Paginación de la búsqueda ----------
  p = await nueva();
  await p.goto('http://localhost:8083/explorar', { waitUntil: 'load' }); await p.waitForTimeout(5000);
  ok('B4-2', 'El inicio no muestra indicadores «en 3D»', (await cuenta(p, /en 3D/)) === 0);
  const campo = vis(p, p.getByLabel('Buscar negocio, plato o producto'));
  // Cambio rápido: «zipa» → token completo; deben quedar solo los del token.
  await campo.fill('zipa'); await p.waitForTimeout(100); await campo.fill(token); await p.waitForTimeout(2500);
  const filas = () => p.getByRole('button', { name: new RegExp(`^Tienda ${token}`) }).count();
  const n1 = await filas();
  const etiqueta1 = await p.getByText(/resultados? para/).first().textContent();
  const verMas = await cuenta(p, 'Ver más', { exact: true });
  await shot(p, 'c4-busqueda-primera-pagina');
  await vis(p, p.getByText('Ver más', { exact: true })).click();
  await vis(p, p.getByText('Ver más', { exact: true })).click().catch(() => {}); // doble toque: no debe duplicar
  await p.waitForTimeout(2500);
  const n2 = await filas();
  const nombres = await p.getByRole('button', { name: new RegExp(`^Tienda ${token}`) }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const verMasFinal = await cuenta(p, 'Ver más', { exact: true });
  await shot(p, 'c5-busqueda-todas');
  ok('B3-1', 'Búsqueda: 20 resultados y «Ver más»; luego 27 sin duplicados y sin más botón', n1 === 20 && verMas === 1 && /20\+/.test(etiqueta1) && n2 === 27 && new Set(nombres).size === 27 && verMasFinal === 0, JSON.stringify({ n1, etiqueta1, verMas, n2, unicos: new Set(nombres).size, verMasFinal }));
  await campo.fill(`${token} 05`); await p.waitForTimeout(2500);
  ok('B3-2', 'Cambiar la búsqueda reinicia la paginación', (await filas()) === 1 && (await cuenta(p, 'Ver más', { exact: true })) === 0);

  // ---------- 5. Ícono del panel ----------
  const fav = await (await fetch('http://localhost:3001/favicon.ico')).status;
  const svg = await (await fetch('http://localhost:3001/icon.svg')).status;
  ok('B5-1', 'El panel sirve favicon.ico e icon.svg (antes 404)', fav === 200 && svg === 200, `favicon ${fav} · icon.svg ${svg}`);

  fs.writeFileSync(`${out}/beta21.json`, JSON.stringify({ resultados: R, errores: [...new Set(errores)] }, null, 2));
  for (const r of R) console.log(r.resultado, r.id, r.prueba, r.resultado === 'OK' ? '' : '→ ' + r.detalle);
  console.log('errores de consola:', [...new Set(errores)]);
  await br.close();
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
