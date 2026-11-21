// Catálogo territorial de Colombia a partir de DIVIPOLA (DANE), conjunto «DIVIPOLA- Códigos municipios»
// de datos.gov.co (gdxc-w37w): código DANE, departamento, municipio y coordenadas de la cabecera.
//
// Uso (solo cuando el DANE publique cambios; el resultado se revisa y se sube a Git):
//   node packages/shared/scripts/generar-territorio.js <divipola.json>
// donde <divipola.json> se descarga de
//   https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=5000&$order=cod_mpio
//
// Escribe:
//   packages/shared/src/territorio/municipios.ts  (lo usan las apps: búsqueda y municipio más cercano sin red)
//   supabase/migrations/0023_municipios_dane.sql   (misma tabla en la base; NO reescribir una migración ya
//                                                    aplicada: si el DANE cambia, generar una migración nueva)
const fs = require('fs');
const path = require('path');

const origen = process.argv[2];
if (!origen) throw new Error('Falta la ruta del JSON de DIVIPOLA');
const filas = JSON.parse(fs.readFileSync(origen, 'utf8'));
if (filas.length < 1100) throw new Error(`Muy pocas filas (${filas.length}): revisa la descarga`);

const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en']);
function nombrePropio(t) {
  if (/^BOGOTÁ, D\.C\.$/.test(t)) return 'Bogotá, D. C.';
  return t
    .toLocaleLowerCase('es-CO')
    .split(/(\s+|-|\()/)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toLocaleUpperCase('es-CO') + p.slice(1)))
    .join('');
}
const num = (s) => Number(String(s).replace(',', '.'));
const TIPO = { Municipio: 'M', Isla: 'I', 'Área no municipalizada': 'A' };

const departamentos = {};
const municipios = filas.map((f) => {
  if (!/^\d{5}$/.test(f.cod_mpio) || !/^\d{2}$/.test(f.cod_dpto)) throw new Error(`Código raro: ${JSON.stringify(f)}`);
  const tipo = TIPO[f.tipo_municipio];
  if (!tipo) throw new Error(`Tipo desconocido: ${f.tipo_municipio}`);
  const lat = num(f.latitud);
  const lng = num(f.longitud);
  if (!(lat > -5 && lat < 14 && lng > -82 && lng < -66)) throw new Error(`Coordenadas fuera de Colombia: ${f.cod_mpio}`);
  departamentos[f.cod_dpto] = nombrePropio(f.dpto);
  return [f.cod_mpio, nombrePropio(f.nom_mpio), f.cod_dpto, Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5, tipo];
});
municipios.sort((a, b) => a[0].localeCompare(b[0]));

const raiz = path.resolve(__dirname, '../../..');
const ts = `// GENERADO por packages/shared/scripts/generar-territorio.js a partir de DIVIPOLA (DANE, datos.gov.co
// gdxc-w37w). No editar a mano. ${municipios.length} municipios y áreas no municipalizadas.
// [código DANE, nombre, código del departamento, latitud y longitud de la cabecera, tipo: M municipio,
// I isla, A área no municipalizada]

export const DEPARTAMENTOS: Record<string, string> = ${JSON.stringify(departamentos, null, 2)};

export type MunicipioFila = readonly [codigo: string, nombre: string, departamento: string, latitud: number, longitud: number, tipo: 'M' | 'I' | 'A'];

export const MUNICIPIOS: readonly MunicipioFila[] = [
${municipios.map((m) => `  ${JSON.stringify(m)},`).join('\n')}
];
`;
fs.mkdirSync(path.join(raiz, 'packages/shared/src/territorio'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'packages/shared/src/territorio/municipios.ts'), ts);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = `-- LocalmenteTuyo: catálogo territorial de Colombia (DIVIPOLA del DANE, datos.gov.co gdxc-w37w).
-- GENERADO por packages/shared/scripts/generar-territorio.js; las apps usan la misma lista
-- (packages/shared/src/territorio/municipios.ts). Migración solo aditiva.
-- Si el DANE publica cambios: generar de nuevo y aplicar las diferencias en una migración NUEVA.

create table public.departamentos (
  codigo text primary key check (codigo ~ '^[0-9]{2}$'),
  nombre text not null
);

create table public.municipios (
  codigo text primary key check (codigo ~ '^[0-9]{5}$'), -- código DANE (DIVIPOLA), estable
  nombre text not null,
  departamento_codigo text not null references public.departamentos (codigo),
  latitud numeric(8,5) not null,   -- cabecera municipal
  longitud numeric(8,5) not null,
  tipo text not null check (tipo in ('M', 'I', 'A')), -- municipio, isla, área no municipalizada
  nombre_busqueda text generated always as (public.normalizar(nombre)) stored
);
create index municipios_busqueda_idx on public.municipios (nombre_busqueda);
create index municipios_departamento_idx on public.municipios (departamento_codigo);

-- Datos públicos de solo lectura: nadie los cambia desde la API.
alter table public.departamentos enable row level security;
alter table public.municipios enable row level security;
create policy "departamentos visibles" on public.departamentos for select using (true);
create policy "municipios visibles" on public.municipios for select using (true);
revoke insert, update, delete on public.departamentos, public.municipios from anon, authenticated;
grant select on public.departamentos, public.municipios to anon, authenticated;

insert into public.departamentos (codigo, nombre) values
${Object.entries(departamentos).sort().map(([c, n]) => `  (${q(c)}, ${q(n)})`).join(',\n')};

insert into public.municipios (codigo, nombre, departamento_codigo, latitud, longitud, tipo) values
${municipios.map((m) => `  (${q(m[0])}, ${q(m[1])}, ${q(m[2])}, ${m[3]}, ${m[4]}, ${q(m[5])})`).join(',\n')};
`;
fs.writeFileSync(path.join(raiz, 'supabase/migrations/0023_municipios_dane.sql'), sql);
console.log(`${municipios.length} municipios, ${Object.keys(departamentos).length} departamentos`);
