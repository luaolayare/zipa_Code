// Datos FICTICIOS para el proyecto Supabase de PRUEBAS (nunca producción).
// Crea, una sola vez (idempotente por correo y nombre): 1 administrador (rol admin; el MFA se
// configura al entrar al panel), 2 dueñas de negocio (restaurante con reservas y emprendimiento),
// 3 clientes, productos, reseñas, un destacado y una solicitud de reserva pendiente.
// Todos los correos son @pruebas.zipa.test (dominio reservado, no recibe correo).
//
// Variables (se pasan al ejecutar; NO se guardan en el repositorio):
//   SUPABASE_URL                 URL del proyecto de PRUEBAS
//   SUPABASE_SERVICE_ROLE_KEY    clave service_role del proyecto de PRUEBAS (secreta)
//   SUPABASE_ANON_KEY            clave pública (anon) del proyecto de PRUEBAS
//   ZIPA_CLAVE_PRUEBAS           contraseña común de las cuentas ficticias (mín. 8)
// Uso: node pruebas/entorno/sembrar-pruebas.js
const crypto = require('crypto');
const path = require('path');
const { createClient } = require(path.join(__dirname, '../../node_modules/@supabase/supabase-js'));
const { PROYECTO_PRODUCCION } = require('../../packages/shared/entorno');

const URL = process.env.SUPABASE_URL || '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON = process.env.SUPABASE_ANON_KEY || '';
const CLAVE = process.env.ZIPA_CLAVE_PRUEBAS || '';
if (!URL || !SERVICE || !ANON || CLAVE.length < 8) throw new Error('Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY o ZIPA_CLAVE_PRUEBAS (mín. 8).');
if (URL.includes(PROYECTO_PRODUCCION)) throw new Error('ALTO: esta URL es de PRODUCCIÓN. Este script solo corre contra el proyecto de pruebas.');

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });
const correo = (n) => `${n}@pruebas.zipa.test`;

async function cuenta(nombre, alias) {
  const email = correo(alias);
  const { data, error } = await svc.auth.admin.createUser({ email, password: CLAVE, email_confirm: true, user_metadata: { full_name: nombre } });
  let id = data?.user?.id;
  if (!id) {
    if (error && !/already/i.test(error.message)) throw error;
    const { data: l } = await svc.auth.admin.listUsers({ perPage: 1000 });
    id = l.users.find((u) => u.email === email).id;
  }
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: e2 } = await c.auth.signInWithPassword({ email, password: CLAVE });
  if (e2) throw e2;
  return { id, email, c };
}
const hora = (dias, hhmm) => { const d = new Date(`${new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)}T00:00:00-05:00`); d.setUTCDate(d.getUTCDate() + dias); return `${d.toISOString().slice(0, 10)}T${hhmm}:00-05:00`; };
const ok = (r, que) => { if (r.error) throw new Error(`${que}: ${r.error.message}`); return r.data; };

async function negocio(duena, datos, productos) {
  const existe = await svc.from('businesses').select('id').eq('owner_id', duena.id).maybeSingle();
  if (existe.data) return existe.data.id;
  const b = ok(await svc.from('businesses').insert({ owner_id: duena.id, status: 'publicado', ...datos }).select('id').single(), 'negocio');
  ok(await svc.from('products').insert(productos.map(([name, price_cop, description, section], i) => ({ business_id: b.id, name, price_cop, description, section, sort_order: i, available: true }))), 'productos');
  return b.id;
}

