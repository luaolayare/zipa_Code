# Plan definitivo hacia producción en Android: Zipa lo tiene

**Fecha:** 20-nov-2026.
**Base:** rama `feature/tipografia-espacios` (Beta 2.2 + rediseño).
**Estado:** **propuesta. No se ejecuta ninguna fase sin autorización.** La primera será la estabilización de Android.

**Restricciones durante la elaboración:** no se cambió código ni dependencias, no hubo migraciones, no se tocó Supabase remoto, no hubo builds, push, merge ni compras.

**Precios:** son de referencia (nov-2026) y deben confirmarse en la página de cada servicio antes de contratar.

---

## 0. Estado actual (qué existe, qué funciona y qué falta)

| Área | Qué existe hoy | Estado | Qué falta |
|---|---|---|---|
| Descubrimiento (Explorar, búsqueda, categorías, fichas, productos, galería, video) | Completo | ✅ Probado en local (auditoría funcional 46 OK) | Prueba física en Android; video sin prueba física |
| Reservas (solicitar, confirmar, rechazar, vencer, asistencia, bandeja paginada) | Completo (0019–0022) | ✅ Local; P1 desplegado | Prueba física con dos celulares |
| Notificaciones push | Expo + Firebase, envío por app (P1), activación clara (P13) | ⚠️ Sin prueba física | Prueba física; no registrar en Expo Go |
| Registro e inicio de sesión | Correo y contraseña (`packages/shared/src/auth.tsx`) | ⚠️ **Sin verificación de correo** (`enable_confirmations = false`) y **sin recuperar contraseña** | Verificación, recuperación, SMTP propio, Google |
| Google / Apple | **No existe.** Solo un comentario «Pendiente» en `apps/clientes/src/app/login.tsx:66` | ❌ | Fase 2 |
| QR del negocio | QR permanente con token (`business_qr`, 0012). Abre `vitrinalocal://negocio/<id>?v=<token>` (`QrPoster.tsx:15`) | ⚠️ **Solo funciona con la app instalada**. Sin dominio no hay enlace web ni salto a la tienda | Dominio, App Links y página web de respaldo |
| Reseñas y antifraude | Antispam de 0012: cuenta de más de 24 h, máximo 3 por día, una por negocio, sin calificar a la competencia, retención de ráfagas de 1–2 estrellas, reportes, bloqueos y moderación | ✅ Base sólida | **El sello «Visitó el negocio» se gana con solo escanear el QR**, lo que contradice el principio 7 |
| Monetización | Destacados (`featured_placements`, 0017) que asigna el equipo | ✅ | Proceso comercial (fuera del código) |
| Panel de administración | Next.js con MFA y roles | ✅ | Sin cambios en el rediseño |
| Diseño | Escala de tipografía y espacios aplicada | ✅ Local | Revisión física al 130 % |
| Estabilidad Android | Cierre intermitente al abrir una ficha en Expo Go | ❌ **Abierto** | Fase 1 (`DIAGNOSTICO_CIERRE_RESTAURANTE_ANDROID.md`) |
| Observabilidad | Analítica propia (0015). **Sin reporte de errores ni cierres** | ❌ | Fase 1 (mínimo) y fase 5 |
| Ambientes | Las pruebas usan producción (P6) | ❌ | Fase 4 |
| Textos legales | Borrador sin revisar (P3) | ❌ | Antes de la beta cerrada |
| Repositorio | 25 commits locales sin subir (contando este plan); Beta 2.2 sin unir a `main` | ⚠️ | Al cerrar cada fase |
| CI | GitHub Actions (`.github/workflows/ci.yml`): typecheck, pruebas y SQL | ✅ | Agregar e2e (P8) |

---

## 1. Matriz de prioridades

