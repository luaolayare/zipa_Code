# Especificación de diseño: Zipa lo tiene

> **Fuente de verdad: `packages/shared/src/theme.ts`.** Este documento la describe.
> Si algo de aquí no coincide con `theme.ts`, manda `theme.ts`.
>
> - **Sección 1 (tokens):** actualizada el 20-nov-2026 con el rediseño de tipografía y espacios. Las referencias están en `rediseno-tipografia/`; el antes y después, en `docs/capturas-tipografia/comparacion/`.
> - **Secciones 2 a 4:** describen el prototipo original y quedan como **referencia histórica de la estructura**. Sus medidas (tamaños, radios y espacios) ya no son las vigentes: hoy salen de los tokens de la sección 1.

El código del prototipo está en `prototipo/`:

- `prototipo/app-clientes.prototipo.html`: todas las pantallas de la app de clientes.
- `prototipo/app-negocios.prototipo.html`: registro en 5 pasos y panel del negocio.

Esos archivos son HTML con estilos en línea (`style="..."`). **No se ejecutan solos**: se leen como referencia.
Cada pantalla está en un bloque marcado con un comentario, por ejemplo `<!-- ============ INICIO ============ -->`.
Los valores exactos (px, colores, radios, pesos) se copian de ahí a `StyleSheet` de React Native (1 px CSS = 1 punto RN).

> Lo que NO se porta: el "3D" del prototipo está hecho con capas CSS para simular. En la app real va un visor 3D de verdad (fase 3D). Tampoco se portan los datos de ejemplo del prototipo que ya existen en `packages/shared/src/demo.ts`.

---

## 1. Tokens

### Colores

| Token | Hex | Uso |
| --- | --- | --- |
| `background` | `#F6F4EF` | Fondo de todas las pantallas |
| `surface` | `#FFFFFF` | Tarjetas, inputs, barra inferior |
| `text` | `#14211F` | Texto principal, botones oscuros |
| `textMuted` | `#55605D` | Texto secundario |
| `textBody` | `#2E3A38` | Cuerpo de reseñas y descripciones |
| `border` | `#E2DDD3` | Bordes de tarjetas |
| `inputBorder` | `#D6D0C5` | Bordes de inputs |
| `primary` | `#0F3D3E` | Verde petróleo: cabeceras, botones principales, tab activa |
| `primaryDeep` | `#145052` | Círculo decorativo y tarjeta en bienvenida |
| `primarySoft` | `#DDEBEA` | Etiqueta "Clásico de la zona", avisos de éxito |
| `onPrimaryMuted` | `#CFE1DF` | Texto secundario sobre verde |
| `accent` | `#F2B134` | Mostaza: botones secundarios, sellos "en 3D", ranking |
| `accentSoft` | `#FDEFD0` | Etiqueta "Emprendimiento local", avisos |
| `accentText` | `#7A4B00` | Texto sobre `accentSoft` |
| `price` | `#C2381B` | Precios, enlaces |
| `danger` | `#A12E15` | Errores, cerrar sesión |
| `success` | `#166534` | "Abierto", pasos completados |
| `star` | `#E09A00` | Estrellas |
| `starText` | `#8A5A00` | Texto de estrellas en reseñas |
| `chipIdle` | `#ECE7DE` | Fondo de botones circulares neutros |
| `stage3d` | `#E9EFEE` | Fondo del visor 3D y de la galería |

**Fondos de estado** (píldoras, avisos y plazos). Cada uno va con su color de texto:

| Token | Hex | Texto | Uso |
| --- | --- | --- | --- |
| `successSoft` | `#DCEFE2` | `success` | Confirmada, Abierto, Publicado, «Solicitud enviada» |
| `warningSoft` | `#FDEFD0` | `accentText` | Pendiente, En revisión, avisos |
| `dangerSoft` | `#F9DED6` | `danger` | Rechazada, plazo «Responde antes de», errores |
| `infoSoft` | `#DDEBEA` | `primary` | Avisos informativos, «Clásico de la zona» |
| `neutralSoft` | `#ECE7DE` | `textMuted` | Cancelada, Vencida, conteos inactivos |

