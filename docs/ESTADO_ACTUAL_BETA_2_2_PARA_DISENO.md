# Zipa lo tiene: estado actual (Beta 2.2) para el rediseño de tipografía y espacios

**Fecha:** 20-nov-2026.
**Repositorio:** `luaolayare/zipa_Code`, rama `feature/beta-2-2-reservas`.

**Para qué sirve:** darle a quien diseñe, persona o IA, **todo el contexto**:
- qué es la app;
- qué tiene;
- qué se ha hecho;
- cómo se ve hoy, con valores exactos;
- qué se puede y qué no se puede cambiar.

Así puede proponer una tipografía y unos espacios mejores sin romper nada. El prompt sugerido está al final (sección 9).

---

## 1. Qué es

**Producto**
- Directorio de **restaurantes y emprendimientos locales de Zipaquirá** (centro histórico), pensado para **turistas**.
- Muestra fotos, videos y menús.
- Permite reseñas y **reservas** con aviso al restaurante.

**Tres piezas**

| Pieza | Para quién | Tecnología |
|---|---|---|
| **App «Zipa lo tiene»** (clientes) | Turistas y personas de la zona: explorar, buscar, ver productos, reservar y calificar | Expo SDK 58 / React Native 0.88 (Android y iOS) |
| **App «Zipa lo tiene Negocios»** | Dueños de restaurantes y emprendimientos: registrarse, subir productos, atender reservas | Expo SDK 58 / React Native 0.88 |
| **Panel de administración** | Solo el equipo: aprobar negocios y videos, moderar, ver reservas y avisos | Next.js 16 (web privada) |

**Backend:** Supabase (Postgres con seguridad por filas, Auth, Storage, Edge Functions y pg_cron). No hay servidor propio ni web pública.

### Usuarios y tono
- **Turistas:** a menudo con datos móviles, poco tiempo y celulares de gama media.
- **Dueños de negocios:** muchos son **personas mayores o poco digitales**. Hay que tener paciencia con ellos: textos grandes, botones claros y un paso a la vez.
- **Idioma:** español de Colombia, sencillo, sin tecnicismos y de tú.
- **Lo que se busca:** una app **estable, fácil para todos**, cálida y local, nunca genérica.

---

## 2. Qué se ha hecho (historial)

| Versión | Qué agregó |
|---|---|
| **Beta 1** | Directorio, fichas de negocio, búsqueda, reseñas, registro de negocios en 5 pasos, panel admin con MFA, moderación y textos legales |
| **Beta 2** | Panel de negocios completo, videos aprobados por el equipo, menú digital, analítica, logo y búsqueda rápida, galería de fotos por producto y destacados |
| **Beta 2.1** | Platos y productos por tipo de negocio, ilustraciones por categoría, búsqueda con «Ver más», se quitaron las promesas de 3D, íconos provisionales |
| **Beta 2.2** | Emprendimientos con fotos, ayuda para elegir la categoría, redes sociales y modos de entrega. **Reservas**: el cliente pide y el restaurante confirma o rechaza; hay plazos, vencimiento, asistencia y WhatsApp. **Notificaciones** con Expo y Firebase, panel de avisos en el admin y documentación |
| **Auditoría general 2.2** | 17 hallazgos (P1–P17) en `docs/AUDITORIA_GENERAL_BETA_2_2.md` |
| **Correcciones prioritarias** | **P1:** avisos separados por app. **P4:** bandeja de reservas paginada. **P13:** activación clara de las notificaciones. En `docs/CORRECCIONES_PRIORITARIAS_BETA_2_2.md` |
| **Hoy** | **Videos fluidos:** caché, búfer, solo el visible, grabación H.264 liviana. **Guía de Play Store** y **estructura** (`docs/GUIA_PLAY_STORE.md` y `docs/ESTRUCTURA_DE_LA_APP.md`) |

