# Beta 2.2: implementación

**Rama:** `feature/beta-2-2-reservas`, que sale de `main` en `49d1cf4` (Beta 2.1). Todo el trabajo está solo en este equipo: no se ha subido a GitHub.

**Estado por entrega:**

| Entrega | Estado |
|---|---|
| Fase 0: auditoría | ✅ Hecha |
| A: Emprendimientos | ✅ Hecha y probada en local. Falta la prueba en Android real |
| B: Reservas y seguridad | ✅ Hecha y probada en local (ver «Entrega B» al final). Falta la prueba en Android real |
| C: Notificaciones y contacto | ✅ Hecha y probada en local (ver «Entrega C»). El envío real a un celular requiere Firebase y APK nuevos |
| D: Panel y validación integral | ✅ Hecha y probada en local (ver «Entrega D») |

**Lo que NO se hizo:**
- No se tocó Supabase remoto: las migraciones nuevas (0018 a 0021) se aplicaron solo en la base local de Docker.
- No hubo builds de EAS, despliegues ni push.
- No se cambiaron identificadores Android/iOS.

## Resumen final (los 10 puntos del informe)

1. **Estado inicial del repositorio:** sección 1. La base era `main` en `49d1cf4`, con 17 migraciones y el CI con una falla de infraestructura en el paso de migraciones.
2. **Funcionalidades implementadas:**
   - **A:** fotos con recorte y compresión, ayuda de categorías, redes sociales y entregas.
   - **B:** solicitudes de reserva con confirmación manual.
   - **C:** notificaciones push, bandeja por estados y contacto por WhatsApp.
   - **D:** «Mis reservas», panel «Reservas», vencimiento automático, retención y documentos.
   - Todo se probó en local.
3. **Archivos modificados:** secciones 3, B.8, C.5 y D.5.
4. **Migraciones creadas:** cuatro, todas solo aditivas y aplicadas solo en la base local.

   | Migración | Contenido |
   |---|---|
   | `0018_contacto_y_entregas` | Redes y entregas del negocio |
   | `0019_reservas` | Reservas |
   | `0020_notificaciones_push` | Notificaciones |
   | `0021_reservas_operacion` | Vencimiento, retención y estadísticas |

5. **Resultados reales de pruebas** (última corrida, 19-nov-2026):

   | Comprobación | Resultado |
   |---|---|
   | `typecheck` y `lint` | ✅ sin errores ni avisos |
   | Jest | ✅ 119/119 |
   | `verificar_esquema.sql` | ✅ 25 tablas, todas con RLS |
   | `probar_permisos.sql` | ✅ todo pasa |
   | Integral | ✅ 8/8 |
   | Entrega C | ✅ 6/6 |
   | Notificaciones | ✅ 11/11 |
   | Concurrencia | ✅ 8/8 |
   | Entrega B | ✅ 15/15 |
   | Entrega A | ✅ 12/12 |
   | Beta 2.1 | ✅ 12/12 |
   | Auditoría funcional | ✅ 46 OK, 0 fallas (2 requieren celular) |
   | Panel `next build` y `expo export` Android de las dos apps | ✅ |
   | `expo-doctor` | ⚠️ 19/20 (tres parches recientes no instalados por la regla de dos semanas) |

6. **Estado de las notificaciones:** C.7.
   - El servidor y la lógica de las apps están probados.
   - La entrega real a un celular **no se ha probado**: requiere Firebase (Android), las migraciones y la función en Supabase remoto, y APK nuevos.
7. **Estado de seguridad y RLS:** B.6, C.4 y D.2.
   - 25 de 25 tablas con RLS.
   - Escrituras solo por funciones validadas en el servidor.
   - El equipo sin acceso a datos personales de reservas.
8. **Riesgos y limitaciones:** secciones 8, B.10 y C.8. El más importante:
   - **Revisión legal (bloqueante):** la política de privacidad y los términos deben incluir reservas, notificaciones y retención antes de publicar a usuarios reales (`docs/PROPUESTA_TEXTOS_LEGALES_BETA_2_2.md`).
9. **Pruebas pendientes en Android físico:** secciones 9, B.11 y C.9.
10. **Instrucciones para probar cada app:** sección 10, y además la sección «Cómo publicar y probar Beta 2.2» al final de este documento.

---

## 1. Estado inicial del repositorio (Fase 0)

### Git y CI

- **Rama y commit:** `main` en `49d1cf4`, igual que `origin/main`. Solo había un archivo local sin seguimiento (`docs/ESTADO_ACTUAL_BETA_2.md`), idéntico al que ya estaba en la rama, así que no se perdió nada.
- **CI de `49d1cf4`:**
  - «Typecheck, lint y pruebas»: ✅.
  - «Migraciones de Supabase»: ❌, falló en `supabase db start`, al arrancar la base temporal y antes de aplicar ninguna migración. Ese commit no tocaba migraciones, y el mismo paso pasó en `b9c2ecc`. Lo más probable es una falla de infraestructura de GitHub. Falta volver a lanzarlo (*Re-run failed jobs*).

### Aplicaciones y paquetes

| Pieza | Estado |
|---|---|
| Clientes y negocios | Expo SDK 58.0.25, React Native 0.88.1, Expo Router con rutas tipadas |
| Panel administrativo | Next.js 16.4.5, cuenta del equipo con MFA (aal2) obligatorio y roles `admin`/`revisor` |
| `packages/shared` | Tema, API, sesión, categorías, presentación, paginación, moderación y textos legales |
| Supabase | 17 migraciones y RLS en las 15 tablas de `public`. Edge Functions `revisar-negocio` y `eliminar-cuenta` |
| Pruebas | Jest: 78 pruebas en 9 suites. SQL de CI: `verificar_esquema.sql` y `probar_permisos.sql`. Playwright local: `pruebas/auditoria/` |
| EAS | Un proyecto por app (`projectId` en cada `app.json`). Perfil `preview` que genera APK. Uso: 5 de 30 builds del plan gratis |

### Lo que la especificación pide y ya existía

- **Categorías:** las dos principales y las 12 subcategorías de la especificación ya están, con los mismos nombres (migración 0013). El equipo ya las administra desde el panel. No hizo falta crear ninguna.
- **Fotos:**
  - límite de 4 por producto (la principal y 3 más), aplicado en la base (0017);
  - elegir cuál es la foto principal (Beta 2);
  - aprobación de videos por el equipo (0011).
- **WhatsApp** como canal principal, con analítica de clics (0015).
- **Piezas reutilizables:**
  - filtro de palabras ofensivas en la base (`texto_ofensivo`) y en la app (`findOffensiveWords`);
  - bitácora del equipo (`admin_actions`);
  - zona horaria `America/Bogota` ya usada en destacados;
  - patrón de Edge Functions con verificación de sesión.

### Lo que no existe todavía (relevante para B, C y D)

- **Reservas:** no hay tablas, pantallas ni estados.
- **Notificaciones push:** no hay nada. Falta:
  - instalar `expo-notifications`;
  - crear la tabla de tokens;
  - configurar el archivo de Firebase (`google-services.json`) y las credenciales FCM en EAS.
- **Tareas programadas:** no hay `pg_cron` ni Edge Functions programadas. La expiración automática de la Entrega D necesita una de las dos.

### Riesgos detectados para las siguientes entregas

1. **Push en Android:** Expo envía a Android a través de Firebase Cloud Messaging. Hace falta un proyecto de Firebase (gratis) y subir su credencial FCM V1 a EAS. Eso lo debe crear o autorizar el dueño de la cuenta, y requiere un APK nuevo.
2. **Push en iOS:** requiere una cuenta de Apple Developer (pago anual). Hoy solo se generan APK de Android, así que iOS quedaría documentado pero sin probar.
3. **Expiración automática:** necesita activar `pg_cron` (o una función programada) en el proyecto remoto. Es una migración remota que requiere autorización.
4. **Orden de publicación:** cada migración nueva debe llegar a Supabase remoto **antes** de los APK que la usan. La Entrega A está preparada para eso: si la tabla nueva no existe, las apps simplemente no muestran redes ni entregas, sin errores.

---

## 2. Entrega A: Emprendimientos

### 2.1 Fotos

**Recorte y encuadre**
- Al elegir o tomar una foto se abre el editor del celular (`allowsEditing` de `expo-image-picker`).
  - En **Android** permite recortar, ampliar, mover y girar.
  - En **iOS** permite recortar; el recorte siempre es cuadrado (así lo define el sistema).
