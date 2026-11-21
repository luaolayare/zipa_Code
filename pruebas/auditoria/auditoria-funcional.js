// Auditoría funcional de punta a punta de Zipa lo tiene Beta 2, SOLO contra Supabase LOCAL:
// clientes (8083), negocios (8084) y panel del equipo (3001), con Edge Functions locales.
// Cada paso queda como OK, FALLA o NO_PROBADO, con su detalle. Las capturas van a <carpeta>.
// Uso: BETA2=... node auditoria-funcional.js <carpeta> <foto.png> <video.mp4>
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
function totp(secret, offset = 0) { const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset)); const h = crypto.createHmac('sha1', base32(secret)).update(ctr).digest(); const o = h[h.length - 1] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0'); }

const [OUT, FOTO, VIDEO] = process.argv.slice(2);
const R = [];
const ok = (id, area, desc, cond, detalle = '') => R.push({ id, area, prueba: desc, resultado: cond ? 'OK' : 'FALLA', detalle: String(detalle ?? '').slice(0, 240) });
const noProbado = (id, area, desc, motivo) => R.push({ id, area, prueba: desc, resultado: 'NO_PROBADO', detalle: motivo });
const errores = [];
async function paso(id, area, desc, fn) {
  try { await fn(); } catch (e) { R.push({ id, area, prueba: desc, resultado: 'FALLA', detalle: 'Error: ' + e.message.split('\n')[0].slice(0, 200) }); }
}

