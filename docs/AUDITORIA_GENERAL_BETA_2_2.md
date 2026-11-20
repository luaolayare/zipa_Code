# Auditoría general: Zipa lo tiene, Beta 2.2

**Fecha:** 20-nov-2026
**Alcance:** las tres apps (clientes, negocios y panel), la base de datos, las notificaciones push y los APK.
**Modo:** solo lectura.
- No se implementaron funciones ni se modificó producción.
- No se hizo push ni despliegue.
- Las pruebas corrieron contra Supabase **local** (Docker), con un servidor falso de Expo.
- Las consultas a producción fueron de solo lectura: lista de migraciones, lista de funciones y configuración pública de autenticación.

**Etiquetas de evidencia:**

| Etiqueta | Significado |
|---|---|
| **[PA]** | Probado automáticamente: pruebas ejecutadas hoy, con su identificador |
| **[PM]** | Probado manualmente (por una persona o por mí, a mano) |
| **[VC]** | Verificado en código: lectura del código, sin ejecución |
| **[NV]** | No verificado |
| **[F]** | Fallido |

**Resultados crudos de esta auditoría:** `pruebas/auditoria/resultados/auditoria-general-beta-2-2.txt`.

---

## 1. Resumen ejecutivo

Beta 2.2 (emprendimientos, reservas, notificaciones y panel) está **implementada y funciona en el entorno local**:

- **Sin fallas en las pruebas automáticas:**
  - 119 pruebas unitarias;
  - pruebas SQL de esquema y permisos;
  - 72 casos de punta a punta en el navegador y en la API;
  - la regresión funcional (46 OK, 0 fallas, 2 que requieren celular).
- **CI de GitHub en verde** en la rama.
- **Producción (Supabase)** ya tiene las 21 migraciones y la función de envío publicada.
- **Los APK nuevos** (commit `6eb31c4`) incluyen Beta 2.2 y la configuración de Firebase.

**Lo que NO está demostrado:**
- **Ninguna notificación push se ha entregado a un celular real.** Todo el envío se probó contra un Expo falso. La entrega en Android (abierta, en segundo plano o cerrada) está **PENDIENTE**.
- **Ninguna función de Beta 2.2 se ha probado en un Android físico:** reservas, recorte de fotos, WhatsApp desde la app.

**Lo que encontró la auditoría:**
- **Un error alto, reproducido:** la función de envío mezcla en la misma petición avisos de los **dos proyectos de Expo** (clientes y negocios). Expo rechaza esas peticiones completas. Cuando coinciden en cola avisos para las dos apps (por ejemplo, después de una caída), **ninguno se entrega** y terminan como «fallida» (P1).
- **Un error medio:** la bandeja del restaurante deja fuera las solicitudes más nuevas cuando su historial pasa de 300 (P4).
- **Bloqueos para publicar** (no para seguir probando en beta privada):
  - los textos legales no cubren reservas ni notificaciones;
  - no hay verificación de correo ni recuperación de contraseña;
  - el entorno de pruebas es el mismo de producción.

| Destino | ¿Está listo? |
|---|---|
| Seguir probando con el equipo, en beta privada | **Sí**, corrigiendo antes P1 si se van a probar las notificaciones |
| Abrir las reservas a clientes reales | **No** |
| Publicar en tiendas | **No** |

---

## 2. Estado general y de cada app

| Punto | Estado | Evidencia |
|---|---|---|
| **Rama** | `feature/beta-2-2-reservas` en `6eb31c4`, subida a GitHub y sin cambios pendientes. **No está unida a `main`** (5 commits por delante) | `git status` y `git log` [PM] |
| **`main`** | `49d1cf4` (Beta 2.1). Su última corrida de CI **falló** en `supabase db start` (infraestructura de GitHub) y **no se volvió a lanzar** | GitHub Actions, corrida del 19-nov 02:31 [PM] |
| **CI de la rama** | ✅ `06eae10` y `6eb31c4`: typecheck, lint, Jest, migraciones en base limpia y pruebas SQL de esquema y permisos | GitHub Actions [PA] |
| **Versiones** | Expo SDK 58 (`expo` 58.0.25), React Native 0.88.1, React 19.3.0, expo-router 58.0.31, expo-notifications 58.1.8 (fijada), Next.js 16.4.5 | `node_modules/*/package.json` [PM] |
| **Migraciones** | **21** en el repositorio (0001–0021) y **21 aplicadas en producción** | `ls supabase/migrations`; `supabase migration list --remote` [PM] |
| **Edge Functions en producción** | `revisar-negocio` (v4, JWT), `eliminar-cuenta` (v4, JWT) y `enviar-notificaciones` (v2, sin JWT y con secreto) | `supabase functions list --remote` [PM] |
| **Pruebas automáticas** | 119 unitarias (12 suites); SQL de esquema y permisos; 8 scripts de punta a punta con 72 casos más la regresión de 48 casos | ver sección 5 |
| **Compilación** | Panel `next build` ✅; `expo export` Android de clientes y negocios ✅; `expo-doctor` 19/20 ⚠️ | [PA] |