- Producto y logo se recortan **cuadrados**, para que se vean igual en Android y en iOS.
- La foto del documento de verificación **no se recorta**, para que el equipo la vea completa.

**Optimización**
- Después del recorte, `expo-image-manipulator` reduce el lado más largo y comprime en JPEG:
  - producto: 1600 px, calidad 0,75;
  - logo: 512 px, calidad 0,8;
  - documento: 2000 px, calidad 0,8.
- Nunca agranda una foto pequeña.
- Si la optimización falla, se usa la foto original en vez de bloquear al negocio.
- **Paquete nuevo:** `expo-image-manipulator ~58.0.16`, instalado con `npx expo install` en la app de negocios. La versión es del 28-oct-2026, así que cumple la regla de dos semanas. Al tener código nativo, **necesita un APK nuevo**.

**Sin cambios**
- **Vista previa:** la foto recortada se ve en el formulario antes de guardar. Se agregó un texto que lo explica.
- **Foto principal, límite de 4 fotos y aprobación de videos:** siguen igual. También los permisos de Storage: las fotos van a la carpeta del dueño, como antes.

**En clientes**
- Al tocar una foto del producto se abre **a pantalla completa**.
- Se puede deslizar entre fotos, acercar a 2x o 3x con los botones y mover la foto arrastrando.
- No se agregaron librerías nativas nuevas.

### 2.2 Categorías

- Debajo de «¿Qué es tu negocio?» hay una ayuda plegada: **«¿No sabes cuál elegir? Mira ejemplos»**.
- La pregunta de la subcategoría ahora dice **«¿Qué vendes principalmente?»**.
- **Ejemplos** (`CLASSIFICATION_EXAMPLES`, en `packages/shared/src/contact.ts`):

  | Qué vende | Categoría / subcategoría |
  |---|---|
  | Café empacado | Emprendimiento / Productos locales |
  | Café preparado | Restaurante / Cafeterías |
  | Artesanías | Emprendimiento / Artesanías |
  | Tortas y postres por encargo | Emprendimiento / Repostería |
  | Almuerzos y platos del día | Restaurante / Comida típica |

- Se ve en el registro y en «Tus datos». **No reclasifica negocios existentes.**

### 2.3 Redes sociales y 2.4 Modalidades de entrega

En el panel del negocio hay una sección nueva, **«Contacto y entregas»**, con su propia pantalla: `apps/negocios/src/app/negocio/contacto.tsx`.

**Redes sociales (opcionales)**
- **Campos:** Instagram, Facebook, TikTok y sitio web.
- **Qué acepta:** «@usuario», el usuario solo o el enlace completo. Se guarda siempre en una forma única con **https**.
- **Lo que se rechaza:**
  - enlaces que no son https (`javascript:`, `data:`);
  - direcciones IP y `localhost`;
  - usuario o contraseña dentro del enlace (`https://usuario@sitio`);
  - caracteres que rompen el enlace;
  - acortadores que esconden el destino (bit.ly y otros);
  - dominios que imitan a la red, como `instagram.com.evil.com`.
- **Doble validación:** las mismas reglas están en la app (`normalizeSocialLink`) y en la base (restricciones `CHECK`). No se pueden saltar llamando a la API directamente.

**Modalidades de entrega (opcionales e informativas)**
- Atención presencial, recogida en el establecimiento, entrega a convenir, domicilio local, envíos nacionales y envíos internacionales.
- Condiciones en texto corto: hasta 160 caracteres, con el filtro de palabras ofensivas.
- **No hay** pedidos, cobros, cálculo de envíos ni seguimiento.

**Dónde se ve**
- **Clientes:** debajo de WhatsApp, que sigue siendo el canal principal.
  - Solo aparecen las redes configuradas, como botones con el nombre de la red.
  - Las entregas se resumen en una línea, con las condiciones debajo.
  - Si el negocio no llenó nada, la ficha queda igual que antes.
- **Panel del equipo:** en la ficha del negocio, las redes se muestran **como texto, no como enlace**, para revisar el dominio sin abrirlo.

**Reglas**
- Guardar esta sección **no devuelve el negocio a revisión**.
- Lucide 1.x ya no trae íconos de marcas, así que los botones usan íconos genéricos (@ y globo) con el nombre de la red escrito.

---

## 3. Archivos modificados (Entrega A)

**Nuevos:**
- `supabase/migrations/0018_contacto_y_entregas.sql`
- `packages/shared/src/contact.ts`: redes, entregas y ejemplos de clasificación.
- `packages/shared/src/photos.ts`: tamaños y recorte por tipo de foto.
- `packages/shared/src/__tests__/contact-test.ts`
- `apps/negocios/src/app/negocio/contacto.tsx`
- `apps/clientes/src/components/PhotoViewer.tsx`
- `pruebas/auditoria/beta-2-2-entrega-a.js`
- `pruebas/auditoria/resultados/beta-2-2-entrega-a.json` y `funcional-beta-2-2-a.json`
- `docs/capturas-beta-2-2/`: 7 capturas.
- `docs/BETA_2_2_IMPLEMENTACION.md`: este informe.

**Modificados:**
- **Compartido:**
  - `api.ts`: `getBusinessLinks` y `saveBusinessLinks`.
  - `index.ts`
  - `__tests__/api-test.ts`
- **Negocios:**
  - `components/media.ts`: recorte y compresión.
  - `components/LogoPicker.tsx`, `components/ProductEditor.tsx` y `components/CategoryPicker.tsx`
  - `app/registro/verificacion.tsx` y `app/panel.tsx`
  - `package.json`
- **Clientes:** `app/negocio/[id].tsx` y `app/producto/[id].tsx`.
- **Panel:** `app/(panel)/negocios/[id]/page.tsx`.
- **CI:** `supabase/ci/verificar_esquema.sql` y `supabase/ci/probar_permisos.sql`.
- `package-lock.json`

---

## 4. Migraciones creadas

### `0018_contacto_y_entregas.sql`

Es solo aditiva: no cambia ni borra datos.

- **Tabla `business_links`:** una fila por negocio, y se borra junto con el negocio. Va aparte para no tocar la vista pública `businesses_public` ni la búsqueda `buscar_negocios`, que están afinadas para rendir.
- **Restricciones `CHECK`:** formato de cada red y del sitio web, lista cerrada de modalidades y largo de las condiciones.
- **RLS:**
  - **lectura:** si se puede ver el negocio (publicado, dueño o equipo);
  - **crear, editar y borrar:** solo el dueño.
- **Permisos por columna:**
  - `business_id` no se puede cambiar, así que una fila no se puede pasar a otro negocio;
  - `updated_at` no se puede escribir desde la API.
- **Trigger `business_links_cuidar`:**
  - normaliza espacios y deja las modalidades sin repetidos y en orden;
  - aplica `texto_ofensivo` a las condiciones;
  - actualiza `updated_at`.

**Aplicación:** solo en la base local, con `supabase migration up`; hay 18 migraciones aplicadas. **No se aplicó en remoto.**

---

## 5. Resultados de pruebas (18-nov-2026, todo local)

| Comprobación | Resultado |
|---|---|
| `typecheck`, en todos los paquetes | ✅ Sin errores |
| `lint`, en todos los paquetes | ✅ Sin errores ni avisos |
| Jest | ✅ **95/95** (10 suites; 17 pruebas nuevas) |
| `verificar_esquema.sql` | ✅ 16 tablas con RLS y el trigger nuevo |
| `probar_permisos.sql`, con 28 comprobaciones nuevas de `business_links` | ✅ Todo pasa (ver nota) |
| Entrega A en el navegador (`beta-2-2-entrega-a.js`) | ✅ **12/12**, 0 errores de consola |
| Regresión funcional completa: autenticación, negocios, productos, reseñas, moderación y panel | ✅ **46 OK · 0 fallas** · 2 que requieren celular |
| Regresión Beta 2.1 | ✅ 12/12 |
| Panel: `next build` | ✅ Compila |
| Clientes y negocios: `expo export --platform android` | ✅ Exportan |
| `expo-doctor` | ⚠️ 19/20: pide `expo-router` 58.0.32, que salió hace un día. No se actualizó (es un parche, no bloquea) |