### Estado técnico
- **Producción:** Supabase con 22 migraciones y 3 Edge Functions.
- **APK de prueba:** del commit `83cfd00`.
- **Pruebas:**

  | Comprobación | Resultado |
  |---|---|
  | Typecheck y lint | ✅ |
  | Pruebas unitarias | ✅ 128/128 |
  | Pruebas de punta a punta | ✅ |
  | Regresión funcional | ✅ 46/46 |
  | Avisos en un celular real | ⏳ falta probarlos |

- **Pendientes para publicar:**
  - P3: textos legales;
  - P5: verificación de correo y recuperar contraseña;
  - P6: ambiente de pruebas;
  - íconos y logo definitivos;
  - cuenta de Google Play.

---

## 3. Pantallas

**Todas** las pantallas de abajo entran en el rediseño de tipografía y espacios.

### App de clientes

| Pantalla | Contenido principal |
|---|---|
| **Inicio** | Saludo y ciudad, buscador, destacados en carrusel, categorías con ilustración, «lo más destacado» por categoría y resultados con «Ver más» |
| **Explorar** (pestaña) | Categorías y ranking |
| **¿Tienes negocio?** (pestaña) | Explica qué gana un negocio y lleva a la app de negocios |
| **Perfil** (pestaña) | Cuenta, Mis reservas, textos legales, Acerca de, cerrar sesión y borrar cuenta |
| **Categoría** | Lista de negocios con portada, calificación y etiquetas |
| **Negocio** | Portada y logo, nombre, etiqueta «Emprendimiento local» o «Clásico de la zona», calificación, horario y abierto/cerrado, menú por secciones con precios en COP, contacto (WhatsApp y redes), modos de entrega, reseñas, «Reservar» y reportar |
| **Producto** | Galería con video y fotos, puntos, contador «1 de N», visor a pantalla completa, nombre, precio, descripción y calificar |
| **Reservar** | Fecha y hora por franjas, personas, nombre y WhatsApp, mesa, observaciones, platos opcionales y aviso de que no es una reserva confirmada |
| **Mi reserva** | Código grande (por ejemplo `R-7KQ2PX`), estado en píldora con explicación, datos, platos, tarjeta de notificaciones, WhatsApp, cancelar y «Solicitar otro horario» |
| **Mis reservas** | Historial |
| **Calificar** | Estrellas y comentario |
| **Login** | Entrar o crear cuenta con consentimientos |
| **Legal** | Privacidad y términos |

### App de negocios

| Pantalla | Contenido principal |
|---|---|
| **Bienvenida** | Titular grande y «Ya tengo cuenta» |
| **Registro en 5 pasos** | Cuenta → datos (tipo, categoría con ayuda, dirección, horario, WhatsApp, redes, entregas) → verificación → productos (foto, video, precio y sección) → vista previa. Cabecera de pasos con progreso |
| **Panel** | Estado de revisión en píldora, tarjeta de reservas con pendientes y estado de avisos, productos, QR, editar negocio y contacto |
| **Producto** | Editor con fotos (recorte), más fotos, video (grabar 20 s o de la galería), precio, sección, extras y disponibilidad |
| **Grabar** | Cámara a pantalla completa con cuenta regresiva y progreso |
| **QR** | Afiche para imprimir o compartir |
| **Reservas** | Pestañas en chips con conteo (Pendientes, Confirmadas, Rechazadas, Canceladas, Finalizadas, Vencidas), tarjetas con código, píldora, fecha, personas, plazo y «Ver más» |
| **Detalle de reserva** | Confirmar, rechazar con motivo, marcar asistencia y WhatsApp |
| **Configurar reservas** | Activar, franjas por día, cupo, anticipación, plazo de respuesta y «Último paso: notificaciones» |

### Panel de administración (web, uso interno)
- Páginas: inicio, negocios y su detalle, videos, reseñas, reportes, categorías, destacados, reservas y avisos, analítica, bitácora y sistema.
- **Prioridad baja** en el rediseño.

---

