# Estado actual — Zipa lo tiene Beta 2

- **Fecha:** 18 de noviembre de 2026.
- **Versión revisada:** `main` en el commit `b9c2ecc`, limpia y sincronizada con GitHub.
- **Alcance:** informe basado en el código y en pruebas ejecutadas. No se implementó nada ni se tocó la base de datos remota.

**Cómo leer las marcas:**
- **[Verificado hoy]:** ejecutado el 18 de noviembre sobre `b9c2ecc`.
- **[Verificado 16-nov]:** prueba de la auditoría (`docs/AUDITORIA_BETA_2.md`, `pruebas/auditoria/resultados/`). El código móvil no cambió desde entonces: `git diff 40ad02a..HEAD` solo toca `apps/admin/package.json`, `package-lock.json` y documentos.
- **[Código]:** revisado leyendo el código.
- **[Manual]:** requiere una prueba manual o un dispositivo real.

---

## 1. Estado técnico

| Punto | Estado | Evidencia |
|---|---|---|
| Next.js | **16.4.5.** Actualizado el 18 de noviembre desde 16.4.3. `npm audit` ya no reporta `next` (antes: GHSA-mfr8-8qww-v76h). `next build` y `next dev` arrancan al primer intento | `apps/admin/package.json`; `next build` exit 0 [Verificado hoy] |
| Expo / React Native / React | Expo 58.0.25 · React Native 0.88.1 · React 19.3.0 · TypeScript 6.0.3 | `node_modules/*/package.json` [Verificado hoy] |
| Compilación del panel | OK, 16 rutas | `npx next build` exit 0 [Verificado hoy] |
| Compilación de clientes y negocios (Android) | OK: paquete Android exportado en las dos apps | `npx expo export --platform android` exit 0 [Verificado hoy] |
| Compatibilidad con Expo | `expo-doctor` 20/20 en las dos apps; dependencias al día | [Verificado 16-nov] |
| Typecheck y lint | OK en los 4 paquetes (admin, clientes, negocios y shared) | `npm run typecheck` y `npm run lint` exit 0 [Verificado hoy] |
| Migraciones de Supabase | **17** (`0001` a `0017`): 17 aplicadas en local y 17 en el proyecto remoto | `supabase/migrations/`; local [Verificado hoy]; remoto `migration list` [Verificado 16-nov] |
| Pruebas automáticas | **63/63** en 7 archivos (Jest) | `npm test` [Verificado hoy] |
| Pruebas de base de datos | Esquema OK; permisos con 284 comprobaciones por rol OK; 17/17 tablas públicas con RLS | `supabase/ci/verificar_esquema.sql`, `supabase/ci/probar_permisos.sql` [Verificado hoy] |
| Pruebas de seguridad contra las APIs | 34/34 | `pruebas/auditoria/resultados/seguridad.json` [Verificado 16-nov] |
| Pruebas funcionales en el navegador | 46 OK, 0 fallas, 2 pendientes de Android real | `pruebas/auditoria/resultados/funcional.json` [Verificado 16-nov] |
| GitHub Actions | Las 4 últimas ejecuciones en `main` (`b9c2ecc`, `ee1baeb`, `57e0cb4` y `79533bc`) terminaron en éxito, con los dos trabajos: calidad y migraciones | API de GitHub Actions [Verificado hoy]; `.github/workflows/ci.yml` |

---

## 2. Estado funcional

### Clientes: funciona completo [Verificado 16-nov, en la versión web]

| Función | Prueba |
|---|---|
| Inicio con «¿Qué buscas hoy?», Destacados, Los mejor calificados y Recién llegados | C01 |
| Búsqueda en el servidor por nombre (sin tildes), plato o producto y subcategoría; mensaje sin resultados | C02–C05 |
| Categorías con subcategorías, «Ver más» y orden por calificación | C06 |
| Ficha: logo, subcategoría, menú por secciones, precio y «No disponible hoy» | C07 |
| WhatsApp (`wa.me`) y «Cómo llegar» (mapa) | C08 |
| Reseñas de a 20 con «Ver más reseñas» | C09 |
| Galería del producto: video aprobado y hasta 4 fotos con descripción | C10 |
| Registro con aceptación de términos, entrada, sesión persistente, credenciales incorrectas y cierre de sesión | C11, C12, C14, C19 |
| Visita por QR, reseña con foto y sello, una sola reseña por persona (editable) | C15 |
| Reportar y bloquear | C16, C17 |
| Perfil: mis reseñas, documentos legales y «Acerca de» | C18 |
| Eliminar la cuenta (Edge Function) | C13, S32 |

