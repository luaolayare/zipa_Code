import { BRAND } from '../brand';
import type { LegalDocument } from './tipos';

// BORRADOR para revisión de un abogado. Los textos entre [CORCHETES] los completa el responsable.
// Marco: Ley 1581 de 2012, Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015).
export const POLITICA_PRIVACIDAD: LegalDocument = {
  id: 'privacidad',
  title: 'Política de privacidad',
  VERSION: '1.0',
  FECHA: '2026-11-08',
  borrador: true,
  intro:
    `Esta política explica cómo ${BRAND.name} trata los datos personales de quienes usan la app ${BRAND.clientesApp} (clientes y turistas) y la app ${BRAND.negociosApp} (restaurantes y emprendimientos), según la Ley 1581 de 2012 y sus decretos reglamentarios.`,
  sections: [
    {
      heading: '1. Responsable del tratamiento',
      paragraphs: [
        'Responsable: [NOMBRE DEL RESPONSABLE], identificado con [NIT/CÉDULA], con domicilio en [DIRECCIÓN], [CIUDAD], Colombia.',
        'Correo para temas de datos personales: [CORREO DE SOPORTE]. Teléfono: [TELÉFONO DE CONTACTO].',
      ],
    },
    {
      heading: '2. Datos que recogemos',
      paragraphs: [
        'De todos los usuarios con cuenta: nombre, correo electrónico, contraseña (guardada cifrada, nunca la vemos) y, si entras con Google o Apple, el identificador y el correo que esa cuenta nos comparta.',
        'De los clientes: las reseñas y calificaciones que publicas, los negocios que visitas en la app y los reportes que envías.',
        'De los negocios: nombre y datos del negocio (tipo, categoría, dirección, horario, WhatsApp), cédula o NIT del responsable, una foto del local o puesto para verificarlo, fotos y videos de los productos, y los modelos 3D que se generan a partir de esos videos.',
        'Datos técnicos: modelo y sistema operativo del celular, versión de la app, registros de errores y, si lo autorizas, tu ubicación aproximada para mostrarte negocios cercanos. La ubicación no se guarda en tu perfil.',
        'Permisos del celular: la cámara solo se usa cuando tú tomas una foto o grabas un video desde la app. Los videos se graban sin sonido, así que la app no usa el micrófono. No recogemos datos sensibles en los términos del artículo 5 de la Ley 1581 de 2012.',
      ],
    },
    {
      heading: '3. Para qué usamos tus datos',
      paragraphs: [
        'Crear y administrar tu cuenta e iniciar sesión.',
        'Mostrar a los clientes los negocios publicados, sus productos en 3D y sus reseñas.',
        'Publicar tus reseñas con tu nombre y permitir que el negocio las responda.',
        'Verificar que los negocios registrados existen. La cédula o NIT y la foto del local solo las ve el equipo de revisión; la foto se borra después de la revisión.',
        'Generar los modelos 3D a partir de los videos que sube el negocio.',
        'Atender solicitudes, reportes de contenido y bloqueos, y mantener la seguridad de la plataforma.',
        'Detectar y corregir errores de la app.',
        'Enviarte mensajes sobre tu cuenta o tu negocio (por ejemplo, el resultado de la revisión). Solo te enviaremos mensajes publicitarios si lo autorizas aparte.',
      ],
    },
    {
      heading: '4. Tus derechos como titular',
      paragraphs: [
        'Según el artículo 8 de la Ley 1581 de 2012, puedes: conocer, actualizar y rectificar tus datos; pedir prueba de la autorización que nos diste; ser informado sobre el uso que les damos; revocar la autorización o pedir que los borremos cuando no se respeten tus derechos; acceder gratis a tus datos; y presentar quejas ante la Superintendencia de Industria y Comercio después de haber hecho tu consulta o reclamo ante nosotros.',
        'Puedes eliminar tu cuenta en cualquier momento desde Perfil (clientes) o desde el Panel (negocios). Al hacerlo borramos tu perfil, tus reseñas, tu negocio y tus archivos, salvo lo que la ley nos obligue a conservar.',
      ],
    },
    {
      heading: '5. Cómo ejercer tus derechos y plazos',
      paragraphs: [
        'Escríbenos a [CORREO DE SOPORTE] con tu nombre, el correo de tu cuenta, lo que solicitas y, si aplica, los documentos que lo sustenten.',
        'Consultas: las respondemos en máximo 10 días hábiles desde que las recibimos. Si no es posible, te avisamos el motivo y la nueva fecha, que no superará 5 días hábiles más (artículo 14 de la Ley 1581 de 2012).',
        'Reclamos (corrección, actualización, supresión o incumplimiento): los respondemos en máximo 15 días hábiles. Si no es posible, te avisamos el motivo y la nueva fecha, que no superará 8 días hábiles más (artículo 15 de la Ley 1581 de 2012).',
      ],
    },
    {
      heading: '6. Encargados del tratamiento',
      paragraphs: [
        'Para prestar el servicio usamos proveedores que tratan datos por cuenta nuestra y bajo nuestras instrucciones:',
        'Supabase: base de datos, inicio de sesión y almacenamiento de archivos.',
        'Expo (EAS): compilación de la app y entrega de actualizaciones.',
        'Google: inicio de sesión con Google y distribución de la app en Google Play.',
        'Apple: inicio de sesión con Apple y distribución de la app en el App Store.',
        'Sentry: registro de errores de la app.',
        '[NOMBRE DEL SERVICIO 3D]: procesamiento de videos para generar los modelos 3D.',
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
        'Es pública para cualquier usuario: la información del negocio publicado (sin la cédula o NIT), sus fotos, productos y modelos 3D, y las reseñas con el nombre de quien las escribe.',
      ],
    },
    {
      heading: '9. Seguridad y conservación',
      paragraphs: [
        'Usamos conexiones cifradas, contraseñas cifradas y reglas de acceso para que cada persona solo vea y modifique lo que le corresponde.',
        'Conservamos tus datos mientras tengas una cuenta activa. Cuando la eliminas, los borramos en un plazo de [PLAZO DE BORRADO] días, salvo lo que la ley nos obligue a conservar.',
      ],
    },
    {
      heading: '10. Menores de edad',
      paragraphs: [
        'Las apps no están dirigidas a menores de [EDAD MÍNIMA] años. Si eres padre, madre o representante y crees que un menor nos dio datos, escríbenos a [CORREO DE SOPORTE] para borrarlos.',
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