## 4. Sistema visual actual (valores exactos)

**Archivos:**
- tokens: `packages/shared/src/theme.ts`;
- fuentes: `packages/shared/src/fonts.ts`.

### Tipografías (aprobadas)
- **Bricolage Grotesque** para títulos:
  - 800 `hero`: titulares de portada;
  - 700 `display`: títulos y números grandes;
  - 600 `displaySemi`: subtítulos.
- **DM Sans** para textos, botones y formularios: 400, 500, 600 y 700.
- En React Native **cada peso es un archivo distinto**: se elige con `fontFamily`, no con `fontWeight`.
- Se cargan con `@expo-google-fonts`. Cambiar de familia es posible, pero agrega o quita paquetes.

### Escala tipográfica existente
Hoy existe **solo en la app de negocios** (`apps/negocios/src/components/kit.tsx`, objeto `type`):

| Estilo | Fuente | Tamaño / interlineado | Tracking |
|---|---|---|---|
| `hero` | Bricolage 800 | 40 / 42 | −1,2 |
| `h1` | Bricolage 700 | 30 / 34 | −0,8 |
| `h2` | Bricolage 700 | 22 / 27 | −0,4 |
| `h3` | DM Sans 700 | 17 / 22 | 0 |
| `body` | DM Sans 400 | 16 / 24 | 0 |
| `small` | DM Sans 400 | 14 / 20 | 0 |
| `strong` | DM Sans 600 | 15 / 21 | 0 |
| `overline` | DM Sans 700, mayúsculas | 12,5 | +1,4 |
| `number` | Bricolage 700 | 34 / 38 | −1 |
| `error` | DM Sans 600 | 14,5 / 20 | 0 |

**La app de clientes no tiene escala:** cada pantalla define sus estilos en línea.

### Colores (aprobados)

| Token | Hex | Uso |
|---|---|---|
| `background` | `#F6F4EF` | Fondo crema |
| `surface` | `#FFFFFF` | Tarjetas e inputs |
| `text` | `#14211F` | Texto principal |
| `textBody` | `#2E3A38` | Descripciones |
| `textMuted` | `#55605D` | Secundario |
| `border` | `#E2DDD3` | Bordes de tarjetas |
| `inputBorder` | `#D6D0C5` | Bordes de inputs |
| `primary` | `#0F3D3E` | Verde petróleo |
| `primaryDeep` | `#145052` | Decorativo y bienvenida |
| `primarySoft` | `#DDEBEA` | Fondos suaves verdes |
| `onPrimaryMuted` | `#CFE1DF` | Texto secundario sobre verde |
| `accent` | `#F2B134` | Mostaza |
| `accentSoft` | `#FDEFD0` | Fondos suaves mostaza |
| `accentText` | `#7A4B00` | Texto sobre mostaza suave |
| `price` | `#C2381B` | Precios y enlaces |
| `danger` | `#A12E15` | Errores |
| `success` | `#166534` | Éxito y «Abierto» |
| `star` | `#E09A00` | Estrellas |
| `starText` | `#8A5A00` | Texto de estrellas |
| `chipIdle` | `#ECE7DE` | Chips neutros |
| `dark` | `#14211F` | Escenario de video y fotos |

### Tokens de espacio y radio (existen, pero casi no se usan)
- `spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 }`
- `radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 }`

### Lo que encontramos al medir el código (20-nov-2026)