### Funcionalidades por estado

| Estado | Funcionalidades |
|---|---|
| **Completas** (probadas automáticamente en local) | Búsqueda paginada, categorías, menús, redes y entregas, ayuda de clasificación, visor de fotos, reservas completas (configuración, solicitud, decisión, cancelación, vencimiento, historial), bandeja por estados, WhatsApp prellenado, «Mis reservas», panel «Reservas», cola y envío de notificaciones (contra Expo falso), retención automática |
| **Parciales** | **Notificaciones push:** sin entrega real probada y con el error P1. **Recorte de fotos:** solo en código; la web no tiene editor y Android no está probado. **Panel:** cifras reales, pero producción casi no tiene datos de reservas |
| **Pendientes** | Push en iOS (sin cuenta de Apple Developer); todas las pruebas en Android físico de Beta 2.2; textos legales; verificación de correo y recuperación de contraseña; ambiente de pruebas separado |

---

## 3. App de clientes

| Función | Estado | Evidencia |
|---|---|---|
| Registro y autenticación | ✅ | `auditoria-funcional.js` (clientes) y B-3 (iniciar sesión y volver al formulario) [PA]. **Sin** recuperar contraseña: no hay `resetPasswordForEmail` en el código [VC] |
| Categorías y subcategorías | ✅ | `auditoria-funcional.js` C01, C04, C06 [PA] |
| Búsqueda por productos y platos | ✅ | C02, C03 [PA] |
| Paginación | ✅ | B3-1, B3-2: 20 resultados más «Ver más», sin duplicados y reinicio al cambiar la búsqueda [PA] |
| Fotos ampliables | ✅ web · ⏳ Android | A-11: abrir, 2x y cerrar [PA]. Pellizco y arrastre en Android [NV] |
| Menú digital | ✅ | B1-4, C07 [PA] |
| WhatsApp y «Cómo llegar» | ✅ | C08; C-5 (WhatsApp del restaurante con el código) [PA] |
| Redes sociales | ✅ | A-8, A-9 (solo las configuradas; abre https normalizado) [PA] |
| Modalidades de entrega | ✅ | A-8 [PA] |
| Reseñas | ✅ | Casos de reseñas de `auditoria-funcional.js` [PA] |
| QR (visita verificada) | ✅ / ⏳ | La visita por QR se prueba en la regresión [PA]. Compartir la imagen del QR (N07) requiere celular [NV] |
| Solicitar reserva | ✅ | B-3 a B-6, I-1 [PA] |
| Mis reservas | ✅ | B-12, I-4 [PA] (pestañas: `apps/clientes/src/app/mis-reservas.tsx`) |
| Cancelar reserva | ✅ | B-13, I-5; SQL (antes de la hora; cancelación simultánea RC-4) [PA] |
| Estados de la solicitud | ✅ | B-11 (motivo y «Solicitar otro horario»); textos por estado en `apps/clientes/src/app/reserva/[id].tsx` [VC] |
| Notificaciones al cliente | ⏳ | La cola y el envío funcionan (N-4, I-4, I-7) [PA]. **Entrega al celular [NV]** |
| Experiencia sencilla | ✅ con nota | La ficha suma, sin bloques nuevos si no hay datos: un botón de reserva (solo restaurantes que la activaron), botones de redes (solo los configurados) y una línea de entregas (A-10 [PA]). El perfil muestra 3 reservas y «Ver todas». Capturas en `docs/capturas-beta-2-2/` [PM] |

**Ninguna solicitud pendiente se muestra como confirmada:**
- La etiqueta y el texto salen del estado guardado en el servidor (`ReservationPill`, `EXPLAIN` en `reserva/[id].tsx`) [VC].
- B-5 comprueba que una solicitud nueva queda y se muestra «Pendiente» [PA].
- Las solicitudes solo pasan a confirmada por `confirmar_reserva`, ejecutada por el dueño (SQL) [PA].
- **Matiz:** una pendiente cuyo plazo venció se sigue mostrando «Pendiente» hasta 5 minutos, hasta que corre la tarea de vencimiento (I-7 [PA]). Nunca aparece como confirmada.