### Negocios: funciona completo [Verificado 16-nov, en la versión web]

| Función | Prueba |
|---|---|
| Registro en 5 pasos: categoría, subcategoría, 3 etiquetas, verificación con foto y cédula o NIT, productos con fotos y video | N01 |
| Retomar el registro; la cédula no se guarda en el dispositivo | N02, N03 |
| Validaciones (precio obligatorio y otras) | N04 |
| Panel: estado, aviso de Destacado y pantalla del QR | N05, N06 |
| Logo: subir, cambiar y quitar; aviso si falla en el registro | N14, N15 |
| Responder reseñas | N08 |
| Productos y platos: crear, editar, borrar, «Disponible hoy», secciones, foto principal y fotos adicionales | N09, N10 |
| Editar los datos del negocio sin despublicarlo | N11 |
| Los cambios se ven en la app de clientes | N12 |

### Panel administrativo: funciona completo [Verificado 16-nov, y prueba de humo hoy con 16.4.5]

| Función | Prueba |
|---|---|
| Entrada protegida, verificación en dos pasos obligatoria y acceso solo para el equipo | A01–A03 |
| Revisar negocios (foto del local, cédula o NIT, videos y fotos), aprobar y rechazar con motivo | A04, A05 |
| Moderar videos, reseñas en espera y reportes | A06–A08 |
| Destacados (crear, programar y quitar) y categorías (crear, editar, ordenar, activar y borrar sin uso) | A09, A10 |
| Bitácora | A11 |
| Analítica con cifras que coinciden con la base | A12 |
| Sistema: estado y latencia de 4 servicios, y uso de la base | A13 |
| Sin claves privilegiadas en el navegador | A14 |
| Las 10 páginas responden 200 y destacar o quitar funciona con Next.js 16.4.5 | prueba de humo [Verificado hoy] |

### Implementado a medias

| Función | Qué hay y qué falta | Evidencia |
|---|---|---|
| Distancia al cliente | La interfaz la muestra si existe, pero siempre es `null`: la app no pide ubicación y su permiso está bloqueado | `packages/shared/src/api.ts:62`; `apps/clientes/app.json` (`ACCESS_FINE_LOCATION` en `blockedPermissions`) [Código] |
| 3D y realidad aumentada | La app abre un modelo con el visor del sistema si un producto tiene `model_url`, pero no hay cómo crear ni cargar modelos (solo con service role) | `apps/clientes/src/app/producto/[id].tsx` (`arUrl`); `docs/PROPUESTA_3D_Y_REALIDAD_AUMENTADA.md` [Código] |
| Búsqueda del inicio | Muestra hasta 30 resultados, sin «Ver más» (las categorías sí lo tienen) | `apps/clientes/src/lib/useSearch.ts:25` [Código] |
| QR del negocio | Usa el esquema `vitrinalocal://`, que solo abre la app si ya está instalada. Sin dominio no hay enlace universal | `apps/negocios/src/components/QrPoster.tsx` [Código] |
| Compartir el QR y la cámara | Implementados con `expo-sharing` y `expo-camera`; no probados en un dispositivo | N07, N13 [Manual] |
| Analítica | Solo la app de clientes envía eventos; la de negocios no está medida | `apps/clientes/src/app/_layout.tsx` (`AppOpen`), `packages/shared/src/analytics.ts` [Código] |
| Monitoreo | Sistema mide estado y latencia en el momento; no hay historial ni errores de las apps («No configurado») | `apps/admin/src/app/(panel)/sistema/page.tsx` [Código] |
| Gestión del equipo | Los roles (`admin_users`) solo se dan por SQL; no hay pantalla en el panel | `supabase/migrations/0008_roles_admin.sql` [Código] |

