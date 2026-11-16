import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { numero } from '@/lib/format';

type Metrics = { usuarios: number; resenas: number; reportes_pendientes: number; negocios_por_estado: Record<string, number> };
type Analitica = { cuentas_registradas: number; cuentas_activas_30d: number; activos_30d: number; activos_hoy: number; ultimo_evento: string | null };

export default async function Resumen() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: a }, { count: videos }, { count: resenas }] = await Promise.all([
    supabase.rpc('admin_metrics'),
    supabase.rpc('admin_analitica', { p_dias: 30 }),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('video_status', 'pendiente'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'en_espera'),
  ]);
  const m = data as Metrics | null;
  const an = a as Analitica | null;
  const estado = (k: string) => m?.negocios_por_estado?.[k] ?? 0;
  const registrados = Object.values(m?.negocios_por_estado ?? {}).reduce((s, n) => s + n, 0);
  const pendiente = (n: number, uno: string, varios: string) => `${n === 1 ? uno : varios} →`;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Resumen</p>
          <h1>Hola, equipo</h1>
          <p>Lo que está pendiente y cómo va la app. Todas las cifras son reales.</p>
        </div>
      </div>
      {error && <p className="notice error">No pudimos cargar las cifras.</p>}

      <h2 className="section-title">Pendientes</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <Link href="/negocios" className="card link">
          <p className="stat-number">{estado('en_revision')}</p>
          <p className="stat-label">{pendiente(estado('en_revision'), 'negocio por revisar', 'negocios por revisar')}</p>
        </Link>
        <Link href="/videos" className="card link">
          <p className="stat-number">{videos ?? 0}</p>
          <p className="stat-label">{pendiente(videos ?? 0, 'video por aprobar', 'videos por aprobar')}</p>
        </Link>
        <Link href="/resenas" className="card link">
          <p className="stat-number">{resenas ?? 0}</p>
          <p className="stat-label">{pendiente(resenas ?? 0, 'reseña en espera', 'reseñas en espera')}</p>
        </Link>
        <Link href="/reportes" className="card link">
          <p className="stat-number">{m?.reportes_pendientes ?? 0}</p>
          <p className="stat-label">{pendiente(m?.reportes_pendientes ?? 0, 'reporte abierto', 'reportes abiertos')}</p>
        </Link>
      </div>

      <h2 className="section-title">Personas</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card"><p className="stat-number">{numero(m?.usuarios)}</p><p className="stat-label">Cuentas registradas</p></div>
        <div className="card"><p className="stat-number">{numero(an?.cuentas_activas_30d)}</p><p className="stat-label">Cuentas que entraron en 30 días</p></div>
        <Link href="/analitica" className="card link"><p className="stat-number">{numero(an?.activos_30d)}</p><p className="stat-label">Dispositivos activos en 30 días →</p></Link>
        <Link href="/analitica" className="card link"><p className="stat-number">{numero(an?.activos_hoy)}</p><p className="stat-label">Dispositivos activos hoy →</p></Link>
      </div>
      <p className="small muted" style={{ marginBottom: 24 }}>
        «Registradas» son cuentas creadas. «Activos» son dispositivos que usaron la app de clientes (con o sin cuenta), contados de forma anónima.
        {!an?.ultimo_evento && ' Aún no hay datos de uso: se empiezan a contar con la versión nueva de la app.'}
      </p>

      <h2 className="section-title">Negocios</h2>
      <div className="grid grid-4">
        <div className="card"><p className="stat-number">{registrados}</p><p className="stat-label">Registrados</p></div>
        <div className="card"><p className="stat-number">{estado('publicado')}</p><p className="stat-label">Aprobados y publicados</p></div>
        <div className="card"><p className="stat-number">{estado('en_revision') + estado('borrador')}</p><p className="stat-label">Pendientes (en revisión o sin terminar)</p></div>
        <div className="card"><p className="stat-number">{estado('rechazado')}</p><p className="stat-label">No aprobados</p></div>
      </div>
    </>
  );
}
