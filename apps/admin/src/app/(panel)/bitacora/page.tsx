import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { fecha } from '@/lib/format';

const ACCION: Record<string, string> = {
  publicar_negocio: 'Publicó un negocio',
  cambiar_estado_ciudad: 'Cambió el estado de una ciudad',
  eliminar_negocio: 'Eliminó un negocio',
  rechazar_negocio: 'No aprobó un negocio',
  borrar_resena: 'Borró una reseña',
  reporte_revisado: 'Marcó un reporte como revisado',
  reporte_descartado: 'Descartó un reporte',
  aprobar_video: 'Aprobó un video',
  rechazar_video: 'No aprobó un video',
  publicar_resena: 'Publicó una reseña en espera',
  rechazar_resena: 'No publicó una reseña en espera',
};

export default async function Bitacora() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('admin_actions')
    .select('id, admin_id, action, target_type, target_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  // admin_id apunta a auth.users (no a profiles): los nombres se buscan aparte.
  const adminIds = [...new Set((data ?? []).map((a) => a.admin_id).filter(Boolean))] as string[];
  const { data: perfiles } = adminIds.length ? await supabase.from('profiles').select('id, full_name').in('id', adminIds) : { data: [] };
  const nombre = (id: string | null) => perfiles?.find((p) => p.id === id)?.full_name ?? 'Cuenta eliminada';

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Bitácora</p>
          <h1>Quién hizo qué</h1>
          <p>Cada decisión del equipo queda registrada. Nadie puede editarla ni borrarla desde el panel.</p>
        </div>
      </div>
      {error && <p className="notice error">No pudimos cargar la bitácora.</p>}
      {data?.length === 0 ? (
        <div className="card"><p className="muted">Todavía no hay decisiones registradas.</p></div>
      ) : (
        <table>
          <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Detalle</th></tr></thead>
          <tbody>
            {data?.map((a) => {
              const d = (a.details ?? {}) as { nota?: string; motivo?: string };
              return (
                <tr key={a.id}>
                  <td className="small">{fecha(a.created_at)}</td>
                  <td>{nombre(a.admin_id)}</td>
                  <td>{ACCION[a.action] ?? a.action}</td>
                  <td className="small">
                    {a.target_type === 'business' && a.target_id ? <Link href={`/negocios/${a.target_id}`}>Ver negocio</Link> : null}
                    {d.nota && <div>Motivo: {d.nota}</div>}
                    {d.motivo && <div>Reporte: {d.motivo}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