| Prioridad | Tema | Fase |
|---|---|---|
| **P0** | Cierre intermitente en Android: causa confirmada y corregida | 1 |
| **P0** | Avisos push probados en Android real (abierta, segundo plano y cerrada) | 1 |
| **P0** | Verificación de correo y recuperar contraseña (requiere SMTP y dominio) | 2 |
| **P0** | Textos legales revisados (Ley 1581), página web de privacidad y de borrar cuenta (requisito de Google Play) | 2 y 7 |
| **P0** | Ambiente de pruebas separado de producción | 4 |
| **P0** | Supabase Pro en producción (sin pausas, con copias de seguridad) | 6 |
| **P1** | Reporte de errores y cierres (Sentry o similar) | 1 (mínimo) y 5 |
| **P1** | Google OAuth sin perfiles duplicados | 2 |
| **P1** | QR con enlace web que abre la ficha (App Links) y respaldo web o tienda | 3 |
| **P1** | Reseñas: sello del QR sin prometer consumo y controles antifraude adicionales | 3 |
| **P1** | Imágenes livianas (reducir al mostrar y al subir) | 1 y 5 |
| **P2** | Actualizaciones sin APK (EAS Update) | 5 |
| **P2** | Pruebas e2e en el CI; pruebas de carga de reservas y avisos (P17) | 4 y 5 |
| **P2** | Conversión de videos en el servidor; regrabar los 4 videos HEVC | 5 |
| **P2** | Parches de Expo pendientes (P9) y dependencia de letra sin uso | 1 |
| **P3** | Igualar el panel de administración a la escala nueva; colores sueltos; detalle de reserva en filas | 5 |
| **P3** | Conservación y borrado de reservas viejas (P16, depende de la decisión legal) | 5 |
| **P3** | iOS (cuenta de Apple, APNs, Sign in with Apple) | 8 |

---

## 2. Fases

> Cada fase se cierra con su lista de verificación (§4). Ninguna empieza sin autorización expresa.

### Fase 1. Estabilidad y corrección de fallos en Android (la primera)

**Alcance:**
1. **Confirmar la causa del cierre** con Logcat (§4 del diagnóstico) y corregir solo lo confirmado:
   - **H-A:** no registrar notificaciones dentro de Expo Go;
   - **H-B:** «Intentar de nuevo» en la ficha;
   - **H-C:** imágenes reducidas al mostrarlas.
2. **Imágenes:**
   - mostrar reducidas (`resizeMethod="resize"` en Android o `expo-image`);
   - reducir el logo al subirlo, como ya se hace con las fotos de producto (`PHOTO_PRESETS`).
3. **Reporte de errores mínimo:**
   - capturar cierres y errores de JavaScript con contexto (pantalla y versión), **sin datos personales**;
   - recomendado: Sentry (`@sentry/react-native` con su plugin de Expo, plan gratuito).
4. **APK nuevos** con el rediseño, la mejora de videos y las correcciones.
5. **Pruebas físicas pendientes:**
   - avisos (P2 y P13: «Último paso», permiso negado, reintento);
   - videos con datos móviles;
   - letra al 130 %;
   - bandeja con muchas solicitudes.
6. **Limpieza menor:**
   - parches de Expo con `npx expo install --fix` (P9);
   - quitar `@expo-google-fonts/space-grotesk`;
   - texto del permiso de cámara (P11);
   - barra inferior con `minHeight` si se corta al 130 %.

**Archivos:**
- `apps/*/src/lib/notificaciones.ts`;
- `apps/clientes/src/app/negocio/[id].tsx`;
- `apps/clientes/src/components/{Cover,ProductCard,ProductVideo}.tsx`;
- `apps/negocios/src/components/{LogoPicker,media}.ts*`;
- `packages/shared/src/photos.ts`;
- `apps/*/app.json` / `app.config.js` (Sentry, permiso de cámara);
- `apps/*/package.json`.

**Dependencias técnicas:**
- Logcat (`adb`) con un celular por USB;
- cuenta de Sentry;
- EAS (APK; el contador va en 11/30).

**Pruebas automatizadas:**
- typecheck, lint y Jest (128 más las nuevas de reintento y de reducción de imagen);
- `pruebas/diagnostico/repetir-abrir-negocio.js`;
- todas las suites de `pruebas/auditoria/`.