### No existe todavía

- **Recuperar la contraseña** («olvidé mi contraseña»): no hay ninguna llamada a `resetPasswordForEmail` en el código. Requiere SMTP (Paso 8). [Código]
- **Verificación del correo:** apagada, ver sección 5.
- Notificaciones push (sin `expo-notifications`), favoritos, inicio con Google o Apple, pedidos y pagos (fuera de alcance por decisión). [Código]
- **Builds de iOS:** solo hay builds de Android en EAS.
- Ambiente de pruebas separado (Paso 9).

---

## 3. Experiencia de usuario

| # | Problema | Evidencia | Tipo |
|---|---|---|---|
| UX1 | **Los íconos de las apps son los de la plantilla de Expo** (la «A» azul): es lo que se ve en el celular al instalar los APK | `apps/clientes/assets/icon.png` revisado (imagen de la plantilla). Negocios apunta a la misma ruta de la plantilla (`apps/negocios/assets/icon.png`, `android-icon-foreground.png`). Falta ver la imagen de negocios y la pantalla de inicio (splash) | [Código]; [Manual] para negocios y splash |
| UX2 | **«Plato» o «producto» según la categoría vieja.** La app de negocios decide el texto y si sugiere secciones del menú con `category === 'comer'`. Una cafetería (Restaurantes, categoría vieja `cafe_dulces`) ve «producto» y sin sugerencias de secciones, mientras la app de clientes la muestra como «Menú» (usa la categoría nueva) | `apps/negocios/src/components/ProductEditor.tsx:60`, `apps/negocios/src/app/producto/[id].tsx:48`, `panel.tsx:64`, `registro/productos.tsx:20`, `registro/vista-previa.tsx:19`, `qr.tsx:53`; `apps/clientes/src/app/producto/[id].tsx:66`. Lo correcto existe: `isRestaurant()` en `packages/shared/src/categories.ts:76` | [Código] |
| UX3 | **Textos que prometen 3D.** La política de privacidad y los términos para negocios hablan de «productos en 3D», y quedan componentes que muestran «N en 3D» (hoy siempre 0) | `packages/shared/src/legal/politica-privacidad.ts:36`, `terminos-negocios.ts:23`; `apps/clientes/src/components/BusinessRow.tsx:32`, `CarouselCard.tsx:15` | [Código] |
| UX4 | **Colores e ilustraciones por la categoría vieja.** Las portadas y la ilustración de plato usan 3 paletas (comer, artesanías, café y dulces), no las 12 subcategorías. Una heladería o una repostería se ve con la taza de café | `packages/shared/src/ui/PlateArt.tsx`, `businessCover()` en `categories.ts` | [Código] |
| UX5 | Los negocios **no tienen foto de portada**, solo logo y color. La ficha depende del logo para verse propia | `apps/clientes/src/components/Cover.tsx` | [Código] |
| UX6 | La búsqueda no ofrece «Ver más» después de 30 resultados (ver sección 2) | `useSearch.ts:25` | [Código] |
| UX7 | El panel no tiene ícono de pestaña (`favicon.ico` responde 404) | prueba de humo [Verificado hoy] | Bajo |
| — | Navegación: no se encontraron rutas rotas. Las 19 pruebas de clientes y las 15 de negocios navegan sin errores de consola | `funcional.json` [Verificado 16-nov] | — |

### Posibles errores en Android [Manual]

