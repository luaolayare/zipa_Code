import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { dia, fecha, numero } from '@/lib/format';

type Fila = { id: string; nombre: string; vistas: number; whatsapp?: number; como_llegar?: number; negocio?: string };
type Analitica = {
  dias: number;
  cuentas_registradas: number;
  cuentas_activas_30d: number;
  activos_15min: number;
  activos_hoy: number;
  activos_7d: number;
  activos_30d: number;
  totales: Record<string, number>;
  busquedas_sin_resultados: number;
  serie: { dia: string; activos: number; aperturas: number; sesiones: number }[];
  top_categorias: Fila[];
  top_negocios: Fila[];
  top_productos: Fila[];
  top_busquedas: { termino: string; veces: number; dispositivos: number }[];
  ultimo_evento: string | null;
};

const PERIODOS = [7, 30, 90];

export default async function AnaliticaPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias: d } = await searchParams;
  const dias = PERIODOS.includes(Number(d)) ? Number(d) : 30;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc('admin_analitica', { p_dias: dias });
  const a = data as Analitica | null;
  const t = (k: string) => a?.totales?.[k] ?? 0;
  const max = Math.max(1, ...(a?.serie ?? []).map((s) => s.activos));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Analítica</p>
          <h1>Cómo se usa la app</h1>
          <p>Datos anónimos de la app de clientes: no se guarda quién es la persona, solo un identificador aleatorio por dispositivo.</p>
        </div>
        <nav className="tabs" aria-label="Periodo">
          {PERIODOS.map((p) => (
            <Link key={p} href={`/analitica?dias=${p}`} aria-current={p === dias ? 'true' : undefined}>{p} días</Link>
          ))}
        </nav>
      </div>
      {error && <p className="notice error">No pudimos cargar la analítica.</p>}
      {a && !a.ultimo_evento && (
        <p className="notice warn" style={{ marginBottom: 16 }}>Sin datos todavía. Se empiezan a contar cuando las personas usen la versión nueva de la app de clientes.</p>
      )}

      {a && (
        <>
          <h2 className="section-title">Personas activas</h2>
          <div className="grid grid-4" style={{ marginBottom: 8 }}>
            <div className="card"><p className="stat-number">{numero(a.activos_15min)}</p><p className="stat-label">Con actividad en los últimos 15 minutos</p></div>
            <div className="card"><p className="stat-number">{numero(a.activos_hoy)}</p><p className="stat-label">Activos hoy (DAU)</p></div>
            <div className="card"><p className="stat-number">{numero(a.activos_7d)}</p><p className="stat-label">Activos en 7 días</p></div>
            <div className="card"><p className="stat-number">{numero(a.activos_30d)}</p><p className="stat-label">Activos en 30 días (MAU)</p></div>
          </div>
          <p className="small muted" style={{ marginBottom: 24 }}>
            Activos = dispositivos distintos que usaron la app. No es una conexión en tiempo real: «últimos 15 minutos» es una estimación.
            Cuentas registradas: {numero(a.cuentas_registradas)} · con inicio de sesión en 30 días: {numero(a.cuentas_activas_30d)}.
          </p>

          <h2 className="section-title">Actividad en {a.dias} días</h2>
          <div className="grid grid-4" style={{ marginBottom: 16 }}>
            <div className="card"><p className="stat-number">{numero(t('app_open'))}</p><p className="stat-label">Aperturas de la app</p></div>
            <div className="card"><p className="stat-number">{numero(t('session_start'))}</p><p className="stat-label">Sesiones</p></div>
            <div className="card"><p className="stat-number">{numero(t('search'))}</p><p className="stat-label">Búsquedas ({numero(a.busquedas_sin_resultados)} sin resultados)</p></div>
            <div className="card"><p className="stat-number">{numero(t('business_view'))}</p><p className="stat-label">Negocios consultados</p></div>
            <div className="card"><p className="stat-number">{numero(t('product_view'))}</p><p className="stat-label">Productos consultados</p></div>
            <div className="card"><p className="stat-number">{numero(t('category_view'))}</p><p className="stat-label">Categorías consultadas</p></div>
            <div className="card"><p className="stat-number">{numero(t('whatsapp_click'))}</p><p className="stat-label">Clics en WhatsApp</p></div>
            <div className="card"><p className="stat-number">{numero(t('maps_click'))}</p><p className="stat-label">Clics en «Cómo llegar»</p></div>
          </div>

          <div className="card stack" style={{ marginBottom: 24 }}>
            <h2>Dispositivos activos por día</h2>
            <div className="bars" role="img" aria-label={`Dispositivos activos por día en los últimos ${a.dias} días`}>
              {a.serie.map((s) => (
                <div key={s.dia} className="bar-col" title={`${dia(s.dia)}: ${s.activos} activos, ${s.sesiones} sesiones`}>
                  <div className="bar" style={{ height: `${(s.activos / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="bars-axis small muted">
              <span>{a.serie[0] ? dia(a.serie[0].dia) : ''}</span>
              <span>Máximo: {max} por día</span>
              <span>Hoy</span>
            </div>
          </div>

          <div className="grid grid-2">
            <Tabla titulo="Negocios más visitados" vacio="Aún no hay visitas." filas={a.top_negocios} columnas={[['Vistas', 'vistas'], ['WhatsApp', 'whatsapp'], ['Cómo llegar', 'como_llegar']]} enlace={(f) => `/negocios/${f.id}`} />
            <Tabla titulo="Productos más consultados" vacio="Aún no hay consultas." filas={a.top_productos} columnas={[['Vistas', 'vistas']]} detalle={(f) => f.negocio} />
            <Tabla titulo="Categorías más consultadas" vacio="Aún no hay consultas." filas={a.top_categorias} columnas={[['Vistas', 'vistas']]} />
            <div className="card stack">
              <h2>Búsquedas más comunes</h2>
              {a.top_busquedas.length === 0 ? (
                <p className="muted small">Sin datos. Por privacidad, solo aparecen búsquedas que hicieron al menos 3 dispositivos distintos.</p>
              ) : (
                <table>
                  <thead><tr><th>Búsqueda</th><th>Veces</th><th>Dispositivos</th></tr></thead>
                  <tbody>{a.top_busquedas.map((b) => <tr key={b.termino}><td>{b.termino}</td><td>{b.veces}</td><td>{b.dispositivos}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 16 }}>Último evento recibido: {a.ultimo_evento ? fecha(a.ultimo_evento) : 'ninguno'}.</p>
        </>
      )}
    </>
  );
}

function Tabla({ titulo, vacio, filas, columnas, enlace, detalle }: {
  titulo: string;
  vacio: string;
  filas: Fila[];
  columnas: [string, keyof Fila][];
  enlace?: (f: Fila) => string;
  detalle?: (f: Fila) => string | undefined;
}) {
  return (
    <div className="card stack">
      <h2>{titulo}</h2>
      {filas.length === 0 ? (
        <p className="muted small">{vacio}</p>
      ) : (
        <table>
          <thead><tr><th>Nombre</th>{columnas.map(([c]) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id}>
                <td>{enlace ? <Link href={enlace(f)}>{f.nombre}</Link> : f.nombre}{detalle?.(f) && <div className="small muted">{detalle(f)}</div>}</td>
                {columnas.map(([c, k]) => <td key={c}>{numero(f[k] as number | undefined)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