---

## 4. App de negocios

| Función | Estado | Evidencia |
|---|---|---|
| Registro en 5 pasos | ✅ | Casos de registro de `auditoria-funcional.js` [PA] |
| Clasificación (emprendimientos o restaurantes) y ayuda «¿Qué vendes principalmente?» | ✅ | A-6, A-7, B1-1, B1-2; `contact-test.ts` [PA] |
| Recorte y compresión de fotos | ⏳ | `apps/negocios/src/components/media.ts` (`allowsEditing` + `expo-image-manipulator`) [VC]; tamaños (`photos.ts`, Jest) [PA]. Editor en Android, peso final y la nota de iOS [NV] |
| Redes y entregas | ✅ | A-1 a A-5 [PA]; SQL: rechaza `javascript:`, acortadores e IP [PA] |
| Productos y menú | ✅ | Regresión de negocios; B1-1, B1-2 [PA] |
| Horarios de reservas | ✅ | B-1 (error de horario), B-2 [PA]; SQL (cruces, sin horarios, solo restaurantes) [PA] |
| Activar y desactivar reservas | ✅ | B-2 [PA]; SQL `guardar_config_reservas` [PA] |
| Recibir solicitudes | ✅ | B-7, C-1, I-3 [PA] |
| Fecha, hora, personas, mesa y platos | ✅ | B-7 (WhatsApp, mesa, platos y aviso de que no están pagados) [PA] |
| Contacto por WhatsApp | ✅ web · ⏳ Android | C-3, C-4: mensaje editable, wa.me, sin confirmar la reserva [PA]. Que abra la app de WhatsApp [NV] |
| Confirmar | ✅ | B-9, I-3; RC-3 (concurrencia) [PA] |
| Rechazar con motivo | ✅ | B-8; SQL (motivo obligatorio y nota con «Otro») [PA] |
| Cancelar | ✅ | SQL (con motivo para el restaurante; no aplica a pendientes) y RC-4 [PA] |
| Historial y bandeja por estados | ✅ | C-1, C-2 [PA]; `reservation_events` (SQL) [PA] |
| Notificaciones push | ⏳ | La cola y la Edge Function funcionan (N-1 a N-11, I-2, I-5) [PA]. **Entrega a un Android real [NV]** |
| Enterarse sin tener la app abierta | ⏳ | **En el servidor sí:** el aviso sale por `pg_net` al encolar y, como respaldo, cada minuto con `pg_cron`, sin ninguna app abierta (N-2, I-2, I-7) [PA]. **Que llegue al celular con la app cerrada [NV].** Además requiere que el restaurante haya tocado «Activar notificaciones» (P13) |

**Probado en Android físico hasta hoy:** nada de Beta 2.2. Lo que sí se probó en celular en auditorías anteriores es de Beta 2.

---

## 5. Resultados de pruebas (ejecutadas hoy, 20-nov-2026)

| Prueba | Resultado | Archivo |
|---|---|---|
| Typecheck (todos los paquetes) | ✅ 0 errores [PA] | `npm run typecheck` |
| ESLint (todos los paquetes) | ✅ 0 errores ni avisos [PA] | `npm run lint` |
| Jest | ✅ **119/119**, 12 suites [PA] | `packages/shared/src/__tests__/` |
| Esquema SQL | ✅ [PA] | `supabase/ci/verificar_esquema.sql` |
| Permisos y RLS | ✅ [PA] | `supabase/ci/probar_permisos.sql` (local, con las tablas vaciadas dentro de una transacción con `ROLLBACK`; en CI con base limpia) |
| Integral (tres apps y servidor) | ✅ **8/8** [PA] | `pruebas/auditoria/beta-2-2-integral.js` |
| Notificaciones (Expo falso) | ✅ **11/11** [PA] | `beta-2-2-notificaciones.js` |
| Concurrencia (API real) | ✅ **8/8** [PA] | `beta-2-2-reservas-concurrencia.js` |
| Entrega A | ✅ **12/12** [PA] | `beta-2-2-entrega-a.js` |
| Entrega B | ✅ **15/15** [PA] | `beta-2-2-entrega-b.js` |
| Entrega C | ✅ **6/6** [PA] | `beta-2-2-entrega-c.js` |
| Beta 2.1 | ✅ **12/12** [PA] | `correcciones-beta-2-1.js` |
| Regresión funcional | ✅ **46 OK · 0 fallas · 2 no probadas** (N07 compartir QR, N13 cámara) [PA] | `auditoria-funcional.js` |
| **Reproducción del error P1** | **[F] se reproduce** | `pruebas/auditoria/auditoria-2-2-repro-proyectos-expo.js` |
| Panel `next build` | ✅ [PA] | |
| `expo export` Android (dos apps) | ✅ [PA] | |
| `expo-doctor` | ⚠️ 19/20: `expo` 58.0.26, `expo-router` 58.0.32 y `expo-notifications` 58.1.9 salieron hace menos de 2 semanas y no se instalaron a propósito | |
| `npm audit --omit=dev` | ⚠️ 3 moderadas: `minimatch` y `@expo/fingerprint`, que entran por `expo` (herramientas de build). npm solo propone bajar a Expo 52, que no aplica | |
| Pruebas de carga | **No se ejecutaron hoy** | ver abajo |

