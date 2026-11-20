# Correcciones prioritarias: Beta 2.2 (P1, P4 y P13)

**Fecha:** 20-nov-2026.
**Rama:** `feature/beta-2-2-reservas`. Los cambios están en un commit local que **no se ha subido**.
**Base:** los problemas de `docs/AUDITORIA_GENERAL_BETA_2_2.md`.

**Lo que NO se hizo:**
- No se tocó Supabase remoto.
- No se desplegaron Edge Functions.
- No se generaron APK.
- No hubo push ni fusiones.
- No se agregaron funciones nuevas: el resto de Beta 2.2 queda igual (la regresión completa pasa).

---

## 1. Qué se corrigió

### P1: notificaciones en lotes separados por proyecto de Expo

**Problema**
- Clientes (`2daab65c…`) y negocios (`3c87b418…`) son dos proyectos de Expo.
- La función `enviar-notificaciones` armaba un mismo lote con avisos de los dos.
- Expo rechaza entera una petición que mezcla proyectos (`PUSH_TOO_MANY_EXPERIENCE_IDS`), así que, si coincidían avisos de las dos apps, no se entregaba ninguno.

**Corrección**
- `supabase/functions/enviar-notificaciones/index.ts`:
  - envía **app por app**, con sus propios lotes de hasta 100;
  - cada falla se asigna solo a los avisos de su lote, así que una falla de un proyecto no afecta al otro.
- `supabase/migrations/0022_avisos_por_app.sql`: `tomar_notificaciones` ahora entrega la app de cada aviso. Solo redefine esa función; es aditiva y compatible.
- **Compatibilidad en cualquier orden de despliegue:** si la función llega a producción antes que la migración, deduce la app por la ruta del aviso (`/reservas/…` = negocios, `/reserva/…` = clientes). Esto se probó con la versión anterior de la base.
- **Sin cambios:** los reintentos (2, 4, 8 y 16 minutos, y «fallida» al quinto), la idempotencia (un aviso por evento; los ya resueltos no se reenvían) y los recibos.

### P4: bandeja de reservas con más de 300 solicitudes

**Problema:** la bandeja pedía 300 solicitudes de la más vieja a la más nueva. Con un historial largo, las nuevas y las pendientes no aparecían.

**Corrección: paginación en el servidor por pestaña**
- `packages/shared/src/reservations.ts` (`INBOX_TABS`, `inboxQuery`) define qué estados entra en cada pestaña y en qué orden:

  | Pestaña | Orden |
  |---|---|
  | Pendientes | Por el plazo que vence antes |
  | Confirmadas | Visitas próximas, la más cercana primero |
  | Rechazadas, Canceladas y Vencidas | De la más reciente a la más vieja |
  | Finalizadas | Finalizadas, «no asistió» y las confirmadas cuya hora pasó hace más de 6 horas (para marcar la asistencia), de la más reciente a la más vieja |

- `packages/shared/src/api.ts`:
  - `businessReservationsPage` pide **30 por página** con `range`;
  - `reservationCounts` saca la cantidad de cada pestaña con consultas de solo conteo;
  - se quitó la consulta antigua de 300.
- `apps/negocios/src/app/reservas/index.tsx`:
  - reutiliza el paginador compartido (`createPager`), que no duplica, no pide dos veces a la vez y descarta respuestas de una pestaña anterior;
  - agrega el botón «Ver más».
- `apps/negocios/src/app/panel.tsx`: la tarjeta «Reservas» cuenta las pendientes con `reservationCounts`.

### P13: activación de las notificaciones

- **Al activar las reservas** (`apps/negocios/src/app/reservas/configuracion.tsx`), si los avisos no están activos en ese celular, aparece **«Último paso: las notificaciones»**:
  - explica que, sin ellas, las solicitudes llegan a la bandeja pero no se avisan;
  - tiene el botón explícito **«Activar notificaciones»** y la opción «Ahora no».
- **Aviso visible cuando están desactivadas** (`packages/shared/src/ui/PushPrompt.tsx`):
  - tarjeta roja «Notificaciones desactivadas» en la bandeja, en el panel (con reservas activas) y en la solicitud del cliente;
  - la tarjeta «Reservas» del panel muestra la línea **«Notificaciones: Activadas en este celular / Desactivadas / Bloqueadas en los ajustes / No se pudieron activar»**.
- **Reintentar:**
  - si falla la activación, aparece **«Intentar de nuevo»**;
  - si están bloqueadas, aparecen **«Abrir ajustes»** y **«Ya las activé, revisar de nuevo»**;
  - al volver de los ajustes del celular, el estado se revisa solo (`AppState`, en `apps/*/src/lib/notificaciones.ts`).
- **No promete entrega:** los textos dicen «activadas en este celular», nunca que los avisos «funcionan» o «llegan». La regla está en `pushStateLabel` y una prueba de Jest lo comprueba.

---

## 2. Pruebas (todas en local, 20-nov-2026)