(async () => {
  console.log(`Sembrando datos ficticios en ${URL}`);
  const admin = await cuenta('Equipo Zipa (pruebas)', 'admin');
  ok(await svc.from('admin_users').upsert({ user_id: admin.id, role: 'admin' }), 'admin');

  const ines = await cuenta('Inés Rodríguez', 'duena-restaurante');
  const marta = await cuenta('Marta Suárez', 'duena-emprendimiento');
  const clientes = [await cuenta('Lucía Gómez', 'cliente1'), await cuenta('Andrés Rojas', 'cliente2'), await cuenta('Camila Pérez', 'cliente3')];

  const rest = await negocio(ines, { name: 'Arepas Mamá Inés (prueba)', type: 'establecido', category: 'comer', subcategory_id: 'comida_tipica', address: 'Calle 5 # 3-21, centro histórico', hours: 'Todos los días, 7 a. m. a 8 p. m.', whatsapp: '3001234567', specialty: 'Arepas boyacenses' }, [
    ['Arepa boyacense con queso', 9500, 'Arepa dulce de maíz pelado, rellena de cuajada fresca.', 'Desayunos'],
    ['Changua de la casa', 14000, 'Con almojábana y pan tostado', 'Desayunos'],
    ['Desayuno santafereño', 18000, 'Tamal, chocolate y queso', 'Desayunos'],
  ]);
  const emp = await negocio(marta, { name: 'Tejidos Marta (prueba)', type: 'emprendimiento', category: 'artesanias', subcategory_id: null, address: 'Carrera 7 # 4-10', hours: 'Lunes a sábado, 9 a. m. a 6 p. m.', whatsapp: '3017654321', specialty: 'Mochilas tejidas' }, [
    ['Mochila tejida', 120000, 'Tejida a mano en lana de oveja.', 'Mochilas'],
  ]).catch(async (e) => {
    // subcategory_id puede ser obligatoria: se usa la primera de artesanías.
    if (!/subcategory/i.test(e.message)) throw e;
    const sub = ok(await svc.from('categories').select('id').eq('parent_id', 'emprendimientos').limit(1), 'subcategoría')[0]?.id;
    return negocio(marta, { name: 'Tejidos Marta (prueba)', type: 'emprendimiento', category: 'artesanias', subcategory_id: sub, address: 'Carrera 7 # 4-10', hours: 'Lunes a sábado, 9 a. m. a 6 p. m.', whatsapp: '3017654321', specialty: 'Mochilas tejidas' }, [['Mochila tejida', 120000, 'Tejida a mano en lana de oveja.', 'Mochilas']]);
  });

  const hay = await svc.from('reviews').select('id', { count: 'exact', head: true }).eq('business_id', rest);
  if (!hay.count) {
    const textos = ['Las arepas muy buenas.', 'Atención amable.', 'Buen desayuno.'];
    ok(await svc.from('reviews').insert(clientes.map((c, i) => ({ business_id: rest, user_id: c.id, stars: i === 2 ? 4 : 5, text: textos[i] }))), 'reseñas');
    ok(await svc.from('featured_placements').insert({ business_id: rest, starts_at: new Date(Date.now() - 864e5).toISOString(), ends_at: new Date(Date.now() + 90 * 864e5).toISOString(), position: 1 }), 'destacado');
    ok(await ines.c.rpc('guardar_config_reservas', { p_business: rest, p_enabled: true, p_max_party: 8, p_min_notice_minutes: 60, p_max_advance_days: 30, p_response_hours: 24, p_slot_minutes: 30, p_instructions: null, p_windows: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d, starts: '07:00', ends: '20:00' })), p_blocked: [] }), 'reservas');
    ok(await clientes[0].c.rpc('solicitar_reserva', { p_business: rest, p_starts_at: hora(3, '13:00'), p_party: 4, p_name: 'Lucía Gómez', p_whatsapp: '3009998877', p_table: 'Terraza', p_notes: 'Prueba', p_items: [], p_idempotency: crypto.randomUUID() }), 'solicitud');
  }
  console.log(JSON.stringify({ admin: admin.email, restaurante: { id: rest, duena: ines.email }, emprendimiento: { id: emp, duena: marta.email }, clientes: clientes.map((c) => c.email) }, null, 2));
  console.log('Listo. El administrador debe activar el MFA (TOTP) al entrar al panel por primera vez.');
})().catch((e) => { console.error(e.message || e); process.exit(1); });