- **Foto de la reseña en Android 12 o anterior:** la app de clientes bloquea los permisos de almacenamiento y de cámara, y depende del selector de fotos del sistema (`apps/clientes/app.json`). En celulares sin el selector moderno podría no abrir.
- **Cámara y grabación de video sin sonido** en negocios: `expo-camera` con el micrófono bloqueado (`RECORD_AUDIO`). Hay que confirmar que graba y que el video se reproduce.
- **Compartir el QR:** `react-native-view-shot` y `expo-sharing`, sin probar en un dispositivo.
- **Peso de los APK:** 97,8 MB y 118,4 MB (incluyen todas las arquitecturas). En datos móviles, descargarlos es pesado. Un AAB de producción para Play pesa menos por dispositivo.
- **Videos:** `expo-video` con enlaces firmados de 1 hora (`api.videoUrl`). Si la pantalla queda abierta más de una hora, el video deja de cargar. [Código]

---

## 4. Dashboard y rendimiento

### Métricas reales

Todas salen de consultas a la base, sin valores inventados:
- **Resumen** (`admin_metrics`, migración 0008, y conteos directos):
  - cuentas, negocios por estado, reseñas y reportes;
  - videos pendientes y reseñas en espera.
- **Analítica** (`admin_analitica`, migración 0015):
  - aperturas, sesiones, búsquedas, vistas de negocios, productos y categorías;
  - toques en WhatsApp y en «Cómo llegar»;
  - lo más visto;
  - búsquedas frecuentes, solo si las hicieron 3 o más dispositivos.
- La prueba A12 comprobó que el panel muestra lo mismo que la base [Verificado 16-nov].

### Cómo se calculan los usuarios activos

- **Activos:** dispositivos distintos (`device_id` aleatorio por instalación) con algún evento en el periodo: 15 minutos, hoy (en hora de Colombia), 7 días o 30 días. No son cuentas; también cuentan personas sin sesión.
- **Cuentas registradas:** `auth.users`.
- **Cuentas activas en 30 días:** cuentas con `last_sign_in_at` en ese periodo.
- **«Últimos 15 minutos»** es una estimación, no una conexión en tiempo real. Así lo dice el panel.
- **Solo cuenta la app de clientes, y desde las versiones con analítica.** Los APK del 16 de noviembre ya la incluyen. [Código: `supabase/migrations/0015_analitica.sql`]

### Monitoreo

| Qué | Estado |
|---|---|
| Estado y latencia de la base, la API, Auth y Storage | Sí, medidos **en el momento** desde el servidor del panel. No hay historial |
| Uso de la base (tamaño, conexiones y tablas) | Sí (`admin_sistema`) |
| Errores de las apps instaladas | **No configurado**: no hay Sentry ni otro servicio |
| Rendimiento real en los celulares | No se mide |

### Pruebas de carga [Verificado 16-nov, `docs/PRUEBAS_DE_CARGA.md`]

**Entorno:** Supabase local en Docker, 16 núcleos y 31 GB de RAM, sin red.

| Usuarios | Solicitudes/s | Errores | Búsqueda p95 | Ficha p95 |
|---|---|---|---|---|
| 10 | 11,7 | 0 % | 29 ms | 4,1 ms |
| 50 | 56,9 | 0 % | 52 ms | 4,0 ms |
| 100 | 113,8 | 0 % | 109 ms | 4,0 ms |

La búsqueda es la operación más costosa. Su optimización (migración 0016) la llevó de 288 ms a 149 ms con 100 usuarios.

### Lo que falta para conocer el rendimiento en producción

1. Un proyecto de pruebas en Supabase con el mismo plan que producción (Paso 9), para repetir allí las cargas. Nunca contra el proyecto real.
2. Monitoreo de errores y de rendimiento en las apps (por ejemplo, Sentry).
3. Revisar los límites del plan de Supabase contratado: conexiones, ancho de banda de Storage para fotos y videos, y Edge Functions.
4. Una prueba de carga sobre Storage: descargas de fotos y videos. Hoy no se mide.

---

## 5. Seguridad y lanzamiento

