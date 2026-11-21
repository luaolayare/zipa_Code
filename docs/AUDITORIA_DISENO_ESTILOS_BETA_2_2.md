# Auditoría de diseño y estilos: Zipa lo tiene, Beta 2.2

**Fecha:** 20-nov-2026.
**Repositorio:** `luaolayare/zipa_Code`, rama `feature/tipografia-espacios` (HEAD `9a002a0`).
**Alcance:** los cambios visuales recientes (rediseño de tipografía y espacios) y los cambios funcionales que llegaron en las mismas ramas. Verifica que nada de lo que funcionaba se haya dañado.

**Restricciones cumplidas:**
- no se cambió código ni diseño durante la auditoría;
- no se ejecutaron migraciones;
- no se tocó Supabase remoto ni datos de producción; solo hubo lecturas públicas para diagnosticar;
- no hubo despliegues, APK, push ni merge.

---

## 1. Resumen ejecutivo

- **Qué cambió.** Se aplicó un rediseño **solo visual** de tipografía y espacios en las dos apps móviles.
  - Antes había 31 tamaños de letra, unos 22 valores de espacio y unos 28 radios.
  - Ahora hay 8 estilos de letra, 8 espacios (múltiplos de 4), 5 radios y 5 fondos de estado, definidos en `packages/shared/src/theme.ts`.
  - Lo usan 51 archivos de pantallas y componentes. Quedan 9 tamaños sueltos, todos excepciones documentadas.
- **Qué no cambió:** colores de marca, familias tipográficas, textos, flujos, navegación, base de datos y panel de administración. El rediseño tiene 0 archivos en `apps/admin` y en `supabase`.
- **Cambios funcionales en estas ramas** (no son de diseño, ver §3):
  - reproductor de video del producto (caché, búfer, reproducir solo lo visible y cuando cargó);
  - grabación H.264 liviana y límite de 25 MB para videos de la galería en Android;
  - componente de chips con conteo;
  - un ajuste en una prueba automática (B-7).
- **Pruebas locales:** todo pasa (§9):
  - typecheck, lint y 128 pruebas unitarias;
  - 9 suites de regresión de punta a punta, incluidas P1 (avisos por proyecto), P4 (bandeja con más de 300 solicitudes) y la integral de tres apps;
  - auditoría funcional: 46 OK, 0 fallas;
  - compilación Android de las dos apps.
- **Riesgo principal abierto (P1):** la usuaria reporta en el celular el mensaje «No hay conexión / Revisa tu conexión».
  - **No se pudo reproducir.** Con la misma configuración de producción, la versión web carga los datos (todas las respuestas 200).
  - No se sabe en qué app ni pantalla ocurre (§11, H-1).
- **APK:** los actuales (commit `83cfd00`) **no** tienen el rediseño ni la mejora de videos. Hacen falta APK nuevos para probar en Android sin Expo Go. No se generaron.
- **Conclusión:** el rediseño no rompe ninguna función probada en local. **Antes de seguir con las pruebas físicas** hay que aclarar H-1 y probar en el celular el tamaño de letra grande y los videos.

---

## 2. Estado del repositorio

| Elemento | Estado |
|---|---|
| Rama activa | `feature/tipografia-espacios`, creada desde `feature/beta-2-2-reservas` |
| Último commit | `9a002a0` (20-nov-2026 22:27 −05:00) |
| Cambios sin confirmar | Ninguno, salvo los archivos de esta auditoría |
| `feature/beta-2-2-reservas` en GitHub | Hasta `83cfd00`. Quedan **3 commits locales sin subir**: `39ff45e`, `2702da2` y `586d9ae` |
| `feature/tipografia-espacios` en GitHub | **No existe**: 19 commits solo locales |
| `main` | `49d1cf4` (Beta 2.1). Ni Beta 2.2 ni el rediseño están unidos a `main` |
| Supabase producción | 22 migraciones; `enviar-notificaciones` en v3 (P1 desplegado). El rediseño no cambia la base |
| Expo en el celular | Los servidores de Expo Go (8081 y 8082) sirven la **rama del rediseño contra producción** desde el 20-nov por la noche |

---

## 3. Commits y archivos

### 3.1 Commits recientes posteriores al último push

