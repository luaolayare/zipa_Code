// Candado de entornos para las compilaciones de EAS (lo usan apps/*/app.config.js; JavaScript simple,
// sin TypeScript, porque se ejecuta al compilar).
//
// Regla:
// - Perfiles `production` y `production-apk` -> la app DEBE apuntar al proyecto de producción.
// - Cualquier otro perfil (`preview`, `development`) -> NO puede apuntar a producción.
// Si no se cumple, la compilación se detiene con un mensaje claro.
//
// Excepción consciente: ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS=1 deja compilar un `preview` contra
// producción (como los APK de Beta 2.2, mientras no exista el entorno de pruebas). Solo con
// autorización expresa; queda escrito en el registro del build.
// En desarrollo local (`expo start`, sin EAS_BUILD_PROFILE) tampoco se permite producción, sin excepción:
// el .env local debe ser el del proyecto de pruebas (o Supabase local).

const PROYECTO_PRODUCCION = 'auilsjqprobmhusvxmmz';
// Perfiles de EAS de producción: el AAB para Google Play y el APK release (mismo código y entorno).
const PERFILES_PRODUCCION = ['production', 'production-apk'];

function revisarEntorno(env = process.env) {
  // En el servidor de EAS llega EAS_BUILD_PROFILE. Al lanzar `eas build`, el CLI evalúa la configuración
  // en el computador sin esa variable, pero con el `env` del perfil (eas.json), donde cada perfil declara su
  // nombre en ZIPA_PERFIL_EAS. `expo start` no tiene ninguna de las dos: es desarrollo local.
  const perfil = env.EAS_BUILD_PROFILE || env.ZIPA_PERFIL_EAS;
  const url = env.EXPO_PUBLIC_SUPABASE_URL || '';
  const apuntaAProduccion = url.includes(PROYECTO_PRODUCCION);
  // Desarrollo local (`expo start`, Expo Go): solo pruebas o Supabase local, nunca producción (sin excepción).
  if (!perfil) {
    if (apuntaAProduccion) {
      throw new Error(`[Zipa] El desarrollo local apunta a PRODUCCIÓN (${PROYECTO_PRODUCCION}). Pon en apps/<app>/.env las variables del proyecto de PRUEBAS.`);
    }
    return { perfil: null, destino: 'local' };
  }
  // Primera lectura del CLI de EAS en el computador (solo busca el id del proyecto, todavía sin las variables
  // del ambiente): no hay nada que revisar. En el servidor de EAS (EAS_BUILD_PROFILE) la URL es obligatoria.
  if (!url && !env.EAS_BUILD_PROFILE) return { perfil, destino: 'pendiente' };
  if (!url) throw new Error(`[Zipa] El build "${perfil}" no tiene EXPO_PUBLIC_SUPABASE_URL. Revisa las variables del ambiente de EAS.`);
  const esProduccion = PERFILES_PRODUCCION.includes(perfil);
  if (esProduccion && !apuntaAProduccion) {
    throw new Error(`[Zipa] El build de producción no apunta al proyecto de producción (${PROYECTO_PRODUCCION}). Revisa el ambiente "production" de EAS.`);
  }
  if (!esProduccion && apuntaAProduccion) {
    if (env.ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS === '1') {
      console.warn(`[Zipa] ATENCIÓN: build "${perfil}" contra PRODUCCIÓN por ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS=1.`);
      return { perfil, destino: 'produccion' };
    }
    throw new Error(`[Zipa] El build "${perfil}" apunta a PRODUCCIÓN (${PROYECTO_PRODUCCION}). Usa el proyecto de pruebas en el ambiente "${perfil}" de EAS, o, solo con autorización, ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS=1.`);
  }
  return { perfil, destino: apuntaAProduccion ? 'produccion' : 'pruebas' };
}

// Candado del panel del equipo (apps/admin, Next.js). Lo usa apps/admin/next.config.ts.
// - `next dev` (desarrollo): solo pruebas o Supabase local, nunca producción, sin excepción.
// - `next build` / `next start`: producción SOLO si el entorno lo declara con ZIPA_ENTORNO=produccion;
//   con esa variable, el panel DEBE apuntar a producción. Sin ella, no puede apuntar a producción.
function revisarEntornoPanel(env = process.env, { desarrollo = false } = {}) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || '';
  const apuntaAProduccion = url.includes(PROYECTO_PRODUCCION);
  if (desarrollo) {
    if (apuntaAProduccion) {
      throw new Error(`[Zipa] El panel en desarrollo apunta a PRODUCCIÓN (${PROYECTO_PRODUCCION}). Pon las variables del proyecto de PRUEBAS en apps/admin/.env.development.local.`);
    }
    return { destino: 'pruebas' };
  }
  if (env.ZIPA_ENTORNO === 'produccion') {
    if (!apuntaAProduccion) {
      throw new Error(`[Zipa] ZIPA_ENTORNO=produccion, pero el panel no apunta al proyecto de producción (${PROYECTO_PRODUCCION}).`);
    }
    return { destino: 'produccion' };
  }
  if (apuntaAProduccion) {
    throw new Error(`[Zipa] El panel apunta a PRODUCCIÓN (${PROYECTO_PRODUCCION}) sin declarar el entorno. Solo un entorno de producción con ZIPA_ENTORNO=produccion puede usarla.`);
  }
  return { destino: 'pruebas' };
}

module.exports = { revisarEntorno, revisarEntornoPanel, PROYECTO_PRODUCCION };
