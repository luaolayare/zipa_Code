'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

/** Publicar o rechazar una reseña en espera (admin_moderar_resena, migración 0012). */
export function Moderar({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const run = async (decision: 'publicada' | 'rechazada') => {
    setLoading(decision);
    setError('');
    const { error: err } = await supabaseBrowser().rpc('admin_moderar_resena', { p_review: reviewId, p_decision: decision });
    setLoading('');
    if (err) return setError(err.message);
    router.refresh();
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="actions">
        <button className="btn primary" onClick={() => run('publicada')} disabled={!!loading}>{loading === 'publicada' ? 'Publicando…' : 'Publicar'}</button>
        <button className="btn danger" onClick={() => run('rechazada')} disabled={!!loading}>{loading === 'rechazada' ? 'Guardando…' : 'No publicar'}</button>
      </div>
      {!!error && <p className="notice error small" role="alert">{error}</p>}
    </div>
  );
}