| Commit | Fecha | Tipo | Qué hace |
|---|---|---|---|
| `39ff45e` | 20-nov 13:39 | Documentación | Registro del despliegue de P1 y de los APK |
| `2702da2` | 20-nov 20:36 | **Funcional** (video) y documentación | Reproductor con caché, búfer y pausa fuera de vista; grabación H.264 de 2,5 Mbps; conversión a 720p en iPhone; límite de 25 MB en Android. Más `GUIA_PLAY_STORE.md` y `ESTRUCTURA_DE_LA_APP.md` |
| `586d9ae` | 20-nov 20:47 | Documentación | Estado para el rediseño, con el prompt |
| `193d289` | 20-nov 21:08 | Visual | Tokens: `typography`, `spacing`, `radius`, `sizes` y fondos de estado; `Button`, `TextField`, `Card` y `Screen` |
| `2c52731` | 21:19 | Visual | Inicio (clientes) y sus componentes |
| `21f7e84` | 21:25 | Visual | Negocio (clientes) y `ProductCard` |
| `e5090af` | 21:27 | Visual | Producto (clientes) |
| `691c275` | 21:28 | Visual | Reservar (clientes) y `ReservationPieces` (compartido) |
| `279ca4e` | 21:30 | Visual | Mi reserva (clientes): filas de etiqueta y valor |
| `dc11dec`, `f9f037a` | 21:31 | Evidencia | Capturas |
| `9c9fe0c` | 21:48 | Visual | Bienvenida (negocios) |
| `80b0bb7` | 21:48 | Visual | Panel (negocios), `PanelPieces` y `kit.tsx` |
| `24c8914` | 21:48 | Visual y **API de componente** | Reservas, Detalle y Configuración; `ChoiceChips` acepta `count` (burbuja) |
| `769b43d` | 21:48 | Visual | Registro en 5 pasos |
| `ddf78c9` | 21:48 | Visual | Editar negocio, Contacto, Editar producto, QR y Grabar |
| `f53dbe7` | 21:49 | Evidencia | Capturas de negocios |
| `7d4ebc6` | 21:56 | Visual | Resto de clientes y componentes compartidos |
| `edb7ba0` | 22:20 | **Funcional** (video) | El video arranca solo cuando cargó, está a la vista y la pantalla está enfocada |
| `1eea530` | 22:20 | **Prueba** | B-7 verifica la pestaña por su nombre accesible |
| `e8139f1` | 22:27 | Visual y documentación | Márgenes de 20 y esquinas de cabeceras; `ESPECIFICACION.md` |
| `9a002a0` | 22:27 | Evidencia | Resultados de pruebas |

### 3.2 Archivos

- **Rediseño en código** (`feature/beta-2-2-reservas..HEAD`, sin documentación): **64 archivos, +1.109 / −804 líneas**.

  | Carpeta | Archivos |
  |---|---|
  | `apps/clientes` | 23 |
  | `apps/negocios` | 24 |
  | `packages/shared` | 13 (`theme.ts` y 12 componentes de `ui/`) |
  | `pruebas/` | 4 |
  | `apps/admin` y `supabase` | 0 |

- **Creados:**
  - `pruebas/diseno/capturas-clientes.js` y `capturas-negocios.js` (capturas contra Supabase local);
  - `pruebas/auditoria/resultados/rediseno-tipografia.txt`;
  - `docs/diseno/rediseno-tipografia/*.png` (7 bocetos aprobados);
  - `docs/capturas-tipografia/**` (antes, después y comparación).
- **Eliminados:** ninguno.
- **Imágenes, logos e íconos de la app:** **sin cambios**. No se tocaron `assets/`, `Logo.tsx`, `PlateArt.tsx` ni `WhatsAppIcon.tsx`.

### 3.3 Cambios funcionales dentro de ramas «de diseño» (separados a propósito)

