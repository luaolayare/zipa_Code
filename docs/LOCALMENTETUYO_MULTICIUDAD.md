# LocalmenteTuyo: marca y multiciudad

Fecha: 21 de noviembre de 2026 · Rama: `feature/localmentetuyo-multiciudad` (desde `main` en `09baddc`). Sin push ni merge.
Todo se probó en el proyecto de **pruebas** (`ayvugzpidvafjiqzlqwc`). Producción (`auilsjqprobmhusvxmmz`) no se tocó.

## Qué cambió

**Marca.** Los textos visibles de las tres apps dicen **LocalmenteTuyo**; el eslogan **«Lo mejor de aquí, cerquita de ti.»** aparece en la bienvenida de clientes (`BRAND.slogan`). Sin cambios en identificadores técnicos (ver abajo).

**Ciudad que se explora (clientes).** El encabezado muestra la ciudad elegida (botón «Zipaquirá ▾»), «Hola, [primer nombre]» o «¡Hola!» y **«¿Qué se te antoja descubrir hoy?»**. El selector muestra primero las ciudades disponibles y busca entre los 1.122 municipios del DANE (con departamento, para los 66 nombres repetidos).
- Ubicación física y ciudad explorada son distintas: la ubicación solo se pide al tocar «Usar mi ubicación», es aproximada, se usa una vez para calcular el municipio más cercano **en el celular** y no se guarda ni se envía.
- La ciudad elegida se guarda en el celular y nunca la reemplaza la ubicación sola. Sin ciudad elegida: Zipaquirá, con un aviso para cambiarla.
- Ciudad no activa: «¡Pronto llegaremos a [ciudad]!», «Explorar Zipaquirá» y «Cambiar de ciudad», sin listas vacías. Se distinguen: ciudad no habilitada, ciudad activa sin negocios, búsqueda sin resultados y error de conexión.
- Secciones: «Destacados en [ciudad]» / «Lugares que merecen una visita», «Los favoritos de la comunidad», «Recién llegados».

**Negocios.** «Registrar mi negocio» empieza por **«¿Dónde está tu negocio?»**:
- ciudad activa → registro normal y revisión del equipo;
- en preparación → aviso, «Registrar mi interés» o, si el equipo lo invitó, el registro completo (se publica cuando se apruebe y la ciudad abra);
- próximamente → solo interés: nombre del negocio, tipo, nombre, WhatsApp y autorización. Sin cuenta, cédula, NIT, fotos ni documentos. No crea ni publica nada.

El registro y la edición guardan el municipio y, si la persona está en su local y lo pide, el punto del mapa (se rechaza si queda a más de 40 km del municipio). Un negocio publicado que cambia de municipio o mueve su punto más de 300 m vuelve a revisión.

**Panel.** Nueva sección **Ciudades**: estado de cada ciudad, negocios publicados / en revisión / sin terminar, interesados (con enlace a WhatsApp), cambio de estado y búsqueda para configurar otra ciudad. «Negocios» se filtra por municipio y la ficha muestra municipio y punto.

## Base de datos (migraciones nuevas, solo aditivas)

| Migración | Contenido |
|---|---|
| `0023_municipios_dane.sql` | `departamentos` (33) y `municipios` (1.122) de DIVIPOLA (DANE, datos.gov.co `gdxc-w37w`), generados por `packages/shared/scripts/generar-territorio.js`. Solo lectura. |
| `0024_cobertura_y_visibilidad.sql` | `cobertura_municipios` (solo ciudades configuradas; Zipaquirá `activa`); `businesses.municipio_codigo` (default 25899, para los APK anteriores), `latitud`, `longitud`; `interes_comercial`; funciones `registrar_interes_comercial`, `admin_ciudades`, `admin_cambiar_estado_ciudad` (solo admin con segundo factor, con bitácora) y `admin_interesados`. |

**Regla pública:** un negocio se ve solo si está **publicado** y su **ciudad está activa**. Se aplica en RLS de `businesses` y `products`, la vista `businesses_public`, `buscar_negocios`, `negocios_destacados` y los videos; reservas, reseñas nuevas y visitas por QR se rechazan en negocios que no son públicos (disparador `exigir_negocio_publico`). Cambiar el estado de una ciudad **no** aprueba ni borra negocios.

### Procedimiento futuro para producción (NO ejecutado; requiere autorización)
1. Respaldo de la base de producción.
2. Desde una carpeta vinculada a producción: `npx supabase db push --remote --dry-run` (deben salir solo 0023 y 0024) y luego `npx supabase db push --remote`.
3. Verificar en solo lectura: 1.122 municipios, una ciudad activa (25899) y que la app actual sigue mostrando los mismos negocios (todos quedan en Zipaquirá).
4. La base primero y las apps después: los APK actuales siguen funcionando con la base nueva (mismos parámetros, Zipaquirá por defecto). Las apps nuevas necesitan un build nuevo: `expo-location` es un módulo nativo.

## Pruebas

| Prueba | Resultado |
|---|---|
| Typecheck · lint · unitarias | 0 errores · 0 avisos · **159/159** (10 nuevas del catálogo y del estado de ciudades) |
| CI de esquema y permisos (Supabase local, base limpia) | Aprobadas, con una sección nueva de ciudades (visibilidad, interés, permisos, bitácora, abrir y cerrar ciudad, cambio de municipio) |
| `pruebas/entorno/probar-ciudades.js` (proyecto de pruebas, sesiones reales) | **33/33** |
| Verificación del entorno · aislamiento entre negocios (regresión) | 14/14 · 12/12 |
| Panel con navegador (admin con segundo factor) | **10/10**: abrir Tunja publica lo aprobado, no aprueba pendientes, queda en la bitácora; cerrarla oculta sin borrar; filtro por municipio |
| App de clientes (vista web de Expo, celular 412×915) | **21/21** |
| App de negocios (vista web de Expo, celular 412×915) | **20/20** |
| Emulador Android | **No ejecutado**: Windows no deja arrancar el emulador en esta sesión (`WHPX: Failed to setup partition, hr=80070005`). Suele resolverse reiniciando el computador. |

Errores encontrados y corregidos en las pruebas: «Usar mi ubicación» reutilizaba una posición de hasta 10 minutos; el editor dejaba elegir una ciudad cerrada y fallaba con un aviso genérico.

## Identificadores técnicos que siguen con el nombre anterior (revisar antes de publicar)
Paquetes Android `co.zipa.vitrinalocal` / `co.zipa.vitrinanegocios` (permanentes al subir a Play), slugs `vitrina-local` / `vitrina-negocios`, esquema `vitrinalocal://` (lo usan los QR impresos), proyectos de EAS y de Firebase, `@zipa/shared`, nombre del proyecto de Supabase y la clave de almacenamiento del registro (`zipa:registro-negocio:v1`).

## Pendiente antes del piloto real
1. Repetir en un Android (emulador tras reiniciar el computador, o teléfono) lo probado en la vista web, más la letra grande y los diálogos de permiso de Android.
2. Avisos push en un teléfono físico (sin cambios en esta etapa).
3. Autorizar: push y merge de esta rama, migraciones 0023 y 0024 en producción y builds nuevos (por `expo-location`).
4. Textos legales: completar los datos del responsable, quitar «modelos 3D» y agregar ubicación aproximada e interés comercial a la política de privacidad.
5. Decidir los identificadores técnicos (sobre todo los paquetes Android) antes de la primera subida a Google Play.
