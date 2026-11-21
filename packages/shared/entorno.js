// Candado de entornos para las compilaciones de EAS (lo usan apps/*/app.config.js; JavaScript simple,
// sin TypeScript, porque se ejecuta al compilar).
//
// Regla:
// - Perfil `production`  -> la app DEBE apuntar al proyecto de producción.
// - Cualquier otro perfil (`preview`, `development`) -> NO puede apuntar a producción.
// Si no se cumple, la compilación se detiene con un mensaje claro.
//
// Excepción consciente: ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS=1 deja compilar un `preview` contra
// producción (como los APK de Beta 2.2, mientras no exista el entorno de pruebas). Solo con
// autorización expresa; queda escrito en el registro del build.
// En desarrollo local (`expo start`, sin EAS_BUILD_PROFILE) no se aplica: Expo Go usa el .env local.

const PROYECTO_PRODUCCION = 'auilsjqprobmhusvxmmz';

function revisarEntorno(env = process.env) {
  const perfil = env.EAS_BUILD_PROFILE;
  if (!perfil) return { perfil: null, destino: 'local' };
  const url = env.EXPO_PUBLIC_SUPABASE_URL || '';
  const apuntaAProduccion = url.includes(PROYECTO_PRODUCCION);
  if (!url) throw new Error(`[Zipa] El build "${perfil}" no tiene EXPO_PUBLIC_SUPABASE_URL. Revisa las variables del ambiente de EAS.`);
  if (perfil === 'production' && !apuntaAProduccion) {
    throw new Error(`[Zipa] El build de producción no apunta al proyecto de producción (${PROYECTO_PRODUCCION}). Revisa el ambiente "production" de EAS.`);
  }
  if (perfil !== 'production' && apuntaAProduccion) {
    if (env.ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS === '1') {
      console.warn(`[Zipa] ATENCIÓN: build "${perfil}" contra PRODUCCIÓN por ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS=1.`);
      return { perfil, destino: 'produccion' };
    }
    throw new Error(`[Zipa] El build "${perfil}" apunta a PRODUCCIÓN (${PROYECTO_PRODUCCION}). Usa el proyecto de pruebas en el ambiente "${perfil}" de EAS, o, solo con autorización, ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS=1.`);
  }
  return { perfil, destino: apuntaAProduccion ? 'produccion' : 'pruebas' };
}

module.exports = { revisarEntorno, PROYECTO_PRODUCCION };
