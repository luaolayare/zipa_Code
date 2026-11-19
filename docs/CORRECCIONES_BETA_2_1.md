# Correcciones Beta 2.1

**Fecha:** 18 de noviembre de 2026
**Rama:** `fix/beta-2-1-ux`, que sale de `main` en `b9c2ecc`. Está solo en este equipo: no se ha subido a GitHub.
**Alcance:** las cinco correcciones de UX de la revisión del 18 de noviembre.

**Lo que NO se hizo:**
- No hay migraciones ni cambios en RLS, Auth o el proyecto Supabase remoto.
- No se cambiaron identificadores Android/iOS ni archivos de credenciales.
- No se generaron APK en EAS, no hubo despliegues y no se hizo push.

Todas las pruebas se corrieron contra **Supabase local**: Docker, Edge Functions locales y las apps en web (clientes 8083, negocios 8084 y panel 3001).

---

## 1. Diagnóstico

| # | Problema | Causa encontrada |
|---|---|---|
| 1 | Las cafeterías, heladerías y reposterías decían «Producto» y «Catálogo». Varias pantallas decidían si un negocio era restaurante mirando solo la categoría vieja (`comer`). | La regla estaba repetida y no era la misma en todas partes. Unas pantallas usaban `isRestaurant()` y otras comparaban `category === 'comer'`. Una cafetería tiene la categoría vieja `cafe_dulces`, pero su categoría principal es *Restaurantes*. |
| 2 | Las heladerías mostraban una taza de café. Los colores de portada no seguían a la categoría principal. | `PlateArt` y las portadas usaban la categoría vieja: `cafe_dulces` → taza, para cafeterías, reposterías y heladerías por igual. |
| 3 | La búsqueda solo traía los primeros resultados y no dejaba ver más. | `useSearch` pedía una sola página al servidor. No había paginación, ni control de respuestas viejas o repetidas. |
| 4 | Las apps prometían «3D» en general. Las tarjetas mostraban «N en 3D» y había un botón de 3D aunque el producto no tuviera modelo. | Eran textos y etiquetas de la etapa de prototipo. Hoy casi ningún producto tiene modelo 3D. |
| 5 | Las apps mostraban la «A» por defecto de Expo como ícono y pantalla de inicio. El panel no tenía favicon: daba 404. | Se usaban los recursos de la plantilla de Expo y faltaba `favicon.ico`/`icon.svg` en `apps/admin/src/app`. |

---

## 2. Correcciones

### 2.1 Platos y productos según el tipo de negocio

Hay una sola regla en `packages/shared/src/presentation.ts`, y todas las pantallas de las dos apps la usan:

- `restaurantOf(negocio)` usa la **categoría principal** (`mainCategory`). Si un negocio antiguo no la tiene, cae a la categoría vieja: `comer` → Restaurantes.
- Restaurantes, incluidas cafeterías y comida típica, ven **«Plato», «Menú» o «Tu menú»**, las secciones del menú y **«Disponible hoy» / «No disponible hoy»**.
- Emprendimientos, incluidas heladerías, reposterías y artesanías, ven **«Producto», «Catálogo» o «Tu catálogo»** y **«Disponible» / «Agotado»**.
- `isRestaurant()` (en `categories.ts`) ahora delega en esta regla, así que no hay dos versiones.

Aplicado en:
- **Clientes:** ficha del negocio, tarjeta de producto y ficha de producto.
- **Negocios:** panel, fila de producto, editor de producto, registro (paso de productos y vista previa) y afiche QR («…nuestro menú» / «…nuestro catálogo»).

> **Nota:** en la base de datos, las **heladerías y reposterías** están dentro de *Emprendimientos* (migración 0013). Por eso dicen «Producto» y «Catálogo». La **cafetería** está en *Restaurantes* y dice «Plato» y «Menú». Si se quiere otra cosa, hay que cambiar la clasificación, lo que requiere una migración que no se hizo aquí.

### 2.2 Ilustraciones y colores por categoría