**No ejecutadas:**
- Pruebas en celular físico.
- Pruebas de carga de reservas y notificaciones.
- Pruebas de iOS.

**Reproducibilidad:**
- Los scripts de punta a punta necesitan `playwright-core` y Chromium, que **no están en el repositorio** (P8).
- El CI no corre los scripts de punta a punta (P8).

**Las pruebas de carga del 16-nov (`docs/PRUEBAS_DE_CARGA.md`):**
- **Siguen siendo representativas para la búsqueda:** Beta 2.2 no cambió `buscar_negocios` ni `businesses_public`; los cambios de 0018–0021 son tablas aparte [VC].
- **No cubren lo nuevo:**
  - la ficha hace 2 consultas más (contacto y configuración de reservas);
  - las escrituras de reservas, con validación y bloqueos;
  - el disparador `pg_net`;
  - las tareas de `pg_cron`.
- Para una beta privada el riesgo es bajo. Para un lanzamiento público hay que medirlo.

---

## 6. Estado de las reservas

**Flujo probado de punta a punta (I-1 a I-7) [PA]:**
1. El cliente solicita y Supabase registra la solicitud como PENDIENTE, con su código.
2. El restaurante recibe el aviso (Expo falso) y abre el detalle desde la ruta del aviso.
3. El restaurante confirma.
4. El cliente recibe el aviso y ve la reserva en «Mis reservas».
5. El cliente cancela y el restaurante recibe el aviso.
6. Una solicitud sin respuesta vence sola.
7. El contacto por WhatsApp se probó aparte, en C-3 y C-4.

| Control | Estado | Evidencia |
|---|---|---|
| Fecha y hora (intervalo, anticipación mínima y máxima, días bloqueados, horario) | ✅ | SQL: 9 casos de rechazo [PA]; `reservations-test.ts` (horas y días en la app) [PA] |
| Límite de personas | ✅ | SQL (0 y más del máximo) [PA] |
| Duplicados e idempotencia | ✅ | SQL; RC-1 (5 envíos con la misma clave = 1); RC-2; B-6 (doble toque) [PA] |
| Confirmaciones concurrentes | ✅ | RC-3: confirmar y rechazar a la vez, 8 de 8 con un solo ganador [PA] |
| Rechazo con motivo, cancelaciones y transiciones prohibidas | ✅ | SQL (todas las prohibidas); B-8, B-10 [PA] |
| Vencimiento | ✅ | SQL; RC-5, RC-6 (idempotente y a prueba de carreras); **I-7 (`pg_cron` real)** [PA]. **En producción la tarea existe pero no la vi correr [NV]** |
| Autorización y RLS | ✅ | SQL: el cliente ve solo lo suyo, la dueña solo lo de su restaurante, ni el equipo ni otras dueñas ven solicitudes, anon nada, y no hay escrituras directas [PA] |
| Datos personales | ✅ | Los avisos no llevan nombres, teléfonos ni observaciones (N-5, I-2) [PA]; el panel tampoco (SQL `admin_reservas` e I-6) [PA] |
| Historial y auditoría | ✅ | `reservation_events` (SQL: secuencia completa) [PA]; `notification_deliveries` [PA] |
| Solicitudes masivas | ✅ / ⚠️ | 3 pendientes por restaurante y 10 al día por cuenta (SQL, RC-8) [PA]. Como el registro es abierto y sin verificar el correo, alguien puede crear varias cuentas (P5) |

---

## 7. Estado de las notificaciones push (prioritario)

