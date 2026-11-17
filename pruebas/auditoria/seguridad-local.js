// Auditoría de seguridad contra las APIs REALES de Supabase LOCAL (PostgREST, Storage y Edge Functions),
// con sesiones de usuarios distintos. Cada prueba intenta algo que NO debe poder hacer (o que sí debe).
// Uso: BETA2=... node seguridad-local.js <salida.json>
const { execSync } = require('child_process');
const fs = require('fs');
const W = process.env.BETA2;
const { createClient } = require(W + '/node_modules/@supabase/supabase-js');
const st = JSON.parse(execSync('npx supabase status -o json', { cwd: W }).toString());
if (!/127\.0\.0\.1|localhost/.test(st.API_URL)) throw new Error('Solo contra Supabase local');
const URL = st.API_URL, ANON = st.ANON_KEY;
const svc = createClient(URL, st.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const psql = (sql) => execSync('docker exec -i supabase_db_zipa-lo-tiene psql -U postgres -tA', { input: sql }).toString().trim();
const IMG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

const resultados = [];
const prueba = (id, descripcion, ok, detalle = '') => { resultados.push({ id, descripcion, resultado: ok ? 'OK' : 'FALLA', detalle: String(detalle).slice(0, 200) }); };
const anon = () => createClient(URL, ANON, { auth: { persistSession: false } });

(async () => {
  const t = Date.now();
  const usuario = async (alias, viejo = true) => {
    const email = `${alias}${t}@local.test`;
    const { data } = await svc.auth.admin.createUser({ email, password: 'secreta123', email_confirm: true, user_metadata: { full_name: alias } });
    if (viejo) psql(`update auth.users set created_at = now() - interval '3 days' where id = '${data.user.id}'`);
    const c = anon();
    await c.auth.signInWithPassword({ email, password: 'secreta123' });
    const token = (await c.auth.getSession()).data.session.access_token;
    return { id: data.user.id, c, token, email };
  };
  const A = await usuario('duenaA');
  const B = await usuario('duenoB');
  const T = await usuario('turista');
  const adm = await usuario('adminsinmfa');
  psql(`insert into public.admin_users (user_id, role) values ('${adm.id}', 'admin')`);

  // Negocio A en revisión con foto de verificación y producto con video pendiente (subidos por A).
  const { data: bA } = await A.c.from('businesses').insert({ owner_id: A.id, name: 'Negocio A', type: 'emprendimiento', subcategory_id: 'artesanias', address: 'Calle A', status: 'en_revision' }).select('id').single();
  const verifPath = `${A.id}/${bA.id}/local.png`;
  await A.c.storage.from('verificaciones').upload(verifPath, IMG, { contentType: 'image/png' });
  await A.c.from('business_verifications').insert({ business_id: bA.id, photo_path: verifPath, id_number: '1234567890' });
  const videoPath = `${A.id}/${bA.id}/p1/video.mp4`;
  const up = await A.c.storage.from('videos').upload(videoPath, Buffer.from('video falso'), { contentType: 'video/mp4' });
  prueba('S0', 'La dueña sube su propia foto de verificación y su video', !up.error, up.error?.message);
  // Negocio B publicado (lo publica el equipo; aquí con service role).
  const { data: bB } = await svc.from('businesses').insert({ owner_id: B.id, name: 'Negocio B', type: 'emprendimiento', subcategory_id: 'artesanias', address: 'Calle B', status: 'publicado' }).select('id').single();

  // --- Documentos privados -------------------------------------------------------------------------
  let r = await anon().from('business_verifications').select('*');
  prueba('S1', 'Visitante sin sesión NO lee cédulas/NIT', !!r.error || r.data.length === 0, r.error?.message ?? `${r.data?.length} filas`);
  r = await B.c.from('business_verifications').select('*').eq('business_id', bA.id);
  prueba('S2', 'Otra dueña NO lee la verificación ajena', !r.error && r.data.length === 0, r.error?.message ?? `${r.data.length} filas`);
  r = await B.c.storage.from('verificaciones').download(verifPath);
  prueba('S3', 'Otra dueña NO descarga la foto de verificación ajena', !!r.error, r.error ? 'rechazado' : 'DESCARGÓ');
  r = await B.c.storage.from('verificaciones').createSignedUrl(verifPath, 60);
  prueba('S4', 'Otra dueña NO obtiene enlace firmado de la foto ajena', !!r.error, r.error ? 'rechazado' : 'OBTUVO ENLACE');
  r = await anon().storage.from('videos').download(videoPath);
  prueba('S5', 'Visitante NO ve un video pendiente de aprobación', !!r.error, r.error ? 'rechazado' : 'DESCARGÓ');
  r = await T.c.storage.from('videos').createSignedUrl(videoPath, 60);
  prueba('S6', 'Turista con sesión NO obtiene enlace de un video pendiente', !!r.error, r.error ? 'rechazado' : 'OBTUVO ENLACE');

  // --- Archivos en carpetas ajenas ---------------------------------------------------------------------
  for (const [i, bucket] of [['S7', 'productos'], ['S8', 'negocios'], ['S9', 'resenas'], ['S10', 'verificaciones']]) {
    const u = await B.c.storage.from(bucket).upload(`${A.id}/intruso-${t}.png`, IMG, { contentType: 'image/png' });
    prueba(i, `Otra dueña NO sube archivos a la carpeta ajena en «${bucket}»`, !!u.error, u.error ? 'rechazado' : 'SUBIÓ');
  }

  // --- Negocios ------------------------------------------------------------------------------------------
  r = await B.c.from('businesses').update({ name: 'Hackeado' }).eq('id', bA.id).select('id');
  prueba('S11', 'Otra dueña NO edita un negocio ajeno', !r.error && r.data.length === 0, r.error?.message ?? `${r.data.length} filas`);
  r = await A.c.from('businesses').update({ status: 'publicado' }).eq('id', bA.id).select('id');
  prueba('S12', 'La dueña NO se publica a sí misma', !!r.error, r.error?.message ?? 'SE PUBLICÓ');
  r = await A.c.from('businesses').update({ logo_url: 'https://sitio-externo.com/logo.png' }).eq('id', bA.id).select('id');
  prueba('S13', 'La dueña NO pone como logo una imagen de otro sitio', !!r.error, r.error?.message ?? 'ACEPTÓ');

  // --- Calificaciones --------------------------------------------------------------------------------------
  r = await T.c.from('reviews').insert({ business_id: bB.id, user_id: T.id, stars: 5, text: 'directo' });
  prueba('S14', 'Turista NO inserta reseñas saltándose las reglas', !!r.error, r.error?.message ?? 'INSERTÓ');
  r = await T.c.rpc('guardar_mi_resena', { p_business: bB.id, p_stars: 4, p_text: 'Bonito lugar' });
  prueba('S15', 'Turista SÍ califica con la función de reseñas', !r.error && r.data === 'publicada', r.error?.message ?? r.data);
  await T.c.rpc('guardar_mi_resena', { p_business: bB.id, p_stars: 5, p_text: 'Cambié de opinión' });
  const n = psql(`select count(*) || '|' || max(stars) from reviews where business_id = '${bB.id}' and user_id = '${T.id}'`);
  prueba('S16', 'Una sola reseña por persona y negocio (calificar de nuevo la edita)', n === '1|5', n);
  r = await T.c.from('reviews').update({ stars: 1 }).eq('business_id', bB.id).select('id');
  prueba('S17', 'Turista NO cambia estrellas directamente (sin las reglas)', !!r.error, r.error?.message ?? 'CAMBIÓ');
  r = await B.c.rpc('guardar_mi_resena', { p_business: bB.id, p_stars: 5, p_text: 'Soy el mejor' });
  prueba('S18', 'La dueña NO califica su propio negocio', !!r.error, r.error?.message ?? 'CALIFICÓ');
  r = await B.c.from('reviews').update({ text: 'editado por la dueña' }).eq('business_id', bB.id).select('id');
  prueba('S19', 'La dueña NO edita el texto de reseñas de clientes', !!r.error, r.error?.message ?? 'EDITÓ');
  const nueva = await usuario('cuentanueva', false);
  r = await nueva.c.rpc('guardar_mi_resena', { p_business: bB.id, p_stars: 1, p_text: 'Malo' });
  prueba('S20', 'Cuenta creada hace menos de 24 h NO califica', !!r.error, r.error?.message ?? 'CALIFICÓ');

  // --- Videos y funciones del equipo ---------------------------------------------------------------------
  const { data: prod } = await A.c.from('products').insert({ business_id: bA.id, name: 'P1', price_cop: 1000, video_path: videoPath }).select('id').single();
  r = await A.c.from('products').update({ video_status: 'aprobado' }).eq('id', prod.id).select('id');
  prueba('S21', 'La dueña NO aprueba su propio video', !!r.error, r.error?.message ?? 'APROBÓ');
  for (const [i, fn, args] of [
    ['S22', 'admin_destacar', { p_business: bB.id, p_desde: '2026-11-01', p_hasta: '2026-12-01' }],
    ['S23', 'admin_revisar_video', { p_product: prod.id, p_decision: 'aprobado' }],
    ['S24', 'admin_analitica', {}],
    ['S25', 'admin_guardar_categoria', { p_id: null, p_parent: 'restaurantes', p_nombre: 'Hackeo' }],
  ]) {
    r = await T.c.rpc(fn, args);
    prueba(i, `Turista NO usa ${fn}`, !!r.error, r.error?.message ?? 'FUNCIONÓ');
  }
  r = await adm.c.rpc('admin_analitica', {});
  prueba('S26', 'Administradora SIN verificación en dos pasos NO usa funciones del equipo', !!r.error, r.error?.message ?? 'FUNCIONÓ');

  const llamar = async (fn, token, body) => {
    const res = await fetch(`${URL}/functions/v1/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return res.status;
  };
  let s = await llamar('revisar-negocio', null, { businessId: bA.id, decision: 'publicado' });
  prueba('S27', 'revisar-negocio SIN sesión: rechazado', s === 401, `HTTP ${s}`);
  s = await llamar('revisar-negocio', T.token, { businessId: bA.id, decision: 'publicado' });
  prueba('S28', 'revisar-negocio con turista: rechazado', s === 403 || s === 401, `HTTP ${s}`);
  s = await llamar('revisar-negocio', adm.token, { businessId: bA.id, decision: 'publicado' });
  prueba('S29', 'revisar-negocio con admin SIN MFA: rechazado', s === 403 || s === 401, `HTTP ${s}`);
  prueba('S30', 'El negocio sigue en revisión tras los intentos', psql(`select status from businesses where id = '${bA.id}'`) === 'en_revision');
  s = await llamar('eliminar-cuenta', null, {});
  prueba('S31', 'eliminar-cuenta SIN sesión: rechazado', s === 401, `HTTP ${s}`);

  // --- Eliminación de cuenta completa --------------------------------------------------------------------
  const U = await usuario('borrame');
  const { data: bU } = await U.c.from('businesses').insert({ owner_id: U.id, name: 'Negocio a borrar', type: 'emprendimiento', subcategory_id: 'pizzerias', address: 'Calle U', status: 'borrador' }).select('id').single();
  await U.c.storage.from('productos').upload(`${U.id}/${bU.id}/foto.png`, IMG, { contentType: 'image/png' });
  await U.c.storage.from('negocios').upload(`${U.id}/${bU.id}/logo.png`, IMG, { contentType: 'image/png' });
  await U.c.storage.from('resenas').upload(`${U.id}/x/r.png`, IMG, { contentType: 'image/png' });
  await U.c.rpc('guardar_mi_resena', { p_business: bB.id, p_stars: 5, p_text: 'Me voy' });
  const antes = psql(`select (select count(*) from storage.objects where name like '${U.id}/%') || '|' || (select count(*) from reviews where user_id = '${U.id}')`);
  s = await llamar('eliminar-cuenta', U.token, {});
  const despues = psql(`select (select count(*) from auth.users where id = '${U.id}') || '|' || (select count(*) from businesses where owner_id = '${U.id}') || '|' || (select count(*) from reviews where user_id = '${U.id}') || '|' || (select count(*) from storage.objects where name like '${U.id}/%')`);
  prueba('S32', 'eliminar-cuenta borra usuario, negocio, reseñas y archivos', s === 200 && despues === '0|0|0|0', `HTTP ${s} · antes archivos|reseñas=${antes} · después usuario|negocios|reseñas|archivos=${despues}`);

  // --- Analítica privada -------------------------------------------------------------------------------------
  r = await T.c.from('analytics_events').select('*').limit(1);
  prueba('S33', 'Nadie lee los eventos de analítica por la API', !!r.error, r.error?.message ?? 'LEYÓ');

  fs.writeFileSync(process.argv[2], JSON.stringify(resultados, null, 2));
  const fallas = resultados.filter((x) => x.resultado !== 'OK');
  console.log(`${resultados.length} pruebas · ${resultados.length - fallas.length} OK · ${fallas.length} FALLA`);
  for (const f of fallas) console.log('FALLA', f.id, f.descripcion, '→', f.detalle);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
