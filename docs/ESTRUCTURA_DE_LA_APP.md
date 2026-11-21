# Estructura de «Zipa lo tiene» y plan de estabilidad

**Fecha:** 20-nov-2026.
**Rama:** `feature/beta-2-2-reservas`.

**Para qué sirve este documento:**
- tener a la vista todo lo que contiene el proyecto;
- decidir dónde optimizar el diseño y el rendimiento.

---

## 1. Vista general

```
┌──────────────────────┐   ┌──────────────────────┐   ┌───────────────────────┐
│ App CLIENTES (Expo)  │   │ App NEGOCIOS (Expo)  │   │ Panel ADMIN (Next.js) │
│ turistas: explorar,  │   │ restaurantes y       │   │ solo el equipo:       │
│ buscar, ver, reservar│   │ emprendimientos      │   │ aprobar, moderar      │
└──────────┬───────────┘   └──────────┬───────────┘   └───────────┬───────────┘
           └──────── packages/shared (tema, datos, sesión, UI) ───┘
                                      │
              ┌───────────────────────▼─────────────────────────┐
              │ SUPABASE (producción auilsjqprobmhusvxmmz)      │
              │ Postgres + seguridad por filas · Auth · Storage │
              │ Edge Functions · pg_cron (avisos cada minuto)   │
              └───────────────────────┬─────────────────────────┘
                                      │
                          Expo Push → Firebase (Android)
```

- **Monorepo** con npm workspaces.
- **Sin servidor propio:** todo pasa por Supabase.
- **Sin web pública.**

---

## 2. App de clientes (`apps/clientes`)

**Paquete:** `co.zipa.vitrinalocal`. **Proyecto de EAS:** `vitrina-local`.

### Pantallas (`src/app`)

| Ruta | Qué hace |
|---|---|
| `index` | Inicio: destacados, categorías, carruseles y búsqueda por nombre con «Ver más» |
| `(tabs)/explorar` | Explorar por categoría y lo más destacado |
| `(tabs)/negocio` | Pestaña informativa para negocios |
| `(tabs)/perfil` | Perfil, «Mis reservas», legal y borrar cuenta |
| `categoria/[id]` | Lista de una categoría |
| `negocio/[id]` | Ficha del negocio: fotos, menú, contacto, WhatsApp, redes, reseñas y reservar |
| `producto/[id]` | Producto: galería (video aprobado y fotos), precio, visor de fotos y realidad aumentada si hay modelo |
| `reservar/[id]` | Pedir una reserva: fecha, personas y platos |
| `reserva/[id]` | Estado de la solicitud, cancelar y avisos |
| `mis-reservas` | Historial de solicitudes |
| `calificar/[id]` | Reseña con estrellas |
| `reportar` | Reportar contenido |
| `login` | Entrar o crear cuenta |
| `legal/privacidad`, `legal/terminos` | Textos legales |

### Componentes y lógica
- **Componentes:** `BusinessRow`, `CarouselCard`, `Cover`, `ProductCard`, `ProductVideo`, `PhotoViewer`, `RankCard`, `Rating`, `TabBar`, `Pill` y `BackButton`.
- **`src/lib`:**
  - `useSearch`: búsqueda;
  - `negocios`;
  - `contacto`;
  - `notificaciones`;
  - `supabase`.
- **Módulos nativos:** `expo-video`, `expo-notifications`, `expo-image-picker`, `expo-router` y `react-native-svg`.

---

## 3. App de negocios (`apps/negocios`)

**Paquete:** `co.zipa.vitrinanegocios`. **Proyecto de EAS:** `vitrina-negocios`.

### Pantallas (`src/app`)

| Ruta | Qué hace |
|---|---|
| `index` | Bienvenida y entrar |
| `registro/cuenta → datos → verificacion → productos → vista-previa` | Registro en 5 pasos |
| `panel` | Panel: estado de revisión, productos, reservas y avisos, QR y editar |
| `negocio/editar`, `negocio/contacto` | Datos, fotos, horarios, entregas y redes |
| `producto/[id]` | Editar un producto o plato: fotos, video, precio y sección |
| `grabar` | Cámara para el video del producto (20 s, 720p, H.264) |
| `qr` | Afiche con QR para imprimir o compartir |
| `reservas/index` | Bandeja por estado, de 30 en 30 con «Ver más» |
| `reservas/[id]` | Detalle: confirmar, rechazar, marcar asistencia o WhatsApp |
| `reservas/configuracion` | Horarios, cupos, anticipación y «Último paso: notificaciones» |
| `legal/*` | Textos legales |

### Componentes y módulos
- **Componentes:**
  - `ProductEditor`, `media` (fotos y videos);
  - `CategoryPicker`, `LogoPicker`, `MorePhotos`;
  - `QrPoster`, `BusinessPreview`, `PanelPieces`;
  - `RegistroContext`, `StepHeader`, `kit`.
- **Módulos nativos adicionales:** `expo-camera`, `expo-image-manipulator`, `expo-sharing`, `react-native-qrcode-svg` y `react-native-view-shot`.

---

## 4. Panel de administración (`apps/admin`, Next.js 16)

**Seguridad:** solo el equipo, con su cuenta, el rol de `admin_users` y segundo factor (MFA). Nunca usa la *service role key*.

### Páginas

| Página | Qué hace |
|---|---|
| Inicio | Resumen |
| `negocios` y `negocios/[id]` | Revisar, aprobar o rechazar negocios y ver sus productos y videos |
| `videos` | Cola de videos por aprobar |
| `resenas` y `reportes` | Moderación |
| `categorias` y `destacados` | Contenido del inicio |
| `reservas` | Reservas y estado de los avisos (fallidos o atascados) |
| `analitica` | Uso: vistas y búsquedas |
| `bitacora` | Registro de acciones del equipo |
| `sistema` | Salud de la configuración |
| `entrar`, `verificar`, `sin-acceso` | Acceso |

