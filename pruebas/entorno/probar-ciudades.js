// Ciudades y visibilidad por municipio contra el proyecto Supabase de PRUEBAS (nunca producción).
// Siembra datos FICTICIOS (se puede repetir: no duplica) y prueba con sesiones reales:
// - Zipaquirá (25899) activa; Cajicá (25126) en preparación SOLO para estas pruebas; Bogotá, Tunja y
//   Pasto sin configurar (próximamente).
// - Un negocio publicado en Tunja y otro en Cajicá (no deben verse) y uno pendiente en Zipaquirá.
//
// Variables (no se imprimen):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   del proyecto de PRUEBAS
//   ZIPA_CLAVE_PRUEBAS                                           contraseña de las cuentas ficticias
// Uso: node pruebas/entorno/probar-ciudades.js
const crypto = require('crypto');
const path = require('path');
const { createClient } = require(path.join(__dirname, '../../node_modules/@supabase/supabase-js'));
const { PROYECTO_PRODUCCION } = require('../../packages/shared/entorno');

const URL = process.env.SUPABASE_URL || '';
const ANON = process.env.SUPABASE_ANON_KEY || '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CLAVE = process.env.ZIPA_CLAVE_PRUEBAS || '';
if (!URL || !ANON || !SERVICE || !CLAVE) throw new Error('Faltan SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY o ZIPA_CLAVE_PRUEBAS.');
if (URL.includes(PROYECTO_PRODUCCION)) throw new Error('ALTO: esta URL es de PRODUCCIÓN.');

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });
const nuevo = () => createClient(URL, ANON, { auth: { persistSession: false } });
const R = [];
const ok = (id, que, cond, det = '') => { R.push(cond); console.log(`${cond ? 'OK   ' : 'FALLA'} ${id} ${que}${cond ? '' : ' → ' + JSON.stringify(det).slice(0, 220)}`); };
const D = (p) => `${p}@pruebas.zipa.test`;

async function cuenta(alias, nombre) {
  const { data } = await svc.auth.admin.listUsers({ perPage: 1000 });
  let u = data.users.find((x) => x.email === D(alias));
  if (!u) {
    const r = await svc.auth.admin.createUser({ email: D(alias), password: CLAVE, email_confirm: true, user_metadata: { full_name: nombre } });
    if (r.error) throw r.error;
    u = r.data.user;
  }
  return u.id;
}
async function entrar(alias) {
  const c = nuevo();
  const { data, error } = await c.auth.signInWithPassword({ email: D(alias), password: CLAVE });
  if (error) throw new Error(`${alias}: ${error.message}`);
  return { c, id: data.user.id };
}
async function negocio(ownerId, nombre, municipio, status, sub) {
  const { data: ya } = await svc.from('businesses').select('id').eq('name', nombre).maybeSingle();
  if (ya) {
    await svc.from('businesses').update({ status, municipio_codigo: municipio }).eq('id', ya.id);
    return ya.id;
  }
  const { data, error } = await svc.from('businesses').insert({ owner_id: ownerId, name: nombre, type: 'emprendimiento', subcategory_id: sub, address: 'Calle de prueba 1', status, municipio_codigo: municipio }).select('id').single();
  if (error) throw error;
  return data.id;
}

