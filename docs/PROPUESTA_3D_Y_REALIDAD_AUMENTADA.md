# Propuesta técnica: platos en 3D y realidad aumentada

Beta 2, Entrega 4. Este documento es una evaluación: no se instaló ninguna dependencia ni servicio de pago.

## 1. Video, modelo 3D y realidad aumentada

| | Video (lo que hay hoy) | Modelo 3D | Realidad aumentada (AR) |
|---|---|---|---|
| **Qué ve el cliente** | El producto real grabado unos 20 segundos | Un objeto que gira y se acerca con el dedo | El modelo 3D puesto sobre la mesa real, a tamaño real, a través de la cámara |
| **Cómo se produce** | El negocio graba con su celular | Fotogrametría: muchas fotos o un video procesados por un programa | El mismo modelo 3D, en formatos `.glb` (Android) y `.usdz` (iPhone) |
| **Fidelidad** | Total: es el producto real | Depende de la captura. Los platos brillantes, con salsa o vapor salen mal | La misma del modelo |
| **Peso para el cliente** | 2–10 MB por video | 2–10 MB por modelo optimizado | Igual que el modelo, más abrir el visor |
| **Requisitos** | Ninguno | Ninguno, si se ve en un visor | Celular compatible con ARCore (Android) o ARKit (iPhone) |

**Conclusión:** el video sigue siendo la forma más confiable y barata de mostrar el producto real. El 3D y la realidad aumentada aportan «ver el tamaño en tu mesa». Valen la pena para platos insignia y artesanías, no para todo el catálogo.

## 2. Lo que la app ya tiene

- La tabla `products` tiene la columna `model_url` (desde la migración 0001). Solo la escribe el servidor (service role); los negocios no pueden.
- La pantalla de producto de la app de clientes (`apps/clientes/src/app/producto/[id].tsx`) ya muestra «Ver en tu mesa» cuando hay modelo:
  - **Android:** abre **Scene Viewer** de Google con un `.glb`.
  - **iPhone:** abre **AR Quick Look** de Apple con un `.usdz`.

Usa los visores que ya trae el sistema, así que **no requiere ninguna librería nueva**.

## 3. Alternativas evaluadas

| Opción | Compatible con Expo | Peso para la app | Comentario |
|---|---|---|---|
| **A. Visores del sistema** (Scene Viewer y Quick Look) | Sí, ya implementado con `Linking` | Ninguno | Lo más liviano. El cliente sale un momento a un visor del sistema. Funciona en Expo Go |
| B. `<model-viewer>` de Google dentro de un WebView | Sí, con `react-native-webview` (paquete oficial del SDK) | Bajo a medio | Visor 3D dentro de la app, con botón de AR que abre los visores del sistema. Necesita conexión para cargar el componente o empaquetarlo |
| C. `expo-gl` con three.js | Sí | Medio a alto | Control total, pero hay que programar el visor. El rendimiento en Android de gama baja es un riesgo |
| D. ViroReact u otra AR nativa dentro de la app | Requiere compilación propia (no Expo Go) | Alto | Potente, pero agrega mantenimiento nativo. No se justifica para esta etapa |

## 4. Cómo crear los modelos (opciones gratuitas o de bajo costo)

| Herramienta | Tipo | Notas |
|---|---|---|
| Apple Object Capture | Gratis | Necesita un Mac con Apple Silicon; las fotos pueden tomarse con iPhone. Exporta `.usdz` |
| Meshroom (AliceVision) | Gratis, código abierto | Necesita PC con tarjeta NVIDIA. Más manual |
| Blender | Gratis | Para limpiar, reducir polígonos y exportar `.glb`. Convertir a `.usdz` requiere herramientas adicionales |
| Polycam, Luma AI, KIRI Engine | Apps con plan gratuito y planes de pago | Fáciles desde el celular. **Revisar los términos y precios vigentes antes de usarlas**: cambian con frecuencia y pueden limitar el uso comercial o las exportaciones |

**Metas para cada modelo:**
- Menos de 5 MB y menos de 100.000 triángulos.
- Texturas de máximo 2048 px.
- `.glb` con compresión.
- Tamaño real en metros, para que el plato aparezca del tamaño correcto en la mesa.

## 5. Requisitos de los celulares

- **Android:** realidad aumentada solo en celulares certificados para ARCore, con «Servicios de Google Play para RA». Muchos equipos de gama baja no lo están. En ellos, Scene Viewer muestra el modelo en 3D sin realidad aumentada.
- **iPhone:** AR Quick Look funciona en iPhone con ARKit (iPhone 6s o posterior, iOS 12 o superior).
- **Datos móviles:** un modelo de 5 MB es parecido a un video corto. Conviene cargarlo solo cuando el cliente toca «Ver en tu mesa».

## 6. Limitaciones de rendimiento

- En la app no hay costo de dibujo: los visores del sistema hacen el trabajo.
- En la opción B o C, dibujar modelos pesados en celulares de gama baja produce tirones y consume batería. Por eso se recomienda la opción A.
- Los modelos se guardarían en Supabase Storage, en un bucket público con caché. El costo es el ancho de banda de descarga.

## 7. Propuesta de prueba de concepto

**Fase 1 (sin dependencias nuevas, 1–2 semanas de trabajo del equipo):**
1. Elegir de 3 a 5 productos insignia, por ejemplo un ajiaco, una artesanía y un postre.
2. Crear sus modelos con una herramienta gratuita, optimizarlos y exportarlos a `.glb` y `.usdz`.
3. Subirlos a un bucket `modelos3d`. Una función del equipo con rol admin les asignaría `model_url`, con registro en la bitácora.
4. Agregar el evento de analítica `ar_open` para medir cuántas personas lo usan.
5. Probar en al menos 2 Android (uno de gama baja) y 1 iPhone.

**Para decidir si se sigue:**
- Que los modelos se vean fieles, según una valoración del equipo y de los negocios.
- Que al menos el 10 % de quienes ven el producto toquen «Ver en tu mesa».
- Que abra en menos de 5 segundos con datos móviles.

**Fase 2 (solo si la fase 1 funciona):**
- Visor 3D dentro de la app con la opción B.
- Un flujo para que el equipo convierta en 3D los videos aprobados.

**Fuera de alcance por ahora:**
- Generar los modelos automáticamente desde el video del negocio. Requiere un servicio de procesamiento, normalmente de pago, y los resultados con comida son inconsistentes.