**Pruebas manuales en Android (Android ≤12 y ≥13, gama media):**
- 10 aperturas seguidas de fichas justo después de iniciar sesión, con Logcat;
- Explorar con negocios de imágenes pesadas;
- avisos en los tres estados de la app;
- video con datos móviles;
- letra al 130 %.

**Criterios de aceptación:**
- causa del cierre identificada en Logcat y **0 cierres** en 30 aperturas en el APK;
- avisos recibidos y abiertos en los tres estados;
- sin cortes de texto al 130 %;
- Sentry recibe un error de prueba.

**Riesgos:** cambiar el registro de push puede afectar los avisos en el APK. Se prueba en el APK antes de cerrar la fase.

**Servicios y costos:** Sentry gratis (límite mensual de eventos); EAS gratis.

**Orden:**
1. Logcat;
2. corrección confirmada;
3. imágenes;
4. Sentry;
5. APK;
6. pruebas físicas;
7. limpieza.

### Fase 2. Autenticación, Google OAuth y prevención de perfiles duplicados

**Alcance:**
1. **Dominio y correo:**
   - dominio propio;
   - SMTP (Resend o Brevo) en Supabase;
   - plantillas en español.
2. **Verificación de correo** (`enable_confirmations = true` en producción) y **recuperar contraseña** en las dos apps, con pantallas de «revisa tu correo» (ya existe `CheckEmailView`).
3. **Google OAuth:**
   - Google Sign-In nativo (`@react-native-google-signin/google-signin`, requiere development build o APK, no Expo Go) y `supabase.auth.signInWithIdToken`;
   - alternativa: `expo-auth-session` con el flujo web.
   - Configuración:
     - cliente OAuth Android (SHA-1 del keystore de EAS);
     - cliente web en Google Cloud;
     - proveedor Google en Supabase.
4. **Sin perfiles duplicados:**
   - Supabase vincula automáticamente identidades con el **mismo correo verificado**. Por eso la verificación (punto 2) va antes de Google.
   - `profiles` se crea una sola vez por `auth.users.id` (revisar que el disparador sea idempotente).
   - Negocios: un dueño, un negocio (la regla actual de `myBusiness`). Agregar una restricción única en la base si no existe.
   - Prueba explícita: cuenta con correo y contraseña → luego Google con el mismo correo → **un solo usuario**.
5. **Borrar cuenta** desde la web (requisito de Google Play): página en el dominio que lleva a iniciar sesión y borrar (la función `eliminar-cuenta` ya existe).

**Archivos:**
- `packages/shared/src/auth.tsx`;
- `apps/clientes/src/app/login.tsx`;
- `apps/negocios/src/app/registro/cuenta.tsx`;
- `packages/shared/src/ui/CheckEmailView.tsx`;
- `supabase/config.toml`;
- migración nueva (unicidad, si falta);
- `apps/*/app.config.js` (plugin de Google);
- página web de borrar cuenta.

**Dependencias:**
- dominio y SMTP;
- Google Cloud;
- APK o development build para probar Google.

**Pruebas automatizadas:**
- Jest del flujo de sesión;
- e2e local de registro con verificación (Inbucket local);
- prueba SQL de unicidad.

**Pruebas manuales en Android:**
- registro, verificación, entrar, recuperar contraseña, Google;
- Google con un correo ya registrado (sin duplicado);
- cerrar sesión y borrar cuenta.

**Criterios de aceptación:**
- no se entra sin correo verificado;
- la recuperación funciona;
- Google crea o vincula sin duplicar;
- en producción: 0 perfiles duplicados (consulta de control).

**Riesgos:**
- cuentas existentes sin verificar: definir una transición (se les pide verificar al entrar);
- cambio de SHA-1 si cambia el keystore.

**Servicios y costos:**
- dominio US$10–40 al año;
- SMTP gratis hasta unos 3.000 correos al mes;
- Google Cloud OAuth gratis.

**Orden:**
1. dominio y SMTP;
2. verificación y recuperación;
3. unicidad;
4. Google;
5. borrar cuenta desde la web.

### Fase 3. QR, enlaces profundos y reseñas sencillas

