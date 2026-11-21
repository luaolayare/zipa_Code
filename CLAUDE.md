# LocalmenteTuyo (zipa_Code)

> Antes se llamaba «Zipa lo tiene» y, antes, Vitrina Local. La marca y el eslogan están en `packages/shared/src/brand.ts`.
> Paquetes Android definitivos: `com.localmentetuyo.app` y `com.localmentetuyo.negocios`. Los slugs y proyectos de EAS, Firebase y Supabase y los esquemas antiguos (`vitrinalocal://`, para QR impresos) siguen con el nombre anterior: no cambiarlos sin autorización.
> Las ciudades se activan desde el panel (tabla `cobertura_municipios`, migración 0024); hoy solo Zipaquirá está activa.

Lee también `AGENTS.md` (reglas de Expo: usar `npx expo install`, no confiar en APIs de memoria).

## Qué es
Directorio de restaurantes y emprendimientos locales de Colombia, ciudad por ciudad (hoy solo Zipaquirá), con catálogo, reseñas y reservas.

## Arquitectura definitiva
- **Dos apps móviles independientes en Expo** (iOS y Android), en este monorepo con npm workspaces:
  - `apps/clientes`: el turista explora, busca por nombre, ve lo más destacado por categoría, ve productos en 3D y califica.
  - `apps/negocios`: el negocio se registra (5 pasos: cuenta, datos, verificación, productos en 3D, vista previa) y administra su panel.
- `packages/shared`: tema, tipos, acceso a datos (`createApi`), sesión (`AuthProvider`), textos legales, moderación y componentes de UI comunes.
- **Backend: Supabase** (Postgres con RLS, Auth, Storage y Edge Functions). No hay backend propio.
  - `supabase/migrations`: esquema versionado. Todo cambio de base de datos va en una migración nueva; nunca cambios manuales desde el panel.
  - `supabase/functions`: Edge Functions (Deno).
- **Panel administrativo privado en Next.js** (futuro `apps/admin`): solo para el equipo, con su propia cuenta y rol de administrador. Nunca usa la *service role key* en el navegador.
- **Sin web pública.** La vista web de Expo (`npm run clientes:web`) es solo para revisar pantallas en desarrollo.
- **Fuera de alcance por ahora:** Spring Boot, AWS, microservicios o cualquier backend independiente.

Plan vigente de infraestructura: `docs/PLAN_FASE_1_INFRAESTRUCTURA.md` (se avanza paso a paso, con autorización).

## Reglas del proyecto
- Textos de la interfaz en español (Colombia).
- Lógica y UI reutilizable van en `packages/shared`; cada app solo tiene sus pantallas.
- Sin variables de Supabase, las apps usan datos de ejemplo (`demo.ts`) **solo en desarrollo** (`__DEV__`). En producción muestran un error: nunca datos inventados.
- Nunca subir credenciales: los `.env` y `supabase/.env.local` están ignorados por Git.
- Antes de terminar una tarea: `npm run typecheck` desde la raíz.