| # | Punto | Estado | Evidencia |
|---|---|---|---|
| 1 | Token por dispositivo | ✅ servidor · ⏳ celular | SQL (registro, celular compartido, máximo 10, formato) [PA]; `apps/*/src/lib/notificaciones.ts` [VC]. Obtener el token en un Android real [NV] |
| 2 | Permiso de Android | ✅ en el APK · ⏳ en uso | `POST_NOTIFICATIONS` está en el manifiesto de los dos APK `6eb31c4` (inspección del APK) [PM]. El diálogo de permiso en un celular [NV] |
| 3 | Configuración Expo, EAS y Firebase | ✅ / ⚠️ | Los dos APK contienen `google_app_id` y el proyecto `zipa-lo-tiene-23578` (inspección del APK) [PM]. Llave FCM V1 de negocios: captura de la usuaria [PM]. **Llave de clientes: confirmada solo de palabra [NV]** |
| 4 | Envío desde el servidor | ✅ local · ⚠️ producción | N-1 a N-11 [PA]. En producción la función responde 200 con el secreto y 401 sin él [PM, 19-nov]. **Secretos de Vault en producción: los cargó la usuaria y no pude verificarlos [NV]** |
| 5 | Seguridad de los tokens | ✅ | SQL (el token no se puede leer desde la app, sin escrituras directas, nada de la cola para las apps) [PA]; N-11 (el log no los muestra) [PA] |
| 6 | Reintentos | ✅ | N-6, N-7; SQL (2 minutos y «fallida» al quinto intento) [PA] |
| 7 | Duplicados | ✅ | N-8 (tres envíos simultáneos sin duplicar); SQL (un aviso por evento) [PA] |
| 8–11 | Nueva, confirmada, rechazada, cancelada (y vencida) | ✅ cola · ⏳ entrega | SQL (destinatario y app de cada evento) [PA]; N-2, N-4, N-10, I-2, I-4, I-5, I-7 [PA] |
| 12 | Abrir el detalle al tocar | ✅ ruta · ⏳ toque real | `notificationRoute` (Jest) [PA]; C-6, I-3 (la ruta abre el detalle) [PA]. El toque real en el celular [NV] |
| 13 | App abierta, en segundo plano y cerrada | ❌ **PENDIENTE** | **Sin prueba en dispositivo [NV]** |
| 14 | Errores y recibos | ✅ | N-3, N-9 (`DeviceNotRegistered` en ticket y recibo) [PA]; incidencias en el panel (I-6) [PA] |
| — | **Avisos de las dos apps en la misma petición** | **[F] FALLA** | **P1**, reproducido |

**Importante:** que una notificación quede encolada, o incluso «enviada» (aceptada por Expo), no significa que haya llegado al celular. Hoy no existe ninguna evidencia de entrega real.

**iOS:** no configurado. No hay cuenta de Apple Developer, ni llave APNs, ni builds de iOS [VC].

---

## 8. Seguridad

| Punto | Estado | Evidencia |
|---|---|---|
| RLS | ✅ **27/27 tablas** de `public` con RLS (consulta a `pg_class`, local) [PA] | `verificar_esquema.sql` (25 tablas esperadas) [PA] |
| Escrituras de reservas y avisos | Solo por funciones `SECURITY DEFINER` con `search_path` vacío, que validan sesión, rol y estado [VC]; las escrituras directas fallan (SQL) [PA] | migraciones 0019–0021 |
| Edge Function de envío | Secreto en un encabezado y comparación en tiempo constante; 401 sin él (N-1 local, producción el 19-nov) [PA/PM] | `supabase/functions/enviar-notificaciones/index.ts` |
| Secretos fuera del repositorio | `google-services*.json` y `*firebase-adminsdk*.json` en `.gitignore`; Firebase va a EAS como archivo secreto; Vault fuera de las migraciones [VC] | `.gitignore`, `apps/*/app.config.js` |
| Enlaces de redes | La app y la base rechazan esquemas peligrosos, IP, usuario dentro del enlace, acortadores e imitaciones (SQL y Jest) [PA] | 0018, `contact.ts` |
| Autenticación en producción | ⚠️ `mailer_autoconfirm: true`, registro abierto, solo correo [PM, 20-nov, `GET /auth/v1/settings`]. Sin recuperar contraseña [VC] | |
| Dependencias | 3 moderadas (herramientas de Expo) [PA] | `npm audit` |
| Eliminar cuenta | Se borran solicitudes, dispositivos y avisos en cascada (SQL) [PA] | |

---

## 9. Panel administrativo