> **Nota sobre `probar_permisos.sql`:** espera una base vacía, como la del CI. En local se corrió con las tablas vaciadas dentro de su propia transacción, que termina en `ROLLBACK`. Los datos locales quedaron intactos (se comprobó el número de negocios antes y después).

**Lo que verifican las pruebas nuevas:**
- **Café empacado vs. café preparado:**
  - cada uno cae en la categoría correcta;
  - cambian las palabras («producto» o «plato»);
  - todos los ejemplos existen en las categorías reales.
- **Redes sociales:**
  - formatos aceptados y la forma única en https;
  - 15 enlaces peligrosos o engañosos rechazados, tanto en la app como en la base.
- **Entregas:** orden, repetidos, largo y palabras ofensivas de las condiciones.
- **Permisos:**
  - **la dueña:** crea y edita lo suyo, pero no lo ajeno, y no puede pasar la fila a otro negocio;
  - **el turista:** ve, pero no edita ni borra;
  - **anon:** ve solo lo de negocios publicados;
  - **al borrar el negocio** se borra su contacto (eliminar cuenta).
- **Fotos:**
  - tamaño final sin deformar y sin agrandar;
  - qué tipos de foto se recortan.
- **En el navegador:**
  - un enlace peligroso no se guarda;
  - lo que sí se guarda queda normalizado;
  - guardar no manda el negocio a revisión;
  - la ayuda de categorías no cambia la clasificación;
  - clientes solo muestra lo configurado y Instagram abre el enlace https;
  - el visor amplía y se cierra;
  - el panel del equipo muestra los enlaces como texto.

**Un error encontrado y corregido durante las pruebas:**
- **El trigger** descartaba en silencio una modalidad desconocida. Ahora la rechaza.
- **El guardado en la app** usaba `upsert`, que intentaba reescribir `business_id`; la base lo impide a propósito. Ahora actualiza y, si no hay fila, inserta.

---

## 6. Estado de notificaciones

Todavía no se ha implementado: es la Entrega C. Ver los riesgos de la sección 1.

## 7. Estado de seguridad y RLS

- **16 de 16 tablas** de `public` tienen RLS.
- La tabla nueva no da permisos de escritura a `anon`.
- Toda validación de enlaces y textos se repite en la base.

---

## 8. Riesgos y limitaciones (Entrega A)

1. **Editor de recorte en iOS:** siempre es cuadrado y no permite girar. Además, Expo documenta un problema de iOS: con fotos de muy alta resolución de la galería, el recorte puede salir corrido. Hay que probarlo en un iPhone antes de publicar en iOS.
2. **Recorte en la web:** la vista web de desarrollo no tiene editor de recorte. Solo reduce y comprime. Es esperado, porque no hay web pública.
3. **Ampliar fotos:** se hace con botones, no con pellizco. Arrastrar la foto ampliada usa dos desplazamientos anidados; en Android hay que comprobar que se sienta natural.
4. **Enlaces maliciosos:** las reglas impiden formatos peligrosos y engaños comunes, pero no pueden saber si un sitio web legítimo en apariencia es malo. El equipo puede revisarlo en el panel; hoy no hay moderación previa de enlaces.
5. **Privacidad:** las redes y las entregas son información pública del negocio, ya cubierta por la política («la información del negocio publicado»). Conviene mencionarlas en la revisión legal de la Entrega D.
6. **Orden de publicación:** primero `db push` de la 0018 y después los APK. Si se publica al revés, las apps no fallan, pero en negocios la pantalla «Contacto y entregas» muestra «No pudimos cargar tus datos».

## 9. Pruebas pendientes en Android físico (Entrega A)

- [ ] Tomar una foto con la cámara: aparece el editor de recorte, se puede ampliar y mover, y el resultado se ve en la vista previa.
- [ ] Elegir una foto de la galería: igual que con la cámara.
- [ ] Revisar el peso final de la foto en Storage: debería ser de cientos de KB, no de varios MB.
- [ ] Logo: recorte cuadrado y tamaño final pequeño.
- [ ] Documento de verificación: no aparece el editor y la foto se lee bien.
- [ ] Ver fotos ampliadas en clientes: deslizar, acercar a 2x y 3x, arrastrar y cerrar con el botón y con «atrás».
- [ ] Tocar Instagram, Facebook o TikTok: abre la app de la red si está instalada, o el navegador.
- [ ] «Contacto y entregas» con el teclado del celular: el campo de sitio web usa el teclado de direcciones y no pone mayúsculas.

## 10. Cómo probar cada aplicación (local)

1. Arranca Supabase local y aplica las migraciones: `npx supabase start` y luego `npx supabase migration up`.
2. Levanta cada app con las variables de `npx supabase status -o json`:
   - clientes: `npx expo start --web --port 8083`, desde `apps/clientes`;
   - negocios: `npx expo start --web --port 8084`, desde `apps/negocios`;
   - panel: `npx next dev --port 3001`, desde `apps/admin`.
3. Corre las pruebas de la Entrega A:

   ```powershell
   node pruebas/auditoria/beta-2-2-entrega-a.js <carpeta-capturas> <foto.png>
   ```

4. **Prueba manual en negocios:** entra con una cuenta de negocio publicado → Panel → «Contacto y entregas». Llena las redes y las entregas y guarda. Luego abre la ficha en clientes y compara.

---

# Entrega B: Reservas y seguridad

Fecha: 19-nov-2026. Todo se probó en local.

## B.1 Cómo funciona

- **Son solicitudes, no reservas automáticas.** El restaurante decide siempre. No hay mesas, cupos, inventario ni asignación automática. Los horarios publicados dicen **cuándo se puede pedir**, no que haya mesa.
- **Es opcional y solo para restaurantes:** la categoría principal debe ser *Restaurantes* y la dueña tiene que activarlo. Un emprendimiento no ve la sección ni puede activarla; el servidor lo impide aunque se intente por la API.
- **No hay cobros ni anticipos.** Cualquier condición comercial se acuerda directamente entre el cliente y el restaurante.
- **Zona horaria:** `America/Bogota`.
  - En la base se guardan instantes (`timestamptz`).
  - Los horarios del restaurante (hora local) se comparan convirtiendo el instante a hora de Bogotá.
  - En la app, Colombia es UTC-5 fijo (no hay horario de verano).

## B.2 Configuración del restaurante (app de negocios)

**Dónde está:** Panel → tarjeta «Reservas» → «Activar reservas» o «Configurar reservas».

**Qué se configura:**
- Activar o desactivar.
- **Horarios por día de la semana:** hasta 2 franjas por día. La reserva puede empezar desde la hora inicial hasta antes de la final; con 12:00–15:00, la última es 14:30.
- **Máximo de personas** por solicitud: de 1 a 50.
- **Anticipación mínima:** 1 hora, 2 horas, 4 horas o 1 día. El servidor no acepta menos de 1 hora.
- **Anticipación máxima:** 1 semana, 15 días, 1 mes o 2 meses.
- **Intervalo de horas:** cada 15, 30 o 60 minutos.
- **Tiempo para responder:** 2, 6, 12 o 24 horas (ver B.5).
- **Fechas bloqueadas:** festivos, eventos o cierres.
- **Instrucciones para los clientes:** hasta 300 caracteres, con el filtro de palabras ofensivas.

**Validaciones:**
- Horarios que se cruzan, horas mal escritas o una hora final antes de la inicial se avisan en la app y se rechazan en el servidor.
- No se puede activar sin al menos un horario.

## B.3 Solicitud desde clientes

**Dónde está:** en la ficha de un restaurante con reservas activas aparece **«Solicitar reserva»**.
- Sin sesión, lleva a iniciar sesión y vuelve al formulario.

**El formulario pide:**
- **Día y hora:** solo los disponibles, sin las horas demasiado cercanas ni los días bloqueados.
- **Personas:** con el máximo del restaurante.
- **Nombre:** se llena con el de la cuenta.
- **WhatsApp:** acepta números de Colombia sin indicativo y de otros países con indicativo.
- **Preferencia de mesa y observaciones:** opcionales.
- **Platos (opcional):** se pueden elegir del menú con cantidades.
  - Se guarda una copia del nombre y del precio de ese momento, solo como información.
  - El formulario aclara: «Los platos que elijas son solo una preferencia: no están pagados ni garantizados».

**Antes de enviar** se muestra, palabra por palabra: «Tu solicitud será enviada al restaurante. La reserva solo quedará confirmada cuando el establecimiento la acepte».