**Alcance:**
1. **QR permanente con enlace web:** `https://<dominio>/n/<id>`.
   - **Android App Links:**
     - `intentFilters` con `autoVerify` en `apps/clientes/app.json`;
     - `/.well-known/assetlinks.json` en el dominio, con el SHA-256 del certificado de firma.
   - Con la app instalada, **abre la ficha directamente**. Sin la app, una **página web liviana** de la ficha (nombre, foto y botón «Descargar en Google Play»).
   - Los QR impresos con `vitrinalocal://` siguen funcionando con la app instalada. Se reimprimen con el enlace nuevo.
2. **Reseñas sin aprobación manual** (diseño en §3).
3. **QR rotable** desde el panel de negocios («Generar un QR nuevo»): invalida el token anterior si se filtró. No requiere aprobación de nadie.

**Archivos:**
- `apps/negocios/src/components/QrPoster.tsx`;
- `apps/clientes/app.json` y el manejo de rutas (`negocio/[id]` ya existe);
- migración nueva (rotación del token, señales de reseña);
- página web `/n/<id>` (por ejemplo en Vercel o Netlify, solo lectura de `businesses_public`);
- `apps/clientes/src/app/negocio/[id].tsx` (sello y textos).

**Dependencias:** dominio (fase 2); certificado de firma de EAS (SHA-256).

**Pruebas automatizadas:**
- prueba SQL de rotación y de vencimiento del token;
- e2e del enlace `/n/<id>` → ficha;
- pruebas de las reglas antifraude (§3).

**Pruebas manuales en Android:**
- escanear con la cámara del celular, con y sin la app instalada;
- QR rotado (el viejo deja de dar señal);
- reseñas desde una cuenta nueva y desde una con historial.

**Criterios de aceptación:**
- el QR abre la ficha en 1 toque con la app instalada;
- sin la app, lleva a la página y a Play;
- ningún texto afirma que hubo consumo;
- las reglas antifraude bloquean o retienen los casos de prueba.

**Riesgos:**
- App Links mal verificado (se abre el navegador): probar `adb shell pm get-app-links`;
- QR viejos impresos.

**Servicios y costos:** hosting estático gratis (Vercel o Netlify en plan gratuito); dominio de la fase 2.

**Orden:**
1. dominio y página `/n/<id>`;
2. App Links;
3. QR nuevo y rotación;
4. reglas de reseñas.

### Fase 4. Validación integral de funciones

**Alcance:**
1. **Ambiente de pruebas (P6):** segundo proyecto Supabase y perfiles de EAS `preview` → pruebas, y `production` → producción.
2. **Pruebas e2e en el CI (P8):** `playwright-core` como dependencia de desarrollo y un trabajo del CI contra Supabase local.
3. **Recorrido completo**, con una lista guiada: cliente, negocio y equipo, en Android físico.
4. Auditoría de permisos (SQL) y de las funciones Edge.

**Archivos:**
- `eas.json`;
- variables de EAS;
- `.github/workflows/ci.yml`;
- `pruebas/**`;
- `supabase/ci/*.sql`.

**Criterios de aceptación:**
- ningún APK de prueba apunta a producción;
- CI en verde con e2e;
- la lista guiada al 100 %.

**Costos:** un segundo proyecto Supabase (gratis si se acepta que se pause, o Pro US$25 al mes).

### Fase 5. Seguridad, rendimiento y observabilidad

**Alcance:**
1. **Sentry completo:** versiones, mapas de código fuente y alertas.
2. **Rendimiento:**
   - listas virtualizadas (`FlatList` o `FlashList`) en Explorar, Categoría y Menú;
   - `expo-image` con caché;
   - medir el arranque.
3. **Videos:**
   - conversión en el servidor a 720p H.264 con el índice al inicio y miniatura;
   - regrabar los 4 videos HEVC.
4. **EAS Update** para corregir sin APK.
5. **Seguridad:**
   - revisión de RLS y RPC;
   - límites de frecuencia en las funciones;
   - `npm audit` y parches;
   - claves rotadas si hace falta.
