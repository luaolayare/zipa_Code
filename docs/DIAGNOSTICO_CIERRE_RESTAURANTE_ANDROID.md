# Diagnóstico: cierre intermitente al abrir un restaurante (clientes, Android, Expo Go)

**Fecha:** 20-nov-2026.
**Rama:** `feature/tipografia-espacios`.
**Estado:** **causa raíz no confirmada.** Las hipótesis están ordenadas por probabilidad, con su evidencia.

> **Corrección del 21-nov-2026:** el problema se observó en **iPhone con Expo Go**, no en Android. Consecuencias:
> - **H-A pierde peso:** en iOS, Expo Go sí tiene avisos y el permiso no viene concedido por defecto, así que `register()` no corre solo al iniciar sesión. Igual, desde el Bloque 1 (`e1b0fe1`) la app ya no registra avisos dentro de Expo Go.
> - **H-B** ya tiene «Intentar de nuevo» (`2d8d04c`).
> - **H-C** tiene imágenes reducidas (`7e9eb27`; `resizeMethod` solo actúa en Android).
> - **H-D** (entorno de desarrollo) queda como la explicación más probable en iPhone.
> - Logcat no aplica sin Android.
>
> La usuaria reporta que ahora lo ve estable. Ver `docs/BLOQUE_1_ESTABILIZACION.md`.

**Restricciones:** no se cambió código de la app, ni Supabase remoto, ni datos de producción. Solo hubo lecturas públicas. No hubo APK, despliegues, push ni merge.

## Problema reportado

En Android con Expo Go:
1. iniciar sesión;
2. entrar a Explorar;
3. tocar «Test restaurante».

**Lo que pasa:**
- La primera vez, la app **se cierra o vuelve al inicio**.
- Al volver a entrar y abrir el mismo restaurante, funciona.
- Es intermitente.

Antes, en la misma sesión de pruebas, también apareció el mensaje **«Revisa tu conexión a internet»** (H-1 de `AUDITORIA_DISENO_ESTILOS_BETA_2_2.md`).

---

## 1. Lo que se descartó, con evidencia

| Posible causa | Resultado | Evidencia |
|---|---|---|
| Error de lógica JavaScript al abrir la ficha | **Descartado en la web** | `pruebas/diagnostico/repetir-abrir-negocio.js`: **15/15 aperturas correctas**, cada una desde un contexto nuevo (iniciar sesión → Explorar → tocar el negocio apenas aparece). 0 errores de JavaScript, 0 fallos de red; la ficha carga en 69–101 ms (Supabase local) |
| Configuración equivocada en el paquete del celular | Descartado | El paquete que sirve Metro (8081) apunta a `auilsjqprobmhusvxmmz.supabase.co` (producción) |
| Producción sin servicio | Descartado en ese momento | La app web, con la configuración de producción, cargó Explorar: todas las respuestas de Supabase 200 |
| Video pesado en la ficha | Descartado para esta pantalla | La ficha del negocio **no** usa `ProductVideo` (solo la pantalla de producto). «Test restaurante» tiene 1 producto con foto de 0,16 MB, sin logo; su video (MP4 de ~11 MB) solo carga al abrir el producto |
| Pantalla descargada aparte la primera vez (carga diferida de rutas) | Descartado en Android | `app.json` → `extra.router.asyncRoutes: { web: true }`: en Android todas las rutas van en el paquete principal (12,2 MB por el túnel en 2,3 s) |
| Redirección después de iniciar sesión | Descartado | `login.tsx:35-42` hace un único `router.replace('/explorar')` al terminar `signIn`; ninguna otra pantalla redirige al iniciar sesión. La bienvenida (`index.tsx`) no redirige sola |

**Conclusión:** «vuelve al inicio» es casi seguro un **reinicio de la app**, no una navegación: al reabrirse, Expo Go muestra la bienvenida. Eso apunta a un cierre nativo o a una recarga del entorno de desarrollo, que la web no reproduce.

---

## 2. Hipótesis pendientes (ordenadas)

### H-A (la más probable): registro de notificaciones justo después de iniciar sesión, dentro de Expo Go

**Dónde:**
- `apps/clientes/src/lib/notificaciones.ts:89-98` (`usePushSetup`), montado en `apps/clientes/src/app/_layout.tsx:41-45`;
- `register()` en las líneas 45-59: `ensureChannel()` (`setNotificationChannelAsync`) y `getExpoPushTokenAsync()`.