**Al enviar:**
1. El servidor valida todo.
2. Crea la solicitud en estado **PENDIENTE**.
3. Registra el evento en el historial (`reservation_events`). Ese historial es la base de las notificaciones de la Entrega C.
4. Muestra el **código** de la solicitud (por ejemplo `R-7K3Q9P`, sin letras que se confunden).

**Después:**
- La persona consulta el estado en la pantalla de la solicitud y en **Perfil → «Mis reservas»**.
- Si fue rechazada, vencida o cancelada, ve el motivo y **«Solicitar otro horario»**. Abre el formulario con sus datos; no crea nada por sí solo.
- Puede **retirar** una solicitud pendiente o **cancelar** una confirmada, antes de la hora.

## B.4 Decisión del restaurante (app de negocios)

**«Solicitudes»**
- Muestra las pendientes primero (las que vencen antes), luego las confirmadas próximas y después el historial.
- Cada una muestra el código, la fecha y hora, las personas, el nombre, los platos y el plazo para responder.

**Detalle de una solicitud**
- Datos completos: WhatsApp, preferencia de mesa, observaciones, platos con total informativo, fecha de recibida e historial.
- **«Confirmar reserva»:**
  - Antes, un aviso pide confirmar solo después de acordarlo con el cliente.
  - Se guarda quién confirmó y cuándo.
- **«No puedo confirmarla»:**
  - Exige un motivo de la lista:
    - No hay mesas disponibles.
    - No hay disponibilidad en ese horario.
    - Restaurante cerrado o evento privado.
    - No se puede atender ese número de personas.
    - Otro motivo.
  - Admite un mensaje opcional de hasta 200 caracteres. Con «Otro motivo», el mensaje es obligatorio.
- **Confirmada y antes de la hora:** «Cancelar reserva», con motivo obligatorio.
- **Después de la hora:** «Sí, llegó» (FINALIZADA) o «No llegó» (NO_ASISTIO).

**Personal autorizado:** hoy solo la dueña del negocio, porque la app no tiene cuentas de empleados. Agregarlas sería un cambio futuro.

> El botón «Contactar al cliente» por WhatsApp (mensaje prellenado y editable) va en la **Entrega C**. La función que arma el mensaje ya existe y está probada (`restaurantWhatsappMessage`). Mientras tanto, el detalle muestra el número.

## B.5 Estados, transiciones y expiración

| De | A | Quién | Condición |
|---|---|---|---|
| PENDIENTE | CONFIRMADA | Restaurante | Antes del plazo para responder y antes de la hora |
| PENDIENTE | RECHAZADA | Restaurante | Con motivo de la lista |
| PENDIENTE | CANCELADA | Cliente | Antes de la hora (retira la solicitud) |
| PENDIENTE | EXPIRADA | Sistema | Al pasar el plazo para responder |
| CONFIRMADA | CANCELADA | Cliente o restaurante | Antes de la hora; el restaurante con motivo |
| CONFIRMADA | FINALIZADA / NO_ASISTIO | Restaurante | Desde la hora de la reserva |

**Cualquier otra transición se rechaza en el servidor.** Por ejemplo:
- confirmar una rechazada o una vencida;
- rechazar una confirmada;
- que el restaurante «cancele» una pendiente (debe rechazarla con motivo);
- cancelar después de la hora.

**Plazo para responder (política de expiración):** lo que ocurra primero entre:
- el tiempo para responder que eligió el restaurante (2 a 24 horas; por defecto 24), contado desde la solicitud;
- 30 minutos antes de la hora pedida.

Ese plazo se guarda en `respond_by` al crear la solicitud. Como la anticipación mínima es de 1 hora, el restaurante siempre tiene al menos 30 minutos para responder.

**Expiración:**
- La función `expirar_reservas()` vence las pendientes cuyo plazo pasó.
- Es **idempotente**: correrla dos veces no cambia nada la segunda vez.
- Es **segura frente a una confirmación simultánea**: toma solo filas no bloqueadas y vuelve a revisar el estado.
- Las apps no pueden ejecutarla.
- **Su programación automática (cada pocos minutos) es de la Entrega D.** Mientras tanto, una solicitud con el plazo vencido ya **no se puede confirmar**, aunque siga marcada como pendiente hasta que corra la expiración.

## B.6 Seguridad y concurrencia

**Escrituras**
- Las apps **solo leen** las tablas de reservas. Toda escritura pasa por funciones del servidor (`SECURITY DEFINER`, con `search_path` vacío) que:
  - validan la sesión y el rol (el rol sale de la sesión, no de lo que envíe la app);
  - validan fechas, horarios, personas, WhatsApp, platos y textos (con `texto_ofensivo`);
  - validan la transición de estado.
- **Sin escrituras directas:** `insert`, `update` y `delete` sobre las tablas dan «permission denied».

**Atomicidad**
- Cada cambio de estado bloquea la fila (`FOR UPDATE`), revisa el estado y lo cambia en la misma transacción.
- Si llegan a la vez «Confirmar» y «Rechazar», gana una sola; la otra recibe «Esta solicitud ya está confirmada» (o «rechazada»).

**Idempotencia**
- La app genera una clave por envío. Si la red reintenta, el servidor devuelve **la misma solicitud** (`repetida: true`).
- La misma clave con otros datos se rechaza.
- Un bloqueo por persona (`pg_advisory_xact_lock`) evita carreras entre envíos simultáneos.
- Además, un índice único impide dos solicitudes vivas de la misma persona para el mismo restaurante a la misma hora.

**Contra solicitudes masivas**
- Máximo 3 pendientes por persona en el mismo restaurante.
- Máximo 10 solicitudes por persona en 24 horas.
- Nadie puede reservar en su propio restaurante.

**Quién ve qué (RLS)**
- **Una solicitud:** solo quien la hizo y la dueña del restaurante. Incluye sus platos y su historial.
- **El equipo** del panel **no** ve solicitudes una por una, porque tienen teléfonos y observaciones. En la Entrega D verá estadísticas agregadas sin datos personales.
- **La configuración** del restaurante (horarios, fechas bloqueadas, instrucciones) es pública si el negocio está publicado, porque la necesita el formulario.

**Eliminar cuenta**
- Se borran las solicitudes de esa persona, con sus platos e historial.
- Si se borra el restaurante, se borran sus solicitudes.
- El restaurante deja de ver las solicitudes de clientes que eliminaron su cuenta. Es intencional, por minimización de datos.

**Logs:** las funciones no registran teléfonos. El historial guarda estados, rol y motivo, no datos de contacto.

## B.7 Migración `0019_reservas.sql`

Es solo aditiva: 6 tablas nuevas, todas con RLS.

| Tabla | Para qué |
|---|---|
| `reservation_settings` | Configuración del restaurante |
| `reservation_windows` | Horarios por día de la semana |
| `reservation_blocked_dates` | Fechas sin reservas |
| `reservations` | Las solicitudes |
| `reservation_items` | Platos de preferencia, con copia del nombre y el precio |
| `reservation_events` | Historial y auditoría |

**Funciones nuevas:**
- **Para las apps:** `guardar_config_reservas`, `solicitar_reserva`, `confirmar_reserva`, `rechazar_reserva`, `cancelar_reserva` y `marcar_asistencia`.
- **Del sistema:** `expirar_reservas`.
- **Ayudantes internos:** `normalizar_whatsapp`, `es_restaurante` y `estado_reserva_texto`.

**Índices:**
- único contra duplicados vivos;
- por restaurante y estado;
- por cliente;
- de pendientes por vencer.

**Aplicación:** solo en la base local; hay 19 migraciones aplicadas. **No se aplicó en remoto.**

## B.8 Archivos (Entrega B)

**Nuevos:**
- `supabase/migrations/0019_reservas.sql`
- `packages/shared/src/reservations.ts`: tipos, estados, motivos, WhatsApp, días y horas disponibles, textos.
- `packages/shared/src/ui/ReservationPieces.tsx`: etiqueta de estado, selector en píldoras y contador.
- `packages/shared/src/__tests__/reservations-test.ts`
- **Negocios:** `app/reservas/index.tsx`, `app/reservas/[id].tsx` y `app/reservas/configuracion.tsx`.
- **Clientes:** `app/reservar/[id].tsx` (formulario) y `app/reserva/[id].tsx` (estado).
- **Pruebas:**
  - `pruebas/auditoria/beta-2-2-entrega-b.js`
  - `pruebas/auditoria/beta-2-2-reservas-concurrencia.js`
  - sus resultados en `pruebas/auditoria/resultados/`
