# Bloque 1 de estabilización: informe

**Fecha:** 21-nov-2026.
**Rama:** `feature/tipografia-espacios`, con commits locales sin subir.
**Autorizado:** puntos 1 a 5 con condiciones. Punto 6 (Sentry): solo preparación e instrucciones.

**Restricciones cumplidas:**
- sin escrituras en Supabase de producción, migraciones remotas ni cambios en cuentas reales;
- sin APK, push ni merge;
- todo se probó contra Supabase **local**.

---

## 1. Qué se hizo

| # | Cambio | Commit | Archivos |
|---|---|---|---|
| 1 | **Ficha del negocio: «Intentar de nuevo» y respuestas tardías descartadas** | `2d8d04c` | `apps/clientes/src/app/negocio/[id].tsx`; prueba `pruebas/diagnostico/reintento-ficha.js` |
| 2 | **Avisos push: sin registro remoto dentro de Expo Go** (clientes y negocios) | `e1b0fe1` | `packages/shared/src/push.ts` (`remotePushAvailable`); `apps/{clientes,negocios}/src/lib/notificaciones.ts`; prueba `push-entorno-test.ts` |
| 3 | **Imágenes livianas** | `7e9eb27` | 13 pantallas y componentes con `<Image>`; prueba `imagenes-livianas-test.ts` |
| 4a | **Limpiezas del rediseño** | `f2f38d5` | `reservas/[id].tsx` (negocios), `TabBar.tsx`, `theme.ts` (`dangerOnDark`), `producto/[id].tsx`, `calificar/[id].tsx`, `panel.tsx`, `grabar.tsx` |
| 4b | **Dependencia sin uso** | `c0989bf` | `apps/clientes/package.json`, `package-lock.json` |
| 5 | **Sello «Reseña con QR»** | `3a5d698` | Clientes (ficha), negocios (panel y QR), panel del equipo (`resenas`), comentarios en `api.ts`, `types.ts` y `QrPoster.tsx`; prueba funcional C15 |

### Detalle y decisiones

**1. Reintentos.** **No se agregó un reintento propio de la app.** Al probar, se encontró que `supabase-js` 2.119 **ya reintenta** cada lectura:
- hasta 3 veces, esperando 1, 2 y 4 s;
- solo GET;
- solo con red caída o 503/520.

Nunca reintenta escrituras, sesión, permisos ni validación. Agregar otro reintento duplicaba las peticiones: en la prueba hubo 8 intentos en lugar de 4. Lo que quedó:
- el botón **«Intentar de nuevo»**, que no se puede pulsar dos veces mientras carga;
- un contador (`loadSeq`) que descarta respuestas de cargas anteriores.

La analítica y el registro de la visita por QR no forman parte de la recarga, así que no se duplican.

**2. Expo Go.** La regla usa `isRunningInExpoGo()` del paquete `expo`. No se usa `executionEnvironment`, porque también marca `storeClient` a los development builds. En Expo Go:
- no se consulta el permiso;
- no se pide el token;
- no se escuchan cambios de token;
- la tarjeta de avisos queda oculta.

En los APK no cambia nada.

**3. Imágenes.**
- `resizeMethod="resize"` en las 16 imágenes remotas que no son el visor con zoom. En Android se decodifican al tamaño en pantalla, no al original (en producción hay fotos de 2 a 3,6 MB). En iOS, React Native ya reduce la decodificación.
- Los **logos nuevos ya se comprimían** antes de subir (512 px, 80 %, `pickPhoto('logo')`); una prueba fija ese límite.
- **No se tocó ningún archivo existente en Supabase.**

**4. Diseño:**
- detalle de reserva de negocios en filas, como «Mi reserva»;
- barra inferior con `minHeight` (crece con letra grande);
- 4 colores a tokens: `#A12E15` → `danger`, `#CFC8BB` → `inputBorder`, `#AFC2BE` → `onPrimaryMuted`, `#FFB4A2` → nuevo `dangerOnDark`;
- fuera `@expo-google-fonts/space-grotesk`. El lockfile además sincroniza la dependencia `lucide-react-native` que ya declaraba `packages/shared`.

**5. Sello.** La evidencia técnica **es fiable**, comprobado en los permisos efectivos de la base local, que tiene las mismas 22 migraciones:
- los usuarios no pueden insertar reseñas: `revoke insert` en la 0012;
- solo pueden editar `reply` y `replied_at`;
- `visited` lo escribe solo `guardar_mi_resena` (SECURITY DEFINER), a partir de `business_visits`;
- `business_visits` solo lo llena `registrar_visita` después de validar el token del QR en el servidor.

Lo que cambió en pantalla:
- texto «Reseña con QR» con **ícono de QR neutro**, en lugar de una insignia de verificado verde;
- etiqueta accesible;
- nota visible: «El QR no acredita por sí solo una visita ni un consumo».

**Límite del sello:** indica que la cuenta abrió la ficha **con el enlace del QR** en los últimos 30 días. Si alguien comparte una foto del QR, también cuenta. Por eso no afirma visita ni consumo. La rotación del QR y la ventana más corta están en la fase 3 del plan.

---

## 2. Pruebas ejecutadas de verdad (21-nov-2026, Supabase local)

