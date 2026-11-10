# Zipa lo tiene (zipa_Code)

> Antes se llamaba Vitrina Local. El nombre y la ciudad están en `packages/shared/src/brand.ts`.

Lee también `AGENTS.md` (reglas de Expo: usar `npx expo install`, no confiar en APIs de memoria).

## Qué es
Directorio de restaurantes y emprendimientos locales para turistas, con productos en 3D y reseñas.
Son **dos apps móviles** (iOS y Android), sin panel web: todo se hace desde el celular.

- `apps/negocios`: el negocio se registra (5 pasos: cuenta, datos, verificación, productos en 3D, vista previa) y administra su panel.
- `apps/clientes`: el turista explora, busca por nombre, ve lo más destacado por categoría, ve productos en 3D y califica.
- `packages/shared`: tema, tipos, acceso a datos (`createApi`), sesión (`AuthProvider`) y componentes de UI comunes.
- `supabase/migrations`: esquema de base de datos.

## Reglas del proyecto
- Textos de la interfaz en español (Colombia).
- Lógica y UI reutilizable van en `packages/shared`; cada app solo tiene sus pantallas.
- Sin variables de Supabase, las apps usan datos de ejemplo (`demo.ts`) **solo en desarrollo** (`__DEV__`). En producción muestran un error: nunca datos inventados.
- Antes de terminar una tarea: `npm run typecheck` desde la raíz.