- 7 capturas `b*.png` en `docs/capturas-beta-2-2/`.

**Modificados:**
- **Compartido:** `api.ts` (10 métodos de reservas) e `index.ts`.
- **Negocios:** `app/panel.tsx` (tarjeta «Reservas», solo para restaurantes).
- **Clientes:**
  - `app/negocio/[id].tsx`: botón «Solicitar reserva».
  - `app/login.tsx`: vuelve al formulario después de iniciar sesión.
  - `app/(tabs)/perfil.tsx`: «Mis reservas», y el aviso de «Eliminar cuenta» ahora menciona las solicitudes.
- **CI:** `supabase/ci/verificar_esquema.sql` (22 tablas) y `supabase/ci/probar_permisos.sql`.

## B.9 Resultados de pruebas (19-nov-2026, todo local)

| Comprobación | Resultado |
|---|---|
| `typecheck` y `lint`, en todos los paquetes | ✅ Sin errores ni avisos |
| Jest | ✅ **111/111** (11 suites; 16 nuevas de reservas) |
| `verificar_esquema.sql` | ✅ 22 tablas, todas con RLS |
| `probar_permisos.sql`, con **82 comprobaciones nuevas** de reservas | ✅ Todo pasa (con las tablas vaciadas dentro de una transacción que termina en `ROLLBACK`, como en la Entrega A) |
| Concurrencia real con sesiones simultáneas (`beta-2-2-reservas-concurrencia.js`) | ✅ **8/8** |
| Entrega B en el navegador (`beta-2-2-entrega-b.js`) | ✅ **15/15**, 0 errores de consola |
| Regresión: Entrega A, Beta 2.1 y auditoría funcional completa | ✅ 12/12 · 12/12 · **46 OK, 0 fallas** (2 requieren celular) |
| Panel `next build`, `expo export` Android de clientes y negocios | ✅ |
| `expo-doctor` | ⚠️ 19/20: el mismo parche de `expo-router` de la Entrega A |

**Lo que cubren las pruebas SQL**
- **Configuración:**
  - solo la dueña configura;
  - solo restaurantes;
  - horarios cruzados o vacíos se rechazan;
  - anticipación menor a 1 hora se rechaza;
  - palabras ofensivas en las instrucciones se rechazan;
  - las fechas pasadas no se bloquean;
  - no se puede escribir directo en las tablas.
- **Solicitud:**
  - sin sesión no se puede;
  - se crea con los datos normalizados;
  - la idempotencia funciona (mismo resultado, y otra solicitud con la misma clave se rechaza);
  - se rechazan duplicados, personas fuera de rango, horas que no son del intervalo, horas muy cercanas, horas pasadas, más allá de la anticipación máxima, días bloqueados, fuera del horario, WhatsApp inválido, textos ofensivos, platos de otro negocio, platos repetidos o en cantidad cero, emprendimientos y el propio restaurante;
  - funcionan el límite de 3 pendientes y el de 10 al día.
- **Visibilidad:**
  - otra persona, otra dueña y el equipo no ven solicitudes ajenas;
  - anon no ve ninguna.
- **Transiciones:**
  - confirmar, rechazar con y sin motivo, cancelar como cliente y como restaurante, y asistencia antes y después de la hora;
  - todas las prohibidas;
  - el historial completo;
  - el plazo para responder.
- **Expiración:**
  - vence lo que debe;
  - es idempotente;
  - después ya no se puede confirmar;
  - las apps no pueden ejecutarla.
- **Eliminar cuenta:** se borran sus solicitudes.

**Lo que cubren las pruebas de concurrencia**
- 5 envíos simultáneos con la misma clave crean 1 sola solicitud.
- 2 envíos simultáneos para la misma hora con claves distintas: pasa 1.
- Confirmar y rechazar a la vez, repetido 8 veces: siempre gana 1, con el estado y el historial coherentes.
- Cliente y restaurante cancelan a la vez: 1 sola cancelación.
- Confirmar justo cuando vence el plazo mientras corre la expiración: queda vencida, nunca confirmada.
- El límite diario funciona.
- Las apps no pueden correr la expiración.

**Lo que cubre la prueba en el navegador**
- El restaurante:
  - un horario mal escrito se rechaza;
  - activa las reservas desde el panel;
  - ve la lista y el detalle;
  - al rechazar con «Otro motivo» se le exige la explicación;
  - rechaza con motivo y confirma;
  - una reserva confirmada ya no ofrece «rechazar».
- El cliente:
  - sin sesión pasa por iniciar sesión;
  - llena el formulario completo con platos;
  - recibe el código;
  - un doble toque en «Enviar» crea una sola solicitud;
  - ve el motivo del rechazo;
  - «Solicitar otro horario» llega con sus datos;
  - ve «Mis reservas» y cancela.
- La heladería y un restaurante sin reservas no muestran el botón, y el panel del emprendimiento no muestra la sección.

**Errores encontrados por las pruebas y corregidos**
1. Al abrir el formulario directamente, el nombre quedaba vacío porque la sesión llegaba después del primer render.
2. El aviso de platos en la app del restaurante le hablaba al cliente («los platos que elijas»). Ahora tiene su propio texto.

## B.10 Riesgos y pendientes (Entrega B)

1. **Política de privacidad: BLOQUEANTE antes de publicar.** Las reservas recogen datos personales nuevos (nombre de contacto, WhatsApp, observaciones y preferencias). La política actual no los menciona.
   - Hay que agregar la finalidad (gestionar solicitudes de reserva), quién los ve (solo el restaurante elegido), cuánto se guardan y el derecho a borrarlos.
   - Es un cambio de fondo: subir la versión obliga a aceptar de nuevo. **No se modificó; requiere revisión humana o legal** (Módulo 9.12, previsto para la Entrega D).
2. **Expiración automática:** hasta la Entrega D, una solicitud vencida sigue mostrándose «Pendiente», aunque ya no se puede confirmar. No hay que publicar reservas sin la tarea programada.
3. **Notificaciones (Entrega C):** hoy el restaurante solo se entera abriendo la app, y el cliente revisando «Mis reservas».
4. **Retención de datos:** aún no se borran solicitudes antiguas. Se propondrá en la Entrega D (por ejemplo, borrar los datos de contacto de solicitudes cerradas hace más de 12 meses).
5. **Personal autorizado:** solo la dueña puede decidir.
6. **Hora en la app:** se calcula con UTC-5 fijo. Si Colombia adoptara horario de verano habría que cambiarlo. En la base se usa la zona horaria real.

## B.11 Pruebas pendientes en Android físico (Entrega B)

- [ ] El formulario completo con el teclado del celular: la fila de días se desliza de lado, el teclado numérico aparece en WhatsApp y nada queda tapado por el teclado.
- [ ] La confirmación nativa (`Alert`) al confirmar en negocios y al cancelar o retirar en clientes.
- [ ] El flujo invitado → iniciar sesión → formulario en la app instalada.
- [ ] Un doble toque real en «Enviar solicitud» con conexión lenta, y con el modo avión justo al enviar: al reintentar no debe duplicarse.
- [ ] Las horas mostradas: el celular con otra zona horaria (por ejemplo, un turista con el teléfono en hora de España) debe seguir mostrando la hora de Bogotá.

---

# Entrega C: Notificaciones y contacto

Fecha: 19-nov-2026. Todo se probó en local. **El envío real a un celular todavía no se ha probado**: requiere un APK nuevo y las credenciales de Firebase (ver C.7).

## C.1 Cómo funciona

1. **Registro del dispositivo:** cada app registra el token de Expo del celular para la sesión actual (tabla `push_tokens`).
   - **Permiso en contexto, nunca al abrir la app:**
     - en negocios, en la bandeja de reservas y en la tarjeta «Reservas» del panel (si las reservas están activas);
     - en clientes, en la pantalla de una solicitud pendiente o confirmada.
   - **Se actualiza solo:** si el permiso ya está dado, al abrir la app con sesión se vuelve a registrar el token, y también si el token cambia.
   - **Celular compartido:** si otra cuenta inicia sesión en el mismo celular, el token pasa a esa cuenta.
   - **Varios dispositivos:** hasta 10 por persona y app; al pasar de 10 se desactivan los más viejos.
   - **Cerrar sesión:** antes de salir se desactiva el token de ese celular (`onBeforeSignOut`). Si no hay red, el cierre de sesión no espera más de 3 segundos.