| Prueba | Resultado |
|---|---|
| TypeScript (todos los paquetes) | ✅ 0 errores |
| ESLint (todos los paquetes) | ✅ 0 problemas |
| Jest | ✅ **134/134** (6 nuevas: entorno de push y logos) |
| Reintento de la ficha con fallos forzados (`reintento-ficha.js`) | ✅ 4/4: red pasajera se recupera; red caída → 4 intentos de supabase-js y 0 extra de la app; «Intentar de nuevo» carga; permisos (42501) sin reintento |
| Notificaciones | ✅ 15/15 |
| Reproducción de P1 | ✅ «no se reproduce» |
| Bandeja P4 (324 solicitudes) | ✅ 7/7 |
| Integral (tres apps) | ✅ 9/9 |
| Concurrencia de reservas | ✅ 8/8 |
| Entregas A, B y C | ✅ 12/12 · 15/15 · 6/6 |
| Correcciones de la Beta 2.1 | ✅ 12/12 |
| Aperturas repetidas (iniciar sesión → Explorar → ficha) | ✅ 10/10 |
| Auditoría funcional | ✅ 46 OK · 0 fallas · 0 errores de consola · 2 no probadas (requieren celular) |
| Capturas (web 390 px, sin errores de página) | ✅ `docs/capturas-bloque-1/` |

## 3. Pendiente en dispositivos físicos (no ejecutado)

- **iPhone con Expo Go:**
  - «Intentar de nuevo» con el modo avión;
  - la tarjeta de avisos ya **no** aparece en Expo Go (es lo esperado);
  - el sello y la nota;
  - la barra inferior con letra grande.
- **Android** (sin dispositivo): todo lo de imágenes (`resizeMethod` solo actúa en Android) y avisos en el APK. Requiere el emulador o un APK más un celular.
- **APK:** avisos en los tres estados (siguen sin prueba física).

## 4. Riesgos

| Riesgo | Mitigación |
|---|---|
| En Expo Go ya no se pueden probar los avisos ni la tarjeta de activación | Se prueban en el APK. Es el comportamiento buscado |
| `resizeMethod="resize"` puede bajar un poco la nitidez de fotos grandes en Android | Solo aplica al tamaño mostrado; el visor con zoom conserva la resolución completa |
| El sello depende de que el QR no se filtre | Documentado. Rotación y ventana corta en la fase 3 |
| Cambio de texto en la auditoría funcional (C15) | Mismo control (que la visita por QR quede registrada), con el texto aprobado |

---

## 5. Sentry: cómo crear los proyectos (sin activar todavía)

1. Crear una cuenta gratuita en sentry.io (plan Developer). Usar un correo del equipo.
2. **Organización:** por ejemplo `zipa-lo-tiene`.
3. **Crear dos proyectos**, plataforma **React Native**: `zipa-clientes` y `zipa-negocios`.
4. **Lo que necesito, por proyecto: solo el DSN.** Está en Project Settings → Client Keys (DSN) y tiene la forma `https://<clave pública>@o<número>.ingest.<región>.sentry.io/<id>`.
   - No es una contraseña; va dentro de la app.
   - Aun así, lo guardamos como variable de EAS (`EXPO_PUBLIC_SENTRY_DSN`), no en el repositorio.
5. **Para subir los mapas de código fuente** (después, en el APK): un **token de autenticación** de la organización (Settings → Auth Tokens) con permiso `project:releases`.
   - **Este sí es secreto.** No lo envíes por chat: se carga directo en EAS como variable secreta (`SENTRY_AUTH_TOKEN`).
6. **Privacidad, a revisar antes de activar:**
   - `sendDefaultPii: false`, sin IP ni datos del usuario;
   - no adjuntar correo, nombre ni WhatsApp;
   - limpiar los textos de las reservas en `beforeSend`;
   - muestreo de rendimiento bajo (por ejemplo 0,1) o apagado;
   - sin grabación de sesión (Replay);
   - aviso en la política de privacidad (P3).
7. **Activación:** el código quedará **apagado si no hay DSN**. Se enciende solo cuando definamos `EXPO_PUBLIC_SENTRY_DSN`, tras revisar lo anterior.

---

## 6. Propuesta: entorno Supabase de pruebas independiente (no ejecutada)

**Objetivo:** que los APK de prueba y las pruebas manuales no escriban en producción (P6).

1. **Crear** un segundo proyecto en Supabase, por ejemplo `zipa-lo-tiene-pruebas`, en la misma organización, región y plan gratuito.
   - En el plan gratis se pausa tras días sin uso. Es aceptable para pruebas y se reactiva desde el panel.
2. **Esquema:** aplicar las 22 migraciones con `npx supabase link --project-ref <ref-pruebas>` y `npx supabase db push`. Así queda idéntico a producción, sin datos reales.
3. **Funciones:** desplegar `revisar-negocio`, `eliminar-cuenta` y `enviar-notificaciones` en el proyecto de pruebas, con secretos propios: `CRON_SECRET` distinto y Vault con la URL de ese proyecto.
4. **Datos:** sembrar negocios de muestra con un script como `pruebas/diseno/capturas-clientes.js`. **No copiar datos reales de producción.**
5. **EAS:**
   - el perfil `preview` usa `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` del proyecto de pruebas;
   - `production` mantiene producción;
   - la variable de Firebase se comparte, porque es el mismo paquete de la app.
6. **Panel de administración:** una URL de pruebas, o local apuntando al proyecto de pruebas, con su propia cuenta de administrador.
7. **Correo:** en pruebas, el SMTP de Supabase alcanza (límite bajo, solo para el equipo).
8. **Costo:** US$0 en el plan gratis. Si se necesita que no se pause, Pro cuesta US$25 al mes.

**Riesgos:**
- confundir los dos proyectos: nombres y colores distintos en el panel, y la CLI enlazada al de pruebas por defecto;
- cambiar el enlace de la CLI exige `--project-ref` explícito para producción.

**Requiere tu autorización:** crear el proyecto, aplicar migraciones allí y cambiar las variables de EAS.