| Sección | Estado | Evidencia |
|---|---|---|
| Inicio de sesión y MFA | ✅ | A01–A03 de la regresión; I-6 [PA] |
| Usuarios registrados y activos | ✅ datos reales | `admin_analitica` (0015) [VC]; casos del panel en la regresión [PA]. Los «activos» solo cuentan la app de clientes con analítica (Beta 2 en adelante) |
| Analítica | ✅ real, ⚠️ pocos datos | Sin datos simulados [VC]. Producción tiene pocos usuarios, así que las cifras aún no son representativas |
| Categorías, negocios, destacados, moderación (videos, reseñas, reportes) y bitácora | ✅ | Casos A04–A14 de la regresión [PA] |
| Reservas: estados, motivos, tiempo de respuesta, restaurantes activos, avisos, incidencias y tareas | ✅ | I-6, SQL `admin_reservas` (sin datos personales; solo equipo con MFA) [PA] |
| Estado del sistema | ✅ | `admin_sistema` (0015) y página Sistema en la regresión [PA] |

**Datos aún insuficientes:**
- En producción no hay (o casi no hay) solicitudes de reserva, porque las apps con reservas aún no están en manos de nadie.
- El tiempo de respuesta, los motivos y las incidencias se llenarán con el uso.
- En local, el «tiempo promedio de respuesta» sale en 0 minutos porque las pruebas confirman al instante; **no es un dato real**.

**Observaciones menores:**
- El inicio del panel no tiene una tarjeta de reservas (P14).
- «Restaurantes con más solicitudes» muestra solo los 10 primeros.

---

## 10. Base de datos

| Elemento | Cantidad o estado | Evidencia |
|---|---|---|
| Migraciones | 21, todas aditivas desde la 0018 | repositorio y producción [PM] |
| Tablas `public` | 27, con RLS en todas (6 de reservas, 3 de avisos y 1 de contacto son de Beta 2.2) | consulta local [PA] |
| Índices `public` | 61 (incluye el único contra duplicados vivos, los de bandeja, plazos y cola) | `pg_indexes` [PA] |
| Funciones `public` | 57 | `pg_proc` [PA] |
| Triggers propios | 14 (Beta 2.2: `business_links_cuidar`, `reservation_events_notificar`, `notifications_despertar`) | `pg_trigger` [PA] |
| Tareas `pg_cron` | 3: envío cada minuto, vencimiento cada 5 minutos y limpieza diaria | `cron.job` local [PA]; producción [NV] |
| Edge Functions | 3, activas en producción | [PM] |
| Restricciones | `CHECK` de formatos, estados, motivos y largos; claves foráneas con `on delete cascade` o `set null` según el caso | migraciones [VC], SQL [PA] |
| Storage | Sin cambios en Beta 2.2: las fotos recortadas siguen yendo a la carpeta del dueño | `media.ts` [VC]; regresión [PA] |
| Datos personales | Las solicitudes se ven solo cliente–restaurante; el panel solo ve cifras; los avisos llevan textos sin datos personales | SQL [PA] |

---

## 11. APK de Android

| Build | App | Fecha | Commit | Supabase | Firebase / push | ¿Trae Beta 2.2? |
|---|---|---|---|---|---|---|
| `447a6fcf` | Clientes | 20-nov | `6eb31c4` | **Producción** (`auilsjqprobmhusvxmmz`) | ✅ (inspección del APK) | ✅ (textos de Beta 2.2 en el bundle) |
| `b11b486a` | Negocios | 20-nov | `6eb31c4` | **Producción** | ✅ | ✅ |
| `a522a059` / `cbe1a2c7` | Clientes / negocios | 19-nov | `06eae10` | Producción | ❌ sin Firebase | Sí, pero sin avisos en Android |
| `ffd402ea` / `8c13192d` | Clientes / negocios | 17-nov | `40ad02a` | Producción | ❌ | **No** (Beta 2) |

**Datos de los APK actuales:**
- **Perfil:** `preview` (APK).
- **Versión:** 0.1.0, build 1 (versión remota de EAS).
- **Builds usados:** 9 de 30 en el plan gratis.
- **Enlaces:** clientes `https://expo.dev/artifacts/eas/GmrZG0oEqatQ1YsF2P825CRAXl0GxD5m09ddHvjenEc.apk` · negocios `https://expo.dev/artifacts/eas/j3sJ1ZuHFaX3EzjbHwARp17nSPCePj81FkKgarqXI-g.apk`.