| Medida | Hoy | Problema |
|---|---|---|
| **Tamaños de letra distintos** | **31**: 11, 11,5, 12, 12,5, 13, 13,5, 14, 14,5, 15, 15,5, 16, 16,5, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 34, 36, 38, 40 y 44. El más usado es 15 (64 veces) | Demasiados pasos casi iguales. Se ve poco ordenado y cuesta mantenerlo |
| **Valores de espacio** (padding, gap, margin) | **~22**: 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32 y 40… Los más usados son 12, 16, 10 y 14 | Sin ritmo. No sigue la escala de 4 u 8 |
| **Radios de borde** | **~28 valores**: 4 a 42, y 999 | Las tarjetas se ven parecidas pero no iguales |
| **Uso de `spacing` y `radius` del tema** | **Solo 7 veces** en todo el código | Los tokens existen, pero nadie los usa |
| **Colores sueltos fuera del tema** | `#F9DED6` (fondo de error), `#DCEFE2` (fondo de éxito), `#D8D2C6`, `#C9D6D3`, `#FFF6DF` y otros | Faltan tokens para fondos de estado |
| **Escala tipográfica** | Solo en la app de negocios (115 usos); la de clientes no tiene | Las dos apps no comparten la misma tipografía |
| **Documento de diseño** | `docs/diseno/ESPECIFICACION.md` todavía dice **Space Grotesk** y «Vitrina Local». Está desactualizado | La fuente de verdad real es `theme.ts` |

**Conclusión:** la identidad está bien (colores y familias aprobadas). Lo que falta es **orden**:
- una escala tipográfica corta y compartida, de 7 a 9 estilos;
- una escala de espacios en múltiplos de 4;
- 4 o 5 radios;
- tokens para los fondos de estado.

---

## 5. Restricciones para el diseño

**Técnicas**
1. **React Native, no web.** Los estilos son objetos (`StyleSheet`), 1 punto = 1 px de CSS. No hay `rem`, `em`, media queries ni CSS en cascada.
2. **Las letras crecen con el ajuste de tamaño del celular** (accesibilidad). Hay que diseñar para que no se rompa a 130 % y evitar textos en cajas de alto fijo.
3. **Pantallas de referencia:**
   - Android de gama media de 360–412 pt de ancho;
   - iPhone de 390 pt;
   - margen lateral actual de 20–24.

**Accesibilidad y legibilidad**
4. **Áreas táctiles de al menos 44×44** (48 en Android). El botón compartido (`Button`) mide hoy 56 de alto y los enlaces 44.
5. **Contraste AA:** el texto `textMuted` sobre `background` ya está en el límite, así que no aclararlo más.
6. **Público mayor:** el cuerpo de texto **no debe bajar de 15–16**, y nada importante por debajo de 13.

**Contenido y marca**
7. **Textos en español de Colombia** y precios en COP (`$ 18.000`).
8. **No prometer 3D ni realidad aumentada** en los textos. Se quitó en la Beta 2.1.
9. **No cambiar:**
   - los identificadores internos (`vitrina…`);
   - los textos legales;
   - los flujos de reservas y registro.

   El rediseño es **visual**: tipografía, espacios, jerarquía y ritmo.
10. **Mantener:**
    - las familias aprobadas (Bricolage Grotesque y DM Sans), salvo una propuesta justificada;
    - la paleta: crema, verde petróleo y mostaza.

---

## 6. Cómo se aplicaría después en el código

Esto sirve para que el diseño salga «implementable».

1. **`packages/shared/src/theme.ts`:**
   - nueva escala `type` compartida (sale de `kit.tsx`);
   - `spacing` y `radius` revisados;
   - tokens de fondos de estado.
2. **Reemplazar** tamaños y espacios sueltos por tokens, pantalla por pantalla, empezando por las más vistas:
   - clientes: Inicio, Negocio, Producto y Reservar;
   - negocios: Panel, Registro y Reservas.
3. **Comprobar** con capturas antes y después (Playwright en la vista web), typecheck y pruebas, y finalmente en el celular.

---

## 7. Archivos de referencia en el repositorio