**No se escriben colores a mano en las pantallas:** siempre van por token. Las únicas excepciones son los colores sobre fondos oscuros, como el blanco o los translúcidos de la cámara y del visor de fotos.

Colores de portada por negocio (fondo / círculo interior), mientras no haya fotos:

| Negocio demo | Portada | Interior |
| --- | --- | --- |
| Arepas Mamá Inés | `#C2381B` | `#F2B134` |
| Tejidos Kaashi | `#0F6E6E` | `#C2381B` |
| Café Sierra Viva | `#5A3A22` | `#F2E6D0` |
| La Fogata de Doña Rosa | `#9A3412` | `#F5F1E6` |
| Mar y Coco | `#0F3D3E` | `#D9772B` |
| Galería Manos de Bolívar | `#7A4B00` | `#EDE0C2` |
| Dulces de Palenque | `#B45309` | `#F3E3C3` |

Para negocios nuevos sin foto: portada por categoría (`comer` `#C2381B`, `artesanias` `#0F6E6E`, `cafe_dulces` `#5A3A22`).

### Tipografía

- **Familias:**
  - títulos y números grandes: **Bricolage Grotesque** 600 / 700 / 800 (`@expo-google-fonts/bricolage-grotesque`);
  - textos, botones y formularios: **DM Sans** 400 / 500 / 600 / 700 (`@expo-google-fonts/dm-sans`).
- **Carga:** las dos apps las cargan con `useFonts(APP_FONTS)` en su `_layout.tsx` raíz.
- **Peso:** cada peso es un archivo distinto, así que se elige con `fontFamily` (`fonts.*`), no con `fontWeight`.
- **Escala:** son 8 estilos compartidos por las dos apps, en `typography` de `@zipa/shared`. En negocios, `type` de `kit.tsx` los repite y agrega dos:
  - `error`: `label` en rojo;
  - `help`: `body` en gris, para párrafos de ayuda.

| Estilo | Fuente | Tamaño / alto de línea | Tracking | Uso |
| --- | --- | --- | --- | --- |
| `display` | Bricolage 800 | 34 / 40 | −0,8 | Titular de portada, código de reserva, números grandes |
| `title` | Bricolage 700 | 26 / 32 | −0,5 | Título de pantalla, nombre del negocio o producto, precio grande |
| `heading` | Bricolage 700 | 20 / 26 | −0,3 | Títulos de sección: Destacados, Menú, Tu menú |
| `subtitle` | DM Sans 700 | 17 / 24 | 0 | Título de tarjeta, texto de botones |
| `body` | DM Sans 400 | 16 / 24 | 0 | Descripciones, mensajes y textos largos (color `textBody`) |
| `label` | DM Sans 600 | 15 / 20 | 0 | Datos, chips, precios en listas, rótulos de campos |
| `caption` | DM Sans 500 | 13 / 18 | 0 | Información secundaria: categoría, «Recibida hoy» (color `textMuted`) |
| `overline` | DM Sans 700 | 13 / 16 | +1,2 | Rótulos en MAYÚSCULAS sobre secciones |

**Reglas:**
- Se usan los estilos de la tabla; un estilo puede cambiar solo el color o el peso (`fontFamily`), por ejemplo un `caption` en negrita para una etiqueta.
- Texto de lectura: 16. **Nada importante por debajo de 13.**
- **No se desactiva `allowFontScaling` ni se ponen alturas fijas a cajas con texto:** todo debe aguantar el tamaño de letra del celular al 130 %. Se usa `minHeight`, nunca `height`.

**Excepciones aceptadas** (cada una lleva su comentario en el código):

| Dónde | Por qué |
| --- | --- |
| Título de las dos tarjetas grandes del Inicio de clientes | 16, para que «Emprendimientos» quepa en dos columnas |
| Iniciales del logo y número grande de la calificación (ficha del negocio) | Son gráficos, no texto de lectura |
| Estrellas de las reseñas | Son un símbolo |
| Palomita de la casilla de consentimiento | Es un símbolo |
| Afiche QR (`QrPoster`) | Es una imagen para imprimir y tiene sus propias medidas |

