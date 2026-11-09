# Especificación de diseño: Vitrina Local

Fuente de verdad visual para las dos apps. El código del prototipo está en `prototipo/`:

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
| `stage3d` | `#E9EFEE` | Fondo del visor 3D |

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

- Títulos y números grandes: **Space Grotesk** 700 (`@expo-google-fonts/space-grotesk`).
- Todo lo demás: **DM Sans** 400 / 500 / 600 / 700 (`@expo-google-fonts/dm-sans`).
- Cargar con `useFonts` en el `_layout.tsx` raíz de cada app y mantener el splash hasta que carguen.

| Estilo | Fuente | Tamaño / alto de línea | Peso | Extra |
| --- | --- | --- | --- | --- |
| Display (bienvenida) | Space Grotesk | 40 / 42 | 700 | letterSpacing -0.8 |
| H1 pantalla | Space Grotesk | 28 / 31 | 700 | letterSpacing -0.56 |
| H1 detalle | Space Grotesk | 24–26 | 700 | |
| H2 sección | Space Grotesk | 20 | 700 | |
| Cuerpo | DM Sans | 15 / 22 | 400 | |
| Nombre en tarjeta | DM Sans | 15 | 700 | |
| Meta | DM Sans | 12–13 | 400–600 | color `textMuted` |
| Etiqueta (badge) | DM Sans | 11–12 | 700 | píldora |
| Sobretítulo | DM Sans | 11–12 | 700 | MAYÚSCULAS, letterSpacing 0.7 |

### Espaciado y radios

- Margen lateral de pantalla: 20 (24 en bienvenida, inicio de negocios e inicio de sesión).
- Separación entre secciones: 22; dentro de una sección: 12; entre tarjetas: 10–14.
- Radios: inputs 12–14, botones 14 (16 el principal de bienvenida), tarjetas 16–20, portadas internas 14, píldoras 999.
- Cabeceras verdes: esquinas inferiores redondeadas 28.
- Alturas táctiles: botón principal 52–56, secundario 44–48, chips 40, iconos circulares 44.

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

**Tarjeta de ranking** ("Lo más destacado"): fondo `primary`, radio 18, padding 12. Izquierda: cuadro 40 mostaza radio 12 con el puesto (Space Grotesk 18). Centro: sobretítulo mostaza ("MEJOR EN COMER" / "PUESTO 2 EN ARTESANÍAS"), nombre blanco 15/700, meta `onPrimaryMuted` 12. Derecha: estrella mostaza + calificación 16/700 blanco.

**Tarjeta de carrusel** (Emprendimientos del barrio): ancho 210, scroll horizontal que llega al borde (margen -20, padding 20). Portada 120 de alto con círculo 64 (borde blanco 6 al 85 %) y sello mostaza "N en 3D" abajo a la izquierda. Cuerpo: nombre 15/700, "categoría · distancia" 12, estrella + calificación + (n reseñas).

**Fila de lista** (Clásicos de la zona, resultados de búsqueda): blanco, borde, radio 20, padding 10. Miniatura 76 (64 en resultados) radio 14 con círculo interior. Nombre, meta, calificación y etiqueta "N en 3D" en `primarySoft`.

**Etiqueta de tipo**: "Emprendimiento local" (`accentSoft` / `accentText`) o "Clásico de la zona" (`primarySoft` / `primary`). Píldora, 11–12/700.

**Tarjeta de producto** (vitrina): grilla de 2 columnas, gap 12. Miniatura 110 de alto con forma central 56 y cuadrito mostaza 26 con `Box` arriba a la derecha. Nombre 14/700, precio 14/700 en `price`, botón "Ver en 3D" de 40 con borde `primary`.

**Tarjeta de reseña**: blanco, borde, radio 16, padding 14. Nombre 14/700 a la izquierda, estrellas texto ★☆ 13/700 `starText` a la derecha, cuerpo 14/20 `textBody`. Respuesta del negocio en caja `background` radio 12.

**Barra inferior** (app de clientes): alto 72, blanco, borde superior. Tres pestañas iguales: Explorar, ¿Tienes negocio?, Perfil. Activa `primary`, inactiva `textMuted`. 12/700. "¿Tienes negocio?" abre la app de negocios o su página en la tienda.

**Encabezado de pasos** (app de negocios): botón atrás circular 44, sobretítulo "PASO N DE 5", título 18 Space Grotesk, y 5 barras de 6 de alto (completadas `primary`, pendientes `#DCD6CC`).

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

