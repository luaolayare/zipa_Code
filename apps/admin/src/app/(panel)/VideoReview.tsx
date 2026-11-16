'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

const ESTADO: Record<string, string> = { pendiente: 'Video en revisión', aprobado: 'Video aprobado', rechazado: 'Video no aprobado' };

/** Video de un producto con los botones para aprobarlo o no (función admin_revisar_video, 0011). */
export function VideoReview({ productId, url, status, note }: { productId: string; url: string | null; status: string | null; note: string | null }) {
  const router = useRouter();
  const [rechazando, setRechazando] = useState(false);
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const decidir = async (decision: 'aprobado' | 'rechazado') => {
    setLoading(decision);
    setError('');
    const { error: err } = await supabaseBrowser().rpc('admin_revisar_video', { p_product: productId, p_decision: decision, p_nota: decision === 'rechazado' ? nota : null });
    setLoading('');
    if (err) return setError(err.message);
    setRechazando(false);
    setNota('');
    router.refresh();
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      {url ? (
        <video src={url} controls muted playsInline preload="metadata" style={{ width: '100%', borderRadius: 12, background: '#14211f', aspectRatio: '9 / 16', maxHeight: 360, objectFit: 'contain' }} />
      ) : (
        <p className="small muted">No se pudo cargar el video.</p>
      )}
      <span className={`pill ${status === 'aprobado' ? 'publicado' : status === 'rechazado' ? 'rechazado' : 'pendiente'}`} style={{ alignSelf: 'flex-start' }}>{ESTADO[status ?? 'pendiente']}</span>
      {status === 'rechazado' && note && <p className="small">Motivo: {note}</p>}
      {!rechazando ? (
        <div className="actions">
          {status !== 'aprobado' && <button className="btn primary" onClick={() => decidir('aprobado')} disabled={!!loading}>{loading === 'aprobado' ? 'Aprobando…' : 'Aprobar video'}</button>}
          {status !== 'rechazado' && <button className="btn danger" onClick={() => setRechazando(true)} disabled={!!loading}>No aprobar</button>}
        </div>
      ) : (
        <>
          <textarea aria-label="Motivo (lo verá el negocio)" value={nota} maxLength={300} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Se ve muy oscuro. Grábalo con luz de día y que se vea el producto completo." style={{ minHeight: 80 }} />
          <div className="actions">
            <button className="btn danger" onClick={() => decidir('rechazado')} disabled={!!loading}>{loading === 'rechazado' ? 'Guardando…' : 'No aprobar'}</button>
            <button className="btn outline" onClick={() => { setRechazando(false); setError(''); }} disabled={!!loading}>Cancelar</button>
          </div>
        </>
      )}
      {!!error && <p className="notice error small" role="alert">{error}</p>}
    </div>
  );
}