| Cambio | Archivo | Efecto | Verificación |
|---|---|---|---|
| Reproductor de video | `apps/clientes/src/components/ProductVideo.tsx` | Caché (`useCaching`); búfer de 15 s; mínimo de 4 s en Android; reproduce solo si el slide está activo, la pantalla enfocada y el estado es `readyToPlay`; indicador de carga y mensaje de error | Auditoría funcional sin errores de consola. **Falta prueba física** |
| Grabación y galería | `apps/negocios/src/app/grabar.tsx`, `components/media.ts` | H.264 (`avc1`) a 2,5 Mbps en 720p; conversión a 720p H.264 en iPhone; rechazo de videos de más de 25 MB en Android | Typecheck. **Requiere APK nuevo y prueba física** |
| Chips con conteo | `packages/shared/src/ui/ReservationPieces.tsx` | `options[].count` opcional, que se muestra en burbuja. El nombre accesible sigue siendo «Pendientes (2)» | P4 7/7, Entrega B 15/15 |
| Filas agrupadas | `PanelPieces.tsx` (`grouped`, `first`) y `reserva/[id].tsx` (`Row first`) | Solo presentación | Regresión |
| Nombres de platos | `ProductCard.tsx` | `numberOfLines` pasa de 2 a 3 | Capturas |
| Prueba B-7 | `pruebas/auditoria/beta-2-2-entrega-b.js` | Buscaba el texto visible «Pendientes (2)»; ahora busca el radio con ese nombre accesible | Se cambió porque el rediseño aprobado cambió el texto visible. No oculta ninguna falla funcional |

---

## 4. Cambios por aplicación

Los tamaños son los del código antes y después (Git). Todas las pantallas tienen captura real de antes y después (§10).

### 4.1 App de clientes

| Pantalla | Antes | Ahora | Por qué | Observaciones |
|---|---|---|---|---|
| Inicio (`explorar`) | Titular 32/36; secciones 21; subtítulos 13,5; nombres 15; meta 12; insignia 11,5; buscador de 52 con radio 16; separación entre secciones 26 | Titular 34 (`display`); secciones 20 (`heading`); subtítulos 13 (`caption`); nombres 17 (`subtitle`); meta 13; buscador de 56 con radio 12; secciones a 32 | Jerarquía clara y nada por debajo de 13 | El título de las dos tarjetas grandes queda en 16 para que «Emprendimientos» quepa en 2 columnas |
| Negocio | Nombre 32 (hero); etiquetas 14; tarjetas con radio 24 y relleno 18; botón de 52 con radio 16 | Nombre 26 (`title`, en una línea); tarjetas con radio 20 y relleno 16; botón de 56 con radio 12; píldoras con `infoSoft` y `warningSoft` | Coherencia con los bocetos | El menú sigue en **cuadrícula con fotos**; el boceto proponía lista (§11, H-9) |
| Producto | Nombre 34 y precio 30, que competían; descripción 17/26; botón de 58 con radio 18 | Nombre y precio en 26 (`title`); descripción 16/24; botón de 56 con radio 12 | Jerarquía | Se conservó el orden de los elementos |
| Reservar | Mezcla de 12,5 a 26 | `overline`, `title`, `label` y `caption`; aviso en `warningSoft`; chips, contador y píldoras compartidos con tokens | Formularios legibles | — |
| Mi reserva | Datos con la etiqueta arriba y el valor abajo | **Filas de etiqueta y valor con separadores** en una tarjeta; código en 34 | Cabe sin desplazarse | Valor con ancho máximo del 58 % para no partir la hora |
| Bienvenida, Entrar, Perfil, ¿Tienes negocio?, Categoría, Mis reservas, Calificar, Reportar, Legal y visor de fotos | Varios tamaños de 11 a 40 | Escala de 8 estilos | Consistencia | Excepciones de posición: `marginTop` 70 en «¿Tienes negocio?» |
| Barra inferior | Etiqueta 12 | 13 (`caption`, negrita) | Mínimo de 13 | Alto fijo de 72 (§11, H-7) |

### 4.2 App de negocios

| Pantalla | Antes | Ahora | Observaciones |
|---|---|---|---|
| Bienvenida | Titular 44/46; margen lateral 24 | 34 (`display`); margen lateral 20 | `marginTop` 128 conservado (posición bajo la ilustración) |
| Panel | Nombre 36; «Publicado» verde petróleo; etiquetas de cifras 14 que se partían a mitad de palabra; productos en tarjetas sueltas | Nombre 26; «Publicado» en `successSoft`; etiquetas en `caption`; **productos en una tarjeta con separadores** | Corrige el corte de «Calificaci-ón» |
| Reservas (bandeja) | «Pendientes (2)» como texto; código 18; plazo en texto mostaza; «Ver más» de 48 | **Conteo en burbuja**; código 20; fecha 17; **plazo en etiqueta `dangerSoft`**; «Ver más» de 56 con radio 12 | Nombre accesible sin cambios |
| Detalle y Configuración de reservas | `small` 14 para ayudas | Ayudas en `help` (16, gris); datos cortos en `caption` | El detalle sigue con la etiqueta arriba del valor; en clientes son filas (H-10) |
| Registro (5 pasos) | Formularios entre 12,5 y 22 | Escala; casilla de términos de 14 a 16 | El paso 5 no tiene captura: exige verificación previa |
| Editar negocio, Contacto, Editar producto, Grabar | Varios | Escala | Grabar se revisó solo por código (la cámara no funciona en la web) |
| Afiche QR | — | **Sin cambios a propósito** | Es una imagen para imprimir |

