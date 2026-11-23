// Datos del sitio que NO se inventan. Mientras un valor sea null, la web muestra «Por completar» en ese
// punto y el build lo advierte. Complétalos aquí y vuelve a publicar (un push basta: Cloudflare compila solo).
export const SITIO = {
  dominio: 'https://localmentetuyo.com',
  marca: 'LocalmenteTuyo',
  eslogan: 'Lo mejor de aquí, cerquita de ti.',
  desarrollador: { nombre: 'SCALIX Cloud', web: 'https://scalix-cloud.com/' },

  // Enlaces públicos de Google Play. Hoy las apps están en prueba interna: no hay enlace público todavía.
  // Ejemplo cuando existan: 'https://play.google.com/store/apps/details?id=com.localmentetuyo.app'
  play: {
    clientes: null,
    negocios: null,
  },

  // Responsable del tratamiento de datos (Ley 1581 de 2012). Obligatorio antes de publicar la política.
  responsable: {
    razonSocial: null, // nombre o razón social exacta
    identificacion: null, // NIT o cédula
    direccion: null,
    ciudad: null,
    correoPrivacidad: null, // correo para temas de datos personales y eliminación de cuentas
    telefono: null,
  },

  // Canal de soporte general (puede ser el mismo correo de privacidad).
  correoSoporte: null,

  // Plazos y condiciones que debe definir el responsable.
  plazos: {
    borradoCuenta: null, // días para borrar los datos después de eliminar la cuenta
    conservacionInteres: null, // cuánto se conserva un registro de interés comercial
  },
  edadMinima: null, // edad mínima para usar las apps
  paisesServidores: null, // países donde los proveedores guardan los datos
  fechaVigencia: null, // fecha desde la que rige la versión publicada de los documentos legales
};