---

## 5. Paquete compartido (`packages/shared`)

| Archivo | Contenido |
|---|---|
| `api.ts` | **Toda** la lectura y escritura de datos (`createApi`): negocios, productos, búsqueda, reseñas, reservas paginadas, archivos y videos firmados |
| `auth.tsx` | Sesión (`AuthProvider` y `useAuth`) |
| `theme.ts`, `fonts.ts` | Colores y tipografía (Bricolage Grotesque y DM Sans) |
| `reservations.ts` | Reglas de reservas, pestañas de la bandeja y textos |
| `push.ts` | Estados y textos de notificaciones |
| `pagination.ts` | Paginador (`createPager`), usado en la búsqueda y la bandeja |
| `photos.ts`, `gallery.ts` | Tamaños de foto y galería |
| `categories.ts`, `presentation.ts`, `contact.ts` | Categorías, ilustraciones y enlaces de WhatsApp y redes |
| `moderation.ts`, `analytics.ts` | Filtro de palabras y eventos de uso |
| `legal/` | Textos legales versionados |
| `demo.ts` | Datos de ejemplo **solo en desarrollo** |
| `ui/` | `Button`, `TextField`, `Card`, `PushPrompt`, `ReservationPieces`, `DeleteAccountButton`, `LegalDocumentView`, `PlateArt` y otros |
| `__tests__/` | 13 suites de Jest y 128 pruebas |

---

## 6. Supabase (`supabase/`)

### Migraciones (22, todas en producción)

| Migraciones | Tema |
|---|---|
| 0001–0002 | Esquema inicial y datos |
| 0003–0008 | Consentimientos, reportes, verificación privada, privilegios mínimos y roles de administración |
| 0009–0012 | Panel de negocios, revisión, videos aprobados y reseñas anti-spam |
| 0013–0017 | Categorías, búsqueda, menú, analítica, logo, galería y destacados |
| 0018–0022 | Contacto y entregas, reservas, notificaciones, operación de reservas y avisos por app |

### Buckets de archivos
- **Fotos:** público.
- **`videos`:** privado. Se reproduce con enlaces firmados de 1 hora, hasta 50 MB por archivo y solo MP4 o MOV.

### Edge Functions
- `revisar-negocio`
- `eliminar-cuenta`
- `enviar-notificaciones`: la llama `pg_cron` cada minuto, protegida con un secreto.

### Pruebas
- SQL: `supabase/ci/` (esquema y permisos).
- De punta a punta: `pruebas/auditoria/`.
- De carga: `pruebas/carga/` (k6).

---

## 7. Plan de estabilidad y rendimiento (propuesta)

Ordenado por impacto para que clientes y negocios tengan una app estable y fácil de usar.

### Hecho hoy: videos que se trababan

**Diagnóstico** (producción, 4 videos):
- 3 de los 4 se grabaron en iPhone en **HEVC (.mov)**: muchos Android lo decodifican con esfuerzo y se traban.
- El cuarto va a **9,4 Mbps**, demasiado para datos móviles.
- La app no guardaba caché: **cada repetición volvía a descargar** el video.
- El video **seguía reproduciéndose** al deslizar a las fotos.

**Corrección:**
- `ProductVideo`:
  - guarda el video en caché;
  - junta más video antes de arrancar (`bufferOptions`);
  - solo se reproduce mientras se ve;
  - muestra un indicador mientras carga y un mensaje si falla.
- Grabación (`grabar.tsx` y `media.ts`):
  - **H.264 a 2,5 Mbps en 720p**, unos 6 MB por 20 s;
  - en iPhone, los videos de la galería se convierten a 720p H.264;
  - en Android, los de más de 25 MB se rechazan con un mensaje claro.
- **Los videos que ya están subidos siguen en HEVC.** Conviene que esos negocios los vuelvan a grabar con la app nueva, o convertirlos en el servidor (punto 7 de la tabla).

### Siguientes pasos recomendados

| # | Mejora | Por qué | Esfuerzo |
|---|---|---|---|
| 1 | **Reporte de errores (Sentry o similar, tiene plan gratis)** | Hoy, si la app se cierra sola en el celular de un cliente, no nos enteramos. Es la base de la estabilidad | Bajo |
| 2 | **Actualizaciones sin APK nuevo (EAS Update)** | Corregir errores de pantalla en minutos, sin reinstalar ni pasar por Play | Bajo–medio |
| 3 | **`expo-image` en lugar de `Image`** | Caché en disco y memoria, transición suave y menos consumo de memoria en listas con muchas fotos | Medio |
| 4 | **Listas virtualizadas** (`FlatList` o `FlashList`) donde hoy se usa `ScrollView` con `map` | Con muchos negocios o productos, solo se dibuja lo que se ve | Medio |
| 5 | **Pantallas sin conexión y reintentos** uniformes | Mensajes claros y un botón «Reintentar» en todas las pantallas | Medio |
| 6 | **Ambiente de pruebas** (P6) | Probar sin tocar los datos reales | Medio |
| 7 | **Convertir los videos en el servidor** (720p H.264 con el índice al inicio y una miniatura) | Garantiza videos livianos aunque los suban de la galería en Android | Medio–alto |
| 8 | **Pruebas de carga de reservas y avisos** (P17) | Saber cuánta gente aguanta | Bajo |
| 9 | **Pruebas de punta a punta en el CI** (P8) | Que cada cambio se pruebe solo | Medio |
| 10 | **Revisión de facilidad de uso** con 3–5 personas reales por app | Encontrar dónde se confunden | Bajo |

**Cada mejora se hará con su propia autorización y sus pruebas, como hasta ahora.**