### 4.3 Panel de administración (web)

- **Sin cambios en el rediseño** (0 archivos en `apps/admin`).
- **Ya era coherente:** misma paleta en variables CSS (`--bg #f6f4ef`, `--primary #0f3d3e`, `--accent #f2b134`…), Bricolage Grotesque y DM Sans con `next/font`, y radio de 20.
- **No adopta la escala nueva:** el panel no consume `theme.ts` (H-8).
- **Sin capturas nuevas:** no hubo cambios que mostrar; las de auditorías anteriores siguen vigentes.

---

## 5. Comparación visual antes y después

- **Comparaciones lado a lado (reales):**
  - 27 en `docs/auditoria-diseno-beta-2-2/capturas/antes-despues/` (JPG a la mitad del tamaño);
  - las originales en `docs/capturas-tipografia/comparacion/`, `antes/` y `despues/`.
- **Bocetos aprobados:** `docs/diseno/rediseno-tipografia/`. Son referencia de diseño, **no capturas**.
- **Cómo se tomaron:**
  - Playwright sobre la versión web de Expo, a 390 de ancho, contra Supabase **local**;
  - negocio de muestra «Arepas Mamá Inés» sembrado solo en local.
- **Límite:** no son capturas de un celular. La fuente nativa, el tamaño de letra del sistema y la cámara no se pueden ver en la web.

---

## 6. Sistema de diseño actual

**Fuente de verdad:** `packages/shared/src/theme.ts`. `docs/diseno/ESPECIFICACION.md` quedó actualizada (sección 1).

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `background` | `#F6F4EF` | Fondo |
| `surface` | `#FFFFFF` | Tarjetas e inputs |
| `text` | `#14211F` | Texto principal |
| `textBody` | `#2E3A38` | Cuerpo |
| `textMuted` | `#55605D` | Secundario |
| `border` | `#E2DDD3` | Bordes de tarjetas |
| `inputBorder` | `#D6D0C5` | Bordes de inputs |
| `primary` | `#0F3D3E` | Verde petróleo |
| `primaryDeep` | `#145052` | Decorativo |
| `primarySoft` | `#DDEBEA` | Fondo verde suave |
| `onPrimaryMuted` | `#CFE1DF` | Texto sobre verde |
| `accent` | `#F2B134` | Mostaza |
| `accentSoft` | `#FDEFD0` | Fondo mostaza suave |
| `accentText` | `#7A4B00` | Texto sobre mostaza suave |
| `price` | `#C2381B` | Precios |
| `danger` | `#A12E15` | Errores |
| `success` | `#166534` | Éxito |
| `star` | `#E09A00` | Estrellas |
| `starText` | `#8A5A00` | Texto de estrellas |
| `chipIdle` | `#ECE7DE` | Chips |
| `stage3d` | `#E9EFEE` | Escenario de fotos |
| `dark` | `#14211F` | Escenario de video |

**Fondos de estado nuevos:**

| Token | Valor | Texto |
|---|---|---|
| `successSoft` | `#DCEFE2` | `success` |
| `warningSoft` | `#FDEFD0` | `accentText` |
| `dangerSoft` | `#F9DED6` | `danger` |
| `infoSoft` | `#DDEBEA` | `primary` |
| `neutralSoft` | `#ECE7DE` | `textMuted` |

### Tipografía

Bricolage Grotesque (600, 700 y 800) y DM Sans (400, 500, 600 y 700).

