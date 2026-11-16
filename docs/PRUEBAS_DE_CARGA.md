# Pruebas de carga — Zipa lo tiene (Beta 2, Entrega 4)

Fecha: 16 de noviembre de 2026 · Herramienta: k6 1.3.0 (imagen Docker `grafana/k6:1.3.0`).

## Qué se midió

Turistas virtuales usando la app de clientes, con las mismas consultas que hace la app:

| Paso | Consulta | Qué hace en la app |
|---|---|---|
| Abrir la app | `GET /rest/v1/categories` | Carga categorías y subcategorías |
| Buscar | `POST /rest/v1/rpc/buscar_negocios` (texto) | Buscador de «¿Qué buscas hoy?» |
| Entrar a una categoría | `POST /rest/v1/rpc/buscar_negocios` (categoría) | Pantalla Emprendimientos o Restaurantes |
| Ficha del negocio | `GET /rest/v1/businesses_public?id=eq.…` | Encabezado y calificación |
| Menú o productos | `GET /rest/v1/products?business_id=eq.…` | Menú por secciones |
| Reseñas | `GET /rest/v1/reviews_public?business_id=eq.…` | Reseñas de la ficha |

Cada turista repite ese recorrido. Entre un paso y otro espera de 1 a 3 segundos, como una persona real.

## Entorno (aislado)

- **Base:** Supabase local en Docker (`supabase start`), en el computador de desarrollo: 16 núcleos lógicos y 31 GB de RAM.
- **Datos:** `pruebas/carga/semilla.sql`, con 250 negocios publicados, 2.500 productos y 5.000 reseñas de 2.250 cuentas ficticias.
- **Lo que no se tocó:** el script se niega a correr contra cualquier dirección que no sea local. **No se ejecutó nada contra el Supabase real.**
- **Duración:** 60 segundos por perfil, con usuarios virtuales constantes.

## Resultados (medidos)

| Usuarios virtuales | Solicitudes | Solicitudes/s | Errores | p50 general | p95 general |
|---|---|---|---|---|---|
| 10 | 739 | 11,4 | 0 % | 3,8 ms | 36,6 ms |
| 50 | 3.727 | 56,5 | 0 % | 3,2 ms | 35,6 ms |
| 100 | 7.399 | 112,2 | 0 % | 3,9 ms | 46,6 ms |

### Latencia por operación (p50 / p95, en ms)

| Operación | 10 VU | 50 VU | 100 VU |
|---|---|---|---|
| Categorías | 2,9 / 27,0 | 2,3 / 15,5 | 2,9 / 33,3 |
| **Búsqueda por texto** | 30,6 / 44,0 | 29,5 / **111,5** | 39,1 / **287,8** (máx. 682) |
| Listado de categoría | 7,3 / 8,7 | 6,7 / 7,9 | 8,1 / 12,0 |
| Ficha | 3,6 / 4,9 | 3,1 / 4,1 | 3,7 / 5,2 |
| Menú o productos | 3,3 / 4,9 | 2,7 / 3,6 | 3,3 / 5,1 |
| Reseñas | 3,5 / 5,0 | 2,8 / 3,8 | 3,4 / 5,2 |

### Recursos (contenedores de Docker, muestreados cada 3 s)

| Usuarios virtuales | Postgres: CPU promedio / máxima | API (PostgREST): CPU promedio / máxima | Memoria de Postgres |
|---|---|---|---|
| 10 | 11 % / 38 % | 1 % / 2 % | ~160 MB |
| 50 | 67 % / 206 % | 8 % / 61 % | ~159 MB |
| 100 | 133 % / 445 % | 26 % / 251 % | ~157 MB |

100 % equivale a un núcleo completo.

Los archivos originales están en `pruebas/carga/resultados/`: `perfil-*.json` y `recursos-*.txt`.

## Cuellos de botella encontrados

