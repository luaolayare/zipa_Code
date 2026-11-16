'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

/** Acciones sobre un reporte pendiente (función admin_resolver_reporte, migración 0010). */
export function Resolver({ reportId, puedeBorrar }: { reportId: string; puedeBorrar: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const run = async (estado: 'revisado' | 'descartado', borrar = false) => {
    if (borrar && !confirm('¿Borrar esta reseña? No se puede deshacer.')) return;
    setLoading(borrar ? 'borrar' : estado);
    setError('');
    const { error: err } = await supabaseBrowser().rpc('admin_resolver_reporte', { p_report: reportId, p_estado: estado, p_borrar_resena: borrar });
    setLoading('');
    if (err) return setError(err.message || 'No se pudo guardar.');
    router.refresh();
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="actions">
        {puedeBorrar && <button className="btn danger" onClick={() => run('revisado', true)} disabled={!!loading}>{loading === 'borrar' ? 'Borrando…' : 'Borrar reseña'}</button>}
        <button className="btn outline" onClick={() => run('revisado')} disabled={!!loading}>{loading === 'revisado' ? 'Guardando…' : 'Revisado, se queda'}</button>
        <button className="btn outline" onClick={() => run('descartado')} disabled={!!loading}>{loading === 'descartado' ? 'Guardando…' : 'Descartar reporte'}</button>
      </div>
      {!!error && <p className="notice error small" role="alert">{error}</p>}
    </div>
  );
}
