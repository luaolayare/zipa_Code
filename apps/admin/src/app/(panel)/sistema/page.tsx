import { requireAdmin } from '@/lib/auth';
import { bytes, numero } from '@/lib/format';

type Sistema = {
  tamano_base_bytes: number;
  conexiones: number;
  version_postgres: string;
  tablas: { tabla: string; filas_aprox: number; bytes: number }[];
  eventos_analitica: number;
  migraciones: number;
};

type Chequeo = { nombre: string; ok: boolean; ms: number | null; detalle: string };

/** Mide cuánto tarda una operación real y si respondió bien. */
async function medir(nombre: string, fn: () => Promise<{ ok: boolean; detalle?: string }>): Promise<Chequeo> {
  const t0 = performance.now();
  try {
    const r = await fn();
    return { nombre, ok: r.ok, ms: Math.round(performance.now() - t0), detalle: r.detalle ?? (r.ok ? 'Responde' : 'Error') };
  } catch (e) {
    return { nombre, ok: false, ms: null, detalle: e instanceof Error ? e.message : 'Sin respuesta' };
  }
}

/** Uso de la base (admin_sistema) y cuánto tardó en responder. */
async function medirSistema(supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase']) {
  const t0 = performance.now();
  const { data, error } = await supabase.rpc('admin_sistema');
  const chequeo: Chequeo = { nombre: 'Base de datos (consulta del panel)', ok: !error, ms: Math.round(performance.now() - t0), detalle: error?.message ?? 'Responde' };
  return { chequeo, data };
}

export const dynamic = 'force-dynamic';

export default async function SistemaPage() {
  const { supabase } = await requireAdmin();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // La consulta de uso de la base también sirve para medir su latencia.
  const { chequeo: base, data: sistemaData } = await medirSistema(supabase);
  const otros = await Promise.all([
    medir('API pública (búsqueda de negocios)', async () => {
      const { error } = await supabase.rpc('buscar_negocios', { p_limite: 1 });
      return { ok: !error, detalle: error?.message };
    }),
    medir('Autenticación', async () => {
      const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon }, cache: 'no-store' });
      return { ok: r.ok, detalle: r.ok ? 'Responde' : `HTTP ${r.status}` };
    }),
    medir('Almacenamiento de fotos', async () => {
      const { error } = await supabase.storage.from('productos').list('', { limit: 1 });
      return { ok: !error, detalle: error?.message };
    }),
  ]);
  const chequeos = [base, ...otros];
  const s = sistemaData as Sistema | null;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Plataforma</p>
          <h1>Sistema</h1>
          <p>Mediciones hechas ahora mismo desde el servidor del panel. Si un dato no se mide todavía, lo decimos.</p>
        </div>
      </div>

      <h2 className="section-title">Estado de los servicios</h2>
      <table style={{ marginBottom: 24 }}>
        <thead><tr><th>Servicio</th><th>Estado</th><th>Latencia</th><th>Detalle</th></tr></thead>
        <tbody>
          {chequeos.map((c) => (
            <tr key={c.nombre}>
              <td>{c.nombre}</td>
              <td><span className={`pill ${c.ok ? 'publicado' : 'rechazado'}`}>{c.ok ? 'Funciona' : 'Con problemas'}</span></td>
              <td>{c.ms == null ? '—' : `${c.ms} ms`}</td>
              <td className="small muted">{c.detalle}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted" style={{ marginBottom: 24 }}>La latencia incluye el viaje entre el servidor del panel y Supabase; desde un celular puede ser distinta.</p>

      <h2 className="section-title">Uso de recursos</h2>
      {s ? (
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <div className="card"><p className="stat-number">{bytes(s.tamano_base_bytes)}</p><p className="stat-label">Tamaño de la base de datos</p></div>
          <div className="card"><p className="stat-number">{numero(s.conexiones)}</p><p className="stat-label">Conexiones abiertas ahora</p></div>
          <div className="card"><p className="stat-number">{numero(s.eventos_analitica)}</p><p className="stat-label">Eventos de analítica guardados</p></div>
          <div className="card"><p className="stat-number">{numero(s.migraciones)}</p><p className="stat-label">Migraciones aplicadas · PostgreSQL {s.version_postgres}</p></div>
        </div>
      ) : (
        <p className="notice error">No pudimos medir la base de datos.</p>
      )}
      {s && (
        <div className="card stack" style={{ marginBottom: 24 }}>
          <h2>Tablas más grandes</h2>
          <table>
            <thead><tr><th>Tabla</th><th>Filas (aprox.)</th><th>Tamaño</th></tr></thead>
            <tbody>{s.tablas.map((t) => <tr key={t.tabla}><td>{t.tabla}</td><td>{t.filas_aprox < 0 ? 'Sin calcular' : numero(t.filas_aprox)}</td><td>{bytes(t.bytes)}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card stack">
          <h2>Errores de la aplicación</h2>
          <p className="pill borrador" style={{ alignSelf: 'flex-start' }}>No configurado</p>
          <p className="small muted">Las apps todavía no envían sus errores a un servicio de monitoreo. Para verlos aquí hace falta conectar uno (por ejemplo, Sentry), con su propia aprobación.</p>
        </div>
        <div className="card stack">
          <h2>Pruebas de carga</h2>
          <p className="pill borrador" style={{ alignSelf: 'flex-start' }}>Sin datos</p>
          <p className="small muted">Se preparan en la Entrega 4 y se ejecutan solo en un entorno aislado, nunca contra la base real. Sus resultados se documentarán en el repositorio.</p>
        </div>
      </div>
    </>
  );
}
