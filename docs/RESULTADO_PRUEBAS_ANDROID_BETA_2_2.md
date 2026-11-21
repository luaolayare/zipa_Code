# Resultado de las pruebas en Android — Beta 2.2

Fecha: 21 de noviembre de 2026 · Rama: `feature/tipografia-espacios` (commits locales, sin push).

Estados usados: **Aprobada**, **Fallida**, **Bloqueada** (no se puede probar en este entorno) y **No ejecutada**.

---

## A. Infraestructura

| Elemento | Estado | Detalle |
|---|---|---|
| Proyecto de pruebas `zipa-lo-tiene-pruebas` (`ayvugzpidvafjiqzlqwc`, us-east-2, plan gratuito) | Aprobada | Es el único proyecto de pruebas. Producción (`auilsjqprobmhusvxmmz`) no se tocó. |
| 22 migraciones | Aprobada | `supabase migration list --linked`: de 0001 a 0022, local = remoto. |
| Edge Functions | Aprobada | `eliminar-cuenta` y `revisar-negocio` exigen sesión. `enviar-notificaciones` exige el secreto del cron. Las tres están activas. |
| Secretos nuevos e independientes | Aprobada | `CRON_SECRET` y los valores del Vault (`zipa_cron_secreto` y `zipa_funciones_url`) son propios de pruebas. |
| Datos ficticios | Aprobada | Todo usa el dominio `@pruebas.zipa.test`: 1 administrador, 3 dueñas (una con su negocio en revisión), 4 clientes, 3 negocios, productos, reseñas, un destacado y reservas. No se copió ningún dato real. |
| Verificación del entorno (`pruebas/entorno/verificar-entorno.js`) | Aprobada | 14/14 |
| Desarrollo local y EAS `preview`/`development` → pruebas | Aprobada | Los `.env` de las tres apps apuntan a pruebas. El candado también bloquea producción en desarrollo local, sin excepción (commit `97f27ac`). |
| EAS `production` sin cambios | Aprobada | No se tocó. **Aviso:** ese ambiente no tiene las variables de Supabase, así que un build de producción hoy se detendría en el candado. Hay que agregarlas antes del primer build de producción. |
| `ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS` | Aprobada | No se usó. |

**Credenciales**
- La contraseña común de las cuentas ficticias está en la variable de usuario de Windows `ZIPA_CLAVE_PRUEBAS`. No está en el repositorio, en archivos de texto ni en este informe.
  - Para conservarla: en PowerShell, `[Environment]::GetEnvironmentVariable('ZIPA_CLAVE_PRUEBAS','User')`. Cópiala a tu gestor de contraseñas con el título «Zipa — cuentas de pruebas» y el usuario `*@pruebas.zipa.test`.
  - Después puedes borrar la variable con `[Environment]::SetEnvironmentVariable('ZIPA_CLAVE_PRUEBAS',$null,'User')`.
- La contraseña de la base de datos de pruebas no se guardó en ningún lado. Si alguna vez la necesitas, se restablece en el panel de Supabase (Project Settings → Database).
- La prueba del panel activó el segundo factor (TOTP) de `admin@` y `duena-emprendimiento@`; al terminar se borró. La primera vez que entres al panel de pruebas, el administrador configurará su propio autenticador.

## B. Pruebas automáticas y de seguridad

| Prueba | Estado | Resultado |
|---|---|---|
| Typecheck (`npm run typecheck`) | Aprobada | 0 errores |
| Lint (`npm run lint`) | Aprobada | 0 errores y 0 advertencias |
| Pruebas unitarias (Jest) | Aprobada | 141/141 (16 suites) |
| Seguridad contra APIs reales (Supabase local, `seguridad-local.js`) | Aprobada | 34/34 |
| Concurrencia e idempotencia de reservas (Supabase local) | Aprobada | 8/8: envíos repetidos, choque de horario, confirmar contra rechazar, cancelación doble, vencimiento y límite de 10 en 24 h |
| Aislamiento entre negocios (proyecto de pruebas, sesiones reales) | Aprobada | 12/12. Marta no puede ver ni cambiar las reservas, los productos, los datos ni las respuestas de Inés. Nadie se vuelve administrador. Los controles confirman que la propia Inés sí ve sus datos. |
| Permisos RLS (verificación del entorno) | Aprobada | 14/14 |
| Panel del equipo (Next.js contra pruebas) | Aprobada | 10/10, detallado en la sección C |
| Prueba integral de punta a punta con avisos push | Bloqueada | Expo Go en Android no entrega avisos push remotos (desde SDK 53). Requiere un build nativo. |
| Enlaces universales (QR que abre la app instalada) | Bloqueada | Requiere un build nativo. En Expo Go se probó con un enlace `exp://`. |