1. **La búsqueda por texto.** Es la única operación que se degrada con la carga, y la que más CPU consume en Postgres.
   - Medida sola, tarda entre 16 y 37 ms.
   - El plan de ejecución (`EXPLAIN ANALYZE`) muestra que unos 11 ms se van en recorrer los 2.500 productos. En cada uno se aplican las reglas de acceso (RLS) y se normaliza el nombre (quitar tildes y signos) en el momento.
   - El costo crece en proporción a la cantidad de productos.
   - Con 25.000 productos se esperaría unas 10 veces más tiempo por búsqueda. Es una estimación que no se midió.
2. **Las reseñas de la ficha se descargan todas, sin límite** (`listReviews`). Con 20 reseñas por negocio es rápido (5 ms). Un negocio con cientos de reseñas haría la ficha más pesada en datos y en tiempo.
3. **Calificación y conteos calculados en cada consulta.** La vista `businesses_public` calcula el promedio y el número de reseñas para cada fila. Hoy es barato, porque usa el índice `(business_id, user_id)`, pero se suma en los listados largos.

## Experimentos hechos (solo en la base local, ya revertidos)

- **Índices trigram (pg_trgm) sobre el texto normalizado:** no mejoraron nada. Con tablas de este tamaño, Postgres prefiere recorrerlas completas, y la consulta, tal como está escrita, no los aprovecha.
- **Reescribir la búsqueda para encontrar primero los ids:** bajó de unos 30 ms a unos 20 ms. Es una mejora modesta.
- **Guardar el nombre ya normalizado en una columna generada:** filtrar 2.500 productos pasó de 36,8 ms (primera ejecución) a 0,4–0,7 ms. Esta es la mejora con más impacto.

## Recomendaciones (en orden)

Ninguna está aplicada. Cada una va en su propia migración y necesita autorización.

1. **Columnas de búsqueda precalculadas.** `nombre_busqueda` en productos y negocios, como `generated always as (normalizar(name)) stored`. `buscar_negocios()` filtraría por esas columnas. Cuando haya miles de negocios, se suma un índice trigram sobre ellas.
2. **Paginar las reseñas de la ficha** (por ejemplo, 20 y un botón «Ver más»), como ya se hace con los negocios.
3. **Mantener la búsqueda con espera de 300 ms y un mínimo de 2 letras**, como ya hace la app. Así se evita una consulta por cada letra.
4. **Medir de nuevo en un proyecto de Supabase de pruebas** (Paso 9 del plan de infraestructura) antes del lanzamiento. El servidor de Supabase tiene mucha menos CPU que este computador, así que los tiempos allá serán mayores.

## Lo que estas pruebas NO dicen

- **No dicen cuántas personas aguanta la app en producción.** Se midió en un computador de 16 núcleos sin red de por medio. El plan de Supabase contratado tiene otros límites de CPU, conexiones y ancho de banda.
- **No se midió:** el inicio de sesión, la subida de fotos y videos, ni la descarga de imágenes y videos desde Storage.
- **Lo que sí se puede afirmar:**
  - Con 100 usuarios simultáneos haciendo el recorrido completo, en este entorno no hubo errores.
  - Todas las operaciones salvo la búsqueda se mantuvieron por debajo de 35 ms en el p95.
  - La búsqueda llegó a 288 ms en el p95.

## Cómo repetirlas

```powershell
# 1. Supabase local (Docker Desktop abierto)
npx supabase start -x edge-runtime,studio,mailpit,logflare,vector,supavisor,imgproxy,realtime

# 2. Datos de prueba (solo la primera vez)
docker cp pruebas\carga\semilla.sql supabase_db_zipa-lo-tiene:/tmp/semilla.sql
docker exec supabase_db_zipa-lo-tiene psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/semilla.sql

# 3. Un perfil (10, 50 o 100)
$st = npx supabase status -o json | ConvertFrom-Json
docker run --rm -v "${PWD}\pruebas\carga:/carga" -e BASE_URL=http://host.docker.internal:54321 `
  -e ANON_KEY=$($st.ANON_KEY) -e PERFIL=50 grafana/k6:1.3.0 run /carga/zipa.js
```

Los perfiles de 250 y 500 usuarios están preparados, pero exigen `-e CONFIRMAR_ALTO=si` y no se ejecutaron.

Al terminar se puede borrar la semilla con `npx supabase db reset --local`.
