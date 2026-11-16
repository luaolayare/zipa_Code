import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { ESTADO, TIPO, clasificacion, fecha } from '@/lib/format';

const FILTROS = ['en_revision', 'publicado', 'rechazado', 'borrador'] as const;

export default async function Negocios({ searchParams }: { searchParams: Promise<{ estado?: string; hecho?: string; nombre?: string }> }) {
  const { estado: e, hecho, nombre } = await searchParams;
  const estado = (FILTROS as readonly string[]).includes(e ?? '') ? e! : 'en_revision';
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, category, type, address, status, created_at, owner:profiles!businesses_owner_id_fkey(full_name), subcategory:categories!businesses_subcategory_id_fkey(name, parent_id)')
    .eq('status', estado)
    .order('created_at', { ascending: estado !== 'en_revision' ? false : true }) // en revisión: el más antiguo primero
    .limit(200);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Negocios</p>
          <h1>{ESTADO[estado]}</h1>
          <p>{estado === 'en_revision' ? 'Revisa los datos y la foto del local, y decide si se publica.' : 'Negocios en este estado.'}</p>
        </div>
        <nav className="tabs" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <Link key={f} href={`/negocios?estado=${f}`} aria-current={f === estado ? 'true' : undefined}>{ESTADO[f]}</Link>
          ))}
        </nav>
      </div>
      {hecho === 'publicado' && <p className="notice ok" role="status" style={{ marginBottom: 16 }}>«{nombre}» quedó publicado y ya aparece en la app de clientes.</p>}
      {hecho === 'rechazado' && <p className="notice warn" role="status" style={{ marginBottom: 16 }}>«{nombre}» no se aprobó. El negocio verá el motivo en su panel.</p>}
      {error && <p className="notice error">No pudimos cargar los negocios.</p>}
      {data?.length === 0 ? (
        <div className="card"><p className="muted">No hay negocios en este estado.</p></div>
      ) : (
        <table>
          <thead><tr><th>Negocio</th><th>Responsable</th><th>Categoría</th><th>Registrado</th><th>Estado</th></tr></thead>
          <tbody>
            {data?.map((b) => {
              const owner = (Array.isArray(b.owner) ? b.owner[0] : b.owner) as { full_name: string } | null;
              return (
                <tr key={b.id}>
                  <td><Link href={`/negocios/${b.id}`}>{b.name}</Link><div className="small muted">{b.address}</div></td>
                  <td>{owner?.full_name ?? '—'}</td>
                  <td>{clasificacion(b)}<div className="small muted">{TIPO[b.type]}</div></td>
                  <td className="small">{fecha(b.created_at)}</td>
                  <td><span className={`pill ${b.status}`}>{ESTADO[b.status]}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