## C. Android (emulador `zipa_android14`, Expo Go 58.0.5, Logcat activo)

### Clientes

| # | Prueba | Estado | Evidencia |
|---|---|---|---|
| 1 | Abrir y cargar | Aprobada | Arranque en frío ~17 s (servidor de desarrollo). Inicio con categorías, «Destacados» y «Recién llegados». |
| 2 | Registro e inicio de sesión | Aprobada | Se creó una cuenta nueva desde la app (Sofia Prueba). Sin aceptar los términos, la app la bloquea con un mensaje claro. El inicio de sesión funciona. |
| 3 | Cerrar y recuperar la sesión | Aprobada | Cerrar sesión deja la app como invitado y se puede volver a entrar. La sesión se mantiene al cerrar la app a la fuerza. |
| 4 | Búsqueda | Aprobada | «arepas», «changua» (busca por plato), «tejidos» y «espiga» dan 1 resultado cada una. «xyzqw» muestra un estado vacío claro. |
| 5 | Abrir el mismo restaurante varias veces | Aprobada | 10 de 10 aperturas sin cierres, en el mismo proceso y sin errores. |
| 6 | Fotos y videos | Aprobada | La foto se ve y el video aprobado se reproduce. |
| 7 | Navegación | Aprobada | Pestañas, ficha, reserva, perfil y botón atrás. |
| 8 | Reseñas y sello «Reseña con QR» | Aprobada | Con el enlace del QR aparece «Abriste este negocio con su código QR». Al publicar, la reseña lleva «Reseña con QR» y su nota explicativa. Una cuenta de menos de 24 h ve: «Podrás calificar 24 horas después de crear tu cuenta». |
| 9 | Reservas | Aprobada | Se pidió la R-PX9335 y quedó «Pendiente». Un WhatsApp inválido se rechaza con un mensaje claro. |
| 10 | Estados de carga y error | Aprobada | En modo avión aparece «No pudimos cargar este negocio · Revisa tu conexión a internet». |
| 11 | «Intentar de nuevo» | Aprobada | Al volver la red, la ficha carga completa. |
| 12 | Diseño adaptable y letra grande (130 %) | Aprobada, con corrección | Todo se lee y nada se corta. La pestaña «¿Tienes negocio?» ocupaba dos líneas y su ícono quedaba desalineado; se corrigió (commit `6ad6237`). |
| 13 | Memoria y errores visibles | Aprobada | 400–446 MB (Expo Go en modo desarrollo). En Logcat: 0 cierres, 0 ANR y 0 cierres por falta de memoria. |

### Negocios

| # | Prueba | Estado | Evidencia |
|---|---|---|---|
| 1 | Inicio de sesión | Aprobada | Panel en ~4 s |
| 2 | Panel | Aprobada | Estado «Publicado», destacado, calificación 4,7, 3 reseñas y 3 productos |
| 3 | Datos del negocio | Aprobada | Se ven tipo, dirección, horario y WhatsApp |
| 4 | Catálogo | Aprobada | Precio cambiado ($9.500 → $9.800) y «No disponible hoy». Sin foto no deja guardar: «Agrega una foto del plato». |
| 5 | Imágenes y videos | Aprobada, en parte | Se muestran la foto y el «Video aprobado». No se grabó un video con la cámara del emulador. |
| 6 | Bandeja de reservas | Aprobada | Pestañas Pendientes, Confirmadas y Rechazadas, con su detalle y plazo de respuesta |
| 7 | Confirmar y rechazar | Aprobada | Confirmar pide confirmación y deja historial. Rechazar exige un motivo y deja la reserva «No confirmada». |
| 8 | Responder reseñas | Aprobada | Se publicó la respuesta y se puede editar. |
| 9 | QR | Aprobada | Pantalla del QR con la advertencia de que es una versión de prueba |
| 10 | Navegación y cierre de sesión | Aprobada | Con sesión iniciada, la bienvenida muestra «Ir a mi panel». |
| 11 | Letra grande | Aprobada | Bienvenida y panel legibles al 130 % |
| 12 | Errores y cierres | Aprobada | 0 cierres |