**¿Hay que recompilar?**
- **Para probar ahora:** no. Los APK `6eb31c4` tienen todo.
- **El error P1 no obliga a recompilar:** es del servidor y se corrige desplegando de nuevo la función.
- **Sí habrá que recompilar** si se corrige P4 (está en la app), si se actualizan los parches de Expo o al cambiar el logo.

---

## 12. Problemas encontrados

| # | Problema | App / archivo | Gravedad | Impacto | Solución recomendada | Prueba para comprobarla |
|---|---|---|---|---|---|---|
| **P1** | La función de envío arma un mismo lote con avisos de los **dos proyectos de Expo** (clientes `2daab65c…`, negocios `3c87b418…`). Expo exige un proyecto por petición y rechaza todo el lote (`PUSH_TOO_MANY_EXPERIENCE_IDS`). **Reproducido** | Servidor · `supabase/functions/enviar-notificaciones/index.ts:82-90` | **Alto** | Si coinciden en cola avisos de las dos apps (después de una caída, con reintentos o con eventos simultáneos), ninguno se entrega y quedan «fallida» tras unos 30 minutos | Agrupar los mensajes por app (o por proyecto) y enviar una petición por grupo; que el Expo falso de las pruebas aplique esa regla | `auditoria-2-2-repro-proyectos-expo.js` debe decir «no se reproduce», más un caso nuevo en `beta-2-2-notificaciones.js` |
| **P2** | Ninguna notificación entregada a un celular real; los secretos de Vault en producción y la llave FCM de clientes no están verificados | Las dos apps, producción | **Alto** (para la beta con avisos) | No se sabe si los avisos llegan | Prueba física con los APK `6eb31c4` (checklist C.9 de `BETA_2_2_IMPLEMENTACION.md`); revisar en el panel → Reservas → Notificaciones | Avisos recibidos con la app abierta, en segundo plano y cerrada |
| **P3** | La política de privacidad y los términos no cubren reservas, el token de notificaciones ni la conservación de datos | `packages/shared/src/legal/` | **Crítico** para publicar · Alto para usar con clientes reales | Datos personales nuevos sin informar | Revisión humana de `docs/PROPUESTA_TEXTOS_LEGALES_BETA_2_2.md`, subir `VERSION`, decidir la conservación | Prueba legal (`legal-test.ts`) y aceptación de la nueva versión |
| **P4** | La bandeja del restaurante pide `limit(300)` ordenado por fecha **ascendente**: con más de 300 solicitudes, las nuevas y pendientes quedan fuera | Negocios · `packages/shared/src/api.ts:546` | **Medio** (aparece con el uso) | Un restaurante no vería solicitudes nuevas | Pedir por estado o paginar, con las recientes primero | Prueba con más de 300 solicitudes antiguas y 1 pendiente nueva |
| **P5** | Sin verificación de correo (`mailer_autoconfirm: true`) ni recuperar contraseña; el registro está abierto | Clientes, negocios, producción | **Crítico** para publicar · Medio en beta | Cuentas falsas que esquivan el límite de reservas; cuentas perdidas | Paso 8 del plan: dominio, SMTP, verificación y recuperación | Registro con correo no verificado rechazado; flujo de recuperación |
| **P6** | No hay ambiente de pruebas: los APK de prueba usan **producción** | EAS env `preview` | **Crítico** para publicar · Medio en beta | Los datos de prueba se mezclan con los reales | Paso 9: proyecto Supabase de pruebas y variables por perfil | APK `preview` apuntando a otro proyecto |
| **P7** | La rama no está unida a `main`; producción ya tiene 0018–0021; el CI de `main` está en rojo sin reintentar | Repositorio | **Medio** | Riesgo de desplegar desde `main` sin las migraciones; confusión | Revisar y unir la rama a `main`; reintentar el CI | CI verde en `main` |
| **P8** | Los scripts de punta a punta no se pueden correr solo con el repositorio (`playwright-core` y Chromium vienen de fuera) y no corren en el CI | `pruebas/auditoria/` | **Medio** | Otra persona no puede repetir la evidencia | Agregar `playwright-core` como dependencia de desarrollo y un README; opcionalmente un trabajo del CI | Correr los scripts en un clon limpio |
| **P9** | Parches de Expo pendientes (`expo` 58.0.26, `expo-router` 58.0.32, `expo-notifications` 58.1.9) | Apps | **Bajo** | `expo-doctor` 19/20 | Actualizar cuando cumplan 2 semanas (expo-notifications desde el 25-nov) con `npx expo install --fix` y recompilar | `expo-doctor` 20/20 |
| **P10** | `npm audit`: 3 moderadas en `minimatch` y `@expo/fingerprint` (herramientas de build) | Dependencias | **Bajo** | Riesgo bajo: no corre en el celular | Seguir los parches de Expo | `npm audit` |
| **P11** | El permiso de cámara de negocios todavía promete «…con el que creamos la vista 3D» | Negocios · `apps/negocios/app.json:39` | **Bajo** | Texto engañoso en el diálogo del sistema | Cambiar el texto (requiere build) | Revisión del diálogo en Android |
| **P12** | `notificaciones.ts` duplicado en las dos apps (solo cambia el nombre de la app) | `apps/*/src/lib/notificaciones.ts` | **Bajo** | Mantenimiento | Mover al paquete compartido cuando `expo-notifications` quede en la raíz | Typecheck y pruebas |
| **P13** | El aviso al restaurante depende de que toque «Activar notificaciones» (bandeja o panel); no hay otro recordatorio | Negocios | **Medio** | Restaurantes que nunca se enteran | Invitar justo después de activar las reservas; mostrar en el panel «avisos desactivados» | Prueba de interfaz |
| **P14** | El inicio del panel no resume las reservas; el top muestra solo 10 restaurantes | Panel | **Bajo** | Menos visibilidad | Agregar una tarjeta en el inicio | Prueba del panel |
| **P15** | Push e iOS no configurados (sin Apple Developer); no hay builds de iOS | Apps | **Medio** (bloquea iOS) | iPhone sin avisos | Cuenta de Apple Developer y llave APNs en EAS | Build de iOS y prueba |
| **P16** | No está decidida la conservación de las solicitudes de reserva (no se borran) | Base de datos | **Medio** | Datos personales sin plazo | Decisión legal y luego una tarea `pg_cron` | SQL de retención |
| **P17** | Las pruebas de carga no cubren reservas ni avisos | `pruebas/carga` | **Medio** para publicar | Rendimiento desconocido bajo uso | Agregar escenarios de reserva a k6 (solo en local) | k6 local |