| Estilo | Fuente | Tamaño / interlineado | Tracking |
|---|---|---|---|
| `display` | Bricolage 800 | 34 / 40 | −0,8 |
| `title` | Bricolage 700 | 26 / 32 | −0,5 |
| `heading` | Bricolage 700 | 20 / 26 | −0,3 |
| `subtitle` | DM Sans 700 | 17 / 24 | 0 |
| `body` | DM Sans 400 | 16 / 24 | 0 |
| `label` | DM Sans 600 | 15 / 20 | 0 |
| `caption` | DM Sans 500 | 13 / 18 | 0 |
| `overline` | DM Sans 700 | 13 / 16 | +1,2, mayúsculas |

En negocios, `kit.tsx` agrega `error` (`label` en rojo) y `help` (`body` en gris).

### Espacios, radios y medidas

| Grupo | Valores |
|---|---|
| Espacios | 4, 8, 12, 16, **20 (margen lateral)**, 24, 32 (entre secciones) y 48 (final) |
| Radios | 8, 12 (botones e inputs), 20 (tarjetas), 28 (cabeceras y galerías) y 999 |
| Medidas | Botón e input de 56; área táctil mínima de 44 |

### Otros elementos

| Elemento | Estado |
|---|---|
| Adopción en código | 376 usos de la escala, 474 de `spacing.`, 173 de `radius.` y 23 de `sizes.`. Quedan 9 `fontSize` sueltos, todos excepciones documentadas |
| Sombras | **No se usan.** La profundidad se logra con bordes de 1 y fondos |
| Iconografía | `lucide-react-native`, trazo 2, en 32 archivos; sin cambios |
| Botones | `Button` compartido: 56 de alto, radio 12, texto `subtitle`. Variantes `primary`, `accent`, `dark`, `outline`, `danger` y `link` (44) |
| Tarjetas | Radio 20, borde `border`, relleno 16 |
| Estados | Píldoras con su fondo de estado (`ReservationPill`, `StatusPill`) |
| Modo oscuro | **No existe**: `userInterfaceStyle: "light"` en las dos apps |
| Coherencia | Las dos apps móviles ya comparten la escala. El panel comparte paleta y familias, pero no la escala (H-8) |

---

## 7. Componentes nuevos o modificados

- **Nuevos tokens:** `typography`, `sizes`, `TypographyStyle` y los 5 colores de estado. Se redefinieron `spacing` y `radius`.
- **Nuevo estilo en negocios:** `help`. Se quitaron los nombres viejos de `kit.tsx` (`hero`, `h1`, `h2`, `h3`, `small`, `strong`, `number`).
- **Componentes compartidos modificados:** `Button`, `TextField`, `Card`, `Screen`, `ReservationPieces` (con `count` nuevo), `ConsentCheckbox`, `PushPrompt`, `LegalDocumentView`, `ReportView`, `DeleteAccountButton`, `AboutCard`, `CheckEmailView` y `MissingConfigView`.
- **No hay pantallas nuevas.**

---

## 8. Validación funcional

La columna «Evidencia» resume los resultados del 20-nov-2026 sobre `9a002a0`, contra Supabase local.

| Área | Resultado | Evidencia |
|---|---|---|
| Inicio de sesión y registro | ✅ | Auditoría funcional; Entregas A y B; capturas de los pasos 1 a 4 |
| Búsqueda y filtros | ✅ | Auditoría funcional; Beta 2.1 («Ver más») |
| Catálogo de productos | ✅ | Auditoría funcional (producto con foto y video, galería) |
| Reseñas | ✅ | Auditoría funcional |
| QR | ✅ | Auditoría funcional (`n06-qr`); el afiche no cambió |
| Navegación | ✅ | Todas las suites navegan por rutas y botones; sin errores de página en 23 pantallas capturadas |
| Solicitudes de reserva | ✅ | Entrega B, integral y concurrencia |
| Confirmar y rechazar | ✅ | Entrega B, integral y concurrencia (sin carreras) |
| **P1:** avisos por proyecto de Expo | ✅ en local | Notificaciones 15/15 (N-12 a N-15) y reproducción de P1 «no se reproduce» |
| **P4:** bandeja con más de 300 solicitudes | ✅ en local | 7/7 con 324 solicitudes |
| **P13:** activación de avisos | ⚠️ Lógica ✅ (Jest); interfaz sin probar | La tarjeta y «Último paso» no se ven en la web; requieren celular |
| Notificaciones push en dispositivos reales | ❌ **Sin evidencia física** | No se puede afirmar que lleguen a Android |
| WhatsApp | ✅ | Enlaces y mensajes en la auditoría funcional y en Entrega B |
| Panel administrativo | ✅ | Integral (tres apps); sin cambios de código |
| Permisos y roles | ✅ | El rediseño no toca SQL ni RLS; las suites SQL no se repitieron por eso. Producción niega `reservations` a `anon` (comprobado) |