### Espacios, radios y medidas

Los espacios son todos múltiplos de 4 (`spacing`):

| Token | Valor | Uso |
| --- | --- | --- |
| `xxs` | 4 | Ícono y texto |
| `xs` | 8 | Líneas dentro de una tarjeta |
| `sm` | 12 | Entre tarjetas |
| `md` | 16 | Relleno de tarjetas y botones |
| `lg` | 20 | **Margen lateral de pantalla** (las dos apps) |
| `xl` | 24 | Debajo de cabeceras |
| `xxl` | 32 | Entre secciones |
| `xxxl` | 48 | Final de pantalla |

Radios (`radius`):

| Token | Valor | Uso |
| --- | --- | --- |
| `sm` | 8 | Etiquetas pequeñas |
| `md` | 12 | Botones, buscador e inputs |
| `lg` | 20 | Tarjetas |
| `xl` | 28 | Cabeceras, galerías y hojas |
| `pill` | 999 | Píldoras, chips, avatares y círculos |

Medidas fijas (`sizes`):
- botones e inputs: 56 de alto;
- nada que se toque mide menos de 44 (`touchMin`).

**Excepciones de posición:** no son ritmo, solo ubican el titular debajo de la ilustración.
- Bienvenida de negocios: `marginTop` 128.
- «¿Tienes negocio?» en clientes: `marginTop` 70.

**Formas aprobadas en el rediseño:**
- Estados en píldora con su fondo de estado.
- Datos de «Mi reserva» en filas de etiqueta y valor dentro de una tarjeta.
- Productos del panel de negocios en una tarjeta con separadores. El menú de la ficha del negocio sigue en cuadrícula con fotos.
- Pestañas de Reservas de 44 de alto con el conteo en una burbuja. El nombre accesible sigue siendo «Pendientes (2)».
- Plazo «Responde antes de» en una etiqueta `dangerSoft`.

### Iconos

Usar `lucide-react-native` (trazo 2, color heredado). Equivalencias con el prototipo:

| Dónde | Icono |
| --- | --- |
| Ubicación en cabecera | `MapPin` (mostaza) |
| Buscar / borrar búsqueda | `Search` / `X` |
| Categoría Todo / Comer / Artesanías / Café | `LayoutGrid` / `Utensils` / `ShoppingBag` / `Coffee` |
| Sello 3D, "Ver en 3D" | `Box` |
| Estrella | `Star` relleno `#E09A00` |
| Volver | `ChevronLeft` |
| Ver en mi mesa / espacio (RA) | `ScanLine` |
| Tabs: Explorar / ¿Tienes negocio? / Perfil | `Compass` / `Store` / `User` |
| Cámara, foto del local | `Camera` |
| Paso completado | `Check` |
| QR | `QrCode` (y en el panel, un QR real con `react-native-qrcode-svg`) |

---

## 2. Componentes

**Cabecera verde** (Explorar, Mi negocio): fondo `primary`, padding 20/20/22, radio inferior 28. Dentro: ubicación (13, `onPrimaryMuted`, icono mostaza), saludo "Hola, {nombre}" (15, 700, mostaza), H1 blanco, buscador.

**Buscador**: fondo blanco, alto 48, radio 14, padding izq. 14. Icono `Search` gris + input 15 + botón circular 36 `chipIdle` con `X` cuando hay texto. Placeholder: "Busca un restaurante o emprendimiento".

**Tiles de categoría**: grilla de 4 columnas, gap 10, alto 84, radio 18. Inactivo: blanco con borde. Activo: `primary` con texto e icono blancos. Icono 24 arriba, etiqueta 13/700 abajo.

**Tarjeta de ranking** ("Lo más destacado"): fondo `primary`, radio 18, padding 12. Izquierda: cuadro 40 mostaza radio 12 con el puesto (Bricolage Grotesque 18). Centro: sobretítulo mostaza ("MEJOR EN COMER" / "PUESTO 2 EN ARTESANÍAS"), nombre blanco 15/700, meta `onPrimaryMuted` 12. Derecha: estrella mostaza + calificación 16/700 blanco.