### Panel del equipo (Next.js, contra pruebas)

| # | Prueba | Estado |
|---|---|---|
| P-1 | Sin sesión, redirige a «Entrar» | Aprobada |
| P-2 | Una dueña de negocio (sin rol) termina en «Sin acceso» | Aprobada |
| P-3 | Segundo factor obligatorio: un código incorrecto se rechaza y el correcto entra | Aprobada |
| P-4 | Aprobar un negocio en revisión lo publica | Aprobada |
| P-5 | Las 9 secciones cargan: reservas, reseñas, reportes, videos, destacados, categorías, analítica, bitácora y sistema | Aprobada |
| P-6 | La bitácora registra «Publicó un negocio» | Aprobada |
| P-8 | No hay claves secretas en el JavaScript del navegador (17 archivos revisados) | Aprobada |
| P-9 | Sin errores de JavaScript | Aprobada |
| P-10 | «Salir» cierra la sesión | Aprobada |

### Flujos integrales

| Flujo | Estado | Detalle |
|---|---|---|
| Cliente pide una reserva → el negocio confirma → el cliente ve el estado | Aprobada | R-PX9335 aparece «Confirmada» y R-3BDUUP «No confirmada» en «Mis reservas» |
| Búsqueda → negocio → catálogo | Aprobada | — |
| QR → reseña | Aprobada | — |
| El negocio edita un producto → el cliente lo ve | Aprobada | Aparecen el nuevo precio $9.800, el plato «No disponible hoy» (al final del menú) y la respuesta del negocio |
| El equipo aprueba un negocio → aparece en la app | Aprobada | «Panadería La Espiga (prueba)» sale en la búsqueda y en «Restaurantes: 2 lugares» |
| Aislamiento entre negocios | Aprobada | 12/12 (sección B) |

### Revisión de Logcat
- 2.029 líneas.
- 0 `FATAL EXCEPTION`, 0 ANR y 0 cierres por falta de memoria.
- Todos los cierres de Expo Go fueron `force-stop` de las pruebas.
- Los únicos errores de JavaScript son `Cannot find native module 'ExpoApplication'`, en 3 momentos. Siempre ocurren al cambiar de app (clientes ↔ negocios) dentro del mismo proceso de Expo Go, o tras muchas recargas. Si se abre en limpio, no aparecen. Es un límite de Expo Go, no de la app.

## D. Código

Commits de esta etapa:

| Commit | Cambio |
|---|---|
| `97f27ac` | El candado también impide usar producción en desarrollo local |
| `205a73c` | **Error real encontrado en Android:** con la sesión iniciada, «Empezar a explorar» llevaba al inicio de sesión; ahora va a Explorar. El script de datos de prueba ahora puede subir foto y video. |
| `6ad6237` | Pestañas de clientes alineadas con letra grande |
| (siguiente) | Observaciones 1 y 2 corregidas con autorización (ver abajo) |

No hizo falta cambiar el esquema, borrar información ni cambiar reglas del negocio.

