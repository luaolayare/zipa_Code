// Configuración de la app: toma todo de app.json y solo agrega el google-services.json de Firebase
// (notificaciones en Android). Ese archivo NO está en el repositorio (es público): EAS lo entrega
// en el build como variable de entorno de tipo archivo, privada (GOOGLE_SERVICES_JSON). En
// desarrollo local no existe y la app funciona igual, solo sin notificaciones.
// Candado de entornos: un build de pruebas no puede apuntar a producción, ni uno de producción a
// otro proyecto (packages/shared/entorno.js). En `expo start` local no se aplica.
const { revisarEntorno } = require('../../packages/shared/entorno');

module.exports = ({ config }) => {
  const entorno = revisarEntorno();
  return {
    ...config,
    android: {
      ...config.android,
      ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
    },
    extra: { ...config.extra, entorno: entorno.destino },
  };
};
