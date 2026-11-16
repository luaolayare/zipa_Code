import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';
import { ESTADO, TIPO, clasificacion, fecha, pesos } from '@/lib/format';

import { VideoReview } from '../../VideoReview';

import { Decision } from './Decision';

export default async function NegocioDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: b } = await supabase.from('businesses').select('*, owner:profiles(full_name), subcategory:categories!businesses_subcategory_id_fkey(name, parent_id)').eq('id', id).maybeSingle();
  if (!b) notFound();

  const [{ data: v }, { data: products }, { data: acciones }] = await Promise.all([
    supabase.from('business_verifications').select('*').eq('business_id', id).maybeSingle(),
    supabase.from('products').select('*').eq('business_id', id).order('created_at'),
    supabase.from('admin_actions').select('action, details, created_at').eq('target_id', id).order('created_at', { ascending: false }).limit(10),
  ]);

  // Enlaces firmados de 10 minutos: la foto del local y los videos son privados.
  const foto = v?.photo_path ? (await supabase.storage.from('verificaciones').createSignedUrl(v.photo_path, 600)).data?.signedUrl : null;
  const videos = Object.fromEntries(
    await Promise.all(
      (products ?? []).filter((p) => p.video_path).map(async (p) => [p.id, (await supabase.storage.from('videos').createSignedUrl(p.video_path, 600)).data?.signedUrl ?? null] as const),
    ),
  );
  const owner = (Array.isArray(b.owner) ? b.owner[0] : b.owner) as { full_name: string } | null;

  return (
    <>
      <p><Link href={`/negocios?estado=${b.status}`}>← Negocios</Link></p>
      <div className="page-head">
        <div>
          <p className="overline">{clasificacion(b)} · {TIPO[b.type]}</p>
          <h1>{b.name}</h1>
          <p>Registrado el {fecha(b.created_at)}</p>
        </div>
        <span className={`pill ${b.status}`}>{ESTADO[b.status]}</span>
      </div>

      <div className="detail">
        <div className="stack">
          <div className="card stack">
            <h2>Datos del negocio</h2>
            <dl className="facts">
              <dt>Responsable</dt><dd>{owner?.full_name ?? '—'}</dd>
              <dt>Dirección</dt><dd>{b.address}</dd>
              <dt>Horario</dt><dd>{b.hours ?? '—'}</dd>
              <dt>WhatsApp</dt><dd>{b.whatsapp ?? '—'}</dd>
              <dt>Cédula o NIT</dt><dd>{v?.id_number ?? 'No la envió'}</dd>
            </dl>
            {b.review_note && <div className="quote"><p className="overline">Motivo enviado</p><p>{b.review_note}</p></div>}
          </div>

          <div className="card stack">
            <h2>Productos ({products?.length ?? 0})</h2>
            {products?.length ? (
              <div className="products">
                {products.map((p) => (
                  <div className="product" key={p.id}>
                    {p.photo_url ? <img src={p.photo_url} alt={`Foto de ${p.name}`} /> : <div className="noimg">Sin foto</div>}
                    <div className="info">
                      <strong>{p.name}</strong>
                      <span className="small muted">{pesos(p.price_cop)}</span>
                      {p.description && <span className="small">{p.description}</span>}
                      {p.video_path ? <VideoReview productId={p.id} url={videos[p.id] ?? null} status={p.video_status} note={p.video_note} /> : <span className="small muted">Sin video</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No subió productos.</p>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card stack">
            <h2>Foto del local</h2>
            {foto ? (
              <a href={foto} target="_blank" rel="noreferrer"><img className="photo" src={foto} alt={`Foto del local de ${b.name}`} /></a>
            ) : (
              <p className="muted">{v?.photo_deleted_at ? `Se borró al revisarlo (${fecha(v.photo_deleted_at)}).` : 'No hay foto.'}</p>
            )}
            <p className="small muted">¿Se ve un negocio real que coincide con el nombre y la dirección?</p>
          </div>

          {b.status === 'en_revision' ? (
            <Decision businessId={b.id} name={b.name} pendingVideos={(products ?? []).filter((p) => p.video_status === 'pendiente').map((p) => p.id)} />
          ) : (
            <div className="card"><p className="muted">Solo se decide sobre negocios en revisión. Si el negocio cambia sus datos o los envía de nuevo, volverá a aparecer aquí.</p></div>
          )}

          {!!acciones?.length && (
            <div className="card stack">
              <h3>Historial</h3>
              {acciones.map((a, i) => (
                <p key={i} className="small"><strong>{a.action.replace('_', ' ')}</strong> · {fecha(a.created_at)}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