6. **Pruebas de carga (P17)** de reservas y avisos con k6 en local o pruebas.
7. **Conservación de datos (P16)** según la decisión legal.

**Costos:** Sentry gratis o pago según volumen; EAS Update gratis hasta cierto número de usuarios activos.

**Criterios de aceptación:**
- arranque en menos de 3 s en gama media;
- 0 cierres en 7 días de beta;
- alertas configuradas.

### Fase 6. Beta cerrada con usuarios y negocios reales

**Alcance:**
- **Supabase Pro** en producción.
- **Cuenta de Google Play:**
  - personal: exige una **prueba cerrada de 12 personas durante 14 días**;
  - organización: con NIT y D-U-N-S.
- 5–10 negocios reales y 12 o más testers.
- Encuesta de facilidad de uso; seguimiento en Sentry; ajustes.

**Criterios de aceptación:**
- 14 días con 12 o más testers;
- sin errores P0 ni P1 abiertos;
- negocios satisfechos con el registro y la bandeja.

**Costos:** Google Play US$25 (una vez); Supabase Pro US$25 al mes.

### Fase 7. Publicación en Google Play

**Alcance:**
- AAB con el perfil `production`;
- ficha de la tienda (íconos y logo definitivos, capturas e imagen destacada);
- formulario de seguridad de los datos;
- clasificación de contenido;
- acceso para revisión (cuenta de prueba);
- políticas en el dominio;
- **decidir los paquetes definitivos** (`co.zipa.vitrinalocal` y `co.zipa.vitrinanegocios` son permanentes una vez publicados);
- lanzamiento por etapas (20 % → 100 %).

Detalle en `docs/GUIA_PLAY_STORE.md`.

### Fase 8. iOS (posterior)

- Apple Developer (US$99 al año);
- APNs en EAS;
- **Sign in with Apple** (obligatorio si se ofrece Google en iOS);
- ajustes de interfaz;
- TestFlight y App Store.

---

## 3. Reseñas con QR sin aprobación manual: diseño antifraude proporcional

### 3.1 Principios

1. **Escanear el QR no es una prueba de consumo** (principio 7).
   - El sello de hoy, «Visitó el negocio», promete algo que el sistema no puede saber. Se propone cambiarlo por **«Reseña desde el local»** (o «Escaneó el QR en el negocio»), o usarlo solo como señal interna.
   - **Decisión de producto pendiente:** el texto exacto lo aprueba el dueño del producto.
2. **Cualquiera con cuenta puede reseñar**, con o sin QR. El QR solo **facilita** llegar a la ficha y aporta una **señal** de cercanía.
3. **Nada manual:** ni el comerciante valida, ni hay códigos de compra ni facturas. El equipo solo modera lo que el sistema retiene o lo que se reporta (como hoy).

### 3.2 Riesgos de un QR estático compartido

| Riesgo | Efecto |
|---|---|
| La foto del QR circula en internet o en grupos | Cualquiera obtiene la señal de «desde el local» sin ir |
| Un competidor organiza reseñas negativas | Hundir la calificación |
| El propio negocio pide reseñas 5 estrellas a familiares y amigos | Inflar la calificación |
| Cuentas creadas en masa | Saltarse los límites por persona |
| Token permanente sin control | Imposible invalidarlo si se filtra |

### 3.3 Controles propuestos (automáticos, proporcionales a una app de descubrimiento)

**Ya existen (0012):**
- cuenta de más de 24 h para la primera reseña;
- máximo 3 reseñas por día;
- una reseña por persona y negocio (editable);
- no se califica a la competencia de la misma categoría;
- ráfagas de 1–2 estrellas quedan **en espera**;
- reportes, bloqueos y moderación del equipo.

**A agregar:**