2. **Encolar:** cada cambio de estado de una reserva deja un aviso en cola (tabla `notifications`), con un trigger sobre el historial de la Entrega B.
   - **Si encolar falla, la reserva no falla:** queda un aviso en el log y la solicitud sigue en la bandeja. Está probado provocando la falla.
3. **Enviar:** lo hace la Edge Function `enviar-notificaciones`, nunca las apps. Usa el servicio de Expo.
   - **Lotes:** de hasta 100 mensajes.
   - **Fallas reintentables:** red caída, HTTP 429 o 5xx se reintentan a los 2, 4, 8 y 16 minutos. Al quinto intento el aviso queda «fallida».
   - **Tokens inválidos:** si Expo responde `DeviceNotRegistered`, en el ticket o en el recibo, ese token se desactiva.
   - **Recibos:** se revisan después de 15 minutos.
   - **Sin duplicados:** aunque corran varios envíos a la vez (`SKIP LOCKED` y una sola respuesta por aviso).
4. **Despertar:**
   - **Inmediato:** al encolar, la base llama a la función con `pg_net`. La llamada sale después de que la reserva se guarda; si la transacción se deshace, no sale.
   - **Respaldo:** cada minuto con `pg_cron`, para reintentos y recibos.
5. **Al tocar el aviso:**
   - Abre el detalle: `/reservas/<id>` en negocios y `/reserva/<id>` en clientes.
   - Funciona con la app abierta, en segundo plano o cerrada.
   - Solo se aceptan esas rutas: un dato manipulado no puede llevar a otra pantalla ni fuera de la app.

**No se promete entrega garantizada.** Expo, Google y Apple pueden demorar o perder avisos. Si un aviso no llega, la solicitud siempre está en la bandeja.

## C.2 Avisos

El texto es visible con la pantalla bloqueada. Por eso **no lleva nombres, teléfonos, observaciones ni preferencia de mesa**; solo el restaurante, la fecha y las personas. Está probado.

| Evento | Para | Título | Abre |
|---|---|---|---|
| Nueva solicitud | Restaurante | «Tienes una nueva solicitud de reserva» | Detalle en la bandeja |
| Confirmada | Cliente | «Tu reserva fue confirmada» | Su solicitud |
| Rechazada | Cliente | «Tu solicitud de reserva no pudo confirmarse» | Su solicitud (motivo y «Solicitar otro horario») |
| Cancelada por el cliente | Restaurante | «Un cliente retiró su solicitud» / «Un cliente canceló su reserva» | Detalle |
| Cancelada por el restaurante | Cliente | «El restaurante canceló tu reserva» | Su solicitud |
| Vencida | Cliente | «Tu solicitud de reserva venció» | Su solicitud |

Finalizada y «no asistió» no generan aviso.

## C.3 Bandeja del restaurante y contacto

**Bandeja «Reservas»**
- **Pestañas con su cantidad:** Pendientes, Confirmadas, Rechazadas, Canceladas, Finalizadas (incluye «no asistió») y Vencidas.
- **Cada solicitud muestra:** código, fecha y hora, personas, nombre, preferencia de mesa, observaciones, platos, fecha de recibida, estado y, si está pendiente, el plazo para responder.

**«Contactar al cliente»** (en el detalle)
- Prepara el mensaje oficial con el restaurante, el código, la fecha, la hora y las personas.
- El restaurante **lo puede editar** y luego toca «Abrir WhatsApp» (`https://wa.me/<número>?text=…`).
- No envía nada solo, no guarda la conversación y **no confirma la reserva** (probado: sigue «pendiente»).
- El número ya viene validado del servidor.

**«Contactar al restaurante»** (en clientes, en la pantalla de la solicitud)
- Abre el WhatsApp del restaurante con un mensaje que menciona el código.
- Esto adelanta un punto del Módulo 7 (Entrega D), porque usa la misma pieza.

## C.4 Seguridad

**Tokens**
- Cada persona solo ve sus dispositivos, y sin el token en sí (permiso por columnas).
- Nadie escribe directo en la tabla: solo por `registrar_token_push` (exige sesión y valida el formato) y `desactivar_token_push` (solo el propio token).
- No hay credenciales de push en las apps.

**Cola, intentos y recibos**
- Las apps no tienen ningún acceso: ni leer, ni escribir, ni ejecutar las funciones del envío.
- Esas funciones solo las puede ejecutar `service_role`.

**Edge Function**
- `verify_jwt = false`, porque no hay sesión de usuario. Exige el secreto `CRON_SECRET` en el encabezado `x-zipa-cron` y lo compara en tiempo constante.
- Sin el secreto responde 401 (probado).
- **El log solo tiene cuentas:** ni tokens, ni nombres, ni teléfonos (probado).

**Avisos a otros negocios:** cada aviso va solo a los tokens activos del destinatario y de la app correcta.

**Eliminar cuenta:** se borran sus dispositivos y sus avisos (en cascada; probado).

## C.5 Migración `0020_notificaciones_push.sql` y archivos

**Migración** (solo aditiva):
- **Tablas:** `push_tokens`, `notifications` y `notification_deliveries`, todas con RLS.
- **Funciones para las apps:** `registrar_token_push` y `desactivar_token_push`.
- **Funciones del envío** (solo `service_role`): `tomar_notificaciones`, `registrar_envio_notificacion`, `recibos_pendientes` y `registrar_recibos`.
- **Trigger** que encola cada cambio de estado.
- **Despertar el envío:** `disparar_envio_notificaciones()`, que lee dos secretos de Vault y, si faltan, no hace nada y no falla.
- **Respaldo:** la tarea programada `zipa-enviar-notificaciones`, cada minuto.
- **Extensiones que activa:** `pg_net` y `pg_cron`. Supabase las incluye.

**Archivos nuevos:**
- `supabase/functions/enviar-notificaciones/index.ts` (más su entrada en `supabase/config.toml`).
- **Compartido:**
  - `packages/shared/src/push.ts`: rutas permitidas, formato del token, enlace de WhatsApp, textos y cierre de sesión;
  - `packages/shared/src/ui/PushPrompt.tsx`;
  - `packages/shared/src/__tests__/push-test.ts`.
- **Cada app:** `src/lib/notificaciones.ts`, que es lo único que habla con el módulo nativo.
  - Los dos archivos son iguales salvo el nombre de la app.
  - No pueden ir en el paquete compartido porque `expo-notifications` quedó instalado dentro de cada app.
- **Íconos:** `apps/*/assets/notification-icon.png` (Android: símbolo blanco), generados con `scripts/identidad/generar.cjs`. Los demás íconos no cambiaron.
- **Pruebas:** `pruebas/auditoria/beta-2-2-notificaciones.js` y `pruebas/auditoria/beta-2-2-entrega-c.js`.

**Archivos modificados:**
- **Compartido:**
  - `auth.tsx`: tareas antes de cerrar sesión;
  - `api.ts`: registrar y desactivar el token, y el WhatsApp del restaurante en la solicitud;
  - `reservations.ts`, `index.ts` y `package.json` (dependencia de `lucide-react-native`).
- **Negocios:** `_layout.tsx`, `panel.tsx`, `reservas/index.tsx` (pestañas) y `reservas/[id].tsx` (contactar).
- **Clientes:** `_layout.tsx` y `reserva/[id].tsx`.
- **Las dos apps:** `app.json` (plugin `expo-notifications` con ícono, color y canal «reservas») y `package.json`.
- `scripts/identidad/generar.cjs` y su `README.md`.
- **CI:** `supabase/ci/verificar_esquema.sql` (25 tablas y el trigger nuevo) y `supabase/ci/probar_permisos.sql`.

**Paquetes nuevos** (en las dos apps, instalados con `npx expo install`):
- `expo-device ~58.0.5`.
- `expo-notifications 58.1.8`, fijada exacta.
  - La versión que propone Expo (58.1.9) salió el 11-nov y no cumple la regla de dos semanas.
  - Por eso `expo-doctor` la marcará como un parche atrás, igual que `expo-router`.
- Los dos tienen código nativo: **necesitan APK nuevos**.

## C.6 Resultados de pruebas (19-nov-2026, todo local)

