// Beta 2.2, Entrega B (reservas), en el navegador contra Supabase LOCAL (clientes 8083, negocios 8084).
// Uso: BETA2=<ruta del repositorio> node pruebas/auditoria/beta-2-2-entrega-b.js <capturas>
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
  fs.mkdirSync(out, { recursive: true });
  const t = Date.now();
  const sfx = t % 10000;
  const R = [];
  const ok = (id, prueba, cond, detalle = '') => R.push({ id, prueba, resultado: cond ? 'OK' : 'FALLA', detalle: String(detalle).slice(0, 300) });
  const mk = async (alias, name) => (await svc.auth.admin.createUser({ email: `${alias}${t}@local.test`, password: 'secreta123', email_confirm: true, user_metadata: { full_name: name ?? alias } })).data.user;

  // Datos: un restaurante (comida típica) con dos platos, una heladería y un restaurante sin reservas.
  const duena = await mk('resto', 'Dueña Resto');
  const cliente = await mk('turista', 'Ana Turista');
  const dh = await mk('heladeria');
  const dx = await mk('sinreservas');
  const { data: b } = await svc.from('businesses').insert({ owner_id: duena.id, name: `Fogón Reservas ${sfx}`, type: 'establecido', subcategory_id: 'comida_tipica', address: 'Calle 3', whatsapp: '3001112233', status: 'publicado' }).select('id').single();
  const { data: bh } = await svc.from('businesses').insert({ owner_id: dh.id, name: `Helados Res ${sfx}`, type: 'emprendimiento', subcategory_id: 'heladerias', address: 'Calle 4', status: 'publicado' }).select('id').single();
  const { data: bx } = await svc.from('businesses').insert({ owner_id: dx.id, name: `Parrilla Sin Reservas ${sfx}`, type: 'establecido', subcategory_id: 'parrillas', address: 'Calle 5', status: 'publicado' }).select('id').single();
  const pr = await svc.from('products').insert([{ business_id: b.id, name: `Ajiaco ${sfx}`, price_cop: 22000, available: true }, { business_id: b.id, name: `Mazamorra ${sfx}`, price_cop: 6000, available: true }]);
  if (pr.error) throw new Error(pr.error.message);

  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const errores = [];
  const nueva = async () => {
    const p = await (await br.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 })).newPage();
    p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
    p.on('console', (m) => { if (m.type() === 'error' && !/GO_BACK|Failed to load resource/.test(m.text())) errores.push(m.text().slice(0, 160)); });
    p.on('dialog', (d) => d.accept()); // confirmaciones (window.confirm en la web)
    return p;
  };
  const vis = (p, l) => l.filter({ visible: true }).first();
  const cuenta = (p, s, o) => p.getByText(s, o).filter({ visible: true }).count();
  const shot = (p, n, full = true) => p.screenshot({ path: `${out}/${n}.png`, fullPage: full });
  const entrarNegocios = async (p, email) => {
    await p.goto('http://localhost:8084/', { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(3500);
    await vis(p, p.getByText('Ya tengo cuenta')).click(); await p.waitForTimeout(800);
    await vis(p, p.getByLabel('Correo electrónico', { exact: true })).fill(email);
    await vis(p, p.getByLabel('Contraseña', { exact: true })).fill('secreta123');
    await vis(p, p.getByText('Entrar', { exact: true })).click(); await p.waitForTimeout(5000);
  };
  const reservas = () => JSON.parse(psql(`select coalesce(json_agg(r order by created_at), '[]') from reservations r where business_id = '${b.id}'`));

  // ---------- Negocios: configurar ----------
  const n = await nueva();
  await entrarNegocios(n, duena.email);
  const tarjeta = { seccion: await n.getByRole('header', { name: 'Reservas' }).count() || await cuenta(n, 'Reservas', { exact: true }), apagadas: await cuenta(n, 'Apagadas', { exact: true }) };
  await vis(n, n.getByText('Activar reservas', { exact: true })).click(); await n.waitForTimeout(3000);
  await vis(n, n.getByRole('switch', { name: 'Recibir solicitudes de reserva' })).click();
  for (const dia of ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']) {
    await vis(n, n.getByLabel(`Agregar horario el ${dia}`)).click(); await n.waitForTimeout(150);
  }
  // Primero un horario mal escrito: debe avisar y no guardar.
  const desdeLunes = vis(n, n.getByLabel('Lunes: desde'));
  const hastaLunes = vis(n, n.getByLabel('Lunes: hasta'));
  await desdeLunes.fill('15:00'); await hastaLunes.fill('12:00');
  await vis(n, n.getByText('Guardar', { exact: true })).click(); await n.waitForTimeout(1200);
  const avisoHorario = await cuenta(n, /Lunes: la hora final debe ser después/);
  const sinGuardar = psql(`select count(*) from reservation_settings where business_id = '${b.id}'`) === '0';
  ok('B-1', 'Un horario con la hora final antes de la inicial se avisa y no se guarda', avisoHorario > 0 && sinGuardar, JSON.stringify({ avisoHorario, sinGuardar }));
  for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) {
    await vis(n, n.getByLabel(`${dia}: desde`)).fill('00:00');
    await vis(n, n.getByLabel(`${dia}: hasta`)).fill('23:00');
  }
  await vis(n, n.getByRole('radio', { name: '1 hora' })).click();
  await vis(n, n.getByLabel('Instrucciones para los clientes (opcional)', { exact: true })).fill('Te escribimos por WhatsApp para confirmar.');
  await shot(n, 'b1-configuracion');
  await vis(n, n.getByText('Guardar', { exact: true })).click(); await n.waitForTimeout(3500);
  const cfg = JSON.parse(psql(`select row_to_json(s) from reservation_settings s where business_id = '${b.id}'`) || '{}');
  const ventanas = Number(psql(`select count(*) from reservation_windows where business_id = '${b.id}'`));
  const tarjetaDespues = await cuenta(n, 'Recibiendo solicitudes', { exact: true });
  ok('B-2', 'El restaurante activa las reservas: 7 horarios, 1 hora de anticipación e instrucciones; el panel muestra «Recibiendo solicitudes»',
    cfg.enabled === true && cfg.min_notice_minutes === 60 && ventanas === 7 && cfg.instructions === 'Te escribimos por WhatsApp para confirmar.' && tarjeta.apagadas > 0 && tarjetaDespues > 0, JSON.stringify({ cfg, ventanas, tarjeta, tarjetaDespues }));

  // ---------- Clientes: solicitar como invitado → iniciar sesión → formulario ----------
  const c = await nueva();
  await c.goto(`http://localhost:8083/negocio/${b.id}`, { waitUntil: 'load', timeout: 300000 }); await c.waitForTimeout(5000);
  const boton = await c.getByRole('link', { name: /^Solicitar reserva/ }).count();
  await vis(c, c.getByRole('link', { name: /^Solicitar reserva/ })).click(); await c.waitForTimeout(2500);
  const enLogin = /\/login/.test(c.url());
  await vis(c, c.getByLabel('Correo electrónico', { exact: true })).fill(cliente.email);
  await vis(c, c.getByLabel('Contraseña', { exact: true })).fill('secreta123');
  await vis(c, c.getByText('Entrar', { exact: true })).click(); await c.waitForTimeout(5000);
  const enFormulario = /\/reservar\//.test(c.url());
  ok('B-3', 'Ficha del restaurante: «Solicitar reserva»; sin sesión lleva a iniciar sesión y vuelve al formulario', boton > 0 && enLogin && enFormulario, JSON.stringify({ boton, enLogin, enFormulario, url: c.url() }));

  const form = {
    instrucciones: await cuenta(c, 'Te escribimos por WhatsApp para confirmar.', { exact: true }),
    aviso: await cuenta(c, 'Tu solicitud será enviada al restaurante. La reserva solo quedará confirmada cuando el establecimiento la acepte.', { exact: true }),
    nombre: await vis(c, c.getByLabel('Nombre de quien reserva', { exact: true })).inputValue(),
  };
  await vis(c, c.getByRole('radio', { name: 'Mañana' })).click(); await c.waitForTimeout(500);
  await vis(c, c.getByRole('radio', { name: '1:00 p. m.' })).click();
  await vis(c, c.getByLabel('Más (Personas)')).click();
  await vis(c, c.getByLabel('Tu WhatsApp', { exact: true })).fill('300 123 4567');
  await vis(c, c.getByLabel('Preferencia de mesa (opcional)', { exact: true })).fill('Terraza');
  await vis(c, c.getByLabel('Observaciones (opcional)', { exact: true })).fill('Celebramos un cumpleaños');
  await vis(c, c.getByText(/Platos que te gustaría pedir/)).click(); await c.waitForTimeout(500);
  const avisoPlatos = await cuenta(c, 'Los platos que elijas son solo una preferencia: no están pagados ni garantizados.', { exact: true });
  await vis(c, c.getByLabel(`Más (Ajiaco ${sfx})`)).click();
  await vis(c, c.getByLabel(`Más (Ajiaco ${sfx})`)).click();
  await shot(c, 'b2-formulario');
  await vis(c, c.getByText('Enviar solicitud', { exact: true })).click(); await c.waitForTimeout(4000);
  const r1 = reservas()[0] ?? {};
  const items = JSON.parse(psql(`select coalesce(json_agg(i), '[]') from reservation_items i where reservation_id = '${r1.id}'`));
  const detalle = { enviada: await cuenta(c, '¡Solicitud enviada!', { exact: true }), codigo: await cuenta(c, r1.code ?? '---', { exact: true }), pendiente: await cuenta(c, 'Pendiente', { exact: true }) };
  await shot(c, 'b3-solicitud-enviada');
  ok('B-4', 'Formulario: instrucciones, aviso de confirmación y nombre de la cuenta ya puesto', form.instrucciones && form.aviso && form.nombre === 'Ana Turista' && avisoPlatos, JSON.stringify({ form, avisoPlatos }));
  ok('B-5', 'Se crea PENDIENTE con 3 personas, WhatsApp con indicativo, mesa, observaciones y 2 ajiacos con su precio; se muestra el código',
    r1.status === 'pendiente' && r1.party_size === 3 && r1.contact_whatsapp === '573001234567' && r1.table_preference === 'Terraza' && r1.notes === 'Celebramos un cumpleaños'
    && items.length === 1 && items[0].quantity === 2 && items[0].unit_price_cop === 22000 && /^R-[A-Z2-9]{6}$/.test(r1.code) && detalle.enviada && detalle.codigo && detalle.pendiente, JSON.stringify({ r1, items, detalle }));

  // Doble toque en «Enviar» (otra hora): una sola solicitud.
  await c.goto(`http://localhost:8083/reservar/${b.id}`, { waitUntil: 'load' }); await c.waitForTimeout(4000);
  await vis(c, c.getByRole('radio', { name: 'Mañana' })).click(); await c.waitForTimeout(400);
  await vis(c, c.getByRole('radio', { name: '7:30 p. m.' })).click();
  await vis(c, c.getByLabel('Tu WhatsApp', { exact: true })).fill('+57 300 123 4567');
  const enviar = vis(c, c.getByText('Enviar solicitud', { exact: true }));
  await enviar.dblclick(); await c.waitForTimeout(4000);
  const total = reservas().length;
  await shot(c, 'b-doble-toque');
  const alerta = await c.locator('[role="alert"]').allInnerTexts().catch(() => []);
  ok('B-6', 'Doble toque en «Enviar solicitud»: se crea una sola solicitud', total === 2, `solicitudes: ${total} · ${c.url()} · ${alerta.join(' | ')}`);
  if (total !== 2) throw new Error('B-6: ' + R.at(-1).detalle);
  const [, r2] = reservas();

  // ---------- Negocios: decidir ----------
  await n.goto('http://localhost:8084/reservas', { waitUntil: 'load' }); await n.waitForTimeout(4000);
  // La pestaña muestra «Pendientes» con el 2 en burbuja; su nombre accesible es «Pendientes (2)».
  const lista = { pendientes: await n.getByRole('radio', { name: 'Pendientes (2)' }).count(), codigo1: await cuenta(n, r1.code, { exact: true }) };
  await shot(n, 'b4-solicitudes');
  await vis(n, n.getByRole('button', { name: new RegExp(`^Solicitud ${r1.code}`) })).click(); await n.waitForTimeout(3500);
  const ficha = { wa: await cuenta(n, '+573001234567', { exact: true }), mesa: await cuenta(n, 'Terraza', { exact: true }), plato: await cuenta(n, `2 × Ajiaco ${sfx}`, { exact: true }), aviso: await cuenta(n, /no están pagados ni garantizados/) };
  await shot(n, 'b5-detalle-restaurante');
  ok('B-7', 'El restaurante ve sus solicitudes pendientes y el detalle: WhatsApp, mesa, platos y el aviso de que no están pagados', lista.pendientes && lista.codigo1 && Object.values(ficha).every(Boolean), JSON.stringify({ lista, ficha }));

  await vis(n, n.getByText('No puedo confirmarla', { exact: true })).click(); await n.waitForTimeout(600);
  await vis(n, n.getByRole('radio', { name: 'Otro motivo' })).click();
  await vis(n, n.getByText('Enviar rechazo', { exact: true })).click(); await n.waitForTimeout(800);
  const pideMotivo = await cuenta(n, 'Cuéntale al cliente el motivo.', { exact: true });
  await vis(n, n.getByRole('radio', { name: 'No hay mesas disponibles' })).click();
  await vis(n, n.getByLabel('Mensaje para el cliente (opcional)', { exact: true })).fill('Ese día tenemos un evento. ¿Te sirve el domingo?');
  await vis(n, n.getByText('Enviar rechazo', { exact: true })).click(); await n.waitForTimeout(3000);
  const rr1 = reservas().find((x) => x.id === r1.id);
  ok('B-8', 'Rechazo: con «Otro motivo» exige explicación; con motivo de la lista queda RECHAZADA con motivo y nota', pideMotivo > 0 && rr1.status === 'rechazada' && rr1.reject_reason === 'sin_mesas' && rr1.reject_note === 'Ese día tenemos un evento. ¿Te sirve el domingo?' && (await cuenta(n, 'No confirmada', { exact: true })) > 0, JSON.stringify({ pideMotivo, rr1 }));

  await n.goto(`http://localhost:8084/reservas/${r2.id}`, { waitUntil: 'load' }); await n.waitForTimeout(3500);
  await vis(n, n.getByText('Confirmar reserva', { exact: true })).click(); await n.waitForTimeout(3000);
  const rr2 = reservas().find((x) => x.id === r2.id);
  ok('B-9', 'Confirmar (después de aceptar el aviso) deja la reserva CONFIRMADA y registra quién decidió', rr2.status === 'confirmada' && rr2.decided_by === duena.id && (await cuenta(n, 'Confirmada', { exact: true })) > 0, JSON.stringify({ status: rr2.status }));
  // Ya no se puede rechazar una confirmada: no aparece el botón.
  ok('B-10', 'Una reserva confirmada ya no ofrece «No puedo confirmarla» (sí «Cancelar reserva»)', (await cuenta(n, 'No puedo confirmarla', { exact: true })) === 0 && (await cuenta(n, 'Cancelar reserva', { exact: true })) > 0, '');

  // ---------- Clientes: estado, otro horario, Mis reservas y cancelar ----------
  await c.goto(`http://localhost:8083/reserva/${r1.id}`, { waitUntil: 'load' }); await c.waitForTimeout(4000);
  const rech = { noConf: await cuenta(c, 'No confirmada', { exact: true }), motivo: await cuenta(c, /Motivo: No hay mesas disponibles\. «Ese día tenemos un evento/) };
  await shot(c, 'b6-rechazada-cliente');
  await vis(c, c.getByText('Solicitar otro horario', { exact: true })).click(); await c.waitForTimeout(4000);
  const prellenado = { url: /\/reservar\/.+otra=/.test(c.url()), wa: await vis(c, c.getByLabel('Tu WhatsApp', { exact: true })).inputValue(), mesa: await vis(c, c.getByLabel('Preferencia de mesa (opcional)', { exact: true })).inputValue() };
  ok('B-11', 'El cliente ve el motivo del rechazo y «Solicitar otro horario» abre el formulario con sus datos (sin crear nada solo)', rech.noConf && rech.motivo && prellenado.url && prellenado.wa === '+573001234567' && prellenado.mesa === 'Terraza' && reservas().length === 2, JSON.stringify({ rech, prellenado }));

  await c.goto('http://localhost:8083/perfil', { waitUntil: 'load' }); await c.waitForTimeout(4500);
  const perfil = { titulo: await cuenta(c, 'Mis reservas', { exact: true }), r1: await cuenta(c, new RegExp(r1.code)), r2: await cuenta(c, new RegExp(r2.code)) };
  await shot(c, 'b7-mis-reservas');
  ok('B-12', 'Perfil → «Mis reservas» lista las dos solicitudes con su estado', perfil.titulo && perfil.r1 && perfil.r2, JSON.stringify(perfil));

  await c.goto(`http://localhost:8083/reserva/${r2.id}`, { waitUntil: 'load' }); await c.waitForTimeout(4000);
  await vis(c, c.getByText('Cancelar reserva', { exact: true })).click(); await c.waitForTimeout(3000);
  const rr2b = reservas().find((x) => x.id === r2.id);
  ok('B-13', 'El cliente cancela su reserva confirmada: CANCELADA por el cliente', rr2b.status === 'cancelada' && rr2b.cancelled_by === 'cliente' && (await cuenta(c, 'Cancelada', { exact: true })) > 0, JSON.stringify({ status: rr2b.status, por: rr2b.cancelled_by }));

  // ---------- Dónde NO aparece ----------
  await c.goto(`http://localhost:8083/negocio/${bh.id}`, { waitUntil: 'load' }); await c.waitForTimeout(4500);
  const enHeladeria = await c.getByRole('link', { name: /^Solicitar reserva/ }).count();
  await c.goto(`http://localhost:8083/negocio/${bx.id}`, { waitUntil: 'load' }); await c.waitForTimeout(4500);
  const enSinReservas = await c.getByRole('link', { name: /^Solicitar reserva/ }).count();
  await c.goto(`http://localhost:8083/reservar/${bh.id}`, { waitUntil: 'load' }); await c.waitForTimeout(4000);
  const directo = await cuenta(c, 'Este restaurante no está recibiendo solicitudes', { exact: true });
  ok('B-14', 'Ni la heladería ni un restaurante sin reservas muestran el botón; entrar directo al formulario lo explica', enHeladeria === 0 && enSinReservas === 0 && directo > 0, JSON.stringify({ enHeladeria, enSinReservas, directo }));

  // El panel de la heladería no ofrece reservas.
  const h = await nueva();
  await entrarNegocios(h, dh.email);
  ok('B-15', 'El panel de un emprendimiento no muestra la sección de reservas', (await cuenta(h, 'Activar reservas', { exact: true })) === 0 && (await cuenta(h, 'Ver solicitudes', { exact: true })) === 0, '');

  await br.close();
  for (const r of R) console.log(`${r.resultado} ${r.id} ${r.prueba}${r.resultado === 'OK' ? '' : ' → ' + r.detalle}`);
  console.log('errores de consola:', JSON.stringify(errores));
  fs.writeFileSync(`${out}/entrega-b.json`, JSON.stringify({ fecha: new Date().toISOString(), resultados: R, erroresConsola: errores }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