| Punto | Estado | Evidencia |
|---|---|---|
| Verificación del correo | **Apagada en el proyecto real:** `mailer_autoconfirm: true`. Cualquiera crea cuenta con cualquier correo | `GET /auth/v1/settings` del proyecto, solo lectura [Verificado hoy] |
| Registro | Abierto a cualquiera; solo correo y contraseña (sin otros proveedores) | mismo endpoint [Verificado hoy] |
| Contraseñas | Mínimo de 6 caracteres y sin requisitos de complejidad (configuración local; en el proyecto real se revisa en el panel de Supabase) | `supabase/config.toml` [Código]; remoto [Manual] |
| Recuperar la contraseña | No existe (sección 2) | [Código] |
| Equipo | Verificación en dos pasos (TOTP) obligatoria; roles admin y revisor; todas las funciones del equipo exigen sesión con segundo factor (`aal2`) | `0008_roles_admin.sql`; pruebas A03 y S26 |
| RLS | 17/17 tablas públicas con RLS; 284 comprobaciones de permisos por rol; 34 ataques contra las APIs bloqueados | [Verificado hoy] y [Verificado 16-nov] |
| Claves | En las apps y el panel solo está la clave pública (`sb_publishable_…`). La clave privilegiada solo vive en las Edge Functions. No hay secretos en Git ni en el historial | auditoría [Verificado 16-nov] |
| Ambientes | **Un solo proyecto** (`auilsjqprobmhusvxmmz`): desarrollo, APK de prueba y producción comparten la base. Los APK escriben datos reales | `eas env:list preview` [Verificado 16-nov] |
| Contraseña de la base | Pendiente de rotar antes del Paso 9 (tarea del usuario) | plan de infraestructura |
| Datos legales | **12 marcadores pendientes** (`[NOMBRE…]`, `[NIT…]`, `[CORREO…]`, `[CIUDAD]`) en 3 documentos, más la mención de 3D (UX3) | `packages/shared/src/legal/` [Verificado hoy] |

### Requisitos para publicar

Son requisitos generales de las tiendas. Conviene confirmar los vigentes al momento de publicar.

**Google Play:**
- cuenta de desarrollador;
- build de producción en formato AAB (el perfil `production` ya existe en `eas.json`);
- **política de privacidad en una URL pública**, que hoy no existe (no hay web pública ni dominio);
- formulario de seguridad de datos y clasificación de contenido;
- ícono y capturas propios (UX1);
- en cuentas personales nuevas, una prueba cerrada con testers antes de producción.

**App Store:**
- cuenta de Apple Developer;
- build de iOS (hoy no existe);
- política de privacidad en una URL;
- etiquetas de privacidad;
- una cuenta de demostración para la revisión;
- moderación de contenido de usuarios: reportar, bloquear y términos (ya existen);
- eliminar la cuenta dentro de la app (ya existe).

**Para las dos tiendas:**
- datos legales completos;
- nombres internos definitivos, porque no se pueden cambiar después;
- verificación del correo y recuperación de contraseña (Paso 8).

---

## 6. APK

| | Clientes | Negocios |
|---|---|---|
| Último build | `ffd402ea`, FINISHED, perfil `preview`, commit `40ad02a`, 17-nov 03:21 UTC | `8c13192d`, FINISHED, perfil `preview`, commit `40ad02a`, 17-nov 03:22 UTC |
| Descarga | https://expo.dev/artifacts/eas/FMAv9V-0Uj-CrJzTalXrtMWSiIKK6gkhUzNza9Pso88.apk | https://expo.dev/artifacts/eas/KMeQ-cdITbIU8-eR-wI5J08KTcjfUlPVOLpduUFFcgo.apk |
| Builds anteriores | `45449c18` (16-nov) | `eaf731a3` (16-nov), `bbfba010` (9-nov) |

[Verificado hoy] con `eas build:list`.

- **¿Corresponden al código actual?** Sí. Desde `40ad02a` no cambió nada de clientes, negocios ni `packages/shared` (`git diff --name-only 40ad02a..HEAD`).
- **¿Se pueden generar nuevos?**
  - Sí: el perfil `preview` está listo, la sesión de EAS está activa (`luisdev1796`) y la cuota es del plan gratuito, con 5/30 builds usados en noviembre [Verificado 16-nov + 2 builds].
  - Hoy no hace falta, salvo que se corrijan UX1 o UX2.
  - Un build nuevo requiere autorización.