| Prueba | Resultado | Archivo |
|---|---|---|
| Typecheck y lint (todos los paquetes) | ✅ 0 errores | |
| Jest | ✅ **128/128** (13 suites; 9 nuevas de P4 y P13) | `packages/shared/src/__tests__/correcciones-2-2-test.ts` |
| SQL de esquema y permisos | ✅ (nueva comprobación: `tomar_notificaciones` indica la app de cada aviso) | `supabase/ci/*.sql` |
| **Reproducción de P1** | ✅ **«no se reproduce»**: 2 peticiones (una por proyecto) y los 2 avisos entregados | `auditoria-2-2-repro-proyectos-expo.js` |
| Reproducción de P1 con la base anterior (sin la 0022) | ✅ no se reproduce (la función deduce la app) | misma prueba, con la función SQL anterior restaurada solo en local |
| Notificaciones (Expo falso que **ahora aplica la regla de un proyecto por petición**) | ✅ **15/15** | `beta-2-2-notificaciones.js` |
| — N-12 | ✅ Avisos de las dos apps en cola a la vez: se entregan los dos, en peticiones separadas | |
| — N-13 | ✅ Si falla solo el proyecto de negocios, el aviso al cliente se entrega igual | |
| — N-14 | ✅ Al volver, el de negocios se entrega en el reintento y el del cliente no se reenvía | |
| — N-15 | ✅ Ninguna petición en toda la prueba mezcló proyectos | |
| Integral (tres apps; Expo falso con la misma regla) | ✅ **9/9** (nuevo I-9: ninguna petición mezcló proyectos) | `beta-2-2-integral.js` |
| **P4 con 324 solicitudes** | ✅ **7/7** | `beta-2-2-correcciones.js` |
| — P4-0 | ✅ Demuestra el problema: la consulta anterior no traía las nuevas | |
| — P4-1 | ✅ El panel cuenta las 2 pendientes | |
| — P4-2 | ✅ Pendientes muestra las 2 nuevas y las cantidades son correctas | |
| — P4-3 | ✅ Finalizadas: 30 y luego 60 sin repetir, con la confirmada pasada primero | |
| — P4-4 | ✅ Confirmadas muestra solo la próxima | |
| — P4-5 | ✅ Cambiar rápido de pestaña no mezcla resultados | |
| — P4-6 | ✅ Sin errores de consola | |
| Regresión: Entregas A, B y C, concurrencia y Beta 2.1 | ✅ 12/12 · 15/15 · 6/6 · 8/8 · 12/12 | |
| Regresión funcional | ✅ **46 OK · 0 fallas** · 2 no probadas (requieren celular) | `auditoria-funcional.js` |
| Panel `next build` y `expo export` Android de las dos apps | ✅ | |
| `expo-doctor` | ⚠️ 19/20 (los mismos parches recientes de la auditoría) | |

- **Resultados crudos:** `pruebas/auditoria/resultados/correcciones-prioritarias-beta-2-2.txt`.
- **Capturas:** `docs/capturas-beta-2-2/q1-bandeja-pendientes.png` y `q2-bandeja-finalizadas-ver-mas.png`.

**Lo que no se pudo probar en la web:** la pantalla «Último paso» y la tarjeta de notificaciones de P13. En la web los avisos no están disponibles, así que la tarjeta se oculta a propósito. Su lógica está probada con Jest; **la interfaz requiere celular**.

---

## 3. Qué falta desplegar (requiere autorización)

| Corrección | Qué hay que hacer | ¿Requiere APK nuevo? |
|---|---|---|
| **P1** | 1) `npx supabase db push --remote` (aplica **solo** la 0022). 2) `npx supabase functions deploy enviar-notificaciones --yes`. Se pueden hacer en cualquier orden | **No** |
| **P4** | Está en el código de la app de negocios | **Sí** (negocios) |
| **P13** | Está en el código de las dos apps | **Sí** (las dos) |
| Repositorio | Subir el commit y unir la rama a `main` cuando lo autorices | — |

Los APK actuales (`447a6fcf` y `b11b486a`, commit `6eb31c4`) **no** tienen P4 ni P13. Sí se benefician de P1 apenas se despliegue la función, porque P1 está en el servidor.

### Despliegue realizado (20-nov-2026, con autorización)

- ✅ Migración 0022 aplicada en producción. Hay 22 migraciones, iguales en local y en remoto.
- ✅ `enviar-notificaciones` desplegada (versión 3, `verify_jwt=false`, protegida con `x-zipa-cron`).
- ✅ Commits `f279122` y `83cfd00` subidos a `feature/beta-2-2-reservas`. No se fusionó con `main`.
- ✅ APK nuevos con P4 y P13, del commit `83cfd00`:
  - clientes: build `0bdf6a86`;
  - negocios: build `a7d59426`.

---

## 4. Qué hay que probar físicamente (Android)

**Después de desplegar P1** (sirve con los APK actuales):
- [ ] Con dos celulares (restaurante y cliente), hacer que coincidan avisos de las dos apps. Por ejemplo, el cliente pide y el restaurante confirma otra al mismo tiempo. Deben llegar a los dos.
- [ ] En el panel del equipo → «Reservas» → «Notificaciones»: no debe haber avisos fallidos ni atascados.

**Con los APK nuevos (P4 y P13):**
- [ ] Activar las reservas: aparece «Último paso». Tocar «Activar notificaciones» y aceptar el permiso del sistema: queda «Activadas en este celular».
- [ ] Negar el permiso: la tarjeta pasa a «Bloqueadas». «Abrir ajustes» lleva a los ajustes de la app; al activarlo allí y volver, el estado se actualiza solo (o con «Ya las activé, revisar de nuevo»).
- [ ] Sin conexión al activar: aparece «Intentar de nuevo» y, con la conexión de vuelta, funciona.
- [ ] Recibir un aviso con la app **abierta, en segundo plano y cerrada**, y tocarlo para abrir el detalle.
- [ ] Bandeja: con muchas solicitudes, «Ver más» al final de cada pestaña; las pendientes siempre arriba.

**Mientras esas pruebas no se hagan, no se puede afirmar que los avisos funcionan en Android.**
