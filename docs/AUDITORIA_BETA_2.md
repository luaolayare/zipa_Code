# Auditoría técnica y funcional — Zipa lo tiene Beta 2

- **Fecha:** 16 de noviembre de 2026.
- **Versión auditada:** `main` en el commit `57e0cb4` (17 migraciones).
- **Rama con correcciones:** `audit/beta-2` (local, todavía sin subir).

## Cómo leer este informe

Cada verificación indica cómo se probó:

- **[Auto]:** probado automáticamente con pruebas ejecutadas y resultado verificable.
- **[Navegador]:** recorrido real en el navegador (Playwright), contra Supabase local. Las apps móviles se probaron en su versión web.
- **[Código]:** revisado solo leyendo el código.
- **[Pendiente]:** no se pudo probar por falta de un dispositivo Android real o de acceso.

**Entorno:** todo se ejecutó contra Supabase local en Docker, con 17 migraciones y Edge Functions locales. **No se modificó el Supabase real** ni se borraron datos reales. Las apps del usuario (puertos 8081, 8082 y 3000) no se tocaron. Las pruebas usaron copias en los puertos 8083, 8084 y 3001.

---

## 1. Verificación del repositorio (Fase 1)

| Punto | Resultado |
|---|---|
| Rama y estado | `main` limpio y sincronizado con `origin/main`. Queda un `stash` con una edición accidental de `ci.yml`, idéntica a lo que ya está en `main`: se puede borrar |
| Versiones | Expo 58.0.25 · React Native 0.88.1 · React 19.3.0 · Next.js 16.4.3 · supabase-js 2.119.0 · @supabase/ssr 0.12.7 · TypeScript 6.0.3 · Jest 30.5.2 · Supabase CLI 3.2.0 local (CI fija 3.1.0) · Node 24.18.0 · eas-cli 27.10.0 |
| Aplicaciones | `apps/clientes` y `apps/negocios` (Expo Router), `apps/admin` (Next.js con proxy de sesión) y `packages/shared` |
| Migraciones | 17 archivos (`0001` a `0017`). **Local:** 17 aplicadas. **Remoto:** 17 aplicadas (`migration list --remote`, solo lectura) |
| Pruebas automáticas | Se reportaban 60 y había 60, en 6 archivos. Con la prueba de regresión agregada en esta auditoría son **63 en 7 archivos** |
| GitHub Actions | `ci.yml` con dos trabajos. **«Typecheck, lint y pruebas»:** typecheck, lint, Jest y `expo install --check`. **«Migraciones de Supabase»:** aplica todas las migraciones en una base desechable, verifica el esquema y prueba los permisos |
| EAS | Las dos apps tienen los perfiles `development`, `preview` (APK, distribución interna) y `production`. `appVersionSource: remote`. Cuenta `luisdev1796` |
| Identificadores | Clientes: «Zipa lo tiene», `co.zipa.vitrinalocal`. Negocios: «Zipa lo tiene Negocios», `co.zipa.vitrinanegocios`. Sin cambios |
| Ambientes | **Hay un solo proyecto de Supabase** (`auilsjqprobmhusvxmmz`). El ambiente `preview` de EAS y los `.env` locales apuntan a él. No existe un ambiente de pruebas separado (ver H1) |
| Variables de entorno | Solo `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` (apps), y `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (panel). Los `.env` con valores reales no están en Git; solo los `.env.example` |
| Credenciales en el repositorio | **Ninguna.** Se buscaron JWT, `sb_secret_`, `sbp_`, llaves privadas, claves de AWS y tokens de GitHub, en los archivos rastreados y en todo el historial. Tampoco hay referencias a la clave `service_role` en el código de las apps ni en `packages` |

## 2. Pruebas automáticas (Fase 6)

| Prueba | Comando | Resultado |
|---|---|---|
| Typecheck (4 paquetes) | `npm run typecheck` | OK [Auto] |
| ESLint (4 paquetes) | `npm run lint` | OK, 0 problemas [Auto] |
| Pruebas unitarias | `npm test` | **63/63 OK**, 7 archivos [Auto] |
| Build de Next.js | `npx next build` (panel) | Compila 16 rutas. **El primer intento termina con error** (`SecurityFatalError`, ver H2); el segundo termina bien [Auto] |
| Compatibilidad con Expo | `npx expo install --check` | Dependencias al día en las dos apps [Auto] |
| Diagnóstico de Expo | `npx expo-doctor` | 20/20 en clientes y 20/20 en negocios [Auto] |
| Migraciones | `supabase db reset --local` | 17/17 aplicadas [Auto] |
| Esquema | `supabase/ci/verificar_esquema.sql` | OK [Auto] |
| Permisos y RLS | `supabase/ci/probar_permisos.sql` | OK, 284 comprobaciones por rol (anónimo, turista, dueña, revisora, admin con y sin MFA) [Auto] |

## 3. Seguridad contra las APIs reales (Fase 5)

`pruebas/auditoria/seguridad-local.js` usa sesiones reales de distintos usuarios contra PostgREST, Storage y las Edge Functions locales. Resultado: **34/34 OK** [Auto]. Detalle en `pruebas/auditoria/resultados/seguridad.json`.

| Área | Qué se intentó (y fue bloqueado, salvo que diga «SÍ») |
|---|---|
| Documentos privados | Leer la cédula o NIT sin sesión o de otro negocio. Descargar u obtener enlace firmado de la foto de verificación ajena |
| Videos pendientes | Verlos o descargarlos sin aprobación, sin sesión o con sesión de turista |
| Archivos | Subir a la carpeta de otro dueño en `productos`, `negocios`, `resenas` y `verificaciones` |
| Negocios | Editar un negocio ajeno. Publicarse a sí mismo. Poner como logo una imagen externa |
| Calificaciones | Insertar reseñas sin las reglas. Cambiar estrellas directamente. Que la dueña califique su negocio o edite reseñas de clientes. Calificar con una cuenta de menos de 24 h. **SÍ:** calificar con la función de reseñas; calificar de nuevo edita la misma reseña (1 por persona) |
| Videos | Que la dueña apruebe su propio video |
| Funciones del equipo | Que un turista use `admin_destacar`, `admin_revisar_video`, `admin_analitica` o `admin_guardar_categoria`. Que una admin **sin MFA** las use |
| Edge Functions | `revisar-negocio`: sin sesión responde 401; con turista o admin sin MFA, 403; el negocio sigue en revisión. `eliminar-cuenta`: sin sesión responde 401 |
| Eliminar cuenta | **SÍ:** con sesión propia borra el usuario, su negocio, su reseña y sus 3 archivos (antes 3 archivos y 1 reseña; después 0 en todo) |
| Analítica | Nadie lee los eventos por la API |
| Secretos en el navegador | [Navegador] En los 18 archivos JS del panel solo aparece la clave pública `anon`. No hay `service_role` ni `sb_secret` (prueba A14) |

## 4. Pruebas funcionales de las tres apps (Fases 2, 3 y 4)

`pruebas/auditoria/auditoria-funcional.js` recorre la app de clientes, la de negocios y el panel en el navegador, y comprueba cada resultado en la base de datos. **Resultado final: 48 pruebas, 46 OK, 0 fallas, 2 no probadas.** Detalle en `pruebas/auditoria/resultados/funcional.json`. Errores de consola: 0.

### App de clientes [Navegador]

| ID | Prueba | Resultado |
|---|---|---|
| C01 | Inicio con «¿Qué buscas hoy?», Destacados, Los mejor calificados y Recién llegados | OK |
| C02 | Búsqueda por nombre sin tildes («fogon» → «Fogón») | OK |
| C03 | Búsqueda por plato o producto | OK |
| C04 | Búsqueda por subcategoría | OK |
| C05 | Búsqueda sin resultados con mensaje | OK |
| C06 | Categoría: «Ver más» carga más y el filtro por subcategoría funciona | OK |
| C07 | Ficha: logo, subcategoría, menú por secciones, precio y «No disponible hoy» | OK |
| C08 | WhatsApp abre `wa.me` con el número; «Cómo llegar» abre el mapa | OK |
| C09 | Reseñas de a 20 con «Ver más reseñas» (20 → 25) | OK |
| C10 | Galería de 4 (video aprobado y 3 fotos) que se desliza, con descripción | OK, tras la corrección M2 |
| C11 | Credenciales incorrectas muestran un mensaje claro | OK |
| C12 | El registro exige aceptar los términos y guarda la aceptación | OK |
| C13 | «Eliminar mi cuenta» borra la cuenta (Edge Function) | OK |
| C14 | Iniciar sesión; la sesión sigue tras recargar | OK |
| C15 | El QR registra la visita; reseña con foto y sello; editar no duplica | OK |
| C16 | Reportar una reseña crea el reporte | OK |
| C17 | Bloquear oculta las reseñas de esa persona | OK |
| C18 | Perfil: Mis reseñas, términos, Acerca de (SCALIX Cloud, Luis Alfredo Olaya) | OK |
| C19 | Cerrar sesión deja el perfil como invitado | OK |

### App de negocios [Navegador]

| ID | Prueba | Resultado |
|---|---|---|
| N01 | Registro en 5 pasos: categoría, 3 etiquetas, verificación, producto con video pendiente y foto adicional | OK |
| N02 | El registro se retoma tras recargar | OK |
| N03 | La cédula o NIT **no** queda guardada en el dispositivo | OK |
| N04 | Precio obligatorio validado | OK |
| N05 | El panel muestra «En revisión» | OK |
| N14 | Si el logo no se puede subir, el panel lo avisa | OK, tras la corrección M1 |
| N15 | Subir el logo desde el panel («+ Logo») | OK |
| N06 | Panel publicado: aviso de Destacado y pantalla del QR | OK |
| N08 | Responder una reseña | OK |
| N09 | «Disponible hoy» con un toque | OK |
| N10 | Plato: crear (sección y precio), editar precio y borrar (con su foto) | OK |
| N11 | Editar el horario sin despublicar | OK |
| N12 | Los cambios se ven en la app de clientes | OK |
| N07 | Guardar o compartir la imagen del QR | **Pendiente:** usa el menú de compartir del celular |
| N13 | Cámara: tomar foto y grabar video sin sonido | **Pendiente:** requiere Android real. En la web se probaron la galería y «usar un video que ya tengo» |

### Panel del equipo [Navegador]

| ID | Prueba | Resultado |
|---|---|---|
| A01 | Sin sesión, `/negocios` redirige a `/entrar` | OK |
| A02 | Una cuenta que no es del equipo termina en `/sin-acceso` | OK |
| A03 | MFA obligatorio: sin segundo factor no entra; un código incorrecto se rechaza | OK |
| A04 | Ficha con foto del local, cédula o NIT, video y fotos. Aprobar publica el negocio, aprueba el video y borra la foto del local | OK |
| A05 | Rechazar exige un motivo (mínimo 10 caracteres) y lo guarda | OK |
| A06 | Aprobar un video desde «Videos» | OK |
| A07 | Reseña en espera: «No publicar» la rechaza | OK |
| A08 | Descartar un reporte | OK |
| A09 | Destacar un negocio y quitarlo | OK |
| A10 | Crear y borrar una subcategoría sin uso | OK |
| A11 | Bitácora con las acciones del equipo | OK |
| A12 | Las cifras de Analítica coinciden con la base. Separa cuentas registradas de dispositivos activos | OK |
| A13 | Sistema: 4 servicios con latencia medida; lo no medido dice «No configurado» o «Sin datos» | OK |
| A14 | Sin claves privilegiadas en el navegador | OK |

## 5. Rendimiento (Fase 7)

Se repitieron los perfiles de `docs/PRUEBAS_DE_CARGA.md` con el mismo escenario k6 y en el mismo entorno local aislado. Los datos eran 259 negocios, 2.518 productos y 5.108 reseñas (la semilla más los datos de la auditoría). No se ejecutó nada contra Supabase remoto.

| Usuarios | Solicitudes/s | Errores | p95 general | Búsqueda p50 / p95 / máx. | Ficha p95 | Reseñas p95 |
|---|---|---|---|---|---|---|
| 10 | 11,7 | 0 % | 21,6 ms | 18,8 / 29,2 / 53 ms | 4,1 ms | 4,1 ms |
| 50 | 56,9 | 0 % | 21,1 ms | 17,6 / 52,0 / 133 ms | 4,0 ms | 3,8 ms |
| 100 | 113,8 | 0 % | 22,7 ms | 18,1 / **108,9** / 327 ms | 4,0 ms | 3,7 ms |

**Comparación con lo documentado:**
- Con 100 usuarios, el informe anterior registraba búsqueda p95 de 149 ms y 0 % de errores. Ahora: 109 ms y 0 %.
- Se reproduce la ausencia de errores y el orden de magnitud. La diferencia en la búsqueda es variación normal entre corridas en el mismo equipo; no indica una mejora del código.

**Condiciones y límites:**
- Se midió en el computador de desarrollo (16 núcleos y 31 GB de RAM), sin red de por medio.
- **No dice cuántos usuarios aguanta el proyecto real de Supabase.**
- El script de carga descarga todas las reseñas de la ficha; la app ahora pide 20. En la práctica, la app hace menos trabajo que la prueba.

Resultados en `pruebas/auditoria/resultados/perfil-*.json`.

## 6. Problemas encontrados

### Crítico
Ninguno.

### Alto

| # | Problema | Evidencia | Estado |
|---|---|---|---|
| H1 | **No hay ambiente de pruebas separado.** El perfil `preview` de EAS (con el que se generarían los APK) y los `.env` apuntan al único proyecto de Supabase, el real. Un APK de pruebas escribiría en los mismos datos que usarán los negocios reales | `eas env:list preview`: la URL es igual a la del `.env` (comparada sin mostrarla), proyecto `auilsjqprobmhusvxmmz` | **Pendiente de decisión.** Opciones: (a) crear el proyecto de pruebas (Paso 9) antes de los APK, o (b) generar los APK contra el proyecto actual, aceptando que es el real |
| H2 | **Next.js 16.4.3 tiene una vulnerabilidad conocida** (GHSA-mfr8-8qww-v76h, moderada, en `'use cache'` con `unstable_cache`). El panel **no usa** esa función: revisado en código, sin coincidencias. Pero la herramienta de Next.js **detiene** `next dev` y `next build` en el primer intento | `next build`: `SecurityFatalError` y salida 1; el segundo intento sale 0 | **Resuelto el 18 de noviembre:** `next` y `eslint-config-next` pasaron a 16.4.5 (15 días de publicada; la 16.4.6 tenía 9 y no cumplía la regla). `npm audit` ya no reporta `next`. `next build` y `next dev` arrancan al primer intento. Prueba de humo contra Supabase local: MFA, las 10 páginas responden 200, destacar y quitar funciona, Sistema 4/4 |

### Medio

| # | Problema | Evidencia | Estado |
|---|---|---|---|
| M1 | **El fallo al subir el logo en el registro se perdía en silencio.** El negocio quedaba sin logo y nadie lo sabía | N01/N14: logo en la base = `false` y sin ningún aviso | **Corregido:** el registro continúa y el panel muestra «No pudimos subir tu logo. Agrégalo desde Tus datos». Verificado (N14 y N15) |
| M2 | **La galería del producto no empezaba en el primer elemento.** El video aprobado llegaba después de las fotos y se insertaba delante; en la web, la galería quedaba en la 2.ª posición | C10: contador «2 de 4» al abrir | **Corregido:** la pantalla se muestra cuando ya se sabe si hay video, y la posición solo se calcula con el ancho medido. Prueba de regresión `gallery-test.ts` (3 casos). Verificado (C10) |
| M3 | **Verificación de correo apagada.** Cualquiera crea cuenta con cualquier correo | Configuración de Auth; Paso 8 pendiente | Pendiente: requiere dominio y SMTP |
| M4 | **Faltan los datos legales.** Hay 12 marcadores (`[NOMBRE…]`, `[NIT…]`, `[CORREO…]`, `[CIUDAD]`) en términos para clientes, términos para negocios y política de privacidad | `grep` en `packages/shared/src/legal` | Pendiente: datos del responsable |
| M5 | **La foto de la reseña en Android 12 o anterior** usa el selector del sistema y la app bloquea los permisos de almacenamiento. En celulares antiguos sin el selector moderno podría no abrir | `app.json` de clientes [Código] | Pendiente: probar en un Android real |

### Bajo

| # | Problema | Estado |
|---|---|---|
| B1 | En la versión **web** de desarrollo, recargar a mitad del registro pierde los archivos ya elegidos, porque son temporales del navegador. No aplica a la app Android; con M1, al menos queda avisado | Documentado (no hay web pública) |
| B2 | El script de carga descarga todas las reseñas de la ficha, aunque la app pide de a 20 | Documentado |
| B3 | El CI fija la Supabase CLI 3.1.0 y el equipo local tiene la 3.2.0 | Informativo |
| B4 | Queda un `stash` en el repositorio local con una edición de `ci.yml` que ya está en `main` | Se puede borrar |
| B5 | `npm audit` reporta 24 avisos moderados en `glob`, `minimatch` y `uuid`, que llegan por las herramientas de pruebas y de Expo (Jest y la CLI). No están en el panel ni en las apps instaladas. El «arreglo» de npm sería volver a versiones antiguas (Jest 29 y Expo 52) | Documentado; revisar con la próxima versión del SDK de Expo |
| B6 | El panel no tiene ícono de pestaña (`favicon.ico` responde 404) | Cosmético |

## 7. Correcciones realizadas (rama `audit/beta-2`, sin subir)

| Archivo | Cambio |
|---|---|
| `apps/negocios/src/app/registro/vista-previa.tsx` | Si el logo no se sube, el panel lo avisa (M1) |
| `apps/negocios/src/app/panel.tsx` | Muestra el aviso «No pudimos subir tu logo» (M1) |
| `apps/clientes/src/app/producto/[id].tsx` | Carga el negocio y el video en paralelo y arma la galería una sola vez; la posición usa `slideIndex` (M2) |
| `packages/shared/src/gallery.ts` y `index.ts` | `slideIndex()`: posición de la galería, segura sin ancho medido (M2) |
| `packages/shared/src/__tests__/gallery-test.ts` | Prueba de regresión de M2 (3 casos) |
| `pruebas/auditoria/` | Scripts de seguridad y funcionales, con sus resultados |
| `docs/AUDITORIA_BETA_2.md` | Este informe |

Después de las correcciones: typecheck, lint, 63/63 pruebas, esquema y permisos, 34/34 de seguridad y 46/46 funcionales probadas en verde.

## 8. Estado de los APK (Fase 8)

**Generados y verificados (16 de noviembre de 2026).** El usuario autorizó la opción (a) de H1: generarlos contra el proyecto actual, sabiendo que es el real.

- **Origen:** rama `feature/auditoria-beta-2` (commit `40ad02a`), con las correcciones M1 y M2. El CI de esa rama está en verde.
- **Perfil `preview`:** APK de distribución interna. No es un build de producción y no se publicó en ninguna tienda.
- **Cuota antes de lanzar:** plan gratuito, 3 de 30 builds, sin cargos extra. Los 2 builds entraron en el plan.

| | Clientes | Negocios |
|---|---|---|
| Nombre visible | Zipa lo tiene | Zipa lo tiene Negocios |
| Paquete Android | `co.zipa.vitrinalocal` (comprobado en el manifiesto) | `co.zipa.vitrinanegocios` (comprobado en el manifiesto) |
| Versión | 0.1.0 (build 1) | 0.1.0 (build 1) |
| Estado en EAS | FINISHED | FINISHED |
| Descarga | https://expo.dev/artifacts/eas/FMAv9V-0Uj-CrJzTalXrtMWSiIKK6gkhUzNza9Pso88.apk | https://expo.dev/artifacts/eas/KMeQ-cdITbIU8-eR-wI5J08KTcjfUlPVOLpduUFFcgo.apk |
| Tamaño | 97,8 MB | 118,4 MB |
| Proyecto de Supabase | `auilsjqprobmhusvxmmz` (el real, por decisión H1-a) | `auilsjqprobmhusvxmmz` |

**Revisión de secretos en los APK** [Auto]:
- Se descargaron los dos APK y se inspeccionó el código empaquetado (`index.android.bundle`).
- La única clave es la pública `sb_publishable_…`, pública por diseño. No hay JWT con rol `service_role`.
- El texto `sb_secret_` aparece una vez en cada APK. No es una clave: es el literal que usa `supabase-js` para reconocer el tipo de clave (`src/lib/fetch.ts`, línea 31: `key.startsWith('sb_secret_')`). En el bundle de Hermes queda pegado a los textos vecinos; en negocios lo sigue «… is not set, cannot invoke nat…», un mensaje de React Native.
- El build solo recibió dos variables: `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