| Control | Cómo | Manual | Archivos |
|---|---|---|---|
| **Correo verificado o Google** para reseñar | Fase 2. Frena las cuentas en masa | No | `guardar_mi_resena` |
| **Rotación del QR** por el negocio | Botón en el panel; el token viejo deja de dar señal | No (lo decide el negocio, no valida a nadie) | Migración, panel |
| **Ventana corta de la señal** | El escaneo vale, por ejemplo, 12 h (hoy 30 días) | No | `registrar_visita` |
| **Límite por token y por dispositivo** | Si un mismo token recibe muchos escaneos de cuentas nuevas en poco tiempo, la señal se apaga y las reseñas quedan **en espera** | No | Función SQL o Edge con conteo por ventana |
| **Ráfagas en los dos sentidos** | Igual que con 1–2 estrellas, también con 5 estrellas de cuentas nuevas en pocas horas | No | `guardar_mi_resena` |
| **Calificación con promedio bayesiano** | La nota pública pondera hacia un promedio general mientras haya pocas reseñas; 3 reseñas falsas no hunden ni elevan un negocio | No | Vista `businesses_public` |
| **Peso por antigüedad y historial** | Reseñas de cuentas con historial (varias reseñas en distintos negocios y tiempo) pesan más en el ranking «mejor calificados» | No | Cálculo del ranking |
| **Ubicación opcional** | Si la persona **da permiso**, una verificación aproximada (a unos 300 m del negocio) refuerza la señal. Nunca es obligatoria | No | Requiere `lat`/`lng` del negocio (ya está en la propuesta 0010 del plan de infraestructura) |
| **Señales a revisión, no rechazos** | Ante dudas, la reseña queda en espera (como hoy) en lugar de rechazarse; el equipo decide con contexto | Solo para lo retenido | Panel → Reseñas |

**Lo que no se propone:** facturas, pagos, códigos manuales ni validación por el comerciante (como se pidió).

### 3.4 Criterios de aceptación del antifraude

- Escanear el QR **no** muestra ningún texto que afirme consumo.
- Una cuenta recién creada no reseña antes de 24 h (ya existe) y necesita el correo verificado.
- 10 reseñas de cuentas nuevas en 1 hora sobre el mismo negocio → quedan en espera, en los dos sentidos (prueba SQL).
- Un QR rotado: el token anterior ya no da señal (prueba SQL).
- Con menos de 5 reseñas, la calificación pública cambia poco por una reseña extrema (prueba del cálculo).

---

## 4. Lista de verificación para autorizar cada fase

| | Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 | Fase 6 | Fase 7 |
|---|---|---|---|---|---|---|---|
| Alcance aprobado | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Servicios y costos aprobados | ☐ Sentry · EAS | ☐ Dominio · SMTP · Google Cloud | ☐ Hosting web | ☐ 2.º Supabase | ☐ Sentry pago (opcional) | ☐ Supabase Pro · Google Play | ☐ — |
| Autoriza cambios en producción | ☐ No aplica | ☐ Verificación de correo, SMTP, proveedor Google | ☐ Migraciones nuevas | ☐ No | ☐ Migraciones de seguridad o cálculo | ☐ Plan Pro | ☐ Publicar |
| Autoriza builds (EAS) | ☐ APK | ☐ APK o dev build | ☐ APK | ☐ APK de pruebas | ☐ APK | ☐ AAB de prueba cerrada | ☐ AAB |
| Autoriza push y merge al cerrar | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Decisiones de producto | ☐ Botón «Intentar de nuevo» | ☐ Transición de cuentas sin verificar | ☐ Texto del sello; ventana del QR; ubicación opcional | ☐ — | ☐ Conservación de datos | ☐ Tipo de cuenta de Play | ☐ Paquetes definitivos; íconos |
| Criterios de aceptación cumplidos | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**Antes de la fase 1 se necesita:**
- tu autorización;
- un celular Android con depuración USB para Logcat;
- decidir si se usa Sentry ya, en la fase 1, o se deja para la fase 5.

---

## 5. Costos resumidos

| Momento | Costo |
|---|---|
| Fases 1–5 | US$0–15 al año (dominio) + opcional un segundo Supabase (US$0–25 al mes) |
| Beta cerrada y publicación | Google Play US$25 una vez + Supabase Pro US$25 al mes |
| Mensual estimado al lanzar | ~US$25–50 (Supabase Pro y, si se requiere, Sentry o SMTP pagos) |
| iOS (posterior) | US$99 al año |
