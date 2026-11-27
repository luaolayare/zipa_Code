// Contenido de cada página. Solo describe lo que las apps hacen hoy; los datos que faltan van con dato().
import { SITIO } from '../sitio.config.mjs';
import { botonPlay, correoEnlace, dato, esc } from './plantilla.mjs';

const R = SITIO.responsable;
const ETIQUETA_NOMBRE = 'nombre completo del responsable (o razón social y NIT de SCALIX Cloud, si la empresa es la responsable)';
// Nombre y domicilio; la dirección solo en la política de privacidad (Decreto 1377 de 2013, art. 13).
const responsableTexto = (ruta, conDireccion = false) =>
  `${dato(R.nombre, ETIQUETA_NOMBRE, ruta)}, con domicilio en ${esc(R.domicilio)}${conDireccion ? `, en la ${esc(R.direccion)}` : ''}`;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = (iso) => { const [a, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${a}`; };
const seccion = (titulo, ...parrafos) => `<section class="legal-seccion"><h2>${titulo}</h2>${parrafos.map((p) => (p.startsWith('<') ? p : `<p>${p}</p>`)).join('')}</section>`;
const lista = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const encabezadoLegal = (titulo, resumen, ruta) => `
<section class="legal-cabecera">
  <div class="contenedor angosto">
    <p class="etiqueta">Información legal</p>
    <h1>${titulo}</h1>
    <p class="entrada">${resumen}</p>
    <p class="vigencia">${SITIO.fechaVigencia ? `Vigente desde el ${fechaLarga(SITIO.fechaVigencia)}` : `Vigente desde: ${dato(null, 'fecha de vigencia', ruta)}`}</p>
  </div>
</section>`;

// ------------------------------------------------------------------------------------------------
export function inicio() {
  const ruta = '/';
  const pasos = [
    ['1', 'Elige tu ciudad', 'Escoge el municipio que quieres explorar. Si nos das permiso, la app te sugiere el más cercano a ti. Tu ubicación es opcional y no la guardamos.'],
    ['2', 'Descubre negocios y productos', 'Restaurantes y emprendimientos con fotos, videos, horarios, precios y las reseñas de otras personas. Busca por negocio, plato o producto.'],
    ['3', 'Explora, contacta o reserva', 'Mira cómo llegar, escribe al negocio por WhatsApp o, en los restaurantes que lo ofrecen, solicita una reserva.'],
  ];
  const beneficios = [
    ['Más visibilidad', 'Tu negocio aparece ante quienes buscan dónde comer y qué comprar en tu ciudad.'],
    ['Catálogo digital', 'Publica tus platos y productos con fotos, precios y un video corto grabado con tu celular.'],
    ['Reseñas', 'Recibe opiniones de tus clientes y respóndelas desde tu panel.'],
    ['Contacto directo', 'Los clientes te escriben por WhatsApp y llegan a tu local con «Cómo llegar».'],
    ['Reservas', 'Si tienes un restaurante, recibe solicitudes de reserva y confírmalas tú mismo.'],
    ['Código QR', 'Descarga el QR de tu negocio para que tus clientes te encuentren y te califiquen.'],
  ];
  const preguntas = [
    ['¿Qué es LocalmenteTuyo?', 'Una plataforma para descubrir restaurantes, emprendimientos y comercios locales. Tiene dos apps: <strong>LocalmenteTuyo</strong>, para quienes quieren descubrir, y <strong>LocalmenteTuyo Negocios</strong>, para que los comerciantes publiquen su negocio.'],
    ['¿Es gratuita?', 'Sí. Descargar y usar LocalmenteTuyo es gratis, y registrar tu negocio en LocalmenteTuyo Negocios también. La app no cobra por las reservas ni procesa pagos.'],
    ['¿En qué ciudades está disponible?', 'En <strong>Zipaquirá, Bogotá y los municipios de la Sabana de Bogotá</strong>: Chía, Cajicá, Cota, Tenjo, Tabio, Sopó, La Calera, Tocancipá, Gachancipá, Cogua, Nemocón, Funza, Mosquera, Madrid, Facatativá, Bojacá, El Rosal, Subachoque, Zipacón, Soacha y Sibaté. Llegaremos a otras ciudades de Colombia poco a poco. Si eliges una ciudad donde todavía no estamos, la app te lo avisa.'],
    ['¿Cómo me uno como tester?', 'Déjanos tu correo de Google en la sección <a href="/#testers">Sé tester</a>. Te agregamos a la prueba en Google Play y te enviamos por correo los enlaces para instalar las apps.'],
    ['¿Cómo registro mi negocio?', 'Descarga LocalmenteTuyo Negocios y sigue cinco pasos: tu cuenta, los datos del negocio, la verificación (cédula o NIT y una foto del local), tus productos y una vista previa. Nuestro equipo revisa cada registro antes de publicarlo. Si tu ciudad aún no está disponible, puedes registrar tu interés para cuando abramos.'],
    ['¿Cómo funcionan las reservas?', 'Solo en los restaurantes que activan las reservas. Eliges el día, la hora y el número de personas, y envías la solicitud. El restaurante la confirma o la rechaza, y ves el estado en «Mis reservas». La app no cobra ni pide pagos por reservar.'],
    ['¿Cómo solicito ayuda?', 'En nuestra página de <a href="/soporte">Soporte</a> encuentras respuestas a los problemas más comunes y el canal de contacto.'],
    ['¿Cómo elimino mi cuenta?', 'Desde la app: en LocalmenteTuyo, ve a Perfil y toca «Eliminar mi cuenta»; en LocalmenteTuyo Negocios, hazlo desde tu Panel. Más detalles en <a href="/eliminar-cuenta">Eliminar mi cuenta</a>.'],
  ];
  return {
    ruta,
    titulo: 'Inicio',
    descripcion: 'LocalmenteTuyo: descubre restaurantes, emprendimientos y lugares especiales de tu ciudad en una sola app. Disponible en Zipaquirá, Bogotá y la Sabana.',
    cuerpo: `
<section class="hero">
  <div class="contenedor hero-rejilla">
    <div class="hero-texto revelar">
      <p class="etiqueta etiqueta-clara">Zipaquirá, Bogotá y la Sabana</p>
      <h1>Descubre lo mejor de tu ciudad.</h1>
      <p class="hero-sub">Restaurantes, emprendimientos y lugares especiales, reunidos en una sola aplicación.</p>
      <p class="hero-eslogan">${esc(SITIO.eslogan)}</p>
      <div class="acciones">
        ${botonPlay('clientes', 'Descargar aplicación')}
        <a class="btn btn-secundario" href="#negocios">Registrar mi negocio</a>
      </div>
      ${SITIO.play.clientes ? '' : '<p class="nota-clara">Las apps están en prueba con un grupo cerrado. Muy pronto podrás descargarlas desde Google Play.</p>'}
    </div>
    <div class="hero-visual revelar" aria-hidden="true">
      <div class="telefono">
        <div class="tel-cabecera">
          <div class="tel-fila"><span class="tel-marca"><img src="/img/simbolo.png" alt="" width="22" height="22">LocalmenteTuyo</span><span class="tel-ciudad">◉ Zipaquirá ▾</span></div>
          <p class="tel-hola">¡Hola!</p>
          <p class="tel-titulo">¿Qué se te antoja descubrir hoy?</p>
          <div class="tel-buscar">Negocio, plato o producto</div>
        </div>
        <div class="tel-cuerpo">
          <div class="tel-tarjetas"><div class="tel-tarjeta clara"><b>Emprendimientos</b><span>Artesanías, repostería y regalos</span></div><div class="tel-tarjeta oscura"><b>Restaurantes</b><span>Comida típica, parrillas y cafeterías</span></div></div>
          <p class="tel-seccion">Recién llegados</p>
          <div class="tel-carrusel"><span></span><span></span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="como-funciona" class="bloque">
  <div class="contenedor">
    <p class="etiqueta">Cómo funciona</p>
    <h2 class="titulo-seccion">Tres pasos para encontrar lo tuyo</h2>
    <ol class="pasos">
      ${pasos.map(([n, t, d]) => `<li class="paso revelar"><span class="paso-num">${n}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}
    </ol>
  </div>
</section>

<section id="negocios" class="bloque bloque-oscuro">
  <div class="contenedor">
    <p class="etiqueta etiqueta-clara">Para comerciantes</p>
    <h2 class="titulo-seccion">Que te encuentren quienes buscan lo que haces</h2>
    <p class="entrada-clara">Con <strong>LocalmenteTuyo Negocios</strong> publicas tu restaurante o emprendimiento y lo administras desde tu celular.</p>
    <div class="beneficios">
      ${beneficios.map(([t, d]) => `<div class="beneficio revelar"><h3>${t}</h3><p>${d}</p></div>`).join('')}
    </div>
    <div class="negocios-pie">
      <p>El registro es gratis y está sujeto a la revisión de nuestro equipo. LocalmenteTuyo te ayuda a darte a conocer; no garantiza ventas ni resultados comerciales.</p>
      ${botonPlay('negocios', 'LocalmenteTuyo Negocios')}
    </div>
  </div>
</section>

<section id="cobertura" class="bloque">
  <div class="contenedor cobertura">
    <div class="revelar">
      <p class="etiqueta">Cobertura</p>
      <h2 class="titulo-seccion">Ya estamos en Bogotá y la Sabana.</h2>
      <p>LocalmenteTuyo está preparada para llegar, poco a poco, a otras ciudades de Colombia. Abriremos cada ciudad cuando tenga negocios verificados para descubrir.</p>
      <p>¿Tienes un negocio en Zipaquirá, Bogotá o la Sabana? Regístralo desde LocalmenteTuyo Negocios. En otras ciudades puedes registrar tu interés y te avisaremos cuando lleguemos.</p>
    </div>
    <div class="cobertura-tarjeta revelar">
      <div class="ciudad activa"><span class="punto"></span><div><b>Zipaquirá</b><small>Cundinamarca</small></div><span class="estado">Disponible</span></div>
      <div class="ciudad activa"><span class="punto"></span><div><b>Bogotá y la Sabana</b><small>Chía, Cajicá, Cota, Funza, Mosquera, Soacha y más</small></div><span class="estado">Disponible</span></div>
      <div class="ciudad"><span class="punto"></span><div><b>Otras ciudades de Colombia</b><small>Abriremos de forma progresiva</small></div><span class="estado">Próximamente</span></div>
    </div>
  </div>
</section>

<section id="testers" class="bloque">
  <div class="contenedor testers">
    <div class="revelar">
      <p class="etiqueta">Pruebas en Google Play</p>
      <h2 class="titulo-seccion">Sé de los primeros en probarla</h2>
      <p>Estamos probando LocalmenteTuyo con un grupo cerrado antes de abrirla para todos. Déjanos tu correo de Google y te agregamos a la prueba. Te enviaremos por correo los enlaces para instalar las apps desde Google Play.</p>
      <p class="nota-suave">Usa el mismo correo con el que entras a Google Play en tu celular Android.</p>
    </div>
    <form id="form-tester" class="tester-tarjeta revelar" novalidate>
      <label class="campo" for="tester-correo">Tu correo de Google
        <input id="tester-correo" name="correo" type="email" autocomplete="email" inputmode="email" placeholder="nombre@gmail.com" required maxlength="254">
      </label>
      <fieldset class="campo">
        <legend>¿Qué quieres probar?</legend>
        <label class="opcion"><input type="checkbox" name="apps" value="clientes" checked><span>LocalmenteTuyo <small>para descubrir negocios</small></span></label>
        <label class="opcion"><input type="checkbox" name="apps" value="negocios"><span>LocalmenteTuyo Negocios <small>si tienes un negocio</small></span></label>
      </fieldset>
      <div class="trampa" aria-hidden="true"><label>Sitio web <input name="sitio" tabindex="-1" autocomplete="off"></label></div>
      <label class="opcion acepta"><input type="checkbox" name="acepta" required><span>Autorizo usar mi correo para agregarme a las pruebas de las apps y enviarme sus enlaces e instrucciones, según la <a href="/privacidad">política de privacidad</a>.</span></label>
      <button class="btn btn-principal" type="submit">Quiero ser tester</button>
      <p class="tester-estado" role="status" aria-live="polite"></p>
      <noscript><p class="tester-estado">Para enviar el formulario activa JavaScript, o escríbenos a ${correoEnlace(R.correoPrivacidad, 'correo', ruta)}.</p></noscript>
    </form>
  </div>
</section>

<section id="preguntas" class="bloque bloque-suave">
  <div class="contenedor angosto">
    <p class="etiqueta">Preguntas frecuentes</p>
    <h2 class="titulo-seccion">Lo que más nos preguntan</h2>
    <div class="faq">
      ${preguntas.map(([p, r]) => `<details class="revelar"><summary>${p}</summary><div class="faq-respuesta"><p>${r}</p></div></details>`).join('')}
    </div>
  </div>
</section>

<section class="bloque cierre">
  <div class="contenedor cierre-caja revelar">
    <img src="/img/logo.png" alt="LocalmenteTuyo. ${esc(SITIO.eslogan)}" width="220" height="220" loading="lazy">
    <div>
      <h2>Lo local, más cerca de ti.</h2>
      <p>Descubre, califica y apoya los negocios de tu ciudad.</p>
      <div class="acciones">${botonPlay('clientes', 'LocalmenteTuyo')}${botonPlay('negocios', 'Negocios')}</div>
    </div>
  </div>
</section>`,
  };
}

// ------------------------------------------------------------------------------------------------
export function privacidad() {
  const ruta = '/privacidad';
  return {
    ruta,
    legal: true,
    titulo: 'Política de privacidad',
    descripcion: 'Cómo LocalmenteTuyo trata los datos personales de quienes usan sus apps y su sitio web.',
    cuerpo: `${encabezadoLegal('Política de privacidad', 'Cómo tratamos los datos personales de quienes usan la app LocalmenteTuyo, la app LocalmenteTuyo Negocios y este sitio web, según la Ley 1581 de 2012 y sus decretos reglamentarios.', ruta)}
<article class="contenedor angosto legal">
${seccion('1. Responsable del tratamiento',
  `Responsable: ${responsableTexto(ruta, true)}.`,
  `Correo para temas de datos personales: ${correoEnlace(R.correoPrivacidad, 'correo de privacidad', ruta)}. Teléfono: ${dato(R.telefono, 'teléfono de contacto', ruta)}.`,
  `${esc(SITIO.marca)} es la marca de la plataforma; las apps las desarrolla ${esc(SITIO.desarrollador.nombre)}.`)}
${seccion('2. Datos que recogemos',
  '<p><strong>Cuenta (ambas apps):</strong> nombre, correo electrónico y contraseña (guardada cifrada; nunca la vemos).</p>',
  '<p><strong>Clientes:</strong> reseñas, calificaciones y fotos que publicas; los negocios que abres con su código QR; los reportes que envías; y, si pides una reserva, el nombre y el WhatsApp de contacto, el número de personas, la fecha y hora y las notas que quieras dejar.</p>',
  '<p><strong>Negocios:</strong> nombre y datos del negocio (tipo, categoría, municipio, dirección, horario, WhatsApp, redes y entregas), cédula o NIT del responsable, una foto del local para verificarlo, fotos y videos de los productos y, si lo confirmas estando en el local, su punto en el mapa.</p>',
  '<p><strong>Interés comercial:</strong> si tu ciudad aún no está disponible y registras tu interés, guardamos el nombre del negocio, si es restaurante o emprendimiento, el municipio, tu nombre y tu WhatsApp, con tu autorización para contactarte. No pedimos cuenta, documentos ni fotos para esto.</p>',
  '<p><strong>Municipio que exploras:</strong> la ciudad que eliges en la app se guarda solo en tu celular.</p>',
  '<p><strong>WhatsApp:</strong> si tocas el botón de WhatsApp de un negocio, la conversación ocurre en WhatsApp (un servicio de Meta), fuera de LocalmenteTuyo y con sus propias condiciones. En las reservas, el restaurante ve el WhatsApp de contacto que escribiste para poder responderte.</p>',
  '<p><strong>Ubicación:</strong> es opcional. Solo si tocas «Usar mi ubicación» y lo autorizas, la app lee una vez tu ubicación aproximada para sugerirte el municipio más cercano; ese cálculo se hace en tu celular y no guardamos ni enviamos tu ubicación. En la app de negocios, la ubicación se usa solo cuando tocas el botón para guardar el punto de tu local.</p>',
  '<p><strong>Datos técnicos:</strong> un identificador del celular para enviarte avisos (por ejemplo, el estado de una reserva), el modelo y sistema operativo, la versión de la app y una analítica de uso anónima, con un identificador aleatorio que no se relaciona con tu cuenta, tu correo ni tu ubicación.</p>',
  '<p><strong>Lista de testers:</strong> si te inscribes en «Sé tester» de este sitio, guardamos tu correo de Google, las apps que quieres probar y la fecha, con tu autorización.</p>',
  '<p><strong>Este sitio web:</strong> no tiene cuentas, cookies de seguimiento ni herramientas de analítica; su único formulario es el de testers. El servicio de alojamiento puede registrar datos técnicos de cada visita (como la dirección IP) por seguridad y funcionamiento.</p>',
  '<p>La cámara solo se usa cuando tomas una foto o grabas un video desde la app de negocios, y los videos se graban sin sonido. No recogemos datos sensibles en los términos del artículo 5 de la Ley 1581 de 2012.</p>')}
${seccion('3. Para qué usamos tus datos', lista([
  'Crear y administrar tu cuenta e iniciar sesión.',
  'Mostrar los negocios publicados de la ciudad que eliges, con sus fotos, videos y reseñas, y ayudarte a llegar a ellos.',
  'Publicar tus reseñas con tu nombre y permitir que el negocio las responda.',
  'Gestionar tus solicitudes de reserva: el restaurante ve tu nombre, tu WhatsApp y los datos de la solicitud para confirmarla o responderte.',
  'Verificar que los negocios registrados existen. La cédula o NIT y la foto del local solo las ve el equipo de revisión; la foto se borra después de la revisión.',
  'Contactar por WhatsApp a los comerciantes que registraron su interés, solo para avisarles cuando abramos en su ciudad.',
  'Agregar a las pruebas de Google Play a quienes se inscriben como testers (Google recibe ese correo para darles acceso) y enviarles por correo los enlaces e instrucciones de la prueba.',
  'Enviarte avisos sobre tu cuenta, tus reservas o tu negocio. Solo te enviaremos mensajes publicitarios si lo autorizas aparte.',
  'Atender solicitudes, reportes de contenido y bloqueos, mantener la seguridad de la plataforma y mejorar la app con la analítica anónima.',
]))}
${seccion('4. Información pública',
  'Es pública para cualquier persona: la información del negocio publicado (sin la cédula o NIT), su municipio, dirección y punto en el mapa, sus fotos y productos, y las reseñas con el nombre de quien las escribe.',
  'No son públicos: tus reservas, los datos de verificación de los negocios, los datos de interés comercial ni la lista de testers.')}
${seccion('5. Proveedores y transferencia internacional', lista([
  '<strong>Supabase:</strong> base de datos, inicio de sesión, archivos y funciones del servidor. Los datos de las apps se guardan en su región us-east-2 (Ohio, Estados Unidos).',
  '<strong>Expo (EAS):</strong> compilación de las apps y envío de los avisos al celular.',
  '<strong>Google (Firebase Cloud Messaging y Google Play):</strong> entrega de los avisos en Android y distribución de las apps.',
  '<strong>Cloudflare:</strong> alojamiento y seguridad de este sitio web, desde su red global.',
]),
  'Por eso tus datos se guardan y se procesan fuera de Colombia: principalmente en Estados Unidos (base de datos) y en la infraestructura de los proveedores de avisos y del sitio web, que puede estar en otros países. Al aceptar esta política autorizas de forma expresa esa transferencia y transmisión internacional, que hacemos según los artículos 25 y 26 de la Ley 1581 de 2012 y con proveedores que ofrecen medidas de seguridad adecuadas.')}
${seccion('6. Seguridad',
  'Usamos conexiones cifradas, contraseñas cifradas y reglas de acceso para que cada persona solo vea y modifique lo que le corresponde. El equipo que revisa negocios entra con verificación en dos pasos.')}
${seccion('7. Conservación y eliminación',
  'Conservamos tus datos mientras tengas una cuenta activa.',
  'Puedes eliminar tu cuenta desde la app (ver <a href="/eliminar-cuenta">Eliminar mi cuenta</a>): tu perfil, tus reseñas, tus reservas, tu negocio y tus archivos se borran en ese momento.',
  `Si nos pides la supresión por correo, la atendemos dentro de los plazos de la Ley 1581 de 2012 y la completamos en un máximo de ${SITIO.plazos.supresionDias} días naturales desde que confirmamos la solicitud, salvo los datos que debamos conservar por una obligación legal.`,
  'Los avisos enviados y los identificadores de celulares que ya no se usan se borran a los 90 días.',
  `Los registros de interés comercial se conservan un máximo de ${SITIO.plazos.interesMeses} meses desde que los recibimos, o menos si pides que los borremos.`,
  `Los correos de la lista de testers se conservan un máximo de ${SITIO.plazos.interesMeses} meses desde la inscripción, o menos si pides que los borremos. Para salir de la prueba en Google Play usa el enlace «Abandonar el programa» de la página de la prueba.`,
  'Las copias de seguridad de nuestros proveedores se eliminan según sus propios ciclos automáticos.')}
${seccion('8. Tus derechos',
  'Según el artículo 8 de la Ley 1581 de 2012, puedes conocer, actualizar y rectificar tus datos; pedir prueba de la autorización que nos diste; ser informado sobre el uso que les damos; revocar la autorización o pedir que los borremos cuando no se respeten tus derechos; acceder gratis a tus datos; y presentar quejas ante la Superintendencia de Industria y Comercio después de haber hecho tu consulta o reclamo ante nosotros.',
  `Escríbenos a ${correoEnlace(R.correoPrivacidad, 'correo de privacidad', ruta)} con tu nombre, el correo de tu cuenta (si tienes), lo que solicitas y, si aplica, los documentos que lo sustenten.`,
  'Consultas: las respondemos en máximo 10 días hábiles, prorrogables 5 días hábiles más avisándote el motivo (artículo 14). Reclamos: en máximo 15 días hábiles, prorrogables 8 días hábiles más avisándote el motivo (artículo 15).')}
${seccion('9. Menores de edad',
  `Las apps están dirigidas a personas mayores de ${dato(SITIO.edadMinima, 'edad mínima', ruta)} años. Si eres menor de esa edad, no crees una cuenta. Si crees que un menor nos dio datos, escríbenos a ${correoEnlace(R.correoPrivacidad, 'correo de privacidad', ruta)} y los borraremos.`)}
${seccion('10. Cambios a esta política',
  'Si cambiamos esta política te lo informaremos en la app antes de que el cambio aplique y, si afecta la finalidad del tratamiento, te pediremos una nueva autorización.')}
</article>`,
  };
}

// ------------------------------------------------------------------------------------------------
export function eliminarCuenta() {
  const ruta = '/eliminar-cuenta';
  return {
    ruta,
    legal: true,
    titulo: 'Eliminar mi cuenta',
    descripcion: 'Cómo eliminar tu cuenta de LocalmenteTuyo o LocalmenteTuyo Negocios y qué pasa con tus datos.',
    cuerpo: `${encabezadoLegal('Eliminar mi cuenta', 'Puedes eliminar tu cuenta de LocalmenteTuyo o de LocalmenteTuyo Negocios cuando quieras, directamente desde la app.', ruta)}
<article class="contenedor angosto legal">
${seccion('Desde la app (la forma más rápida)',
  `<div class="pasos-cuenta">
    <div class="tarjeta-paso"><h3>LocalmenteTuyo (clientes)</h3><ol><li>Abre la app e inicia sesión.</li><li>Ve a <strong>Perfil</strong>.</li><li>Toca <strong>«Eliminar mi cuenta»</strong> y confirma.</li></ol></div>
    <div class="tarjeta-paso"><h3>LocalmenteTuyo Negocios</h3><ol><li>Abre la app e inicia sesión.</li><li>En tu <strong>Panel</strong>, baja hasta el final.</li><li>Toca <strong>«Eliminar mi cuenta»</strong> y confirma.</li></ol></div>
  </div>`,
  'La eliminación se hace en ese momento y cierra tu sesión.')}
${seccion('Si no puedes entrar a la app',
  `Escríbenos desde el correo con el que creaste tu cuenta a ${correoEnlace(R.correoPrivacidad, 'correo de privacidad', ruta)}, con el asunto «Eliminar mi cuenta». Indica si es una cuenta de clientes o de negocios.`,
  'Por seguridad, nunca te pediremos tu contraseña ni documentos de identidad. Podemos hacerte preguntas para confirmar que la cuenta es tuya antes de eliminarla.',
  `Atendemos la solicitud dentro de los plazos de la Ley 1581 de 2012 (15 días hábiles, prorrogables por 8 días hábiles más avisándote el motivo) y completamos la eliminación en un máximo de ${SITIO.plazos.supresionDias} días naturales desde que confirmamos que la cuenta es tuya.`)}
${seccion('Qué se borra', lista([
  'Tu perfil (nombre y correo) y tu acceso.',
  'Tus reseñas y sus fotos, tus solicitudes de reserva, tus reportes y bloqueos.',
  'Si tienes un negocio: el negocio, sus productos, fotos, videos, logo, código QR, reservas y las reseñas que recibió.',
  'Los identificadores de tu celular para avisos.',
]))}
${seccion('Qué podría conservarse', lista([
  'El registro interno de decisiones del equipo (por ejemplo, que un negocio fue aprobado), sin acceso a tu cuenta.',
  'La analítica de uso anónima, que no está relacionada con tu cuenta.',
  'La información que la ley nos obligue a conservar, durante el tiempo que exija.',
  'Copias de seguridad de nuestros proveedores, que se eliminan de forma automática según sus propios ciclos.',
]))}
${seccion('Interés comercial sin cuenta',
  `Si registraste el interés de tu negocio para una ciudad que aún no abre y quieres que borremos esos datos, escríbenos a ${correoEnlace(R.correoPrivacidad, 'correo de privacidad', ruta)} indicando el nombre del negocio, el municipio y el número de WhatsApp que registraste.`)}
${seccion('Responsable', `${responsableTexto(ruta)}. Correo: ${correoEnlace(R.correoPrivacidad, 'correo de privacidad', ruta)}. Más información en nuestra <a href="/privacidad">política de privacidad</a>.`)}
</article>`,
  };
}

// ------------------------------------------------------------------------------------------------
export function soporte() {
  const ruta = '/soporte';
  const temas = [
    ['Problemas de acceso', [
      'Revisa que escribiste bien tu correo y tu contraseña, y que tienes conexión a internet.',
      'Si creaste la cuenta hace poco, revisa tu correo: puede que debas confirmarla.',
      `Si olvidaste tu contraseña, escríbenos a ${correoEnlace(SITIO.correoSoporte, 'correo de soporte', ruta)} desde el correo de tu cuenta.`,
    ]],
    ['Registro de negocios', [
      'El registro tiene cinco pasos: cuenta, datos del negocio, verificación (cédula o NIT y foto del local), productos y vista previa.',
      'Nuestro equipo revisa cada negocio antes de publicarlo. Si no lo aprobamos, verás el motivo en tu Panel y podrás corregirlo.',
      'Si tu ciudad aún no está disponible, la app te permite registrar tu interés para cuando abramos.',
    ]],
    ['Reservas', [
      'Solo los restaurantes que activan las reservas las reciben. El restaurante confirma o rechaza cada solicitud.',
      'Consulta el estado en «Mis reservas». Si necesitas cambiarla, escribe al restaurante por WhatsApp desde el detalle de la reserva.',
      'LocalmenteTuyo no cobra por las reservas ni gestiona pagos.',
    ]],
    ['Reseñas y reportes', [
      'Puedes tener una reseña por negocio y editarla cuando quieras. Las cuentas nuevas pueden calificar 24 horas después de crearse.',
      'Si ves una reseña o un negocio que incumple las reglas, repórtalo desde la app. Nuestro equipo lo revisa.',
    ]],
    ['Tu cuenta y tus datos', [
      'Para eliminar tu cuenta, sigue los pasos de <a href="/eliminar-cuenta">Eliminar mi cuenta</a>.',
      'Para consultas sobre tus datos personales, lee nuestra <a href="/privacidad">política de privacidad</a>.',
    ]],
  ];
  return {
    ruta,
    titulo: 'Soporte',
    descripcion: 'Ayuda para usar LocalmenteTuyo y LocalmenteTuyo Negocios: acceso, registro, reservas, reseñas y cuentas.',
    cuerpo: `
<section class="legal-cabecera">
  <div class="contenedor angosto">
    <p class="etiqueta">Soporte</p>
    <h1>¿En qué te ayudamos?</h1>
    <p class="entrada">Respuestas a lo más común. Si no encuentras la tuya, escríbenos.</p>
  </div>
</section>
<div class="contenedor angosto soporte">
  ${temas.map(([t, items]) => `<section class="tema revelar"><h2>${t}</h2>${lista(items)}</section>`).join('')}
  <section class="contacto revelar">
    <h2>Contacto</h2>
    <p>Correo de soporte: ${correoEnlace(SITIO.correoSoporte, 'correo de soporte', ruta)}</p>
    <p>Teléfono: ${dato(R.telefono, 'teléfono de contacto', ruta)}</p>
    <p class="pie-pequeno">Cuéntanos qué app usas (clientes o negocios), el correo de tu cuenta y qué pasó. Nunca te pediremos tu contraseña.</p>
  </section>
</div>`,
  };
}

// ------------------------------------------------------------------------------------------------
export function terminos() {
  const ruta = '/terminos';
  return {
    ruta,
    legal: true,
    titulo: 'Términos y condiciones',
    descripcion: 'Condiciones de uso de LocalmenteTuyo y LocalmenteTuyo Negocios.',
    cuerpo: `${encabezadoLegal('Términos y condiciones', 'Las reglas para usar LocalmenteTuyo (clientes) y LocalmenteTuyo Negocios (comerciantes). Al crear una cuenta en cualquiera de las apps las aceptas.', ruta)}
<article class="contenedor angosto legal">
${seccion('1. Quiénes somos',
  `LocalmenteTuyo es una plataforma para descubrir restaurantes, emprendimientos y comercios locales, operada por ${responsableTexto(ruta)}. Contacto: ${correoEnlace(SITIO.correoSoporte, 'correo de soporte', ruta)}.`)}
${seccion('2. Qué es y qué no es LocalmenteTuyo',
  'Mostramos información de negocios independientes. No vendemos sus productos, no procesamos pagos por ellos ni prestamos servicios de domicilio.',
  'Cada negocio administra su información comercial y es el único responsable de sus productos, precios, disponibilidad, horarios, calidad y atención, y de cumplir el Estatuto del Consumidor (Ley 1480 de 2011). Las fotos y videos son representaciones aproximadas.',
  'No garantizamos ventas, resultados comerciales ni la disponibilidad de los establecimientos.',
  'Estamos en Zipaquirá, Bogotá y la Sabana de Bogotá, y llegaremos a otras ciudades de forma progresiva. En esta etapa las apps no muestran publicidad de terceros.')}
${seccion('3. Cuentas',
  `Las apps están dirigidas a personas mayores de ${esc(SITIO.edadMinima)} años. Debes dar información verdadera y cuidar tu contraseña. Eres responsable de lo que se haga con tu cuenta. Puedes eliminarla cuando quieras desde la app.`)}
${seccion('4. Reservas',
  'Algunos restaurantes reciben solicitudes de reserva desde la app. La reserva es un acuerdo entre tú y el restaurante: el restaurante decide si la confirma y responde por su cumplimiento. LocalmenteTuyo no cobra por reservar ni gestiona pagos.')}
${seccion('5. Reseñas',
  'Las reseñas son contenido de quienes las escriben y deben reflejar una experiencia real. Puedes tener una por negocio y editarla. Las cuentas nuevas califican 24 horas después de crearse.',
  'Moderamos las reseñas: podemos retener o retirar las que incumplan estas reglas o la ley. Los negocios pueden responderlas, pero no borrarlas ni ofrecer beneficios a cambio de reseñas positivas.')}
${seccion('6. Para los comerciantes',
  'Quien registra un negocio declara que es su dueño o que está autorizado para representarlo, y que la información es verdadera. Para publicarlo revisamos la cédula o NIT del responsable y una foto del local; podemos pedir más información o rechazar el registro.',
  'Las fotos y videos siguen siendo tuyos; al subirlos nos das una licencia gratuita y no exclusiva para mostrarlos en las apps mientras estén publicados. Mantén actualizados tus precios, horarios y productos.')}
${seccion('7. Contenido prohibido',
  'No se permite publicar contenido falso, ofensivo, discriminatorio o ilegal, datos personales de terceros sin autorización, ni intentar manipular calificaciones o usar la plataforma para fines distintos a los previstos.')}
${seccion('8. Suspensión',
  'Podemos suspender o retirar cuentas, negocios o contenidos que incumplan estos términos o pongan en riesgo a otras personas. Cuando sea posible, te informaremos el motivo.')}
${seccion('9. Datos personales',
  'El tratamiento de tus datos está explicado en nuestra <a href="/privacidad">política de privacidad</a>.')}
${seccion('10. Cambios y ley aplicable',
  'Si cambiamos estos términos te lo informaremos en la app. Estos términos se rigen por las leyes de la República de Colombia.')}
<p class="nota-revision">Este documento resume las condiciones de las apps y requiere revisión jurídica antes de su versión definitiva.</p>
</article>`,
  };
}

// ------------------------------------------------------------------------------------------------
export function noEncontrada() {
  return {
    ruta: '/404',
    indexar: false,
    titulo: 'Página no encontrada',
    descripcion: 'La página que buscas no existe.',
    cuerpo: `
<section class="bloque no-encontrada">
  <div class="contenedor angosto">
    <img src="/img/simbolo.png" alt="" width="96" height="96">
    <h1>No encontramos esta página</h1>
    <p>Puede que el enlace esté mal escrito o que la página ya no exista.</p>
    <a class="btn btn-principal" href="/">Volver al inicio</a>
  </div>
</section>`,
  };
}