**Instalación en un dispositivo:** [Pendiente]. No hay un celular ni un emulador conectados (`adb` no está instalado). Hay que instalarlos en un Android real y repetir allí N07, N13 y M5.

## 9. Recomendaciones para la siguiente beta

1. **Paso 9:** proyecto de Supabase de pruebas separado, con su propio ambiente en EAS. Resuelve H1 y permite cargas de prueba en un entorno parecido al real.
2. **Actualizar Next.js a 16.4.5** el 17 de noviembre (H2) y repetir el `next build`.
3. **Paso 8:** dominio, SMTP y verificación de correo (M3).
4. **Completar los datos legales** (M4) antes de cualquier publicación.
5. **Probar en Android real (M5, N07, N13):** cámara, video sin sonido, compartir el QR y la foto de la reseña en un Android antiguo (12 o anterior).
6. **Monitoreo de errores** (hoy «No configurado» en Sistema), para ver los fallos de las apps instaladas.
7. **Agregar al CI** las pruebas de `pruebas/auditoria/`. Requieren Docker y navegador, así que serían un trabajo aparte y más lento.

## 10. Cómo repetir esta auditoría

```powershell
npx supabase start -x studio,mailpit,logflare,vector,supavisor,imgproxy,realtime
npx supabase functions serve        # en otra terminal (PowerShell)
# Servidores de prueba contra la base local: clientes 8083, negocios 8084, panel 3001
# (EXPO_PUBLIC_* y NEXT_PUBLIC_* con los valores de `npx supabase status`)
$env:BETA2 = (Get-Location).Path -replace '\\','/'
node pruebas/auditoria/seguridad-local.js pruebas/auditoria/resultados/seguridad.json
node pruebas/auditoria/auditoria-funcional.js <carpeta-capturas> <foto.png> <video.mp4>
```

Los dos scripts se niegan a correr contra una dirección que no sea local.

**Requisitos:**
- `auditoria-funcional.js` usa `playwright-core` y Chromium. No son dependencias del proyecto: se instalan aparte, en la carpeta desde donde se corre el script.
- `seguridad-local.js` solo necesita las dependencias del proyecto.
