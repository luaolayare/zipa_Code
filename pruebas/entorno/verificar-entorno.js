// Verificación de humo del proyecto Supabase de PRUEBAS (nunca producción): RLS, autenticación y
// funciones. Requiere haber corrido sembrar-pruebas.js. No escribe datos permanentes (solo intenta
// escrituras que DEBEN ser rechazadas). Mismas variables que sembrar-pruebas.js, salvo la service_role,
// que aquí no se usa: todo se prueba como lo haría la app.
//   SUPABASE_URL, SUPABASE_ANON_KEY, ZIPA_CLAVE_PRUEBAS
// Uso: node pruebas/entorno/verificar-entorno.js
const path = require('path');
const { createClient } = require(path.join(__dirname, '../../node_modules/@supabase/supabase-js'));
const { PROYECTO_PRODUCCION } = require('../../packages/shared/entorno');

const URL = process.env.SUPABASE_URL || '';
const ANON = process.env.SUPABASE_ANON_KEY || '';
const CLAVE = process.env.ZIPA_CLAVE_PRUEBAS || '';
if (!URL || !ANON || !CLAVE) throw new Error('Faltan SUPABASE_URL, SUPABASE_ANON_KEY o ZIPA_CLAVE_PRUEBAS.');
if (URL.includes(PROYECTO_PRODUCCION)) throw new Error('ALTO: esta URL es de PRODUCCIÓN.');

const nuevo = () => createClient(URL, ANON, { auth: { persistSession: false } });
const R = [];
const ok = (id, que, cond, det = '') => { R.push(cond); console.log(`${cond ? 'OK   ' : 'FALLA'} ${id} ${que}${cond ? '' : ' → ' + JSON.stringify(det).slice(0, 200)}`); };
const entrar = async (alias) => { const c = nuevo(); const r = await c.auth.signInWithPassword({ email: `${alias}@pruebas.zipa.test`, password: CLAVE }); return { c, r }; };

(async () => {
  const anon = nuevo();
  const pub = await anon.from('businesses_public').select('id, name').ilike('name', '%(prueba)%');
  ok('E-1', 'Sin sesión se ven los negocios publicados', !pub.error && pub.data.length >= 2, pub.error || pub.data);
  const rest = pub.data?.find((b) => /Arepas/.test(b.name))?.id;

  const res = await anon.from('reservations').select('id').limit(1);
  ok('E-2', 'Sin sesión NO se leen reservas (RLS/privilegios)', !!res.error || (res.data ?? []).length === 0, res.error?.code ?? res.data);
  const ins = await anon.from('reviews').insert({ business_id: rest, user_id: '00000000-0000-0000-0000-000000000000', stars: 5 });
  ok('E-3', 'Sin sesión NO se insertan reseñas', !!ins.error, ins.error?.code);

  const mal = await nuevo().auth.signInWithPassword({ email: 'cliente1@pruebas.zipa.test', password: 'clave-incorrecta-xyz' });
  ok('E-4', 'Autenticación: clave incorrecta se rechaza', !!mal.error, mal.error?.message);
  const cli = await entrar('cliente1');
  ok('E-5', 'Autenticación: la cliente ficticia entra', !cli.r.error, cli.r.error?.message);

  const mias = await cli.c.from('reservations').select('id, customer_id');
  const uid = cli.r.data?.user?.id;
  ok('E-6', 'La cliente ve solo SUS reservas', !mias.error && mias.data.length >= 1 && mias.data.every((x) => x.customer_id === uid), mias.error || mias.data);
  const visitaFalsa = await cli.c.rpc('registrar_visita', { p_business: rest, p_token: 'token-falso' });
  ok('E-7', 'Un token de QR falso no registra visita', visitaFalsa.data === false || !!visitaFalsa.error, visitaFalsa);
  const directa = await cli.c.from('reviews').insert({ business_id: rest, user_id: uid, stars: 5, visited: true });
  ok('E-8', 'Una cuenta NO puede insertar reseñas directamente (ni marcar «con QR»)', !!directa.error, directa.error?.code);
  const esAdmin = await cli.c.rpc('is_admin');
  ok('E-9', 'Una cliente no es administradora', esAdmin.data === false || !!esAdmin.error, esAdmin);

  const duena = await entrar('duena-restaurante');
  const suyas = await duena.c.from('reservations').select('id').eq('business_id', rest);
  ok('E-10', 'La dueña ve las reservas de su negocio', !suyas.error && suyas.data.length >= 1, suyas.error || suyas.data);
  const ajeno = await duena.c.from('businesses').update({ name: 'X' }).eq('id', pub.data.find((b) => !/Arepas/.test(b.name))?.id).select('id');
  ok('E-11', 'La dueña NO puede editar un negocio ajeno', !!ajeno.error || (ajeno.data ?? []).length === 0, ajeno.error?.code ?? ajeno.data);

  const f1 = await fetch(`${URL}/functions/v1/enviar-notificaciones`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  ok('E-12', 'enviar-notificaciones rechaza llamadas sin el secreto del cron', f1.status === 401 || f1.status === 403, f1.status);
  const f2 = await fetch(`${URL}/functions/v1/revisar-negocio`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: '{}' });
  ok('E-13', 'revisar-negocio exige sesión', f2.status === 401 || f2.status === 403, f2.status);
  const f3 = await fetch(`${URL}/functions/v1/eliminar-cuenta`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: '{}' });
  ok('E-14', 'eliminar-cuenta exige sesión', f3.status === 401 || f3.status === 403, f3.status);

  console.log(`RESUMEN: ${R.filter(Boolean).length}/${R.length}`);
  process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
