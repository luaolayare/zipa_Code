// Configuración de la app: toma todo de app.json y solo agrega el google-services.json de Firebase
// (notificaciones en Android). Ese archivo NO está en el repositorio (es público): EAS lo entrega
// en el build como variable de entorno de tipo archivo, privada (GOOGLE_SERVICES_JSON). En
// desarrollo local no existe y la app funciona igual, solo sin notificaciones.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
  },
});