---

## 13. Pendientes de lanzamiento

| Pendiente | ¿Bloquea la beta privada? | ¿Bloquea la publicación? | Estado |
|---|---|---|---|
| Logo definitivo | No | Sí (identidad de tienda) | Provisional (`scripts/identidad/`) |
| Datos legales (marcadores `[CORREO DE SOPORTE]` ×9, `[NOMBRE DEL RESPONSABLE]` ×4, `[CIUDAD]` ×5 y otros) y textos de reservas y avisos | **Sí, para usar con clientes reales** | Sí | Pendiente (propuesta lista) |
| Dominio (URL de privacidad, enlaces universales del QR) | No | Sí | No existe |
| Verificación de correo, SMTP y recuperar contraseña | No | Sí | No existe (P5) |
| Contraseña de la base de datos | No | Sí | Rotación pendiente según el plan (no verificado hoy) |
| Proyecto Supabase de producción separado del de pruebas | No | Sí | Un solo proyecto (P6) |
| Identificadores definitivos | No | Sí (no se pueden cambiar después de publicar) | Se mantienen `co.zipa.vitrinalocal` y `co.zipa.vitrinanegocios` por decisión; confirmar antes de la tienda |
| Cuentas de Google Play y Apple Developer | No | Sí | No existen |
| Pruebas en dispositivos físicos (Beta 2.2 y push) | **Sí, para validar los avisos** | Sí | Pendiente (P2) |
| Corregir P1 | **Sí, si se prueban los avisos** | Sí | Pendiente |

---

## 14. Próximas cinco tareas recomendadas

1. **Corregir P1 (envío por proyecto)** con su prueba, y desplegar de nuevo `enviar-notificaciones` (requiere autorización). No requiere un APK nuevo.
2. **Prueba física en Android** con los APK `6eb31c4`: activar avisos, recibir con la app abierta, en segundo plano y cerrada, tocar y abrir el detalle, más las reservas, el recorte de fotos y WhatsApp (checklist C.9). Confirmar en el panel que no hay incidencias de avisos.
3. **Revisión legal** de la propuesta, decidir el plazo de conservación (P3 y P16) y completar los marcadores pendientes.
4. **Unir la rama a `main`** con el CI en verde, y corregir P4 (bandeja) y P11 (texto de la cámara) en el mismo lote. Recompilar cuando también entren los parches de Expo (P9).
5. **Pasos 8 y 9 del plan:** dominio, SMTP, verificación de correo y recuperación de contraseña, y un ambiente de pruebas separado de producción (P5 y P6).