**Tarjeta de carrusel** (Emprendimientos del barrio): ancho 210, scroll horizontal que llega al borde (margen -20, padding 20). Portada 120 de alto con círculo 64 (borde blanco 6 al 85 %) y sello mostaza "N en 3D" abajo a la izquierda. Cuerpo: nombre 15/700, "categoría · distancia" 12, estrella + calificación + (n reseñas).

**Fila de lista** (Clásicos de la zona, resultados de búsqueda): blanco, borde, radio 20, padding 10. Miniatura 76 (64 en resultados) radio 14 con círculo interior. Nombre, meta, calificación y etiqueta "N en 3D" en `primarySoft`.

**Etiqueta de tipo**: "Emprendimiento local" (`accentSoft` / `accentText`) o "Clásico de la zona" (`primarySoft` / `primary`). Píldora, 11–12/700.

**Tarjeta de producto** (vitrina): grilla de 2 columnas, gap 12. Miniatura 110 de alto con forma central 56 y cuadrito mostaza 26 con `Box` arriba a la derecha. Nombre 14/700, precio 14/700 en `price`, botón "Ver en 3D" de 40 con borde `primary`.

**Tarjeta de reseña**: blanco, borde, radio 16, padding 14. Nombre 14/700 a la izquierda, estrellas texto ★☆ 13/700 `starText` a la derecha, cuerpo 14/20 `textBody`. Respuesta del negocio en caja `background` radio 12.

**Barra inferior** (app de clientes): alto 72, blanco, borde superior. Tres pestañas iguales: Explorar, ¿Tienes negocio?, Perfil. Activa `primary`, inactiva `textMuted`. 12/700. "¿Tienes negocio?" abre la app de negocios o su página en la tienda.

**Encabezado de pasos** (app de negocios): botón atrás circular 44, sobretítulo "PASO N DE 5", título 18 Bricolage Grotesque, y 5 barras de 6 de alto (completadas `primary`, pendientes `#DCD6CC`).

---

## 3. App de clientes, pantalla por pantalla

Bloques en `prototipo/app-clientes.prototipo.html`:

| Pantalla | Bloque en el prototipo | Ruta en el código |
| --- | --- | --- |
| Bienvenida | `BIENVENIDA` | `src/app/index.tsx` |
| Iniciar sesión | `INICIAR SESIÓN` | `src/app/login.tsx` |
| Explorar | `INICIO` | `src/app/(tabs)/explorar.tsx` |
| Detalle del negocio | `NEGOCIO` | `src/app/negocio/[id].tsx` |
| Producto en 3D | `PRODUCTO / PLATO EN 3D` | `src/app/producto/[id].tsx` |
| Cámara RA | `REALIDAD AUMENTADA (simulada)` | fase 3D |
| Calificar | `CALIFICAR` | `src/app/calificar/[id].tsx` |
| Perfil | `PERFIL` | `src/app/(tabs)/perfil.tsx` |

Ignorar el bloque `MI NEGOCIO` de este archivo: quedó de una versión anterior y ahora vive en la app de negocios.

**Bienvenida**: fondo `primary` a pantalla completa. Logo (cuadro mostaza 36 con tienda) + "Zipa lo tiene". Decoración: anillo de 260 con borde 36 `primaryDeep` saliendo por la derecha y un cuadro mostaza 90 girado 14° con icono 3D. Abajo: título display "Lo mejor de Cartagena, hecho aquí." (la ciudad sale de la ubicación), párrafo `onPrimaryMuted`, tarjeta `primaryDeep` "Llegaste por el QR de tu hotel…", botón mostaza "Empezar a explorar" (56) y enlace mostaza "¿Tienes un negocio? Regístralo aquí".