| Archivo | Contenido |
|---|---|
| `docs/ESTRUCTURA_DE_LA_APP.md` | Estructura completa y plan de estabilidad |
| `docs/AUDITORIA_GENERAL_BETA_2_2.md` | Auditoría con hallazgos P1–P17 |
| `docs/CORRECCIONES_PRIORITARIAS_BETA_2_2.md` | P1, P4 y P13 con pruebas |
| `docs/GUIA_PLAY_STORE.md` | Qué comprar y cómo publicar |
| `docs/diseno/prototipo/*.html` | Prototipo visual original (referencia histórica) |
| `docs/capturas-beta-2-1/`, `docs/capturas-beta-2-2/` | Capturas de pantallas reales |
| `packages/shared/src/theme.ts` | Tokens actuales |
| `apps/negocios/src/components/kit.tsx` | Escala tipográfica actual |

---

## 8. Cómo ver la app hoy

- **Expo Go:** con las direcciones `exp://…` que da el equipo. Cambian cada vez que se reinicia el servidor.
- **APK de Android** del commit `83cfd00`.
- **Capturas** en `docs/capturas-beta-2-2/`.

---

## 9. Prompt sugerido para Claude de escritorio

> Copia desde aquí. Adjunta este documento y, si puedes, 6–10 capturas reales de la app: Inicio, Negocio, Producto, Reservar y Mi reserva en clientes; Bienvenida, Registro, Panel y Reservas en negocios.

```
Eres un diseñador de producto móvil experto en tipografía y sistemas de espaciado para apps
React Native. Te adjunto el documento «Zipa lo tiene: estado actual (Beta 2.2)» con todo el
contexto de la app y capturas de las pantallas actuales.

Objetivo: proponer un sistema de TIPOGRAFÍA y ESPACIOS más ordenado, legible y cálido para las
dos apps (clientes y negocios), sin cambiar la identidad (paleta crema / verde petróleo #0F3D3E /
mostaza #F2B134, familias Bricolage Grotesque para títulos y DM Sans para texto), ni los flujos,
ni los textos.

Ten en cuenta:
- Público: turistas con datos móviles y dueños de negocios mayores o poco digitales. Fácil de
  leer y de tocar es más importante que lo «moderno».
- Hoy hay 31 tamaños de letra, ~22 valores de espacio y ~28 radios distintos (ver sección 4).
  Quiero reducirlos a un sistema corto y coherente.
- Restricciones de la sección 5: React Native (puntos, sin CSS), el texto crece con el ajuste
  de accesibilidad del celular, áreas táctiles de 44–48, contraste AA, cuerpo de 15–16 como
  mínimo, español de Colombia.

Entrégame:
1. Una escala tipográfica de 7 a 9 estilos (nombre, familia y peso, tamaño, interlineado,
   tracking y para qué se usa), justificada.
2. Una escala de espacios en múltiplos de 4 y reglas de uso: margen de pantalla, separación
   entre secciones, entre elementos de una tarjeta y relleno interno de tarjetas y botones.
3. De 4 a 5 radios con su uso (chips, inputs, tarjetas, hojas o escenarios, píldoras).
4. Tokens para los fondos de estado (error, éxito, aviso e información) dentro de la paleta.
5. Mockups en HTML (ancho 390, como un celular) de estas pantallas, ANTES y DESPUÉS lado a
   lado: Inicio (clientes), Negocio (clientes), Producto (clientes), Mi reserva (clientes),
   Panel (negocios) y Reservas (negocios). Usa contenido real de ejemplo de Zipaquirá en
   español (por ejemplo «Arepas Mamá Inés», precios como $ 18.000, código R-7KQ2PX).
6. Al final, el bloque de código TypeScript listo para reemplazar en packages/shared/src/theme.ts
   (objetos `type`, `spacing`, `radius` y los colores nuevos de estado), compatible con
   StyleSheet de React Native, con los nombres de fuente exactos:
   BricolageGrotesque_800ExtraBold, BricolageGrotesque_700Bold, BricolageGrotesque_600SemiBold,
   DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold.

Primero hazme 2 o 3 preguntas cortas si algo no está claro; luego propón 2 direcciones
(por ejemplo «cálida y aireada» y «compacta y clara») con un mockup de Inicio cada una, para que
yo elija antes de hacer el resto.
```