---

## 9. Resultados de pruebas

| Verificación | Resultado |
|---|---|
| TypeScript (todos los paquetes) | ✅ 0 errores |
| ESLint | ✅ 0 problemas |
| Jest | ✅ 128/128 (13 suites) |
| Notificaciones (P1) | ✅ 15/15 |
| Reproducción de P1 | ✅ «no se reproduce» |
| Bandeja P4 (324 solicitudes) | ✅ 7/7 |
| Integral (tres apps) | ✅ 9/9 |
| Entregas A, B y C | ✅ 12/12 · 15/15 · 6/6 |
| Concurrencia de reservas | ✅ 8/8 |
| Correcciones de la Beta 2.1 | ✅ 12/12 |
| Auditoría funcional | ✅ 46 OK · 0 fallas · 2 no probadas (requieren celular) · 0 errores de consola. Ver la nota |
| `expo export` Android (las dos apps) | ✅ (corrido en el cierre del rediseño; el último commit solo cambió márgenes y radios) |
| `expo-doctor` | ⚠️ 19/20 en las dos apps: parches de Expo pendientes (P9 de la auditoría anterior) |
| `npm audit` | ⚠️ 24 moderadas, 0 altas y 0 críticas (herramientas de compilación) |
| Pruebas SQL | No se repitieron: el rediseño no cambia la base. Pasaron en las correcciones prioritarias |
| `next build` del panel | No se repitió: el panel no cambió |
| Tamaño de letra al 130 % | **No se puede probar en la web**: requiere celular |

**Nota sobre la auditoría funcional:**
- La **primera** corrida de esta auditoría dio 42 OK y 4 fallas, todas del panel de administración (A04, A05, A09 y A11), con 3 errores de consola.
- Los errores eran del **servidor de desarrollo de Next.js** de pruebas (puerto 3001), que había quedado vivo de una sesión anterior: «Jest worker encountered 2 child process exceptions» y archivos internos de `_next` servidos con el tipo equivocado.
- Se reinició ese servidor **sin cambiar código** y la suite completa dio 46 OK, 0 fallas y 0 errores de consola.
- El panel no tiene cambios en estas ramas.

---

## 10. Capturas disponibles

| Carpeta | Contenido |
|---|---|
| `docs/auditoria-diseno-beta-2-2/capturas/antes-despues/` | **27** comparaciones reales: 14 de clientes y 13 de negocios |
| `docs/capturas-tipografia/antes/`, `despues/` y `comparacion/` | Originales a resolución completa |
| `docs/diseno/rediseno-tipografia/` | 7 bocetos aprobados (no son capturas) |

**No hay capturas de un celular físico ni del panel de administración**, porque el panel no cambió.

---

## 11. Errores y riesgos