- **Qué impide probarlos en un dispositivo físico:**
  - En el PC no hay `adb` ni emulador.
  - Hay que instalarlos en el celular desde el enlace, permitiendo «orígenes desconocidos».
  - Escriben en la base real (no hay ambiente de pruebas).
  - No hay versión para iPhone.

---

## 7. Plan de trabajo

### Pendientes clasificados

| Prioridad | Pendiente |
|---|---|
| **Crítico** (bloquea el lanzamiento público) | **C1.** Ambiente de pruebas separado del real (Paso 9). Hoy los APK de prueba escriben datos reales |
| | **C2.** Verificación de correo y recuperación de contraseña (Paso 8: dominio y SMTP) |
| | **C3.** Datos legales completos y política de privacidad en una URL pública |
| **Alto** | **A1.** Íconos y pantalla de inicio propios (hoy los de la plantilla de Expo) — UX1 |
| | **A2.** Probar en un Android real la cámara, el video, compartir el QR y la foto de la reseña en Android 12 o anterior |
| | **A3.** Monitoreo de errores de las apps |
| | **A4.** Nombres internos definitivos antes de publicar |
| **Medio** | **M1.** «Plato» o «producto» y sugerencias del menú según la categoría nueva — UX2 |
| | **M2.** Quitar la promesa de 3D de los textos legales y de las tarjetas — UX3 |
| | **M3.** Paleta e ilustración por categoría principal o subcategoría — UX4 |
| | **M4.** «Ver más» en los resultados de búsqueda — UX6 |
| | **M5.** Contraseña con más requisitos y protección contra contraseñas filtradas |
| | **M6.** Analítica también en la app de negocios |
| **Bajo** | **B1.** Ícono de pestaña del panel |
| | **B2.** Avisos moderados de `npm audit` en herramientas de desarrollo (Jest y Expo) |
| | **B3.** Gestión del equipo desde el panel (hoy por SQL) |
| | **B4.** Distancia y ubicación, y portada con foto del negocio |
| | **B5.** Renovar el enlace del video si la pantalla queda abierta más de 1 hora |

### Las 5 tareas de mayor impacto

1. **Probar los APK en un Android real (A2).** Es lo único que falta para confirmar la estabilidad en el dispositivo: cámara, video, QR y fotos. Lo hace el usuario; los hallazgos se corrigen después.
2. **Íconos propios de las apps (A1).** Es lo primero que ve la persona al instalar. Se puede hacer con el logo actual mientras llega el definitivo. Requiere un build nuevo.
3. **Coherencia de «plato» y «producto» y de las secciones del menú (M1).** Corrige una experiencia confusa en cafeterías y en cualquier subcategoría nueva. Es un cambio pequeño: usar `isRestaurant()`, que ya existe.
4. **Paso 8: dominio, SMTP, verificación de correo y recuperación de contraseña (C2).** Sin esto, una persona que olvide su contraseña pierde la cuenta, y el registro acepta cualquier correo.
5. **Paso 9: proyecto de pruebas separado (C1),** con su ambiente en EAS. Permite probar APK y cargas sin tocar datos reales, y repetir las pruebas de carga en condiciones parecidas a producción.

Después siguen el monitoreo de errores (A3) y los textos sin la promesa de 3D (M2), que son rápidos.

---

## Anexo: comandos ejecutados hoy

```text
git log / git status / git diff --name-only 40ad02a..HEAD
npm run typecheck · npm run lint · npm test            → 0 · 0 · 63/63
npx next build (apps/admin)                            → exit 0
npx expo export --platform android (clientes, negocios) → exit 0 y exit 0
supabase db reset --local + verificar_esquema.sql + probar_permisos.sql → OK
API de GitHub Actions (últimas 4 en main)              → éxito
eas build:list --platform android (las dos apps)       → builds del 17-nov FINISHED
GET <proyecto>/auth/v1/settings (solo lectura)         → mailer_autoconfirm: true, solo correo
prueba de humo del panel 16.4.5 (local, puerto 3001)    → 10 páginas 200, MFA y destacar OK
```
