import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { MOTIVO, fecha } from '@/lib/format';

import { Resolver } from './Resolver';

const FILTROS: Record<string, string> = { pendiente: 'Pendientes', revisado: 'Revisados', descartado: 'Descartados' };
const QUE: Record<string, string> = { review: 'Reseña', business: 'Negocio', user: 'Usuario' };

export default async function Reportes({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado: e } = await searchParams;
  const estado = e && FILTROS[e] ? e : 'pendiente';
  const { supabase, role } = await requireAdmin();

  const { data: reports, error } = await supabase
    .from('reports')
    .select('*, reporter:profiles(full_name)')
    .eq('status', estado)
    .order('created_at', { ascending: estado === 'pendiente' })
    .limit(200);

  // Lo reportado, para verlo sin salir de la página.
  const ids = (t: string) => [...new Set((reports ?? []).filter((r) => r.target_type === t).map((r) => r.target_id as string))];
  const [{ data: reviews }, { data: negocios }, { data: personas }] = await Promise.all([
    ids('review').length ? supabase.from('reviews').select('id, text, stars, business_id, author:profiles(full_name), business:businesses(name)').in('id', ids('review')) : Promise.resolve({ data: [] as never[] }),
    ids('business').length ? supabase.from('businesses').select('id, name, status').in('id', ids('business')) : Promise.resolve({ data: [] as never[] }),
    ids('user').length ? supabase.from('profiles').select('id, full_name').in('id', ids('user')) : Promise.resolve({ data: [] as never[] }),
  ]);
  const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] : x);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Moderación</p>
          <h1>Reportes</h1>
          <p>Lo que los usuarios marcaron como ofensivo, falso o spam.{role === 'revisor' && ' Solo un administrador puede borrar reseñas.'}</p>
        </div>
        <nav className="tabs" aria-label="Filtrar por estado">
          {Object.entries(FILTROS).map(([k, v]) => <Link key={k} href={`/reportes?estado=${k}`} aria-current={k === estado ? 'true' : undefined}>{v}</Link>)}
        </nav>
      </div>
      {error && <p className="notice error">No pudimos cargar los reportes.</p>}
      {reports?.length === 0 && <div className="card"><p className="muted">No hay reportes {FILTROS[estado].toLowerCase()}.</p></div>}

      <div className="stack">
        {reports?.map((r) => {
          const review = reviews?.find((x) => x.id === r.target_id);
          const negocio = negocios?.find((x) => x.id === r.target_id);
          const persona = personas?.find((x) => x.id === r.target_id);
          const reporter = one(r.reporter) as { full_name: string } | null;
          return (
            <article className="card stack" key={r.id}>
              <div className="actions" style={{ justifyContent: 'space-between' }}>
                <div>
                  <p className="overline">{QUE[r.target_type]} · {MOTIVO[r.reason] ?? r.reason}</p>
                  <p className="small muted">Reportado por {reporter?.full_name ?? 'usuario'} · {fecha(r.created_at)}</p>
                </div>
                <span className={`pill ${r.status}`}>{FILTROS[r.status]?.replace(/s$/, '') ?? r.status}</span>
              </div>
              {r.details && <p>«{r.details}»</p>}

              {r.target_type === 'review' && (review ? (
                <div className="quote">
                  <p className="small muted">{(one(review.author) as { full_name: string } | null)?.full_name} en {(one(review.business) as { name: string } | null)?.name} · {'★'.repeat(review.stars)}</p>
                  <p>{review.text || <em className="muted">(sin texto)</em>}</p>
                </div>
              ) : <p className="muted small">La reseña ya no existe.</p>)}
              {r.target_type === 'business' && (negocio ? <p>Negocio: <Link href={`/negocios/${negocio.id}`}>{negocio.name}</Link></p> : <p className="muted small">El negocio ya no existe.</p>)}
              {r.target_type === 'user' && <p>Usuario: <strong>{persona?.full_name ?? 'ya no existe'}</strong></p>}

              {r.status === 'pendiente' && <Resolver reportId={r.id} puedeBorrar={role === 'admin' && r.target_type === 'review' && !!review} />}
            </article>
          );
        })}
      </div>
    </>
  );
}