| ID | Prioridad | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|---|
| **H-1** | **P1** | La usuaria ve en el celular (Expo Go) «No hay conexión / Revisa tu conexión». **No se reprodujo**: con la misma configuración (producción) la web carga los datos y las peticiones dan 200. Los paquetes que reciben los celulares apuntan a producción. Las consultas nuevas de la bandeja P4 solo se probaron contra Supabase local (PostgREST 16.5); en producción no se pueden probar sin sesión, porque `anon` no tiene acceso a `reservations`, como corresponde | Diagnóstico del 20-nov | Saber qué app y qué pantalla, y tomar captura. Si es en negocios (Panel o Reservas), probar con la cuenta de un restaurante de prueba en producción (requiere autorización) o con el ambiente de pruebas (P6). Revisar la consola de la ventana de Expo |
| H-2 | P1 | Los APK actuales (`83cfd00`) **no** tienen el rediseño ni la mejora de videos | Git y EAS | APK nuevos cuando se apruebe el diseño |
| H-3 | P1 | Avisos push sin prueba física en Android (P2 de la auditoría anterior) | Ninguna prueba física | Checklist de la sección 4 de `CORRECCIONES_PRIORITARIAS_BETA_2_2.md` |
| H-4 | P2 | El tamaño de letra grande (130 %) no está verificado | La web no lo simula | Prueba en el celular (Ajustes → Tamaño de fuente) |
| H-5 | P2 | Video sin verificación física: búfer, caché y H.264. Los 4 videos ya aprobados en producción siguen en HEVC y alta tasa | Diagnóstico de producción | Probar en Android de gama media con datos móviles; volver a grabar esos videos |
| H-6 | P2 | 22 commits sin subir a GitHub (3 en Beta 2.2 y 19 en el rediseño) | `git` | Subir cuando se autorice |
| H-7 | P3 | La barra inferior de clientes tiene alto fijo de 72 con texto de 13 | `TabBar.tsx` | Verificar al 130 %; pasar a `minHeight` si se corta |
| H-8 | P3 | El panel de administración no usa la escala nueva (CSS propio) | `apps/admin` | Igualar más adelante; prioridad baja |
| H-9 | P3 | Diferencias con los bocetos, todas a propósito: menú en cuadrícula, textos sin cambiar y horario sin píldora «Abierto» | Decisiones del rediseño | Confirmar que se aceptan |
| H-10 | P3 | Inconsistencia: «Mi reserva» (clientes) usa filas; el detalle de negocios conserva la etiqueta sobre el valor | Capturas `5-mi-reserva` y `n4` | Igualar si se desea |
| H-11 | P3 | Colores sueltos que quedan: `#A12E15` (= `danger`) en Editar producto, `#CFC8BB` en estrellas de Calificar, `#AFC2BE` y `#FFB4A2` sobre fondos oscuros | `grep` | Pasar a tokens |
| H-12 | P3 | `@expo-google-fonts/space-grotesk` instalado sin uso | `apps/clientes/package.json` | Quitar con autorización (cambia dependencias) |
| H-13 | P3 | `ESPECIFICACION.md`: las secciones 2 a 4 son históricas, con medidas viejas | El documento lo advierte | Reescribirlas si se necesita |

No se encontraron hallazgos P0.

---

## 12. Estado de los APK

| Build | Commit | Contenido |
|---|---|---|
| `447a6fcf` y `b11b486a` | `6eb31c4` | Beta 2.2 con Firebase; sin P4 ni P13 |
| **`0bdf6a86` (clientes) y `a7d59426` (negocios)** | `83cfd00` | **Los últimos.** P1 (servidor), P4 y P13. **Sin** la mejora de videos (`2702da2`) **ni** el rediseño |

- **¿Hacen falta APK nuevos?** **Sí**, para probar en Android el rediseño, el video y la grabación H.264. Mientras tanto, Expo Go sirve para lo visual, pero no para avisos ni para «Último paso».
- **Contador de EAS:** 11 de 30. No se generó ningún build.

---

## 13. Recomendaciones priorizadas

1. **(P1) Aclarar H-1 antes de seguir:** qué app, qué pantalla y una captura. Diagnosticarlo sin tocar producción, o con la autorización de una cuenta de prueba.
2. **(P1) Revisión visual en el celular con Expo Go** (rediseño), incluido el tamaño de letra al 130 % (H-4).
3. **(P1) Aprobar o pedir ajustes del rediseño.** Con la aprobación: subir las ramas, generar APK nuevos (H-2) y hacer las pruebas físicas de avisos (H-3) y videos (H-5).
4. **(P2) Subir los commits pendientes y unir a `main`** cuando se autorice.
5. **(P3) Limpiezas:** H-7, H-10, H-11 y H-12. Igualar el panel (H-8) más adelante.

---

## 14. Conclusión

- **Funciones:** el rediseño es visual y **no rompió ninguna función verificable en local**. Todas las suites de regresión y las comprobaciones estáticas pasan, incluidas P1, P4 y la lógica de P13. Los únicos cambios de comportamiento son la mejora del video (intencional) y el conteo en burbuja de la bandeja.
- **Visual:** la app quedó más ordenada:
  - una sola escala en las dos apps;
  - mínimo de 13;
  - botones e inputs de 56;
  - margen de 20;
  - estados con fondos de color.
- **Pruebas físicas:** todavía no estamos listos para darlas por cerradas en Beta 2.2:
  - el error de conexión reportado (H-1) sigue sin explicar;
  - los APK no tienen el diseño;
  - no hay evidencia física de avisos, videos ni letra grande.

  El paso siguiente es aclarar H-1 y revisar el diseño en Expo Go.
