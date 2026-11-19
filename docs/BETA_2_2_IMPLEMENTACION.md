# Beta 2.2: implementación

**Rama:** `feature/beta-2-2-reservas`, que sale de `main` en `49d1cf4` (Beta 2.1). Todo el trabajo está solo en este equipo: no se ha subido a GitHub.

**Estado por entrega:**

| Entrega | Estado |
|---|---|
| Fase 0: auditoría | ✅ Hecha |
| A: Emprendimientos | ✅ Hecha y probada en local. Falta la prueba en Android real |
| B: Reservas y seguridad | ⏸️ Espera autorización |
| C: Notificaciones y contacto | ⏸️ Pendiente |
| D: Panel y validación integral | ⏸️ Pendiente |

**Lo que NO se hizo:**
- No se tocó Supabase remoto: la migración nueva se aplicó solo en la base local de Docker.
- No hubo builds de EAS, despliegues ni push.
- No se cambiaron identificadores Android/iOS.

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