(async () => {
  const t = Date.now();
  const sfx = t % 10000;
  const mk = async (alias, viejo = true) => {
    const email = `${alias}${t}@local.test`;
    const { data } = await svc.auth.admin.createUser({ email, password: 'secreta123', email_confirm: true, user_metadata: { full_name: alias } });
    if (viejo) psql(`update auth.users set created_at = now() - interval '3 days' where id = '${data.user.id}'`);
    return { id: data.user.id, email };
  };
  const signed = async (u) => { const c = createClient(st.API_URL, st.ANON_KEY, { auth: { persistSession: false } }); await c.auth.signInWithPassword({ email: u.email, password: 'secreta123' }); return c; };

  // ---------- DATOS DE PRUEBA ----------
  const duenaR = await mk('rosa');
  const cR = await signed(duenaR);
  const nombreR = `Fogón de Rosa ${sfx}`;
  const { data: bR } = await svc.from('businesses').insert({ owner_id: duenaR.id, name: nombreR, type: 'establecido', subcategory_id: 'comida_tipica', address: 'Calle 2 # 3-4, Zipaquirá', whatsapp: '3001112233', status: 'publicado', specialty: 'Cocina boyacense' }).select('id').single();
  const IMG = fs.readFileSync(FOTO);
  const subir = async (bucket, path, buf, type) => { const { error } = await cR.storage.from(bucket).upload(path, buf, { contentType: type, upsert: true }); if (error) throw error; return bucket === 'videos' ? path : cR.storage.from(bucket).getPublicUrl(path).data.publicUrl; };
  const logo = await subir('negocios', `${duenaR.id}/${bR.id}/logo.png`, IMG, 'image/png');
  await cR.from('businesses').update({ logo_url: logo }).eq('id', bR.id);
  const { data: pA } = await cR.from('products').insert({ business_id: bR.id, name: `Changua especial ${sfx}`, price_cop: 12000, section: 'Sopas', description: 'Con huevo y calado' }).select('id').single();
  const fotoA = await subir('productos', `${duenaR.id}/${bR.id}/${pA.id}/foto.png`, IMG, 'image/png');
  const extra1 = await subir('productos', `${duenaR.id}/${bR.id}/${pA.id}/extra1.png`, IMG, 'image/png');
  const extra2 = await subir('productos', `${duenaR.id}/${bR.id}/${pA.id}/extra2.png`, IMG, 'image/png');
  const vid = await subir('videos', `${duenaR.id}/${bR.id}/${pA.id}/video.mp4`, fs.readFileSync(VIDEO), 'video/mp4');
  await cR.from('products').update({ photo_url: fotoA, photo_label: 'Porción individual', video_path: vid }).eq('id', pA.id);
  await cR.from('product_photos').insert([{ product_id: pA.id, url: extra1, label: 'Para compartir', position: 1 }, { product_id: pA.id, url: extra2, label: 'Con almojábana', position: 2 }]);
  psql(`update products set video_status = 'aprobado' where id = '${pA.id}'`);
  await cR.from('products').insert({ business_id: bR.id, name: `Empanadas ${sfx}`, price_cop: 6000, section: 'Entradas', available: false, photo_url: fotoA });
  const token = psql(`select token from business_qr where business_id = '${bR.id}'`);
  psql(`insert into featured_placements (business_id, starts_at, ends_at, position, note) values ('${bR.id}', now() - interval '1 hour', now() + interval '10 days', 1, 'auditoría')`);
  // 25 reseñas para la paginación (de cuentas de la semilla de carga si existe, si no se crean).
  const cuentas = psql(`select count(*) from auth.users where email like 'carga-cliente-%'`);
  if (Number(cuentas) < 25) for (let i = 0; i < 25; i++) await mk(`res${i}-`);
  psql(`insert into reviews (business_id, user_id, stars, text) select '${bR.id}', id, 4 + (row_number() over ()) % 2, 'Opinión ' || row_number() over () from auth.users where email like 'carga-cliente-%' or email like 'res%-${t}@local.test' limit 25`);
  const autorReportado = psql(`select r.user_id || '|' || p.full_name from reviews r join profiles p on p.id = r.user_id where r.business_id = '${bR.id}' order by r.created_at desc, r.id limit 1`).split('|');
  const turista = await mk('turista');
  const admin = await mk('admin');
  psql(`insert into admin_users (user_id, role) values ('${admin.id}', 'admin')`);
  const noAdmin = await mk('noadmin');

  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const nuevaPagina = async (w = 390) => {
    const ctx = await br.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    // Registra las direcciones que la app intenta abrir (WhatsApp, mapas) sin salir de la página.
    await ctx.addInitScript(() => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(String(u)); return null; }; });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
    p.on('console', (m) => { if (m.type() === 'error' && !/GO_BACK|favicon|Failed to load resource|x\.jpg/.test(m.text())) errores.push(m.text().slice(0, 160)); });
    p.on('dialog', (d) => d.accept());
    return p;
  };
  const vis = (p, l) => l.filter({ visible: true }).first();
  const texto = (p, s, o) => p.getByText(s, o).filter({ visible: true }).count();
  const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }).catch(() => {});

  // ================= CLIENTES =================
  let p = await nuevaPagina();
  await paso('C01', 'Clientes', 'Inicio: título, Destacados, Los mejor calificados y Recién llegados', async () => {
    await p.goto('http://localhost:8083/explorar', { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(6000);
    const r = { titulo: await texto(p, '¿Qué buscas hoy?'), destacados: await texto(p, 'Destacados', { exact: true }), negocio: await p.getByRole('button', { name: nombreR }).count(), mejores: await texto(p, 'Los mejor calificados'), recientes: await texto(p, 'Recién llegados') };
    await shot(p, 'c01-inicio');
    ok('C01', 'Clientes', 'Inicio: título, Destacados, Los mejor calificados y Recién llegados', r.titulo && r.destacados && r.negocio && r.mejores && r.recientes, JSON.stringify(r));
  });
  const buscar = async (q) => { await vis(p, p.getByLabel('Buscar negocio, plato o producto')).fill(q); await p.waitForTimeout(2000); };
  await paso('C02', 'Clientes', 'Búsqueda por nombre sin tildes', async () => { await buscar(`fogon de rosa ${sfx}`); ok('C02', 'Clientes', 'Búsqueda por nombre sin tildes («fogon» → «Fogón»)', await p.getByRole('button', { name: nombreR }).count() > 0); });
  await paso('C03', 'Clientes', 'Búsqueda por plato', async () => { await buscar(`changua especial ${sfx}`); ok('C03', 'Clientes', 'Búsqueda por plato o producto', await p.getByRole('button', { name: nombreR }).count() > 0); });
  await paso('C04', 'Clientes', 'Búsqueda por subcategoría', async () => { await buscar('comida tipica'); ok('C04', 'Clientes', 'Búsqueda por subcategoría («comida tipica»)', (await texto(p, /resultados? para/)) > 0 && (await p.getByText('Comida típica').count()) > 0); });
  await paso('C05', 'Clientes', 'Búsqueda sin resultados', async () => { await buscar('zzqqxxww'); ok('C05', 'Clientes', 'Búsqueda sin resultados muestra mensaje', await texto(p, 'No encontramos nada con ese nombre') > 0); await vis(p, p.getByLabel('Borrar búsqueda')).click(); });
  await paso('C06', 'Clientes', 'Categoría, filtros y «Ver más»', async () => {
    await vis(p, p.getByRole('button', { name: /^Restaurantes/ })).click(); await p.waitForTimeout(3500);
    const filas = () => p.getByRole('button').filter({ hasText: /Clásico de la zona|Emprendimiento local/ }).count();
    const antes = await filas();
    const hayMas = await texto(p, 'Ver más', { exact: true });
    if (hayMas) { await vis(p, p.getByText('Ver más', { exact: true })).click(); await p.waitForTimeout(3000); }
    const despues = await filas();
    await vis(p, p.getByRole('radio', { name: 'Comida típica', exact: true })).click(); await p.waitForTimeout(2500);
    const filtrado = await p.getByText(/lugares? en Comida típica/).count();
    await shot(p, 'c06-categoria');
    ok('C06', 'Clientes', 'Categoría Restaurantes: «Ver más» carga más y el filtro por subcategoría funciona', hayMas ? despues > antes && filtrado > 0 : filtrado > 0, `antes ${antes}, después ${despues}, verMás ${hayMas}, filtro ${filtrado}`);
  });
  await paso('C07', 'Clientes', 'Ficha del negocio', async () => {
    await p.goto(`http://localhost:8083/negocio/${bR.id}`, { waitUntil: 'load' }); await p.waitForTimeout(5000);
    const r = {
      logo: await p.locator(`img[alt="Logo de ${nombreR}"]`).count(),
      subcategoria: await p.getByText(/Comida típica · Cocina boyacense/).count(),
      secciones: await p.getByRole('heading', { name: /Sopas|Entradas/i }).count(),
      precio: await p.getByText('$12.000').count(),
      noDisponible: await texto(p, 'No disponible hoy'),
    };
    await shot(p, 'c07-ficha');
    ok('C07', 'Clientes', 'Ficha: logo, subcategoría, menú por secciones, precio y «No disponible hoy»', Object.values(r).every((v) => v > 0), JSON.stringify(r));
  });
  await paso('C08', 'Clientes', 'WhatsApp y Cómo llegar', async () => {
    await vis(p, p.getByText('WhatsApp', { exact: true })).click(); await vis(p, p.getByText('Cómo llegar', { exact: true })).click(); await p.waitForTimeout(800);
    const abiertas = await p.evaluate(() => window.__abiertas);
    const lin = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => /wa\.me|whatsapp|maps/.test(h)));
    const todas = [...abiertas, ...lin];
    ok('C08', 'Clientes', 'Botón WhatsApp abre wa.me con el número y «Cómo llegar» abre el mapa', todas.some((u) => /wa\.me\/57?3001112233|whatsapp.*3001112233/.test(u)) && todas.some((u) => /maps|geo:/.test(u)), todas.join(' | ').slice(0, 220));
  });
  await paso('C09', 'Clientes', 'Reseñas paginadas', async () => {
    const n1 = await p.getByText(/^Opinión \d+$/).count();
    await vis(p, p.getByText('Ver más reseñas')).click(); await p.waitForTimeout(3000);
    const n2 = await p.getByText(/^Opinión \d+$/).count();
    ok('C09', 'Clientes', 'Reseñas de a 20 con «Ver más reseñas»', n1 === 20 && n2 === 25, `${n1} → ${n2}`);
  });
  await paso('C10', 'Clientes', 'Producto con galería y video aprobado', async () => {
    await p.goto(`http://localhost:8083/producto/${pA.id}`, { waitUntil: 'load' }); await p.waitForTimeout(5000);
    const badge = async () => (await p.getByText(/^\d de \d$/).first().textContent().catch(() => '')) ?? '';
    const r = { inicial: await badge(), video: await p.locator('video').count() };
    const ancho = await p.evaluate(() => { const el = [...document.querySelectorAll('div')].find((d) => d.scrollWidth > d.clientWidth + 10 && getComputedStyle(d).overflowX !== 'visible'); return el ? el.clientWidth : 0; });
    await p.mouse.move(195, 250); await p.mouse.wheel(ancho, 0); await p.waitForTimeout(1500);
    r.trasDeslizar = await badge(); r.leyenda = await texto(p, 'Porción individual', { exact: true });
    await shot(p, 'c10-producto');
    ok('C10', 'Clientes', 'Producto: galería de 4 (video aprobado + 3 fotos) que se desliza con descripción', r.inicial === '1 de 4' && r.video > 0 && r.trasDeslizar === '2 de 4' && r.leyenda > 0, JSON.stringify(r));
  });
  await paso('C11', 'Clientes', 'Credenciales incorrectas', async () => {
    await p.goto('http://localhost:8083/login', { waitUntil: 'load' }); await p.waitForTimeout(3000);
    await vis(p, p.getByLabel('Correo electrónico', { exact: true })).fill(turista.email);
    await vis(p, p.getByLabel('Contraseña', { exact: true })).fill('incorrecta');
    await vis(p, p.getByText('Entrar', { exact: true })).click(); await p.waitForTimeout(2500);
    ok('C11', 'Clientes', 'Credenciales incorrectas muestran mensaje claro', await texto(p, 'El correo o la contraseña no coinciden.') > 0);
  });
  await paso('C12', 'Clientes', 'Registro de usuario', async () => {
    p = await nuevaPagina();
    await p.goto('http://localhost:8083/login', { waitUntil: 'load' }); await p.waitForTimeout(3000);
    await vis(p, p.getByText('¿No tienes cuenta? Créala')).click(); await p.waitForTimeout(800);
    await vis(p, p.getByLabel('Tu nombre', { exact: true })).fill('Nuevo Viajero');
    await vis(p, p.getByLabel('Correo electrónico', { exact: true })).fill(`nuevo${t}@local.test`);
    await vis(p, p.getByLabel('Contraseña', { exact: true })).fill('secreta123');
    await vis(p, p.getByText('Crear cuenta', { exact: true })).click(); await p.waitForTimeout(1500);
    const pide = await texto(p, /acept/i);
    await vis(p, p.locator('[aria-label^="Acepto los Términos"]')).click();
    await vis(p, p.getByText('Crear cuenta', { exact: true })).click(); await p.waitForTimeout(4000);
    const enBase = psql(`select count(*) from auth.users u join consents c on c.user_id = u.id where u.email = 'nuevo${t}@local.test'`);
    ok('C12', 'Clientes', 'Registro exige aceptar términos y crea la cuenta con su aceptación', pide > 0 && Number(enBase) > 0, `aviso consentimiento ${pide}, aceptaciones guardadas ${enBase}`);
  });
  await paso('C13', 'Clientes', 'Eliminar cuenta desde Perfil', async () => {
    await p.goto('http://localhost:8083/perfil', { waitUntil: 'load' }); await p.waitForTimeout(3500);
    await vis(p, p.getByText('Eliminar mi cuenta')).click(); await p.waitForTimeout(6000);
    const queda = psql(`select count(*) from auth.users where email = 'nuevo${t}@local.test'`);
    ok('C13', 'Clientes', 'Eliminar mi cuenta borra la cuenta (Edge Function)', queda === '0', `cuentas con ese correo: ${queda}`);
  });
  p = await nuevaPagina();
  await paso('C14', 'Clientes', 'Inicio de sesión y persistencia', async () => {
    await p.goto(`http://localhost:8083/negocio/${bR.id}?v=${token}`, { waitUntil: 'load' }); await p.waitForTimeout(4000);
    await p.goto('http://localhost:8083/login', { waitUntil: 'load' }); await p.waitForTimeout(3000);
    await vis(p, p.getByLabel('Correo electrónico', { exact: true })).fill(turista.email);
    await vis(p, p.getByLabel('Contraseña', { exact: true })).fill('secreta123');
    await vis(p, p.getByText('Entrar', { exact: true })).click(); await p.waitForTimeout(4000);
    await p.goto('http://localhost:8083/perfil', { waitUntil: 'load' }); await p.waitForTimeout(3500);
    ok('C14', 'Clientes', 'Inicia sesión y la sesión sigue tras recargar', await texto(p, turista.email) > 0);
  });
  await paso('C15', 'Clientes', 'Visita por QR, reseña con foto y edición', async () => {
    await p.goto(`http://localhost:8083/negocio/${bR.id}?v=${token}`, { waitUntil: 'load' }); await p.waitForTimeout(4500);
    const visita = await texto(p, /Abriste este negocio con su código QR/);
    await vis(p, p.getByText('Calificar', { exact: true })).click(); await p.waitForTimeout(2500);
    await vis(p, p.getByLabel('5 estrellas')).click();
    await vis(p, p.getByLabel('Cuéntanos más', { exact: true })).fill('Excelente changua');
    const [ch] = await Promise.all([p.waitForEvent('filechooser'), vis(p, p.getByText('Agregar una foto de lo que compraste')).click()]);
    await ch.setFiles(FOTO); await p.waitForTimeout(1500);
    await vis(p, p.getByText('Publicar reseña')).click(); await p.waitForTimeout(5000);
    const r1 = psql(`select stars || '|' || visited || '|' || (photo_url is not null) from reviews where business_id = '${bR.id}' and user_id = '${turista.id}'`);
    await vis(p, p.getByText('Editar mi reseña')).click(); await p.waitForTimeout(2500);
    await vis(p, p.getByLabel('4 estrellas')).click();
    await vis(p, p.getByLabel('Cuéntanos más', { exact: true })).fill('Muy buena changua');
    await vis(p, p.getByText(/Publicar reseña|Guardar/)).click(); await p.waitForTimeout(5000);
    const r2 = psql(`select count(*) || '|' || max(stars) || '|' || max(text) from reviews where business_id = '${bR.id}' and user_id = '${turista.id}'`);
    ok('C15', 'Clientes', 'QR registra la visita; reseña con foto y sello; editar no duplica', visita > 0 && r1 === '5|true|true' && r2 === '1|4|Muy buena changua', `visita ${visita} · creada ${r1} · editada ${r2}`);
  });
  await paso('C16', 'Clientes', 'Reportar reseña', async () => {
    await p.goto(`http://localhost:8083/negocio/${bR.id}`, { waitUntil: 'load' }); await p.waitForTimeout(4500);
    await vis(p, p.getByLabel(`Reportar la reseña de ${autorReportado[1]}`, { exact: true })).click(); await p.waitForTimeout(2500);
    await vis(p, p.getByText('Es publicidad o spam')).click();
    await vis(p, p.getByText('Enviar reporte')).click(); await p.waitForTimeout(3000);
    const enBase = psql(`select count(*) from reports where reporter_id = '${turista.id}' and reason = 'spam'`);
    ok('C16', 'Clientes', 'Reportar una reseña crea el reporte', await texto(p, 'Gracias por avisarnos') > 0 && enBase === '1', `reportes ${enBase}`);
  });
  await paso('C17', 'Clientes', 'Bloquear usuario', async () => {
    await p.goto(`http://localhost:8083/negocio/${bR.id}`, { waitUntil: 'load' }); await p.waitForTimeout(4500);
    const antes = await p.getByLabel(`Bloquear a ${autorReportado[1]}`, { exact: true }).count();
    await vis(p, p.getByLabel(`Bloquear a ${autorReportado[1]}`, { exact: true })).click(); await p.waitForTimeout(3500);
    const despues = await p.getByLabel(`Bloquear a ${autorReportado[1]}`, { exact: true }).count();
    ok('C17', 'Clientes', 'Bloquear oculta las reseñas de esa persona', antes > 0 && despues === 0, `${antes} → ${despues}`);
  });
  await paso('C18', 'Clientes', 'Perfil: mis reseñas, legal y Acerca de', async () => {
    await p.goto('http://localhost:8083/perfil', { waitUntil: 'load' }); await p.waitForTimeout(4000);
    const r = { misResenas: await p.getByText(nombreR).count(), scalix: await texto(p, 'SCALIX Cloud'), credito: await texto(p, /Luis Alfredo Olaya/) };
    await vis(p, p.getByText('Términos y condiciones')).click(); await p.waitForTimeout(2500);
    r.terminos = /legal\/terminos/.test(p.url()) ? 1 : 0;
    await shot(p, 'c18-terminos');
    ok('C18', 'Clientes', 'Perfil: «Mis reseñas», términos, «Acerca de» con SCALIX Cloud y Luis Alfredo Olaya', Object.values(r).every((v) => v > 0), JSON.stringify(r));
  });
  await paso('C19', 'Clientes', 'Cerrar sesión', async () => {
    await p.goto('http://localhost:8083/perfil', { waitUntil: 'load' }); await p.waitForTimeout(3500);
    await vis(p, p.getByText('Cerrar sesión', { exact: true })).click(); await p.waitForTimeout(3000);
    await p.goto('http://localhost:8083/perfil', { waitUntil: 'load' }); await p.waitForTimeout(3000);
    ok('C19', 'Clientes', 'Cerrar sesión deja el perfil como invitado', await texto(p, 'Estás como invitado') > 0);
  });

  // ================= NEGOCIOS =================
  const nueva = { email: `marta${t}@local.test`, nombre: `Tejidos Marta ${sfx}` };
  p = await nuevaPagina();
  const fill = (l, v) => vis(p, p.getByLabel(l, { exact: true })).fill(v);
  const clic = async (s, o = {}) => { await vis(p, p.getByText(s, o)).click(); await p.waitForTimeout(1000); };
  const elegir = async (s) => { const [c] = await Promise.all([p.waitForEvent('filechooser'), vis(p, p.getByText(s, { exact: true })).click()]); await c.setFiles(FOTO); await p.waitForTimeout(1500); };
  await paso('N01', 'Negocios', 'Registro en 5 pasos con categoría, etiquetas, logo, verificación, producto y video', async () => {
    await p.goto('http://localhost:8084/', { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(3500);
    await clic('Registrar mi negocio');
    await fill('Tu nombre', 'Marta Rojas'); await fill('Correo electrónico', nueva.email); await fill('Contraseña', 'secreta123');
    await vis(p, p.locator('[aria-label^="Acepto los Términos"]')).click();
    await clic('Crear cuenta y seguir'); await p.waitForTimeout(3000);
    await fill('Nombre del negocio', nueva.nombre);
    await elegir('Elegir logo');
    await vis(p, p.getByRole('radio', { name: /^Emprendimiento/ })).click(); await p.waitForTimeout(1200);
    await vis(p, p.getByRole('radio', { name: 'Artesanías', exact: true })).click();
    for (const tag of ['Regalos y detalles', 'Productos locales', 'Cafeterías']) await vis(p, p.getByRole('checkbox', { name: tag })).click();
    await fill('Dirección', 'Calle 5 # 2-30');
    // Recuperación: recargar a mitad del registro.
    await p.waitForTimeout(1200); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(4000);
    const retoma = await texto(p, 'Retomamos tu registro donde lo dejaste.');
    const nombreRetomado = await vis(p, p.getByLabel('Nombre del negocio', { exact: true })).inputValue();
    await clic('Seguir', { exact: true });
    await elegir('Elegir una foto que ya tengo');
    await fill('Cédula o NIT del responsable', '1.098.765.432');
    await p.waitForTimeout(1200);
    const cedulaEnDispositivo = await p.evaluate(() => JSON.stringify({ ...localStorage }).replace(/\D/g, '').includes('1098765432'));
    await clic('Seguir', { exact: true });
    await fill('Nombre', 'Mochila wayuu');
    await clic('Agregar producto');
    const errorPrecio = await vis(p, p.getByRole('alert')).textContent().catch(() => '');
    await fill('Precio', '180000');
    await elegir('De mis fotos');
    await elegir('Agregar otra foto');
    await vis(p, p.getByLabel('Descripción de la foto 2', { exact: true })).fill('Diseño azul');
    const [cv] = await Promise.all([p.waitForEvent('filechooser'), vis(p, p.getByText('Usar un video que ya tengo')).click()]);
    await cv.setFiles(VIDEO); await p.waitForTimeout(2500);
    await clic('Agregar producto');
    await clic('Ver cómo quedó');
    await clic('Enviar a revisión'); await p.waitForTimeout(12000);
    const db = psql(`select b.status || '|' || b.subcategory_id || '|' || (select count(*) from business_tags where business_id = b.id) || '|' || (b.logo_url is not null) || '|' || (select count(*) from business_verifications where business_id = b.id) || '|' || (select string_agg(coalesce(p.video_status,'-') || ':' || (select count(*) from product_photos f where f.product_id = p.id), ',') from products p where p.business_id = b.id) from businesses b join auth.users u on u.id = b.owner_id where u.email = '${nueva.email}'`);
    await shot(p, 'n01-panel');
    ok('N01', 'Negocios', 'Registro completo: revisión, Artesanías, 3 etiquetas, verificación y producto con video pendiente y foto adicional', /^en_revision\|artesanias\|3\|(true|false)\|1\|pendiente:1$/.test(db), db);
    ok('N05', 'Negocios', 'El panel muestra «En revisión»', await texto(p, /En revisión/) > 0);
    // El logo se eligió ANTES de recargar: en la web ese archivo temporal ya no existe al enviar.
    const avisoLogo = await texto(p, /No pudimos subir tu logo/);
    ok('N14', 'Negocios', 'Si el logo no se puede subir, el panel lo avisa (antes se perdía en silencio)', db.split('|')[3] === 'true' || avisoLogo > 0, `logo guardado ${db.split('|')[3]} · aviso ${avisoLogo}`);
    await vis(p, p.getByLabel('Agregar el logo de tu negocio')).click(); await p.waitForTimeout(3500);
    await elegir('Elegir logo'); await p.waitForTimeout(3000);
    ok('N15', 'Negocios', 'Subir el logo desde el panel («+ Logo» → «Tus datos»)', psql(`select (logo_url is not null)::text from businesses b join auth.users u on u.id = b.owner_id where u.email = '${nueva.email}'`) === 'true');
    ok('N02', 'Negocios', 'El registro se retoma tras recargar', retoma > 0 && nombreRetomado === nueva.nombre, `aviso ${retoma}, nombre «${nombreRetomado}»`);
    ok('N03', 'Negocios', 'La cédula o NIT NO queda guardada en el dispositivo', !cedulaEnDispositivo, `en almacenamiento: ${cedulaEnDispositivo}`);
    ok('N04', 'Negocios', 'Validación de precio obligatorio', /precio/i.test(errorPrecio), errorPrecio);
  });

  // Dueña del restaurante publicado (Rosa)
  p = await nuevaPagina();
  const entrarNegocios = async (email) => { await p.goto('http://localhost:8084/', { waitUntil: 'load' }); await p.waitForTimeout(3500); await clic('Ya tengo cuenta'); await fill('Correo electrónico', email); await fill('Contraseña', 'secreta123'); await clic('Entrar', { exact: true }); await p.waitForTimeout(5000); };
  await paso('N06', 'Negocios', 'Panel publicado: aviso de Destacado y QR', async () => {
    await entrarNegocios(duenaR.email);
    const r = { publicado: await texto(p, /Publicado/), destacado: await texto(p, /Tu negocio está en «Destacados»/) };
    await vis(p, p.getByLabel('Ver e imprimir tu QR')).click(); await p.waitForTimeout(3500);
    r.qr = await texto(p, 'Tu QR'); r.boton = await texto(p, 'Compartir o guardar la imagen');
    r.qrSvg = await p.locator('svg').count();
    await shot(p, 'n06-qr');
    ok('N06', 'Negocios', 'Panel: «Publicado», aviso de Destacado y pantalla del QR con botón para compartir o guardar', r.publicado && r.destacado && r.qr && r.boton && r.qrSvg, JSON.stringify(r));
    noProbado('N07', 'Negocios', 'Guardar o compartir la imagen del QR', 'Usa el menú de compartir del celular (expo-sharing); en la web no existe. Requiere Android real.');
  });
  await paso('N08', 'Negocios', 'Responder una reseña', async () => {
    await p.goto('http://localhost:8084/panel', { waitUntil: 'load' }); await p.waitForTimeout(5000);
    await vis(p, p.getByText('Responder', { exact: true })).click(); await p.waitForTimeout(800);
    await fill('Tu respuesta', '¡Gracias por visitarnos!');
    await clic('Publicar respuesta'); await p.waitForTimeout(2500);
    ok('N08', 'Negocios', 'Responder una reseña la guarda', psql(`select count(*) from reviews where business_id = '${bR.id}' and reply = '¡Gracias por visitarnos!'`) === '1');
  });
  await paso('N09', 'Negocios', 'Disponible hoy con un toque', async () => {
    await vis(p, p.getByRole('switch', { name: `Empanadas ${sfx}: disponible hoy` })).click(); await p.waitForTimeout(2500);
    ok('N09', 'Negocios', '«Disponible hoy» se cambia con un toque desde el panel', psql(`select available from products where name = 'Empanadas ${sfx}'`) === 't');
  });
  await paso('N10', 'Negocios', 'Crear, editar y borrar un plato', async () => {
    await p.goto('http://localhost:8084/producto/nuevo', { waitUntil: 'load' }); await p.waitForTimeout(3500);
    await fill('Nombre', `Ajiaco ${sfx}`); await fill('Precio', '28000');
    await vis(p, p.getByRole('radio', { name: 'Platos fuertes', exact: true })).click();
    await elegir('De mis fotos');
    await clic('Agregar plato'); await p.waitForTimeout(5000);
    const creado = psql(`select section || '|' || price_cop from products where name = 'Ajiaco ${sfx}'`);
    const idP = psql(`select id from products where name = 'Ajiaco ${sfx}'`);
    await p.goto(`http://localhost:8084/producto/${idP}`, { waitUntil: 'load' }); await p.waitForTimeout(3500);
    await fill('Precio', '30000');
    await clic('Guardar cambios'); await p.waitForTimeout(4000);
    const editado = psql(`select price_cop from products where id = '${idP}'`);
    const archivos = psql(`select count(*) from storage.objects where bucket_id = 'productos' and name like '%/${idP}/%'`);
    await p.goto(`http://localhost:8084/producto/${idP}`, { waitUntil: 'load' }); await p.waitForTimeout(3500);
    await clic('Borrar plato'); await p.waitForTimeout(4000);
    const borrado = psql(`select count(*) from products where id = '${idP}'`) + '|' + psql(`select count(*) from storage.objects where bucket_id = 'productos' and name like '%/${idP}/%'`);
    ok('N10', 'Negocios', 'Plato: crear (sección y precio), editar precio y borrar (con su foto)', creado === 'Platos fuertes|28000' && editado === '30000' && archivos === '1' && borrado === '0|0', `creado ${creado} · editado ${editado} · archivos ${archivos} · tras borrar ${borrado}`);
  });
  await paso('N11', 'Negocios', 'Editar datos del negocio', async () => {
    await p.goto('http://localhost:8084/negocio/editar', { waitUntil: 'load' }); await p.waitForTimeout(4000);
    await fill('Horario', 'Todos los días, 7 a. m. a 4 p. m.');
    await clic('Guardar cambios'); await p.waitForTimeout(3000);
    ok('N11', 'Negocios', 'Editar el horario lo guarda sin despublicar', psql(`select hours || '|' || status from businesses where id = '${bR.id}'`) === 'Todos los días, 7 a. m. a 4 p. m.|publicado');
  });
  await paso('N12', 'Negocios', 'Los cambios se ven en clientes', async () => {
    const c = await nuevaPagina();
    await c.goto(`http://localhost:8083/negocio/${bR.id}`, { waitUntil: 'load' }); await c.waitForTimeout(5000);
    ok('N12', 'Negocios', 'Clientes ve la respuesta del negocio y el plato ya disponible', (await c.getByText('¡Gracias por visitarnos!').count()) > 0 && (await c.getByText(`Empanadas ${sfx}`).count()) > 0, '');
  });
  noProbado('N13', 'Negocios', 'Cámara del celular (tomar foto y grabar video sin sonido)', 'Requiere Android real; en la web se probó solo «elegir de la galería» y «usar un video que ya tengo».');

  // ================= PANEL DEL EQUIPO =================
  p = await nuevaPagina(1280);
  await paso('A01', 'Panel', 'Sin sesión redirige a entrar', async () => {
    await p.goto('http://localhost:3001/negocios', { waitUntil: 'networkidle', timeout: 300000 });
    ok('A01', 'Panel', 'Sin sesión, /negocios redirige a /entrar', /\/entrar/.test(p.url()), p.url());
  });
  await paso('A02', 'Panel', 'Cuenta sin rol no entra', async () => {
    await p.fill('#email', noAdmin.email); await p.fill('#password', 'secreta123'); await p.click('button:has-text("Entrar")'); await p.waitForTimeout(5000);
    let url = p.url();
    if (/verificar/.test(url)) {
      const sec = (await p.textContent('[data-testid="totp-secret"]')).trim();
      await p.fill('#code', totp(sec)); await p.click('button:has-text("Verificar")'); await p.waitForTimeout(5000); url = p.url();
    }
    ok('A02', 'Panel', 'Una cuenta que no es del equipo termina en /sin-acceso', /sin-acceso/.test(url), url);
    await p.context().clearCookies();
  });
  await paso('A03', 'Panel', 'MFA obligatorio', async () => {
    await p.goto('http://localhost:3001/entrar', { waitUntil: 'networkidle' });
    await p.fill('#email', admin.email); await p.fill('#password', 'secreta123'); await p.click('button:has-text("Entrar")');
    await p.waitForURL('**/verificar', { timeout: 60000 }); await p.waitForTimeout(2500);
    const resp = await p.request.get('http://localhost:3001/negocios', { maxRedirects: 0 });
    const direct = `${resp.status()} → ${resp.headers()['location'] ?? ''}`;
    const sec = (await p.textContent('[data-testid="totp-secret"]')).trim();
    await p.fill('#code', '000000'); await p.click('button:has-text("Verificar")'); await p.waitForTimeout(2500);
    const rechazo = /verificar/.test(p.url());
    await p.fill('#code', totp(sec)); await p.click('button:has-text("Verificar")');
    await p.waitForURL('http://localhost:3001/', { timeout: 60000 }); await p.waitForTimeout(2000);
    ok('A03', 'Panel', 'Admin sin segundo factor no entra; código incorrecto rechazado; correcto entra', /verificar/.test(direct) && rechazo, `sin MFA → ${direct}`);
  });
  await paso('A04', 'Panel', 'Revisar y aprobar negocio con sus videos', async () => {
    await p.goto('http://localhost:3001/negocios', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    await p.click(`text=${nueva.nombre}`); await p.waitForTimeout(3000);
    const docs = { foto: await p.locator('img[alt^="Foto del local de"]').count(), cedula: await p.getByText('1098765432').count(), video: await p.locator('video').count(), fotosExtra: await p.locator('img[alt="Diseño azul"]').count() };
    await shot(p, 'a04-ficha');
    await p.click('button:has-text("Aprobar y publicar")'); await p.waitForTimeout(6000);
    const db = psql(`select b.status || '|' || (select string_agg(video_status, ',') from products where business_id = b.id) || '|' || (select (photo_deleted_at is not null)::text from business_verifications where business_id = b.id) from businesses b where b.name = '${nueva.nombre}'`);
    ok('A04', 'Panel', 'Ficha muestra foto del local, cédula/NIT, video y fotos; aprobar publica y aprueba el video; se borra la foto del local', docs.foto && docs.cedula && docs.video && docs.fotosExtra && db === 'publicado|aprobado|true', `${JSON.stringify(docs)} · ${db}`);
  });
  await paso('A05', 'Panel', 'Rechazar con motivo', async () => {
    const otra = await mk('otra');
    const { data: bx } = await svc.from('businesses').insert({ owner_id: otra.id, name: `Rechazable ${sfx}`, type: 'emprendimiento', subcategory_id: 'artesanias', address: 'Calle 9', status: 'en_revision' }).select('id').single();
    await p.goto(`http://localhost:3001/negocios/${bx.id}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    await p.click('button.danger:has-text("No aprobar")'); await p.fill('#nota', 'corto'); await p.click('button.danger:has-text("No aprobar")'); await p.waitForTimeout(2000);
    const sigue = psql(`select status from businesses where id = '${bx.id}'`);
    await p.fill('#nota', 'La foto no muestra el local. Envía una foto de la fachada.'); await p.click('button.danger:has-text("No aprobar")'); await p.waitForTimeout(5000);
    const db = psql(`select status || '|' || coalesce(review_note, '') from businesses where id = '${bx.id}'`);
    ok('A05', 'Panel', 'Rechazar exige motivo (mín. 10 caracteres) y lo guarda para el negocio', sigue === 'en_revision' && db.startsWith('rechazado|La foto no muestra'), `con motivo corto: ${sigue} · final: ${db}`);
  });
  await paso('A06', 'Panel', 'Moderación de videos', async () => {
    const { data: pv } = await cR.from('products').insert({ business_id: bR.id, name: `Con video ${sfx}`, price_cop: 5000, video_path: vid }).select('id').single();
    await p.goto('http://localhost:3001/videos', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    const tarjeta = p.locator('article, .card', { hasText: `Con video ${sfx}` }).first();
    await tarjeta.locator('button:has-text("Aprobar video")').click(); await p.waitForTimeout(3000);
    ok('A06', 'Panel', 'Aprobar un video pendiente desde Videos', psql(`select video_status from products where id = '${pv.id}'`) === 'aprobado');
  });
  await paso('A07', 'Panel', 'Moderación de reseñas en espera', async () => {
    const autor = await mk('rafaga');
    psql(`insert into reviews (business_id, user_id, stars, text, status) values ('${bR.id}', '${autor.id}', 1, 'Ráfaga ${sfx}', 'en_espera')`);
    await p.goto('http://localhost:3001/resenas', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    await p.locator('article', { hasText: `Ráfaga ${sfx}` }).locator('button:has-text("No publicar")').click(); await p.waitForTimeout(3000);
    ok('A07', 'Panel', 'Reseña en espera: «No publicar» la rechaza', psql(`select status from reviews where text = 'Ráfaga ${sfx}'`) === 'rechazada');
  });
  await paso('A08', 'Panel', 'Gestión de reportes', async () => {
    await p.goto('http://localhost:3001/reportes', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    // Hay reportes de ejecuciones anteriores: se descartan todos y se comprueba el de esta.
    for (let i = 0; i < 10 && (await p.locator('button:has-text("Descartar reporte")').count()) > 0; i++) {
      await p.locator('button:has-text("Descartar reporte")').first().click(); await p.waitForTimeout(2500);
    }
    ok('A08', 'Panel', 'Descartar el reporte hecho desde clientes', psql(`select status from reports where reporter_id = '${turista.id}'`) === 'descartado');
  });
  await paso('A09', 'Panel', 'Destacados', async () => {
    await p.goto('http://localhost:3001/destacados', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    await p.selectOption('select', { label: nueva.nombre });
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    await p.fill('input[type=date] >> nth=0', hoy); await p.fill('input[type=date] >> nth=1', hoy);
    await p.click('button:has-text("Destacar")'); await p.waitForTimeout(3000);
    const creado = psql(`select count(*) from featured_placements f join businesses b on b.id = f.business_id where b.name = '${nueva.nombre}' and now() between starts_at and ends_at`);
    await p.locator('tr', { hasText: nueva.nombre }).locator('button:has-text("Quitar")').click(); await p.waitForTimeout(3000);
    const vigente = psql(`select count(*) from featured_placements f join businesses b on b.id = f.business_id where b.name = '${nueva.nombre}' and now() between starts_at and ends_at`);
    ok('A09', 'Panel', 'Destacar un negocio y quitarlo', creado === '1' && vigente === '0', `creado ${creado} · vigente tras quitar ${vigente}`);
  });
  await paso('A10', 'Panel', 'Categorías', async () => {
    await p.goto('http://localhost:3001/categorias', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    const sec = p.locator('section', { hasText: 'Emprendimientos' });
    await sec.getByLabel('Nueva subcategoría').fill(`Velas ${sfx}`); await sec.getByRole('button', { name: 'Crear' }).click(); await p.waitForTimeout(3000);
    const id = psql(`select id from categories where name = 'Velas ${sfx}'`);
    await p.locator('tr', { hasText: id }).getByRole('button', { name: 'Borrar' }).click(); await p.waitForTimeout(3000);
    ok('A10', 'Panel', 'Crear y borrar una subcategoría sin uso', !!id && psql(`select count(*) from categories where id = '${id}'`) === '0', id);
  });
  await paso('A11', 'Panel', 'Bitácora', async () => {
    await p.goto('http://localhost:3001/bitacora', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    const filas = await p.locator('tbody tr').count();
    const enBase = psql(`select count(*) from admin_actions where admin_id = '${admin.id}'`);
    ok('A11', 'Panel', 'La bitácora muestra las acciones del equipo', filas > 0 && Number(enBase) >= 6, `filas ${filas} · acciones de esta admin ${enBase}`);
  });
  await paso('A12', 'Panel', 'Analítica con datos reales', async () => {
    await p.goto('http://localhost:3001/analitica', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    const val = async (label) => (await p.locator('.card', { hasText: label }).locator('.stat-number').first().textContent()).replace(/\D/g, '');
    const ui = { hoy: await val('Activos hoy (DAU)'), whatsapp: await val('Clics en WhatsApp'), mapas: await val('Clics en «Cómo llegar»'), busquedas: await val('Búsquedas') };
    const db = {
      hoy: psql(`select count(distinct device_id) from analytics_events where created_at >= date_trunc('day', now() at time zone 'America/Bogota') at time zone 'America/Bogota'`),
      whatsapp: psql(`select count(*) from analytics_events where name = 'whatsapp_click' and created_at > now() - interval '30 days'`),
      mapas: psql(`select count(*) from analytics_events where name = 'maps_click' and created_at > now() - interval '30 days'`),
      busquedas: psql(`select count(*) from analytics_events where name = 'search' and created_at > now() - interval '30 days'`),
    };
    const registrados = psql('select count(*) from auth.users');
    const texto = await p.locator('body').textContent();
    ok('A12', 'Panel', 'Analítica coincide con la base y separa cuentas registradas de dispositivos activos', JSON.stringify(ui) === JSON.stringify(db) && Number(ui.whatsapp) > 0 && texto.includes(`Cuentas registradas: ${Number(registrados).toLocaleString('es-CO')}`), `panel ${JSON.stringify(ui)} · base ${JSON.stringify(db)} · registradas ${registrados}`);
  });
  await paso('A13', 'Panel', 'Sistema', async () => {
    await p.goto('http://localhost:3001/sistema', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
    const r = { funciona: await p.getByText('Funciona', { exact: true }).count(), problemas: await p.getByText('Con problemas', { exact: true }).count(), noConfigurado: await p.getByText('No configurado', { exact: true }).count(), sinDatos: await p.getByText('Sin datos', { exact: true }).count(), ms: await p.getByText(/^\d+ ms$/).count() };
    ok('A13', 'Panel', 'Sistema: 4 servicios medidos con latencia; lo no medido dice «No configurado»/«Sin datos»', r.funciona === 4 && r.problemas === 0 && r.ms === 4 && r.noConfigurado === 1 && r.sinDatos === 1, JSON.stringify(r));
  });
  await paso('A14', 'Panel', 'Sin secretos en el navegador', async () => {
    const scripts = await p.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean));
    let encontrados = [];
    for (const src of scripts) {
      const js = await (await fetch(src)).text();
      for (const m of js.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g) ?? []) {
        const rol = JSON.parse(Buffer.from(m.split('.')[1], 'base64url').toString()).role;
        if (rol !== 'anon') encontrados.push(rol);
      }
      if (/sb_secret_[A-Za-z0-9]{10,}/.test(js)) encontrados.push('clave secreta sb_secret en ' + src.split('/').pop());
    }
    ok('A14', 'Panel', 'El código que recibe el navegador no contiene claves privilegiadas (solo la pública «anon»)', encontrados.length === 0, `${scripts.length} archivos JS revisados · ${encontrados.join(', ') || 'ninguna'}`);
  });

  fs.writeFileSync(`${OUT}/funcional.json`, JSON.stringify({ resultados: R, erroresConsola: [...new Set(errores)] }, null, 2));
  const c = (x) => R.filter((r) => r.resultado === x).length;
  console.log(`${R.length} pruebas · ${c('OK')} OK · ${c('FALLA')} FALLA · ${c('NO_PROBADO')} NO_PROBADO`);
  for (const r of R.filter((x) => x.resultado === 'FALLA')) console.log('FALLA', r.id, r.prueba, '→', r.detalle);
  console.log('errores de consola:', [...new Set(errores)].length);
  await br.close();
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