- **Ilustraciones:** `PlateArt` dibuja según la subcategoría:
  - cafetería → **taza**
  - heladería → **helado**: cono con bolas, lo nuevo
  - repostería → **postre**: ponqué con cereza, lo nuevo
  - otros restaurantes → **plato**
  - otros emprendimientos → **artesanía**
- **Portadas:** el color sale de la **categoría principal**, con la paleta de la marca:
  - Restaurantes: terracota `#C2381B`
  - Emprendimientos: verde petróleo `#0F6E6E`
  - Detalle interior en mostaza `#F2B134` para ambas.
- La paleta está centralizada en `MAIN_PALETTES` (`presentation.ts`). No se agregaron colores fuera de la marca.

### 2.3 Búsqueda paginada en el servidor con «Ver más»

- **`createPager`** (`packages/shared/src/pagination.ts`) pide páginas de 20 al RPC `buscar_negocios` usando `offset`. Es reutilizable y no depende de React.
- **Sin duplicados:** `mergeUnique` descarta los negocios que ya están en la lista.
- **Sin peticiones repetidas:** si ya hay una carga en curso, otro toque a «Ver más» no hace nada.
- **Al cambiar la búsqueda** se reinicia la lista. Las respuestas que llegan tarde de la búsqueda anterior se descartan con un contador de generación.
- **Estados:**
  - cargando la primera página;
  - cargando más, con un indicador en el botón;
  - error en la primera página, con «Intentar de nuevo»;
  - error al cargar más: se conservan los resultados ya mostrados y aparece un mensaje con «Intentar de nuevo».
- **En pantalla:** el contador dice «20+ resultados» mientras haya más. El botón «Ver más» desaparece cuando no quedan más.
- Se conservan la espera de 300 ms al escribir, el mínimo de 2 letras y la medición de búsquedas.

### 2.4 Promesas de 3D

- Se quitaron el indicador **«N en 3D»** de las filas y tarjetas del inicio y los textos que prometían 3D en general.
- El botón **«Ver en 3D»** solo aparece cuando el producto tiene modelo y se está en Android o iOS.
- Se actualizaron los comentarios del código que hablaban de 3D como algo general.
- Se cambiaron los textos de ejemplo (`demo.ts`) que mencionaban 3D.

**Textos legales (solo cambios de coherencia, sin subir `VERSION`):**

| Archivo | Cambio |
|---|---|
| `politica-privacidad.ts` | «…las fotos y videos de sus productos y sus reseñas.» Antes decía «…y sus modelos 3D». |
| `terminos-negocios.ts` | «…con las fotos y videos de tus productos…» |
| `terminos-clientes.ts` | «Las fotos, los videos y, **cuando un producto los tenga**, los modelos 3D son representaciones aproximadas…» |

**Requieren revisión humana o legal (NO se cambiaron porque son de fondo):**
- `politica-privacidad.ts`:
  - «Generar los modelos 3D a partir de los videos que sube el negocio.» Es una **finalidad** del tratamiento de datos.
  - «[NOMBRE DEL SERVICIO 3D]: procesamiento de videos…» Es un **encargado** del tratamiento todavía sin definir.
  - «Es pública… sus fotos, productos y modelos 3D…»
- `terminos-negocios.ts`:
  - El título «4. Fotos, videos y modelos 3D que subes».
  - «Los modelos 3D son representaciones aproximadas generadas automáticamente…»
- `terminos-clientes.ts`: «Las fotos, videos y modelos 3D de cada negocio pertenecen a ese negocio…»

Si se decide no ofrecer 3D por ahora, quien revise lo legal debe decidir si se quitan esas cláusulas y si se sube la versión. Subir la versión obliga a los usuarios a aceptar de nuevo.

### 2.5 Íconos y pantalla de inicio provisionales

