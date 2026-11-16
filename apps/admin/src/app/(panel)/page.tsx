import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';

type Metrics = { usuarios: number; resenas: number; reportes_pendientes: number; negocios_por_estado: Record<string, number> };

export default async function Resumen() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc('admin_metrics');
  const m = data as Metrics | null;
  const estado = (k: string) => m?.negocios_por_estado?.[k] ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Resumen</p>
          <h1>Hola, equipo</h1>
          <p>Lo que está pendiente y cómo va la app.</p>
        </div>
      </div>
      {error && <p className="notice error">No pudimos cargar las cifras.</p>}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Link href="/negocios" className="card link">
          <p className="overline">Por revisar</p>
          <p className="stat-number">{estado('en_revision')}</p>
          <p className="stat-label">{estado('en_revision') === 1 ? 'negocio espera' : 'negocios esperan'} tu revisión →</p>
        </Link>
        <Link href="/reportes" className="card link">
          <p className="overline">Reportes</p>
          <p className="stat-number">{m?.reportes_pendientes ?? 0}</p>
          <p className="stat-label">pendientes de revisar →</p>
        </Link>
      </div>
      <div className="grid grid-4">
        <div className="card"><p className="stat-number">{estado('publicado')}</p><p className="stat-label">Negocios publicados</p></div>
        <div className="card"><p className="stat-number">{estado('rechazado')}</p><p className="stat-label">No aprobados</p></div>
        <div className="card"><p className="stat-number">{m?.usuarios ?? 0}</p><p className="stat-label">Cuentas creadas</p></div>
        <div className="card"><p className="stat-number">{m?.resenas ?? 0}</p><p className="stat-label">Reseñas</p></div>
      </div>
    </>
  );
}
