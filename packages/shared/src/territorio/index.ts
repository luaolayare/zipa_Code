// Catálogo territorial (DIVIPOLA del DANE) y estado comercial de cada ciudad.
// Las apps buscan municipios y calculan el más cercano aquí mismo, sin enviar coordenadas a ningún lado.
import { DEPARTAMENTOS, MUNICIPIOS, type MunicipioFila } from './municipios';

export { DEPARTAMENTOS };

/** Código DANE de Zipaquirá (Cundinamarca): la primera ciudad activa. */
export const ZIPAQUIRA = '25899';

export interface Municipio {
  codigo: string; // código DANE (5 dígitos), estable
  nombre: string;
  departamentoCodigo: string;
  departamento: string;
  latitud: number; // cabecera municipal
  longitud: number;
}

/**
 * Estado comercial de una ciudad. Solo se guardan las ciudades configuradas por el equipo; las demás
 * son «proximamente».
 * - activa: abierta al público (catálogo, reservas y reseñas).
 * - en_preparacion: el equipo está sumando negocios; los clientes ven «próxima apertura».
 * - proximamente: todavía no abre.
 */
export type EstadoCiudad = 'activa' | 'en_preparacion' | 'proximamente';
export const ESTADOS_CIUDAD: readonly EstadoCiudad[] = ['activa', 'en_preparacion', 'proximamente'];
export const ESTADO_CIUDAD_TEXTO: Record<EstadoCiudad, string> = {
  activa: 'Activa',
  en_preparacion: 'En preparación',
  proximamente: 'Próximamente',
};

const desdeFila = (f: MunicipioFila): Municipio => ({
  codigo: f[0],
  nombre: f[1],
  departamentoCodigo: f[2],
  departamento: DEPARTAMENTOS[f[2]] ?? '',
  latitud: f[3],
  longitud: f[4],
});

const POR_CODIGO = new Map(MUNICIPIOS.map((f) => [f[0], f]));

/** Municipio por su código DANE (null si no existe). */
export function municipio(codigo: string | null | undefined): Municipio | null {
  const f = codigo ? POR_CODIGO.get(codigo) : undefined;
  return f ? desdeFila(f) : null;
}

/** Igual que normalizar() de la base: minúsculas, sin tildes y solo letras y números. */
export function normalizarTexto(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const INDICE = MUNICIPIOS.map((f) => ({ f, n: normalizarTexto(f[1]), d: normalizarTexto(DEPARTAMENTOS[f[2]] ?? '') }));

/**
 * Busca municipios por nombre (sin importar tildes ni mayúsculas). Primero los que empiezan por el texto,
 * luego los que lo contienen; las ciudades indicadas en `primero` (p. ej. las activas) van arriba.
 * «Armenia quindio» también sirve: las palabras que sobran se buscan en el departamento.
 */
export function buscarMunicipios(texto: string, limite = 20, primero: readonly string[] = []): Municipio[] {
  const q = normalizarTexto(texto);
  if (q.length < 2) return [];
  const palabras = q.split(' ');
  const puntaje = (x: (typeof INDICE)[number]): number => {
    if (x.n.startsWith(q)) return 0;
    if (x.n.split(' ').some((p) => p.startsWith(q))) return 1;
    if (x.n.includes(q)) return 2;
    // Nombre + departamento: «barbosa santander».
    const todo = `${x.n} ${x.d}`;
    return palabras.every((p) => todo.includes(p)) ? 3 : -1;
  };
  return INDICE.map((x) => ({ x, p: puntaje(x) }))
    .filter((r) => r.p >= 0)
    .sort((a, b) => Number(primero.includes(b.x.f[0])) - Number(primero.includes(a.x.f[0])) || a.p - b.p || a.x.n.localeCompare(b.x.n) || a.x.d.localeCompare(b.x.d))
    .slice(0, limite)
    .map((r) => desdeFila(r.x.f));
}

/** Distancia aproximada en kilómetros entre dos puntos (fórmula del haversine). */
export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/**
 * Municipio cuya cabecera está más cerca de un punto. Aproximación: sirve para sugerir la ciudad, no para
 * trazar límites exactos. Fuera de Colombia (más de 120 km de cualquier cabecera) devuelve null.
 */
export function municipioMasCercano(latitud: number, longitud: number): Municipio | null {
  let mejor: MunicipioFila | null = null;
  let d = Infinity;
  for (const f of MUNICIPIOS) {
    const x = distanciaKm(latitud, longitud, f[3], f[4]);
    if (x < d) { d = x; mejor = f; }
  }
  return mejor && d <= 120 ? desdeFila(mejor) : null;
}

/** «Zipaquirá, Cundinamarca» (Bogotá va sola: «Bogotá, D. C.»). */
export function etiquetaMunicipio(m: Pick<Municipio, 'nombre' | 'departamento'> | null): string {
  if (!m) return '';
  return m.departamento && m.departamento !== m.nombre ? `${m.nombre}, ${m.departamento}` : m.nombre;
}

/** Estado de una ciudad según la lista de ciudades configuradas (las no configuradas: próximamente). */
export function estadoDe(codigo: string | null | undefined, configuradas: ReadonlyMap<string, EstadoCiudad>): EstadoCiudad {
  return (codigo && configuradas.get(codigo)) || 'proximamente';
}

/**
 * Qué mostrar en el inicio de la app de clientes, en orden: ciudad no habilitada, error de conexión,
 * ciudad activa sin negocios o catálogo normal. Así un error nunca parece «no hay comercios».
 */
export type VistaCiudad = 'no_habilitada' | 'error' | 'sin_negocios' | 'catalogo' | 'cargando';
export function vistaCiudad(estado: EstadoCiudad, carga: 'cargando' | 'listo' | 'error', negocios: number): VistaCiudad {
  if (estado !== 'activa') return 'no_habilitada';
  if (carga === 'cargando') return 'cargando';
  if (carga === 'error') return 'error';
  return negocios === 0 ? 'sin_negocios' : 'catalogo';
}