- **El símbolo:** no hay un logo definitivo en el repositorio, así que se adaptó el **símbolo provisional que ya usan las apps** (`<Logo />`: una tienda dentro de un cuadro mostaza). No se usó «ZL».
- **Colores:**
  - Clientes: fondo verde petróleo `#0F3D3E`, cuadro mostaza.
  - Negocios: los mismos colores **invertidos**, para distinguir las dos apps en el celular.
  - Panel: cuadro mostaza.
- **Configuración centralizada** en `scripts/identidad/`:
  - `marca.svg`, el símbolo;
  - `config.json`, los colores de cada app;
  - `generar.cjs`, que regenera todos los recursos;
  - `README.md`, con cómo cambiarla cuando llegue el logo definitivo.
- **Recursos generados:**
  - `icon.png`, ícono adaptativo de Android (primer plano, fondo y **monocromo** para íconos temáticos), `splash-icon.png` y `favicon.png` de cada app;
  - `favicon.ico` e `icon.svg` del panel, que ya no da 404.
- **`app.json`:** la pantalla de inicio usa ahora el plugin `expo-splash-screen` con su color de fondo, y el fondo del ícono adaptativo de negocios es mostaza.
- **Sin cambios:** los identificadores (`co.zipa.vitrinalocal`, `co.zipa.vitrinanegocios`, slug y scheme).
- **Créditos:** se conservan sin cambios: «Desarrollado por SCALIX Cloud» (https://scalix-cloud.com/) y el desarrollador «Luis Alfredo Olaya».
  - La especificación decía «Laya». Se dejó **«Olaya»**, como se corrigió antes en el proyecto. Hay que confirmarlo.

---

## 3. Archivos modificados

**Nuevos:**
- `packages/shared/src/presentation.ts`: palabras, etiquetas, ilustración y colores por tipo de negocio.
- `packages/shared/src/pagination.ts`: paginador de búsqueda.
- `packages/shared/src/__tests__/presentation-test.ts`
- `packages/shared/src/__tests__/pagination-test.ts`
- `scripts/identidad/`: `marca.svg`, `config.json`, `generar.cjs` y `README.md`.
- `apps/admin/src/app/favicon.ico` y `apps/admin/src/app/icon.svg`
- `pruebas/auditoria/correcciones-beta-2-1.js`: prueba de punta a punta de las 5 correcciones.
- `pruebas/auditoria/resultados/correcciones-beta-2-1.json` y `funcional-beta-2-1.json`
- `docs/capturas-beta-2-1/`: 8 capturas.
- `docs/ESTADO_ACTUAL_BETA_2.md`: el informe de estado anterior, que no estaba en el repositorio.

**Modificados:**
- **Compartido:**
  - `categories.ts`, `index.ts`, `demo.ts` y `ui/PlateArt.tsx`
  - `__tests__/categories-test.ts`
  - los 3 textos legales
- **Clientes:**
  - `app.json` y los 6 recursos de `assets/`
  - `lib/useSearch.ts`
  - pantallas `(tabs)/explorar.tsx`, `(tabs)/negocio.tsx`, `negocio/[id].tsx` y `producto/[id].tsx`
  - componentes `BusinessRow`, `CarouselCard`, `Pill` y `ProductCard`
- **Negocios:**
  - `app.json` y los 6 recursos de `assets/`
  - pantallas `index`, `panel`, `qr`, `grabar`, `producto/[id]`, `registro/productos` y `registro/vista-previa`
  - componentes `BusinessPreview`, `PanelPieces`, `ProductEditor`, `QrPoster` y `media.ts`

En total, 43 archivos existentes cambiados: 261 líneas agregadas y 204 quitadas, además de los archivos nuevos.

---

## 4. Pruebas agregadas

**Unitarias (Jest, `packages/shared`): 15 nuevas.** Pasaron de 63 a 78.
- **`presentation-test.ts`:**
  - Restaurante, cafetería, heladería, repostería y artesanías: palabra, título, etiquetas de disponibilidad e ilustración de cada uno.
  - Las dos paletas.
  - Negocios antiguos sin categoría principal.
  - Subcategorías nuevas sin ilustración propia.
- **`pagination-test.ts`:**
  - Paginación por `offset`.
  - Un doble toque a «Ver más» hace una sola petición.
  - Cambiar la búsqueda rápido descarta las respuestas viejas.
  - Un «Ver más» de la búsqueda anterior no se mezcla con la nueva.
  - Errores en la primera página y en «Ver más», y su reintento.
  - Limpiar la búsqueda.

**De punta a punta (Playwright, `pruebas/auditoria/correcciones-beta-2-1.js`): 12 casos.**
- **B1-1 a B1-4:** palabras y etiquetas de la cafetería y la heladería en las apps de negocios y de clientes.
- **B2-1 a B2-3:** la heladería muestra el helado, la cafetería muestra la taza, y la portada tiene el color de su categoría principal.
- **B3-1 y B3-2:**
  - 27 resultados reales: primero 20 con «Ver más», luego 27 sin duplicados y sin el botón;
  - cambiar la búsqueda reinicia la lista.
- **B4-1 y B4-2:** sin modelo no aparece «Ver en 3D», y no hay indicadores «en 3D» en el inicio.
- **B5-1:** el panel sirve `favicon.ico` e `icon.svg`.

---

## 5. Resultados

| Comprobación | Resultado |
|---|---|
| `npm run typecheck`, en todos los paquetes | ✅ Sin errores |
| `npm run lint`, en todos los paquetes | ✅ Sin errores |
| Pruebas unitarias | ✅ **78/78** (9 suites) |
| Correcciones Beta 2.1, de punta a punta | ✅ **12/12**, 0 errores de consola |
| Regresión funcional completa (`auditoria-funcional.js`): autenticación, registro de negocios, productos, fotos y videos, reseñas, moderación y panel del equipo | ✅ **46 OK · 0 fallas · 2 no probadas**, que requieren celular (ver 9), y 0 errores de consola |
| Clientes: 19 casos · Negocios: 15 · Panel: 14 | |

### Estado de los builds

| App | Comprobación | Resultado |
|---|---|---|
| Panel (Next.js 16.4.5) | `next build` | ✅ Compila |
| Clientes | `expo export --platform android` | ✅ Exporta |
| Negocios | `expo export --platform android` | ✅ Exporta |
| Clientes y negocios | `expo-doctor` | ⚠️ 19/20 (ver riesgos) |

No se generaron APK. Los APK actuales (`ffd402ea` clientes, `8c13192d` negocios) son de antes de estas correcciones: **todavía muestran la «A» de Expo y los textos viejos**.

---

## 6. Capturas

En `docs/capturas-beta-2-1/`, tomadas en la vista web contra Supabase local:

| Captura | Qué muestra |
|---|---|
| `c1-ficha-heladeria.png` | Heladería: portada verde petróleo, «Catálogo», ilustración de helado y «Agotado» |
| `c2-ficha-cafeteria.png` | Cafetería: portada terracota, «Menú» con secciones y taza |
| `c3-producto-heladeria-ilustracion.png` | Ficha de producto de la heladería, sin «Ver en 3D» |
| `c4-busqueda-primera-pagina.png` | «20+ resultados» y «Ver más» |
| `c5-busqueda-todas.png` | Los 27 resultados, sin el botón |
| `n1-editor-cafeteria.png` | Editor de la cafetería: «plato», secciones del menú y «Disponible hoy» |
| `n2-panel-heladeria.png` | Panel de la heladería: «Tu catálogo» |
| `n3-editor-heladeria.png` | Editor de la heladería: «producto» y «Disponible»/«Agotado» |

---

## 7. Riesgos pendientes

1. **Íconos y pantalla de inicio sin ver en un celular.** La vista web no los muestra. Los recursos se revisaron como imágenes, pero el resultado final depende del lanzador de Android: el recorte del ícono adaptativo y el ícono temático monocromo.
2. **«Ver en 3D» solo se probó en el caso sin modelo.** El caso con modelo usa el visor nativo (Android/iOS) y no se puede probar en la web.
3. **Textos legales con cláusulas de 3D** (ver 2.4). Necesitan una decisión humana o legal antes de publicar en tiendas.
4. **expo-doctor 19/20:** pide `expo-router` 58.0.32, y la instalada es 58.0.31. La versión nueva salió el 17-nov-2026, hace un día. No se actualizó: está fuera del alcance y conviene esperar dos semanas antes de adoptar versiones nuevas. Es un parche, no bloquea los builds.
5. **Clasificación de heladerías y reposterías** como Emprendimientos (ver 2.1). Es una decisión de producto; cambiarla requiere una migración.
6. **Créditos «Olaya» vs. «Laya»:** confirmar el apellido correcto.
7. **Paginación con datos que cambian:** si se publica un negocio nuevo mientras alguien pasa páginas, la paginación por `offset` puede saltarse uno. Los duplicados se descartan, pero un salto no se puede detectar. El riesgo es bajo con el volumen actual.

---

## 8. Probado vs. pendiente de prueba manual

| Probado automáticamente (local) | Pendiente de prueba manual en Android |
|---|---|
| Palabras «plato/producto», «Menú/Catálogo» y disponibilidad en las dos apps | Ícono en el lanzador: clientes verde petróleo, negocios mostaza |
| Ilustraciones por subcategoría y color de portada | Pantalla de inicio al abrir cada app |
| Búsqueda paginada, sin duplicados, reinicio y errores | Ícono temático (monocromo) con «Íconos temáticos» activado en Android 13 o superior |
| Ausencia de «en 3D» y de «Ver en 3D» sin modelo | «Ver en 3D» en un producto **con** modelo |
| Favicon del panel | Cámara: tomar foto y grabar video sin sonido (N13 de la regresión) |
| Regresión completa: autenticación, negocios, productos, reseñas, moderación y panel | Guardar o compartir el QR (N07 de la regresión) |
| | «Ver más» con desplazamiento real en el celular y conexión lenta |

---

## 9. Recomendaciones para la prueba en Android real

Hacerla con APK nuevos, que requieren autorización y usan 2 builds de la cuota de EAS. Hoy van 5 de 30.

1. **Desinstalar las versiones anteriores.** Si no, Android puede seguir mostrando el ícono viejo guardado en caché.
2. **Revisar el ícono de cada app** en el cajón de apps y en la pantalla principal. Probar con al menos dos formas de ícono, si el lanzador lo permite.
3. **Activar los íconos temáticos** (Ajustes → Fondo de pantalla y estilo) y comprobar que se ve la tienda.
4. **Abrir cada app en frío** y revisar la pantalla de inicio: color de fondo y que el símbolo no quede cortado.
5. **En clientes:**
   - buscar una palabra con más de 20 resultados, tocar «Ver más» varias veces seguidas y comprobar que no hay repetidos;
   - cambiar la búsqueda a mitad de una carga;
   - probar con datos móviles lentos.
6. **Fichas:** abrir una cafetería, una heladería, una repostería y un restaurante. Revisar las palabras, la ilustración y el color de la portada.
7. **En negocios:**
   - registrar o editar un producto en una cafetería y en una heladería: palabras y etiquetas de disponibilidad;
   - tomar una foto y grabar un video con la cámara;
   - guardar y compartir el QR.
8. **Producto con modelo 3D:** si hay alguno, comprobar que aparece «Ver en 3D» y que abre el visor.

---

## 10. Cómo repetir las pruebas

Con Supabase local en marcha y las apps en web (clientes 8083, negocios 8084, panel 3001):

```powershell
npm run typecheck; npm run lint; npm test
$env:BETA2 = "<ruta del repositorio>"
node pruebas/auditoria/correcciones-beta-2-1.js <carpeta-capturas>
node pruebas/auditoria/auditoria-funcional.js <carpeta-capturas> <foto.png> <video.mp4>
```

La regresión funcional necesita antes la semilla `pruebas/carga/semilla.sql` cargada en la base local.