**Bienvenida**: fondo `primary` a pantalla completa. Logo (cuadro mostaza 36 con tienda) + "Vitrina Local". Decoración: anillo de 260 con borde 36 `primaryDeep` saliendo por la derecha y un cuadro mostaza 90 girado 14° con icono 3D. Abajo: título display "Lo mejor de Cartagena, hecho aquí." (la ciudad sale de la ubicación), párrafo `onPrimaryMuted`, tarjeta `primaryDeep` "Llegaste por el QR de tu hotel…", botón mostaza "Empezar a explorar" (56) y enlace mostaza "¿Tienes un negocio? Regístralo aquí".

**Iniciar sesión**: botón atrás, logo 44, H1 "Entra a Vitrina Local", texto. Aviso `accentSoft` "Inicia sesión para publicar tu reseña." cuando viene de calificar. Botones "Continuar con Google" (blanco con borde) y "Continuar con Apple" (`text` con texto blanco), divisor "o con tu correo", inputs, error en `danger`, botón `primary` "Entrar o crear cuenta", enlace subrayado "Seguir como invitado".

**Explorar** (orden de arriba abajo):
1. Cabecera verde con buscador.
2. Si hay texto en el buscador: solo "N resultados para «texto»" y las filas, o el estado vacío (borde punteado: "No encontramos ese nombre").
3. Si no: tiles de categoría → "Lo más destacado" (subtítulo: "El mejor calificado de cada categoría" o "Los mejor calificados en {categoría}") → "Emprendimientos del barrio" (carrusel + contador "N negocios") → "Clásicos de la zona" (lista). Cada sección se oculta si queda vacía al filtrar.

**Detalle del negocio**: cabecera del color de portada del negocio, botón atrás blanco al 92 %, logo cuadrado blanco 64 con iniciales (o la foto), nombre H1 blanco y meta. Debajo: aviso verde tras publicar reseña, etiqueta de tipo + horario en `success`, tarjeta de calificación (número 34 Space Grotesk, "Calificación de clientes", "N reseñas", botón `primary` "Calificar"), sección "Menú en 3D" (comer) o "Vitrina en 3D" (resto) con grilla de productos, sección "Lo que dicen los clientes".

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

**Inicio**: cabecera `text` (oscura) con logo "Vitrina Local **Negocios**" (Negocios en mostaza), H1 34 "Que los turistas encuentren tu negocio.", párrafo. Tres beneficios con check en círculo `primarySoft`. Tarjeta "Registro en 5 pasos, unos 10 minutos…". Botón mostaza "Registrar mi negocio", botón con borde "Ya tengo cuenta".

**Paso 2**: tipo de negocio en 2 tarjetas seleccionables (borde 2, seleccionada `primary` con fondo `stage3d`), con título y descripción; categorías como chips (seleccionado `primary`).

**Paso 3**: botón grande de borde punteado 2 para la foto (icono `Camera` en cuadro 52; al cargar, cuadro `success` con `Check` y borde `success`), input cédula/NIT, nota `primarySoft` sobre la Cámara de Comercio.

**Paso 4**: lista de productos agregados (icono `Box`, "precio · Modelo 3D listo"), tarjeta "Tu primer plato / producto" con nombre, precio, botón rojo `price` "Grabar video del plato/producto"; mientras procesa, caja oscura con barra de progreso mostaza ("Grabando…", "Creando el modelo 3D…"); al terminar, vista 3D + "Se ve bien, agregarlo" + "Grabar de nuevo". Botón mostaza "Ver cómo quedó".

**Paso 5**: la tarjeta del negocio tal como sale en la app de clientes, dentro de un marco `stage3d`. Debajo, resumen horario / WhatsApp / productos y botón "Enviar a revisión y publicar".

**Panel**: cabecera oscura con nombre y píldora de estado ("En revisión" mostaza / "Publicado: visible para clientes" verde). Aviso de revisión. Estadísticas en 3 columnas (Visitas al perfil, Vistas en 3D, Escaneos del QR). Lista de productos con "Agregar". Reseñas con botón "Responder" que abre un textarea y "Publicar respuesta". Tarjeta del QR para imprimir.

---

## 5. Textos

Todos los textos de la interfaz están en el prototipo, en español de Colombia. Copiarlos literalmente.