**Observaciones:**
1. **Corregida (autorizada).** Al salir del editor de un producto con cambios sin guardar, los cambios se perdían sin aviso. Ahora la flecha «Volver», el botón atrás de Android y el gesto preguntan «¿Salir sin guardar?». Sin cambios, o al guardar o borrar, sale sin preguntar. Verificado en el emulador, 7/7: sin cambios no pregunta, atrás pregunta, «Cancelar» conserva el cambio, la flecha pregunta, «Salir sin guardar» no guarda, guardar sale directo y el precio quedó restaurado.
2. **Corregida (autorizada).** Una cuenta de menos de 24 h ahora ve el aviso «Tu cuenta es nueva… Podrás publicar tu reseña desde: Mañana · 9:30 a. m.» arriba de las estrellas, antes de escribir. La base de datos sigue aplicando la regla y no se cambió el esquema. Verificado en el emulador: la cuenta nueva ve el aviso; Lucía, con una cuenta de 2 días, no lo ve; publicar sigue bloqueado con el mensaje de siempre. Tiene 3 pruebas unitarias nuevas y en total pasan 144/144.
3. En el panel de negocios, un producto sin foto aparece como «Solo foto». Solo pasa con datos sembrados, porque la app exige foto.
4. Al cambiar el tamaño de letra del sistema con la app abierta, Android la reinicia en la bienvenida. En Expo Go es normal; habrá que comprobarlo en el build nativo.
5. En Expo Go, una recarga de desarrollo devuelve a la bienvenida. Eso explica el «vuelve al inicio» que se veía en el iPhone.

## Actualización: APK `preview`, variables de producción y `main` (autorizado)

**APK `preview` contra pruebas** (EAS, builds `4a6160a7` clientes y `7de51eb5` negocios), instalados en el emulador:

| Prueba | Resultado | Detalle |
|---|---|---|
| Android entrega el enlace del QR a la app instalada | Aprobada | `vitrinalocal://negocio/…` lo resuelve `co.zipa.vitrinalocal` (sin elegir navegador) |
| QR con la app abierta | Aprobada | Abre la ficha con «Abriste este negocio con su código QR» |
| QR con la app cerrada | Aprobada | Arranca directo en la ficha con el aviso |
| QR sin sesión | Esperado | Abre la ficha. La visita se guarda y se registra al iniciar sesión, por eso el aviso aparece después |
| Inicio de sesión en los dos APK | Aprobada | Lucía en clientes; dueña del restaurante en negocios |
| Cierres o bloqueos (Logcat) | 0 | Ni en `co.zipa.vitrinalocal` ni en `co.zipa.vitrinanegocios` |
| Avisos push | **No se pueden probar en emulador** | La app solo pide el token push en un teléfono físico (`Device.isDevice`), a propósito. Hay que probarlo con un Android conectado por USB e instalando estos mismos APK |

**Avisos push desde el servidor (proyecto de pruebas y Expo real), 9/9:** una solicitud real de Lucía dejó en cola el aviso «Tienes una nueva solicitud de reserva» para la dueña. La base despertó la función sola, en unos 2 segundos. La función rechaza llamadas sin su secreto (401). El texto no lleva nombre, teléfono ni observaciones. La función llegó al servicio de Expo y guardó su respuesta. Con un token ficticio, Expo respondió `DeviceNotRegistered` y el sistema desactivó ese token. La solicitud de prueba quedó cancelada.
Falta solo el último tramo: que Expo entregue el aviso a un teléfono real a través de Firebase. Eso exige un Android físico.

**Variables de producción en EAS:** el ambiente `production` de las dos apps ya tiene `EXPO_PUBLIC_SUPABASE_URL` (proyecto `auilsjqprobmhusvxmmz`) y `EXPO_PUBLIC_SUPABASE_ANON_KEY` (clave pública `anon`, guardada como *sensitive*). Solo se leyó la clave; no se cambió nada en Supabase de producción. El candado aprueba `production → producción` y sigue bloqueando `preview → producción`.

**`main`:** con la CI en verde, se adelantó `main` hasta la rama (fast-forward, sin conflictos). La CI solo prueba contra un Supabase local y no despliega nada.

## E. Próximo paso

1. Probar los avisos push con un teléfono Android físico (USB) usando los APK `preview` ya generados.
2. Listo: variables de Supabase en el ambiente `production` de EAS.
3. Guardar `ZIPA_CLAVE_PRUEBAS` en el gestor de contraseñas y borrar la variable de Windows.
4. Listo: rama subida y `main` actualizado.

Las capturas y los resultados en JSON quedaron en la carpeta temporal de la sesión (no van al repositorio).
