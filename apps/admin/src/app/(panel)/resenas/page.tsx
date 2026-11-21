import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { fecha } from '@/lib/format';

import { Moderar } from './Moderar';

export default async function Resenas() {
  const { supabase } = await requireAdmin();
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, stars, text, photo_url, visited, created_at, user_id, author:profiles(full_name), business:businesses(id, name)')
    .eq('status', 'en_espera')
    .order('created_at', { ascending: true })
    .limit(100);

  // Contexto para decidir: cuántas reseñas tiene cada autor en total.
  const autores = [...new Set((reviews ?? []).map((r) => r.user_id))];
  const { data: otras } = autores.length ? await supabase.from('reviews').select('user_id').in('user_id', autores) : { data: [] };
  const total = (uid: string) => otras?.filter((o) => o.user_id === uid).length ?? 0;
  const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] : x);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Moderación</p>
          <h1>Reseñas en espera</h1>
          <p>Reseñas bajas que llegaron en ráfaga a un mismo negocio (posible ataque de la competencia). No se ven ni cuentan hasta que decidas.</p>
        </div>
      </div>
      {error && <p className="notice error">No pudimos cargar las reseñas.</p>}
      {reviews?.length === 0 && <div className="card"><p className="muted">No hay reseñas en espera.</p></div>}
      <div className="grid grid-2">
        {reviews?.map((r) => {
          const b = one(r.business) as { id: string; name: string } | null;
          const a = one(r.author) as { full_name: string } | null;
          return (
            <article key={r.id} className="card stack">
              <div>
                <p className="overline">{b ? <Link href={`/negocios/${b.id}`}>{b.name}</Link> : 'Negocio'}</p>
                <h3>{'★'.repeat(r.stars)}<span className="muted">{'★'.repeat(5 - r.stars)}</span> · {a?.full_name ?? 'Usuario'}</h3>
                <p className="small muted">{fecha(r.created_at)} · {total(r.user_id)} {total(r.user_id) === 1 ? 'reseña en total' : 'reseñas en total'} · {r.visited ? 'Reseña con QR' : 'Sin QR'}</p>
              </div>
              {r.text ? <div className="quote"><p>{r.text}</p></div> : <p className="muted small">(sin texto)</p>}
              {r.photo_url && <img src={r.photo_url} alt="Foto de la reseña" className="photo" />}
              <Moderar reviewId={r.id} />
            </article>
          );
        })}
      </div>
    </>
  );
}