(async () => {
  // --- Datos ficticios ---------------------------------------------------------------------------
  await svc.from('cobertura_municipios').upsert({ municipio_codigo: '25126', estado: 'en_preparacion' });
  const tunja = await negocio(await cuenta('duena-tunja', 'Dueña Tunja'), 'Almojábanas La Plaza (prueba)', '15001', 'publicado', 'reposteria');
  const cajica = await negocio(await cuenta('duena-cajica', 'Dueña Cajicá'), 'Quesos Cajicá (prueba)', '25126', 'publicado', 'reposteria');
  const pendiente = await negocio(await cuenta('duena-arrayan', 'Dueña Arrayán'), 'Café El Arrayán (prueba)', '25899', 'en_revision', 'reposteria');
  const { data: prods } = await svc.from('products').select('id').eq('business_id', tunja);
  if (!prods?.length) await svc.from('products').insert({ business_id: tunja, name: 'Almojábana de prueba', price_cop: 3000 });
  await cuenta('duena-pasto', 'Dueña Pasto');
  const { data: arepas } = await svc.from('businesses').select('id').eq('name', 'Arepas Mamá Inés (prueba)').single();

  // --- Estado de las ciudades ----------------------------------------------------------------------
  const anon = nuevo();
  const { data: cob } = await anon.from('cobertura_municipios').select('municipio_codigo, estado');
  const activas = (cob ?? []).filter((c) => c.estado === 'activa').map((c) => c.municipio_codigo);
  ok('CI-1', 'Zipaquirá es la única ciudad activa', activas.length === 1 && activas[0] === '25899', cob);
  ok('CI-2', 'Bogotá, Tunja y Pasto no están configuradas (próximamente)', !(cob ?? []).some((c) => ['11001', '15001', '52001'].includes(c.municipio_codigo)), cob);
  const { count: nMun } = await anon.from('municipios').select('codigo', { count: 'exact', head: true });
  ok('CI-3', 'Catálogo DANE visible: 1.122 municipios', nMun === 1122, nMun);

  // --- Lo que ve un turista sin cuenta ---------------------------------------------------------
  const lista = await anon.rpc('buscar_negocios', { p_municipio: '25899', p_limite: 50 });
  ok('CI-4', 'El listado de Zipaquirá solo trae negocios de Zipaquirá', !lista.error && lista.data.length > 0 && lista.data.every((b) => b.municipio_codigo === '25899' && b.municipio === 'Zipaquirá' && b.departamento === 'Cundinamarca'), lista.error ?? lista.data?.length);
  for (const [id, cod, que] of [['CI-5', '15001', 'Tunja (próximamente)'], ['CI-6', '25126', 'Cajicá (en preparación)'], ['CI-7', '11001', 'Bogotá']]) {
    const r = await anon.rpc('buscar_negocios', { p_municipio: cod });
    ok(id, `${que}: el listado sale vacío aunque haya negocios aprobados`, !r.error && r.data.length === 0, r.error ?? r.data);
  }
  const todos = await anon.rpc('buscar_negocios', { p_limite: 50 });
  ok('CI-8', 'Sin ciudad (APK anteriores): solo negocios de ciudades activas', !todos.error && todos.data.every((b) => b.municipio_codigo === '25899'), todos.data?.map((b) => b.municipio_codigo));
  const txt = await anon.rpc('buscar_negocios', { p_texto: 'almojabana' });
  ok('CI-9', 'Buscar «almojábana» no muestra el negocio de Tunja', !txt.error && !txt.data.some((b) => b.id === tunja), txt.data);
  const directo = await anon.from('businesses_public').select('id').in('id', [tunja, cajica, pendiente]);
  ok('CI-10', 'Enlace directo (id) a negocios de ciudades no activas o pendientes: no se ve', !directo.error && directo.data.length === 0, directo.data);
  const tabla = await anon.from('businesses').select('id').in('id', [tunja, cajica, pendiente]);
  ok('CI-11', 'Tampoco por la tabla directamente', !tabla.error && tabla.data.length === 0, tabla.data);
  const prodT = await anon.from('products').select('id').eq('business_id', tunja);
  ok('CI-12', 'Los productos del negocio de Tunja no se ven', !prodT.error && prodT.data.length === 0, prodT.data);
  const dest = await anon.rpc('negocios_destacados', { p_municipio: '15001' });
  ok('CI-13', 'Destacados de Tunja: vacío', !dest.error && dest.data.length === 0, dest.data);
  const destZ = await anon.rpc('negocios_destacados', { p_municipio: '25899' });
  ok('CI-14', 'Destacados de Zipaquirá: solo de Zipaquirá', !destZ.error && destZ.data.every((b) => b.municipio_codigo === '25899'), destZ.data);
  const cnt = await anon.from('businesses_public').select('id', { count: 'exact', head: true }).eq('municipio_codigo', '25899');
  ok('CI-15', 'El conteo por ciudad coincide con el listado', cnt.count === lista.data.length, { conteo: cnt.count, lista: lista.data.length });
  const ficha = await anon.from('businesses_public').select('id, municipio, departamento').eq('id', arepas.id).maybeSingle();
  ok('CI-16', 'La ficha de un negocio de Zipaquirá trae municipio y departamento (QR desde cualquier ciudad)', ficha.data?.municipio === 'Zipaquirá' && ficha.data?.departamento === 'Cundinamarca', ficha.data);

  // --- Interés comercial (sin cuenta) ----------------------------------------------------------
  const wa = `300${crypto.randomInt(1000000, 9999999)}`;
  const i1 = await anon.rpc('registrar_interes_comercial', { p_municipio: '11001', p_nombre_negocio: 'Empanadas Bogotanas (prueba)', p_tipo: 'restaurante', p_nombre_contacto: 'Comerciante Prueba', p_whatsapp: wa, p_acepta: true });
  ok('CI-17', 'Un comerciante de Bogotá registra su interés sin cuenta', !i1.error && i1.data?.repetido === false, i1.error);
  const i2 = await anon.rpc('registrar_interes_comercial', { p_municipio: '11001', p_nombre_negocio: 'Empanadas Bogotanas (prueba)', p_tipo: 'restaurante', p_nombre_contacto: 'Comerciante Prueba', p_whatsapp: wa, p_acepta: true });
  ok('CI-18', 'El mismo interés el mismo día no se duplica', i2.data?.repetido === true, i2);
  const i3 = await anon.rpc('registrar_interes_comercial', { p_municipio: '25899', p_nombre_negocio: 'X prueba', p_tipo: 'restaurante', p_nombre_contacto: 'Ana', p_whatsapp: wa, p_acepta: true });
  ok('CI-19', 'En Zipaquirá (activa) no se registra interés: se registra el negocio', /ya está disponible en Zipaquirá/.test(i3.error?.message ?? ''), i3.error?.message);
  const i4 = await anon.from('interes_comercial').select('id').limit(1);
  ok('CI-20', 'Nadie lee los interesados por la API (solo el equipo con admin_interesados)', !!i4.error, i4.data);
  const { count: creados } = await svc.from('businesses').select('id', { count: 'exact', head: true }).eq('name', 'Empanadas Bogotanas (prueba)');
  ok('CI-21', 'El interés no crea ni publica un negocio', creados === 0, creados);

  // --- Cliente de otra ciudad (Lucía) ----------------------------------------------------------
  const lucia = await entrar('cliente1');
  const res = await lucia.c.rpc('guardar_mi_resena', { p_business: tunja, p_stars: 5, p_text: 'Prueba', p_photo_url: null });
  ok('CI-22', 'No puede reseñar un negocio de una ciudad no activa', !!res.error, res.data);
  const vis = await lucia.c.rpc('registrar_visita', { p_business: tunja, p_token: 'x' });
  ok('CI-23', 'Un QR (token) de un negocio de Tunja no registra visita', vis.error || vis.data === false, vis);
  const resv = await lucia.c.rpc('solicitar_reserva', { p_business: tunja, p_starts_at: new Date(Date.now() + 3 * 864e5).toISOString(), p_party: 2, p_name: 'Lucía', p_whatsapp: '3001112233', p_table: null, p_notes: null, p_items: [], p_idempotency: crypto.randomUUID() });
  ok('CI-24', 'No puede pedir reserva en un negocio de una ciudad no activa', !!resv.error, resv.data);
  const adm = await lucia.c.rpc('admin_cambiar_estado_ciudad', { p_municipio: '15001', p_estado: 'activa' });
  ok('CI-25', 'Un cliente no puede activar una ciudad', /No autorizado/.test(adm.error?.message ?? ''), adm.error?.message);
  const adm2 = await lucia.c.rpc('admin_ciudades');
  ok('CI-26', 'Ni ver el panel de ciudades', /No autorizado/.test(adm2.error?.message ?? ''), adm2.error?.message);
  const cob2 = await lucia.c.from('cobertura_municipios').update({ estado: 'activa' }).eq('municipio_codigo', '15001').select();
  ok('CI-27', 'Ni cambiar la tabla de ciudades directamente', !!cob2.error || (cob2.data ?? []).length === 0, cob2.data);

  // --- Dueñas ----------------------------------------------------------------------------------
  const dt = await entrar('duena-tunja');
  const suyo = await dt.c.from('businesses').select('id, status, municipio_codigo').eq('id', tunja);
  ok('CI-28', 'La dueña de Tunja ve su negocio aunque Tunja no esté activa', suyo.data?.length === 1, suyo);
  const act = await dt.c.rpc('admin_cambiar_estado_ciudad', { p_municipio: '15001', p_estado: 'activa' });
  ok('CI-29', 'La dueña no puede abrir su ciudad', /No autorizado/.test(act.error?.message ?? ''), act.error?.message);
  const ajeno = await dt.c.from('businesses').update({ municipio_codigo: '15001' }).eq('id', arepas.id).select();
  ok('CI-30', 'La dueña de Tunja no puede mover un negocio ajeno', (ajeno.data ?? []).length === 0, ajeno.data);
  const dp = await entrar('duena-pasto');
  const ins = await dp.c.from('businesses').insert({ owner_id: dp.id, name: 'Cuyes de Pasto (prueba)', type: 'establecido', subcategory_id: 'reposteria', address: 'Calle 18', municipio_codigo: '52001' });
  ok('CI-31', 'En Pasto (próximamente) no se puede registrar un negocio', /todavía no está disponible/.test(ins.error?.message ?? ''), ins.error?.message);
  const insCaj = await dp.c.from('businesses').insert({ owner_id: dp.id, name: 'Invitada de Cajicá (prueba)', type: 'establecido', subcategory_id: 'reposteria', address: 'Calle 2', municipio_codigo: '25126', status: 'en_revision' }).select('id, status').single();
  ok('CI-32', 'En Cajicá (en preparación) la invitada sí registra su negocio, en revisión', !insCaj.error && insCaj.data.status === 'en_revision', insCaj.error?.message);
  const pub = await dp.c.from('businesses').update({ status: 'publicado' }).eq('id', insCaj.data?.id ?? '00000000-0000-0000-0000-000000000000').select();
  ok('CI-33', 'Y no puede publicarse sola', !!pub.error, pub.data);
  if (insCaj.data?.id) await svc.from('businesses').delete().eq('id', insCaj.data.id);

  console.log(`\n${R.filter(Boolean).length}/${R.length} pruebas aprobadas`);
  process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