**Qué pasa:** al cambiar `userId` (iniciar sesión), la app llama a `pushState()`.
- En Android 12 o anterior el permiso de notificaciones viene **concedido por defecto**. Entonces llama de una vez a `register()`, **al mismo tiempo** que la persona navega a la ficha.
- Expo Go en Android **ya no tiene notificaciones remotas desde el SDK 53**. El propio Metro lo avisa: «expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go».
- Los errores de JavaScript están atrapados (`try/catch`, `.catch`), pero **un fallo nativo dentro de Expo Go no se puede atrapar** desde JavaScript.

**Por qué encaja:**
- ocurre justo después de iniciar sesión, en la primera navegación;
- el canal `reservas` solo se crea la primera vez;
- con la sesión ya guardada, la app vuelve a llamar a `register()` al arrancar y al parecer no falla, lo que es compatible con un fallo que solo ocurre la primera vez (canal recién creado);
- no pasa en la web (no es nativa).

**Lo que no encaja:** no está confirmado que estas llamadas puedan cerrar Expo Go. Hay que verlo en Logcat.

**Riesgo en los APK:** bajo. Los APK traen Firebase y las notificaciones funcionan de forma nativa. Este fallo sería propio de Expo Go.

### H-B: error transitorio en las consultas iniciales («Revisa tu conexión»)

**Dónde:** `apps/clientes/src/app/negocio/[id].tsx:72-74`. `Promise.all([getBusiness, listProducts, loadReviews()])` muestra «No pudimos cargar este negocio. Revisa tu conexión a internet.» (líneas 86-93) si **cualquiera** de las tres falla.

**Por qué puede pasar la primera vez:**
- justo después de iniciar sesión, el celular hace muchas peticiones a la vez: Explorar, analítica (`app_open`, `business_view`), registro de push y la ficha;
- si la red del celular o el primer acceso a Supabase fallan una vez, la ficha queda en error;
- la pantalla de error **no tiene botón «Intentar de nuevo»**, solo «volver»;
- al reabrir funciona.

**Encaja con:** el mensaje de conexión que se reportó. **No explica** un cierre de la app.

### H-C: memoria al cargar imágenes grandes (Android de gama media)

**Dónde:** las imágenes se muestran con `Image` de React Native sin reducir, en:
- `apps/clientes/src/components/Cover.tsx` (logos en las tarjetas de Explorar);
- `ProductCard.tsx` (fotos del menú);
- `negocio/[id].tsx:141` (logo).

**Evidencia en producción (lectura pública):** el negocio «test» tiene un **logo JPG de 3,58 MB** y fotos de producto de **2,0 y 2,8 MB**. Explorar carga logos de varios negocios a la vez.

**Por qué puede ser la primera vez:**
- la primera carga decodifica todo junto;
- la segunda llega con la memoria ya liberada o con la caché lista.

**Encaja con:** un cierre del proceso (Android lo mata por memoria). «Test restaurante» es liviano, pero Explorar, que se ve justo antes, no lo es.

### H-D: el entorno de desarrollo (Metro por túnel) mientras se trabajaba en el computador

Durante la misma franja en que se reportó el problema, en el computador:
- se arrancaron e intentaron arrancar otros servidores de Metro sobre la **misma carpeta del proyecto** (puertos 8083 y 8084);
- se escribieron y borraron archivos dentro del árbol que vigila el Metro de 8081 (capturas e informes);
- se corrieron pruebas pesadas.

Metro vigila todo el monorepo. Si un cambio afectó algo que usa la app, Expo Go **recarga la app**, y al recargar vuelve a la bienvenida.

**Encaja con:** «vuelve al inicio», intermitente, una sola vez.

**Se descarta:** probando con el computador quieto o con un APK.

---

## 3. Primera apertura frente a la segunda

| | Primera vez (falla) | Segunda vez (funciona) |
|---|---|---|
| Sesión | Recién creada: se disparan `usePushSetup` y `register()` en ese momento | Restaurada al arrancar; el registro ya pasó antes de navegar |
| Canal de notificaciones | Se crea | Ya existe |
| Imágenes | Se decodifican por primera vez | En caché |
| Peticiones al mismo tiempo | Muchas (inicio de sesión, Explorar, analítica, push, ficha) | Menos |
| JavaScript | Igual | Igual (la web no muestra diferencia) |

---

## 4. Cómo capturar la evidencia en el celular

**Objetivo:** distinguir entre cierre del proceso, recarga de la app y redirección.

1. **Preparar:**
   - computador **sin otras tareas** (sin pruebas ni otros servidores);
   - en Android: Opciones de desarrollador → Depuración USB;
   - conectar el cable y comprobar con `adb devices`.
2. **Logcat** (PowerShell, en una carpeta con espacio):

   ```
   adb logcat -c
   adb logcat -v time ReactNativeJS:V ReactNative:V ExpoModulesCore:V AndroidRuntime:E ActivityManager:I lowmemorykiller:I libc:F DEBUG:F *:S > logcat-cierre.txt
   ```