| Comprobación | Resultado |
|---|---|
| `typecheck` y `lint`, en todos los paquetes | ✅ Sin errores ni avisos |
| Jest | ✅ **119/119** (12 suites; 8 nuevas de notificaciones) |
| `verificar_esquema.sql` | ✅ 25 tablas, todas con RLS |
| `probar_permisos.sql`, con las comprobaciones nuevas de notificaciones | ✅ Todo pasa (con las tablas vaciadas dentro de una transacción que termina en `ROLLBACK`) |
| Envío de punta a punta con un servidor falso de Expo (`beta-2-2-notificaciones.js`) | ✅ **11/11** |
| Bandeja y contacto en el navegador (`beta-2-2-entrega-c.js`) | ✅ **6/6**, 0 errores de consola |
| Regresión: Entrega B, Entrega A, Beta 2.1 y concurrencia | ✅ 15/15 · 12/12 · 12/12 · 8/8 |
| Auditoría funcional completa | ✅ **46 OK, 0 fallas** (2 requieren celular) |
| Panel `next build`, `expo export` Android de clientes y negocios | ✅ |
| `expo-doctor` | ⚠️ 19/20: `expo` 58.0.26 (17-nov), `expo-router` 58.0.32 y `expo-notifications` 58.1.9 (11-nov) son parches recientes que no se instalaron por la regla de dos semanas |

**Lo que cubren las pruebas SQL**
- **Tokens:**
  - sin sesión no se pueden registrar;
  - formato y app inválidos se rechazan;
  - cada quien ve solo su dispositivo y no ve el token;
  - nada se escribe directo;
  - nadie desactiva un token ajeno;
  - el celular compartido pasa a la nueva cuenta;
  - cerrar sesión lo desactiva.
- **Cola:**
  - cada transición genera el aviso correcto, al destinatario y la app correctos;
  - el texto no tiene datos personales;
  - un solo aviso por evento;
  - si encolar falla, la reserva se crea igual.
- **Envío (como `service_role`):**
  - lo ya tomado no se vuelve a tomar;
  - el restaurante recibe en sus 2 celulares y el cliente solo en su token de la app clientes;
  - un token no registrado se desactiva;
  - registrar dos veces el mismo resultado no duplica;
  - una falla general se reintenta a los 2 minutos y al quinto intento queda «fallida» con el último error;
  - los recibos funcionan;
  - sin dispositivos, el aviso queda «sin_dispositivos».
- **Despertar:** sin secretos no hace nada; la tarea programada existe.
- **Eliminar cuenta:** se borran sus dispositivos y avisos.
- **Las apps no pueden:** leer la cola, ni ejecutar las funciones del envío o del despertar.

**Lo que cubre la prueba con el servidor falso de Expo**
- Rechaza llamadas sin secreto.
- Una solicitud nueva llega al restaurante **sola** (`pg_net`), con canal «reservas» y la ruta del detalle.
- Un `DeviceNotRegistered` desactiva el token.
- Al confirmar, el aviso llega a los 2 dispositivos del cliente.
- No viaja nada personal.
- Con Expo caído (503), la solicitud se crea igual y el aviso queda en reintento; cuando Expo vuelve, se entrega sin duplicar.
- 3 envíos simultáneos sobre la misma cola: ningún aviso se entrega dos veces.
- Los recibos desactivan tokens.
- Después de cerrar sesión, ese celular ya no recibe.
- El log no tiene datos personales.

## C.7 Estado de las notificaciones y lo que falta para que lleguen de verdad

**Probado:** todo el lado del servidor y la lógica de las apps.

**No probado:** que un aviso llegue a un celular real. Para eso hace falta:

1. **Android (Firebase, gratis), requiere tu acción o autorización:**
   - crear un proyecto en Firebase;
   - agregar las dos apps Android con sus identificadores actuales (`co.zipa.vitrinalocal` y `co.zipa.vitrinanegocios`);
   - poner el `google-services.json` de cada una en su app (`android.googleServicesFile` en `app.json`);
   - subir la credencial **FCM V1** (cuenta de servicio) a EAS con `eas credentials`.
2. **iOS:** requiere una cuenta de Apple Developer (pago anual) y la llave APNs en EAS. Hoy solo se generan APK de Android.
3. **Supabase remoto, requiere tu autorización:**
   - `db push` de las migraciones 0018, 0019 y 0020;
   - desplegar `enviar-notificaciones`;
   - crear el secreto `CRON_SECRET` de la función (`supabase secrets set`);
   - en el SQL Editor, guardar en Vault `zipa_funciones_url` (`https://<proyecto>.supabase.co/functions/v1`) y `zipa_cron_secreto` (el mismo valor de `CRON_SECRET`). **Estos secretos no van en el repositorio.**
4. **Opcional:** activar la «seguridad reforzada» de Expo push y guardar el `EXPO_ACCESS_TOKEN` como secreto de la función.
5. **APK nuevos** de las dos apps.

**Expo Go:** desde el SDK 53, Expo Go en Android **no recibe** notificaciones remotas (lo dice la documentación). En iOS, la documentación del SDK 58 no lo aclara. Por eso la prueba real debe hacerse con los APK (o con un *development build*). Mientras no haya token, las apps funcionan igual: la tarjeta dice que los avisos no están disponibles en esa versión.

## C.8 Riesgos y pendientes (Entrega C)

1. **Política de privacidad (bloqueante, junto con el de la Entrega B):** se guarda un identificador del dispositivo (token de notificaciones). Hay que mencionarlo: finalidad (avisos de reservas), quién lo recibe (Expo, Google o Apple, como encargados del envío) y que se borra al cerrar sesión o eliminar la cuenta. **Requiere revisión humana o legal.**
2. **Sin Firebase no hay avisos en Android:** en el APK sin `google-services.json`, el celular no entrega token y la app sigue sin avisos.
3. **Límites de fabricantes:** algunos Android (Xiaomi, Huawei, Oppo y otros) cierran apps en segundo plano o silencian notificaciones por ahorro de batería. Se documentará con la prueba física; en algunos casos la persona debe permitir la app en los ajustes de batería.
4. **Latencia:** el despertar inmediato depende de `pg_net`. Si falla, el respaldo de cada minuto lo cubre (hasta 1 minuto de demora).
5. **Texto antiguo:** el permiso de cámara de la app de negocios (`app.json`) todavía dice «…con el que creamos la vista 3D». Es una promesa de 3D que quedó de antes de la Beta 2.1. No se cambió porque no es parte de esta entrega; conviene corregirlo en la revisión de textos.

## C.9 Pruebas pendientes en celular físico (Entrega C)

Con APK nuevos y Firebase configurado, en Android 13 o superior:

- [ ] **Permiso:** la tarjeta «Activar notificaciones» aparece solo en la bandeja, en el panel con reservas activas y en la solicitud del cliente. Al aceptar, la tarjeta desaparece; al negarlo, muestra «Abrir ajustes».
- [ ] **App abierta:** llega el aviso de nueva solicitud y se ve el banner.
- [ ] **App en segundo plano:** llega el aviso y al tocarlo se abre el detalle.
- [ ] **App cerrada** (quitada de recientes): llega el aviso y al tocarlo la app abre directo en el detalle.
- [ ] **Pantalla bloqueada:** el aviso no muestra nombres ni teléfonos.
- [ ] **Permiso denegado:** no llega nada y la app funciona igual; la solicitud aparece en la bandeja.
- [ ] **Sin conexión:** al recuperar la red, el aviso llega (o se ve en la bandeja).
- [ ] **Cerrar sesión:** después de cerrar sesión no llegan más avisos de esa cuenta a ese celular.
- [ ] **Dos celulares del mismo restaurante:** les llega a los dos.
- [ ] **Cliente:** confirmar, rechazar, cancelar y vencer generan su aviso, y cada uno abre la solicitud.
- [ ] **«Contactar al cliente»:** abre la app de WhatsApp con el mensaje editado.
- [ ] **Ahorro de batería:** repetir en un Xiaomi o un Samsung con el ahorro de batería activo y anotar las limitaciones.

---

# Entrega D: Panel y validación integral

Fecha: 19-nov-2026. Todo se probó en local.

## D.1 «Mis reservas» (clientes)

- **Dónde está:** pantalla propia `/mis-reservas`. El perfil muestra las 3 más recientes y el botón «Ver todas mis reservas (N)».
- **Pestañas con su cantidad:** Pendientes, Confirmadas, No confirmadas, Canceladas, Vencidas e Historial (finalizadas y «no asistió»).
  - Abre en la primera pestaña que tenga algo.
  - Las solicitudes próximas van por fecha de visita; las pasadas, de la más reciente a la más vieja.