**Iniciar sesión**: botón atrás, logo 44, H1 "Entra a Zipa lo tiene", texto. Aviso `accentSoft` "Inicia sesión para publicar tu reseña." cuando viene de calificar. Botones "Continuar con Google" (blanco con borde) y "Continuar con Apple" (`text` con texto blanco), divisor "o con tu correo", inputs, error en `danger`, botón `primary` "Entrar o crear cuenta", enlace subrayado "Seguir como invitado".

**Explorar** (orden de arriba abajo):
1. Cabecera verde con buscador.
2. Si hay texto en el buscador: solo "N resultados para «texto»" y las filas, o el estado vacío (borde punteado: "No encontramos ese nombre").
3. Si no: tiles de categoría → "Lo más destacado" (subtítulo: "El mejor calificado de cada categoría" o "Los mejor calificados en {categoría}") → "Emprendimientos del barrio" (carrusel + contador "N negocios") → "Clásicos de la zona" (lista). Cada sección se oculta si queda vacía al filtrar.

**Detalle del negocio**: cabecera del color de portada del negocio, botón atrás blanco al 92 %, logo cuadrado blanco 64 con iniciales (o la foto), nombre H1 blanco y meta. Debajo: aviso verde tras publicar reseña, etiqueta de tipo + horario en `success`, tarjeta de calificación (número 34 Bricolage Grotesque, "Calificación de clientes", "N reseñas", botón `primary` "Calificar"), sección "Menú en 3D" (comer) o "Vitrina en 3D" (resto) con grilla de productos, sección "Lo que dicen los clientes".

**Producto en 3D**: escenario 380 de alto fondo `stage3d` con el modelo girando, botón atrás, sello mostaza "Vista 3D", texto "Arrastra para girar". Controles: botón "Pausar giro / Girar solo" y deslizador "Girar". Datos: negocio, nombre H1 26, descripción, precio 20 en `price`, chips de etiquetas, botón `primary` con `ScanLine` "Ver en mi mesa" (comida) o "Ver en mi espacio" (productos), botón con borde "Ya lo probé: calificar" / "Ya lo compré: calificar".

**Calificar**: atrás, nombre del negocio, H1 "¿Cómo te fue?", texto, 5 botones de estrella de 52, textarea "Cuéntanos más" con placeholder "¿Qué compraste o pediste? ¿Era como en la vista 3D?", botón "Publicar reseña", nota "Al publicar, el negocio puede responder tu comentario.".

**Perfil**: con sesión, avatar circular 64 `primary` con inicial mostaza, nombre, correo, dos tarjetas de estadística ("Reseñas escritas", "Lugares vistos"), "Mis reseñas" y botón "Cerrar sesión" con borde `danger`. Como invitado, icono de usuario, "Estás como invitado", texto y botón "Iniciar sesión".

---

## 4. App de negocios, pantalla por pantalla

Bloques en `prototipo/app-negocios.prototipo.html`:

| Pantalla | Bloque | Ruta en el código |
| --- | --- | --- |
| Inicio | `INICIO NEGOCIO` | `src/app/index.tsx` |
| Encabezado de pasos | `ENCABEZADO DE PASOS` | `src/components/StepHeader.tsx` |
| Paso 1 Cuenta | `PASO 1: CUENTA` | `src/app/registro/cuenta.tsx` |
| Paso 2 Datos | `PASO 2: DATOS DEL NEGOCIO` | `src/app/registro/datos.tsx` |
| Paso 3 Verificación | `PASO 3: VERIFICACIÓN` | `src/app/registro/verificacion.tsx` |
| Paso 4 Productos | `PASO 4: PRODUCTOS EN 3D` | `src/app/registro/productos.tsx` |
| Paso 5 Vista previa | `PASO 5: VISTA PREVIA` | `src/app/registro/vista-previa.tsx` |
| Panel | `PANEL DEL NEGOCIO` | `src/app/panel.tsx` |

**Inicio**: cabecera `text` (oscura) con logo "Zipa lo tiene **Negocios**" (Negocios en mostaza), H1 34 "Que los turistas encuentren tu negocio.", párrafo. Tres beneficios con check en círculo `primarySoft`. Tarjeta "Registro en 5 pasos, unos 10 minutos…". Botón mostaza "Registrar mi negocio", botón con borde "Ya tengo cuenta".