3. **Reproducir:**
   - cerrar Expo Go por completo;
   - abrir el enlace `exp://…`;
   - iniciar sesión;
   - abrir Explorar → «Test restaurante» de inmediato;
   - anotar la hora exacta del cierre.
4. **Detener con Ctrl+C y buscar en `logcat-cierre.txt`:**

   | Qué buscar | Qué significa |
   |---|---|
   | `FATAL EXCEPTION` o `AndroidRuntime` | Cierre nativo; la traza dice qué módulo (por ejemplo `expo.modules.notifications`) → **H-A** |
   | `Process host.exp.exponent ... has died` y `lowmemorykiller` / `Kill 'host.exp.exponent'` | Cierre por memoria → **H-C** |
   | `Fatal signal 11 (SIGSEGV)` | Fallo nativo de bajo nivel (imagen o video) |
   | `ReactNativeJS` con `Error`/`Unhandled` | Error de JavaScript |
   | Varios `Running "main"` sin muerte del proceso | **Recarga** de la app → **H-D** o error de JavaScript |
   | Sin nada de lo anterior y la app en la bienvenida | Redirección de navegación (poco probable, §1) |

5. **Ventana de Metro** («ZIPA CLIENTES REDISENO»): foto de las líneas en rojo o amarillo del momento.
6. **Supabase:** en el panel de Supabase → Logs → API, buscar respuestas 4xx o 5xx a la hora del fallo. Es solo lectura.
7. **Repetir con un APK** cuando se autorice: si en el APK no pasa, se confirma que era propio de Expo Go (**H-A** o **H-D**).

---

## 5. Correcciones mínimas propuestas (no aplicadas, requieren autorización)

| Para | Cambio | Archivo | Riesgo |
|---|---|---|---|
| H-A | No registrar notificaciones dentro de Expo Go: salir de `register()` y de `usePushSetup` si `Constants.executionEnvironment === ExecutionEnvironment.StoreClient`. No cambia nada en los APK | `apps/clientes/src/lib/notificaciones.ts` y el mismo archivo en negocios | Muy bajo |
| H-A (alternativa) | Retrasar el registro unos segundos después de iniciar sesión, para que no coincida con la primera navegación | Mismo archivo | Bajo |
| H-B | En la pantalla de error de la ficha, agregar «Intentar de nuevo», que vuelve a llamar a las tres consultas. Opcional: un reintento automático una sola vez | `apps/clientes/src/app/negocio/[id].tsx:86-93` | Bajo (texto nuevo de botón: requiere aprobación) |
| H-C | Mostrar las imágenes reducidas (`resizeMethod="resize"` en Android o `expo-image` con caché) y reducir los logos al subirlos, como ya se hace con las fotos de producto | `Cover.tsx`, `ProductCard.tsx`, `negocio/[id].tsx`, `LogoPicker` | Medio (más archivos) |
| H-D | Ningún cambio de código: no trabajar en el computador mientras se prueba en Expo Go, o probar con APK | — | — |

**No se debe dar por resuelto** solo porque la segunda apertura funciona.

---

## 6. Pruebas de regresión necesarias (después de corregir)

- `pruebas/diagnostico/repetir-abrir-negocio.js` (15/15 en local hoy).
- Las suites de siempre: notificaciones (15), integral (9), auditoría funcional (46 OK) y las demás de `pruebas/auditoria/`.
- **Celular (Expo Go y APK):** 10 aperturas seguidas desde un arranque limpio justo después de iniciar sesión, en Android 12 o anterior y en Android 13 o superior. Con Logcat abierto.
- Para H-A: comprobar que en el APK el aviso sigue llegando, porque el registro de push no debe cambiar fuera de Expo Go.

---

## 7. Riesgo para otros restaurantes

- **H-A y H-D:** no dependen del restaurante. Puede pasar con **cualquier** primera navegación justo después de iniciar sesión en Expo Go. **No afectaría a los APK** (H-A) ni a usuarios reales (H-D).
- **H-B:** cualquier ficha puede quedar en «Revisa tu conexión» con un fallo de red. Hoy no hay botón para reintentar sin salir.
- **H-C:** mayor en negocios con imágenes pesadas. En producción hay ejemplos de 2 a 3,6 MB (negocio «test»). También afecta a los APK.

---

## 8. Siguiente paso recomendado

1. Capturar Logcat según el §4 con el computador quieto. Es la forma de confirmar la causa.
2. Según el resultado, aplicar la corrección mínima de la hipótesis confirmada, con autorización.