- **Desde cada solicitud** (pantalla de las Entregas B y C):
  - ver el detalle y el motivo;
  - cancelar o retirar;
  - «Solicitar otro horario»;
  - «Contactar al restaurante» por WhatsApp;
  - activar los avisos.
- **Sin chat interno** ni tablas de mensajes.
  - Si en el futuro se agrega otro canal de comunicación, se puede hacer sin rehacer las reservas.
  - Ese canal se colgaría de `reservations.id` y del historial `reservation_events`, igual que hoy lo hacen las notificaciones.

## D.2 Panel del equipo: «Reservas»

**Dónde está:** página nueva en el menú, con periodos de 7, 30 o 90 días. Usa la función `admin_reservas`, que exige ser del equipo con MFA.

**Cifras**
- Solicitudes recibidas, pendientes (y cuántas vencen en menos de 1 hora), confirmadas (con el % sobre las respondidas), no confirmadas, canceladas (por cliente o por restaurante), vencidas, finalizadas y «no asistió».
- Tiempo de respuesta, promedio y mediana.
- Personas por solicitud y cuántas solicitudes traen platos.
- Restaurantes con reservas activas.
- Solicitudes por día.
- Motivos de rechazo.
- Restaurantes con más solicitudes: recibidas, confirmadas y vencidas.

**Notificaciones**
- Enviadas, fallidas y sin dispositivos.
- Dispositivos activos por app.

**Incidencias operativas**
- Notificaciones fallidas: código, restaurante, tipo, intentos y último error.
- Notificaciones atascadas hace más de 10 minutos.
- Solicitudes que ya debían vencer, que indican que la tarea de vencimiento no está corriendo.
- Estado de las tres tareas programadas: última ejecución correcta y último estado.

**Privacidad**
- No muestra teléfonos, nombres de clientes, observaciones ni identificadores de personas; solo códigos de solicitud y nombres de restaurantes (probado en SQL y en el navegador).
- El equipo **no puede confirmar ni cambiar reservas** (sin botones, y el servidor lo impide).

**Sin cambios:** MFA, roles, bitácora y permisos siguen igual.

## D.3 Vencimiento automático y retención (migración `0021_reservas_operacion.sql`)

- **`zipa-expirar-reservas`** (`pg_cron`, cada 5 minutos): vence las pendientes cuyo plazo pasó.
  - No depende de que una app esté abierta.
  - Es idempotente y segura frente a confirmaciones simultáneas (Entrega B).
  - Cada vencimiento encola el aviso al cliente.
  - **Probado de verdad:** en la prueba integral, una solicitud sin respuesta venció sola y llegó el aviso, sin ninguna llamada manual.
- **Política de vencimiento (B.5):** lo que ocurra primero entre el tiempo para responder que eligió el restaurante (2 a 24 h; por defecto 24) y 30 minutos antes de la visita. Se calcula al crear la solicitud y se guarda en `respond_by`.
- **`zipa-limpiar-avisos`** (diaria, 3:30 a. m. de Colombia) borra:
  - los avisos ya resueltos de más de 90 días, con sus intentos;
  - los dispositivos desactivados hace más de 90 días.
- **Las solicitudes de reserva no se borran automáticamente.** Su plazo de conservación es una decisión legal; la propuesta es 12 meses (ver `docs/PROPUESTA_TEXTOS_LEGALES_BETA_2_2.md`).
- **Auditoría:**
  - cada cambio de estado queda en `reservation_events`, con estado anterior y nuevo, rol, persona y motivo;
  - cada intento de envío queda en `notification_deliveries`, con ticket, error y recibo;
  - las acciones del equipo siguen en la bitácora (`admin_actions`).

## D.4 Documentos

- **`docs/MODELO_COMERCIAL_FUTURO.md`:**
  - el plan gratis (descubrimiento, catálogo, reseñas, WhatsApp, redes, entregas y reservas gratis en el piloto);
  - Destacados (ya existe, se cobra por fuera de la app);
  - Pro futuro;
  - reservas premium solo después de validar uso, costos y aceptación;
  - lo que no se implementa.
- **`docs/PROPUESTA_TEXTOS_LEGALES_BETA_2_2.md`:** cambios propuestos a la política de privacidad y a los dos términos (reservas, notificaciones, redes y retención), para revisión humana o legal. **No se modificó ningún texto vigente.**

## D.5 Archivos (Entrega D)

**Nuevos:**
- `supabase/migrations/0021_reservas_operacion.sql`
- `apps/admin/src/app/(panel)/reservas/page.tsx`
- `apps/clientes/src/app/mis-reservas.tsx`
- `pruebas/auditoria/beta-2-2-integral.js`
- `docs/MODELO_COMERCIAL_FUTURO.md`
- `docs/PROPUESTA_TEXTOS_LEGALES_BETA_2_2.md`

**Modificados:**
- `apps/admin/src/app/(panel)/Nav.tsx`
- `apps/clientes/src/app/(tabs)/perfil.tsx`
- `supabase/ci/probar_permisos.sql`
- `docs/BETA_2_2_IMPLEMENTACION.md`

## D.6 Prueba integral (`beta-2-2-integral.js`): 8/8

Las tres apps y el servidor completo, con el Expo de prueba:

1. El cliente solicita desde la ficha y ve su código.
2. El restaurante recibe el aviso solo, sin datos personales.
3. Desde la ruta del aviso se abre el detalle y el restaurante confirma.
4. El cliente recibe «Tu reserva fue confirmada» y la ve en «Mis reservas → Confirmadas».
5. El cliente cancela y el restaurante recibe el aviso.
6. El equipo ve las cifras con MFA, sin datos de clientes y sin poder confirmar.
7. Una solicitud sin respuesta vence sola con `pg_cron` y el cliente recibe el aviso.
8. Sin errores de consola en las tres apps.

---

# Cómo publicar y probar Beta 2.2

**Cada paso remoto requiere autorización.** Nada de esto se ha hecho.

## Antes de publicar

1. **Revisión legal** de `docs/PROPUESTA_TEXTOS_LEGALES_BETA_2_2.md`. Si se aprueba, se actualizan los textos y se sube la versión.
2. **Firebase** (para avisos en Android):
   - crear un proyecto;
   - agregar las apps `co.zipa.vitrinalocal` y `co.zipa.vitrinanegocios`;
   - poner el `google-services.json` de cada una en su app (`android.googleServicesFile`);
   - subir la credencial FCM V1 a EAS con `eas credentials`.

## Supabase remoto

1. Revisar con `npx supabase db push --dry-run` y luego aplicar `npx supabase db push`. Aplica las migraciones 0018 a 0021 y activa `pg_net` y `pg_cron`.
2. Desplegar la función: `npx supabase functions deploy enviar-notificaciones`.
3. Crear el secreto de la función:

   ```
   npx supabase secrets set CRON_SECRET=<valor aleatorio largo>
   ```

   Opcional: `EXPO_ACCESS_TOKEN`.
4. En el SQL Editor, guardar los secretos en Vault. **No van en el repositorio.**

   ```sql
   select vault.create_secret('https://<proyecto>.supabase.co/functions/v1', 'zipa_funciones_url');
   select vault.create_secret('<el mismo valor de CRON_SECRET>', 'zipa_cron_secreto');
   ```

5. Comprobar en el panel → «Reservas» → «Tareas programadas» que las tres tareas corren.

## Builds y prueba en el celular

1. APK nuevos de las dos apps (2 builds de EAS). Llevan los paquetes nativos nuevos: `expo-image-manipulator`, `expo-notifications` y `expo-device`.
2. Pruebas en el celular: las listas de las secciones 9, B.11 y C.9.

## Revisión en la web local (sin tocar nada real)

- Supabase local con las 21 migraciones aplicadas.
- Clientes en el 8083, negocios en el 8084 y el panel en el 3001.
- Las pruebas automáticas de `pruebas/auditoria/beta-2-2-*.js` documentan sus requisitos en el encabezado de cada archivo.

## En Expo Go (iPhone)

- Levantar con túnel (`npx expo start --tunnel`), como se hacía antes.
- Para ver las funciones nuevas, apuntar a una base que tenga las migraciones nuevas.
- Las notificaciones push no se pueden probar en Expo Go.
