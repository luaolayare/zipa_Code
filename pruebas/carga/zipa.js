// Prueba de carga de Zipa lo tiene con k6. Simula turistas usando la app de clientes: abren la app
// (categorías), buscan, entran a una categoría, abren un negocio (ficha, menú y reseñas).
//
// SOLO contra un entorno aislado (Supabase local en Docker con pruebas/carga/semilla.sql).
// El script se niega a correr contra cualquier otra dirección.
//
// Uso (desde la raíz del repositorio, con Docker):
//   docker run --rm -i -v "$PWD/pruebas/carga:/carga" -e BASE_URL=http://host.docker.internal:54321 \
//     -e ANON_KEY=<anon key local> -e PERFIL=10 grafana/k6:1.3.0 run /carga/zipa.js
// PERFIL: 10, 50 o 100 usuarios virtuales. 250 y 500 están preparados pero exigen CONFIRMAR_ALTO=si.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = __ENV.ANON_KEY;
const PERFIL = Number(__ENV.PERFIL || 10);
const DURACION = __ENV.DURACION || '60s';

// Seguridad: nunca contra el Supabase real o compartido.
const host = BASE_URL.replace(/^https?:\/\//, '').split(/[:/]/)[0];
if (!['127.0.0.1', 'localhost', 'host.docker.internal'].includes(host)) {
  throw new Error(`Solo se permiten pruebas contra un entorno local aislado. Dirección rechazada: ${host}`);
}
if (!ANON_KEY) throw new Error('Falta ANON_KEY (la clave anon de la base LOCAL).');
if (![10, 50, 100, 250, 500].includes(PERFIL)) throw new Error('PERFIL debe ser 10, 50, 100, 250 o 500.');
if (PERFIL > 100 && __ENV.CONFIRMAR_ALTO !== 'si') {
  throw new Error('Los perfiles de 250 y 500 usuarios están preparados pero no se ejecutan sin CONFIRMAR_ALTO=si.');
}

export const options = {
  scenarios: {
    turistas: { executor: 'constant-vus', vus: PERFIL, duration: DURACION, gracefulStop: '10s' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{tipo:busqueda}': ['p(95)<1500'],
    'http_req_duration{tipo:ficha}': ['p(95)<1000'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'max'],
};

const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' };
const TERMINOS = ['pizza', 'ajiaco', 'cafe', 'helado', 'arepa', 'parrilla', 'postre', 'mochila', 'zipa', 'limonada', 'empanada', 'paramo'];
const MAIN = ['emprendimientos', 'restaurantes'];

const tiempos = {
  categorias: new Trend('t_categorias', true),
  busqueda: new Trend('t_busqueda', true),
  listado: new Trend('t_listado_categoria', true),
  ficha: new Trend('t_ficha', true),
  productos: new Trend('t_productos_menu', true),
  resenas: new Trend('t_resenas', true),
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const get = (path, tipo) => http.get(`${BASE_URL}${path}`, { headers, tags: { tipo } });
const rpc = (fn, body, tipo) => http.post(`${BASE_URL}/rest/v1/rpc/${fn}`, JSON.stringify(body), { headers, tags: { tipo } });

export function setup() {
  const r = get('/rest/v1/businesses_public?select=id&limit=500', 'setup');
  const ids = r.json().map((b) => b.id);
  if (ids.length < 50) throw new Error(`Hay ${ids.length} negocios publicados. Carga primero pruebas/carga/semilla.sql en la base local.`);
  return { ids };
}

export default function ({ ids }) {
  group('abrir la app', () => {
    const r = get('/rest/v1/categories?select=id,parent_id,name,sort_order,active&order=sort_order', 'categorias');
    tiempos.categorias.add(r.timings.duration);
    check(r, { 'categorías 200': (x) => x.status === 200 });
  });
  sleep(1);

  group('buscar', () => {
    const r = rpc('buscar_negocios', { p_texto: pick(TERMINOS), p_limite: 30 }, 'busqueda');
    tiempos.busqueda.add(r.timings.duration);
    check(r, { 'búsqueda 200': (x) => x.status === 200 });
  });
  sleep(1);

  group('entrar a una categoría', () => {
    const r = rpc('buscar_negocios', { p_categoria: pick(MAIN), p_limite: 20 }, 'listado');
    tiempos.listado.add(r.timings.duration);
    check(r, { 'categoría 200': (x) => x.status === 200 });
  });
  sleep(1);

  group('abrir un negocio', () => {
    const id = pick(ids);
    const [ficha, productos, resenas] = http.batch([
      ['GET', `${BASE_URL}/rest/v1/businesses_public?select=*&id=eq.${id}`, null, { headers, tags: { tipo: 'ficha' } }],
      ['GET', `${BASE_URL}/rest/v1/products?select=*&business_id=eq.${id}&order=sort_order.asc,created_at.asc`, null, { headers, tags: { tipo: 'productos' } }],
      ['GET', `${BASE_URL}/rest/v1/reviews_public?select=*&business_id=eq.${id}&order=created_at.desc`, null, { headers, tags: { tipo: 'resenas' } }],
    ]);
    tiempos.ficha.add(ficha.timings.duration);
    tiempos.productos.add(productos.timings.duration);
    tiempos.resenas.add(resenas.timings.duration);
    check(ficha, { 'ficha 200': (x) => x.status === 200 });
    check(productos, { 'menú 200': (x) => x.status === 200 });
    check(resenas, { 'reseñas 200': (x) => x.status === 200 });
  });
  sleep(1 + Math.random() * 2);
}

// Resumen en JSON para el informe (docs/PRUEBAS_DE_CARGA.md).
export function handleSummary(data) {
  const m = (name, stat) => data.metrics[name]?.values?.[stat];
  const fila = (k) => ({ p50: m(`t_${k}`, 'med'), p95: m(`t_${k}`, 'p(95)'), max: m(`t_${k}`, 'max') });
  const resumen = {
    perfil_usuarios: PERFIL,
    duracion: DURACION,
    solicitudes: m('http_reqs', 'count'),
    solicitudes_por_segundo: m('http_reqs', 'rate'),
    tasa_errores: m('http_req_failed', 'rate'),
    latencia_general: { p50: m('http_req_duration', 'med'), p95: m('http_req_duration', 'p(95)') },
    por_operacion: {
      categorias: fila('categorias'),
      busqueda: fila('busqueda'),
      listado_categoria: fila('listado_categoria'),
      ficha: fila('ficha'),
      productos_menu: fila('productos_menu'),
      resenas: fila('resenas'),
    },
  };
  return { [`/carga/resultados/perfil-${PERFIL}.json`]: JSON.stringify(resumen, null, 2), stdout: JSON.stringify(resumen) + '\n' };
}
