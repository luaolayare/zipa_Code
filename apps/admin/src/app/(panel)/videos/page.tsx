import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { ESTADO, fecha, pesos } from '@/lib/format';

import { VideoReview } from '../VideoReview';

export default async function Videos() {
  const { supabase } = await requireAdmin();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price_cop, photo_url, video_path, video_status, video_note, updated_at, business:businesses(id, name, status)')
    .eq('video_status', 'pendiente')
    .order('updated_at', { ascending: true })
    .limit(100);

  const urls = Object.fromEntries(
    await Promise.all((products ?? []).map(async (p) => [p.id, (await supabase.storage.from('videos').createSignedUrl(p.video_path!, 600)).data?.signedUrl ?? null] as const)),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Videos</p>
          <h1>Videos por revisar</h1>
          <p>Cuando apruebas un video, los clientes lo ven en la página del producto. Si no lo apruebas, el negocio ve el motivo y puede grabar otro.</p>
        </div>
      </div>
      {error && <p className="notice error">No pudimos cargar los videos.</p>}
      {products?.length === 0 && <div className="card"><p className="muted">No hay videos pendientes.</p></div>}
      <div className="grid grid-2">
        {products?.map((p) => {
          const b = (Array.isArray(p.business) ? p.business[0] : p.business) as { id: string; name: string; status: string } | null;
          return (
            <article key={p.id} className="card stack">
              <div>
                <p className="overline">{b ? <Link href={`/negocios/${b.id}`}>{b.name}</Link> : 'Negocio'} · {ESTADO[b?.status ?? ''] ?? ''}</p>
                <h3>{p.name}</h3>
                <p className="small muted">{pesos(p.price_cop)} · subido {fecha(p.updated_at)}</p>
              </div>
              <VideoReview productId={p.id} url={urls[p.id]} status={p.video_status} note={p.video_note} />
            </article>
          );
        })}
      </div>
    </>
  );
}
