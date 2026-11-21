import { BRAND } from '../brand';
import type { LegalDocument } from './tipos';

// BORRADOR para revisión de un abogado. Los textos entre [CORCHETES] los completa el responsable:
// no se inventan nombres, NIT, direcciones, correos ni plazos.
// Marco: Ley 1581 de 2012, Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015).
// 1.1: LocalmenteTuyo, varias ciudades, ubicación aproximada, interés comercial, reservas, avisos y
// analítica anónima; sin modelos 3D, inicio con Google/Apple ni Sentry (la app no los usa).
export const POLITICA_PRIVACIDAD: LegalDocument = {
  id: 'privacidad',
  title: 'Política de privacidad',
  VERSION: '1.1',
  FECHA: '2026-11-21',
  borrador: true,
  intro:
    `Esta política explica cómo ${BRAND.name} trata los datos personales de quienes usan la app ${BRAND.clientesApp} (clientes y visitantes) y la app ${BRAND.negociosApp} (restaurantes, emprendimientos y comercios locales), según la Ley 1581 de 2012 y sus decretos reglamentarios.`,
  sections: [
    {
      heading: '1. Responsable del tratamiento',
      paragraphs: [
        'Responsable: [NOMBRE O RAZÓN SOCIAL DEL RESPONSABLE], identificado con [NIT/CÉDULA], con domicilio en [DIRECCIÓN], [CIUDAD], Colombia.',
        'Correo para temas de datos personales: [CORREO DE PRIVACIDAD]. Teléfono: [TELÉFONO DE CONTACTO].',
      ],
    },
    {
      heading: '2. Datos que recogemos',
      paragraphs: [
        'De todos los usuarios con cuenta: nombre, correo electrónico y contraseña (guardada cifrada, nunca la vemos).',
        'De los clientes: las reseñas y calificaciones que publicas, los negocios que abres con su código QR, los reportes que envías y, si pides una reserva, el nombre y el WhatsApp de contacto, el número de personas, la fecha y hora, y la preferencia de mesa o las notas que quieras dejar.',
        'De los negocios: nombre y datos del negocio (tipo, categoría, municipio, dirección, horario, WhatsApp, redes y entregas), cédula o NIT del responsable, una foto del local o puesto para verificarlo, fotos y videos de los productos y, si lo confirmas estando en tu local, el punto del local en el mapa.',
        'De los comerciantes de ciudades donde todavía no estamos (interés comercial): nombre del negocio, si es restaurante o emprendimiento, municipio, tu nombre y tu número de WhatsApp, junto con tu autorización para contactarte. No pedimos cuenta, cédula, NIT, fotos ni documentos para esto.',
        'Ciudad que exploras: el municipio que eliges en la app se guarda solo en tu celular para mostrarte sus negocios.',
        'Ubicación: solo si tocas «Usar mi ubicación» y lo autorizas, la app lee una vez tu ubicación aproximada para sugerirte el municipio más cercano. Ese cálculo se hace en tu celular: no guardamos ni enviamos tu ubicación. En la app de negocios, la ubicación se usa solo cuando tocas el botón para guardar el punto de tu local.',
        'Datos técnicos: identificador del celular para enviarte avisos (por ejemplo, el estado de una reserva), modelo y sistema operativo, versión de la app y una analítica de uso anónima, con un identificador aleatorio que no se relaciona con tu cuenta, tu correo ni tu ubicación.',
        'Permisos del celular: la cámara solo se usa cuando tú tomas una foto o grabas un video desde la app de negocios. Los videos se graban sin sonido, así que la app no usa el micrófono. No recogemos datos sensibles en los términos del artículo 5 de la Ley 1581 de 2012.',
      ],
    },
    {
      heading: '3. Para qué usamos tus datos',
      paragraphs: [
        'Crear y administrar tu cuenta e iniciar sesión.',
        'Mostrar los negocios publicados de la ciudad que eliges, con sus fotos, videos y reseñas, y ayudarte a llegar a ellos.',
        'Publicar tus reseñas con tu nombre y permitir que el negocio las responda.',
        'Gestionar tus solicitudes de reserva: el restaurante ve tu nombre, tu WhatsApp y los datos de la solicitud para confirmarla o responderte.',
        'Verificar que los negocios registrados existen. La cédula o NIT y la foto del local solo las ve el equipo de revisión; la foto se borra después de la revisión.',
        'Contactar por WhatsApp a los comerciantes que registraron su interés, solo para avisarles cuando abramos en su ciudad e invitarlos a registrarse.',
        'Enviarte avisos sobre tu cuenta, tus reservas o tu negocio (por ejemplo, el resultado de la revisión). Solo te enviaremos mensajes publicitarios si lo autorizas aparte.',
        'Atender solicitudes, reportes de contenido y bloqueos, mantener la seguridad de la plataforma y mejorar la app con la analítica anónima.',
      ],
    },
    {
      heading: '4. Tus derechos como titular',
      paragraphs: [
        'Según el artículo 8 de la Ley 1581 de 2012, puedes: conocer, actualizar y rectificar tus datos; pedir prueba de la autorización que nos diste; ser informado sobre el uso que les damos; revocar la autorización o pedir que los borremos cuando no se respeten tus derechos; acceder gratis a tus datos; y presentar quejas ante la Superintendencia de Industria y Comercio después de haber hecho tu consulta o reclamo ante nosotros.',
        'Puedes eliminar tu cuenta en cualquier momento desde Perfil (clientes) o desde el Panel (negocios). Al hacerlo borramos tu perfil, tus reseñas, tu negocio y tus archivos, salvo lo que la ley nos obligue a conservar.',
        'Si registraste interés comercial sin cuenta, puedes pedir que borremos esos datos escribiendo a [CORREO DE PRIVACIDAD] desde el mismo número o indicando el nombre del negocio y el municipio.',
      ],
    },
    {
      heading: '5. Cómo ejercer tus derechos y plazos',
      paragraphs: [
        'Escríbenos a [CORREO DE PRIVACIDAD] con tu nombre, el correo de tu cuenta (si tienes), lo que solicitas y, si aplica, los documentos que lo sustenten.',
        'Consultas: las respondemos en máximo 10 días hábiles desde que las recibimos. Si no es posible, te avisamos el motivo y la nueva fecha, que no superará 5 días hábiles más (artículo 14 de la Ley 1581 de 2012).',
        'Reclamos (corrección, actualización, supresión o incumplimiento): los respondemos en máximo 15 días hábiles. Si no es posible, te avisamos el motivo y la nueva fecha, que no superará 8 días hábiles más (artículo 15 de la Ley 1581 de 2012).',
      ],
    },
    {
      heading: '6. Encargados del tratamiento',
      paragraphs: [
        'Para prestar el servicio usamos proveedores que tratan datos por cuenta nuestra y bajo nuestras instrucciones:',
        'Supabase: base de datos, inicio de sesión, almacenamiento de archivos y funciones del servidor.',
        'Expo (EAS): compilación de la app, entrega de actualizaciones y envío de avisos.',
        'Google: entrega de avisos en Android (Firebase Cloud Messaging) y distribución de la app en Google Play.',
        'Apple: entrega de avisos en iPhone y distribución de la app en el App Store, cuando la app se publique allí.',
      ],
    },
    {
      heading: '7. Transferencia y transmisión internacional',
      paragraphs: [
        'Algunos de estos proveedores guardan o procesan datos fuera de Colombia, principalmente en [PAÍSES DE LOS SERVIDORES]. Al aceptar esta política autorizas de forma expresa esa transmisión, que hacemos según el artículo 26 de la Ley 1581 de 2012 y con proveedores que ofrecen medidas de seguridad adecuadas.',
      ],
    },
    {
      heading: '8. Información pública en la app',
      paragraphs: [
        'Es pública para cualquier usuario: la información del negocio publicado (sin la cédula o NIT), su municipio, dirección y punto en el mapa, sus fotos y productos, y las reseñas con el nombre de quien las escribe.',
        'No son públicos: tus reservas, los datos de verificación de los negocios ni los datos de interés comercial.',
      ],
    },
    {
      heading: '9. Seguridad y conservación',
      paragraphs: [
        'Usamos conexiones cifradas, contraseñas cifradas y reglas de acceso para que cada persona solo vea y modifique lo que le corresponde.',
        'Conservamos tus datos mientras tengas una cuenta activa. Cuando la eliminas, los borramos en un plazo de [PLAZO DE BORRADO] días, salvo lo que la ley nos obligue a conservar.',
        'Los avisos enviados y los identificadores de celulares que ya no se usan se borran a los 90 días.',
        'Los datos de interés comercial se conservan hasta [PLAZO DE CONSERVACIÓN DEL INTERÉS COMERCIAL] o hasta que pidas que los borremos.',
      ],
    },
    {
      heading: '10. Menores de edad',
      paragraphs: [
        'Las apps no están dirigidas a menores de [EDAD MÍNIMA] años. Si eres padre, madre o representante y crees que un menor nos dio datos, escríbenos a [CORREO DE PRIVACIDAD] para borrarlos.',
      ],
    },
    {
      heading: '11. Cambios a esta política',
      paragraphs: [
        'Si cambiamos esta política te lo informaremos en la app antes de que el cambio aplique, y si el cambio afecta la finalidad del tratamiento te pediremos una nueva autorización.',
      ],
    },
  ],
};