**Paso 2**: tipo de negocio en 2 tarjetas seleccionables (borde 2, seleccionada `primary` con fondo `stage3d`), con título y descripción; categorías como chips (seleccionado `primary`).

**Paso 3**: botón grande de borde punteado 2 para la foto (icono `Camera` en cuadro 52; al cargar, cuadro `success` con `Check` y borde `success`), input cédula/NIT, nota `primarySoft` sobre la Cámara de Comercio.

**Paso 4**: lista de productos agregados (icono `Box`, "precio · Modelo 3D listo"), tarjeta "Tu primer plato / producto" con nombre, precio, botón rojo `price` "Grabar video del plato/producto"; mientras procesa, caja oscura con barra de progreso mostaza ("Grabando…", "Creando el modelo 3D…"); al terminar, vista 3D + "Se ve bien, agregarlo" + "Grabar de nuevo". Botón mostaza "Ver cómo quedó".

**Paso 5**: la tarjeta del negocio tal como sale en la app de clientes, dentro de un marco `stage3d`. Debajo, resumen horario / WhatsApp / productos y botón "Enviar a revisión y publicar".

**Panel**: cabecera oscura con nombre y píldora de estado ("En revisión" mostaza / "Publicado: visible para clientes" verde). Aviso de revisión. Estadísticas en 3 columnas (Visitas al perfil, Vistas en 3D, Escaneos del QR). Lista de productos con "Agregar". Reseñas con botón "Responder" que abre un textarea y "Publicar respuesta". Tarjeta del QR para imprimir.

---

## 5. Textos

Todos los textos de la interfaz están en el prototipo, en español de Colombia. Copiarlos literalmente.

---

## 6. Textos corregidos (aprobados el 10 de noviembre de 2026)

Estos textos del prototipo prometían algo que no se puede garantizar. Al portar las pantallas,
usar SIEMPRE la versión corregida, no la del prototipo.

| Prototipo | Usar en la app |
| --- | --- |
| "Registro en 5 pasos, unos 10 minutos. Solo necesitas tu celular." | "Son 5 pasos. Ten a mano tu cédula o NIT." |
| "Para que los turistas confíen, solo publicamos negocios reales. Revisamos tus datos en menos de 24 horas." | "Para que los turistas confíen, revisamos cada negocio antes de publicarlo." |
| "Graba un video de 20 segundos dando la vuelta alrededor y la app lo convierte en 3D." | "Graba un video de unos 20 segundos dando la vuelta alrededor del {plato/producto}. Con ese video creamos una vista 3D. Antes de publicarla podrás revisar cómo quedó." |
| "Se procesa en la nube y queda listo en minutos." | "Se procesa en la nube. Lo verás en tu panel cuando esté listo." |
| "Estamos revisando tus datos. Te avisamos por WhatsApp cuando tu negocio sea visible para los clientes." | "Estamos revisando tus datos. Aquí verás cuando tu negocio quede publicado." |
| Píldora "En revisión: te avisamos por WhatsApp" | "En revisión: aquí verás cuando quede publicado" |
| "Llegaste por el QR de tu hotel. Te mostramos lo que hay cerca de ti." (siempre visible) | Solo si la app se abrió desde un QR (`?origen=qr&lugar=...`): "Llegaste por el QR de {lugar}. Estos son los negocios de la zona." |
| "Mira en 3D lo que vas a pedir o comprar" | "Mira en 3D muchos de los platos y productos antes de pedir o comprar" |
| "Tamaño real" (realidad aumentada) | "Tamaño aproximado" |
| Estadísticas fijas del panel (128 / 64 / 21) | Cifras reales; sin datos: "Aún no hay datos" |
| "Lo más destacado" con cualquier número de reseñas | Solo negocios con al menos `MIN_REVIEWS_FOR_RANKING` (5) reseñas |
| Grabación de video con sonido | Video sin sonido (`mute`): la app no pide permiso de micrófono |
