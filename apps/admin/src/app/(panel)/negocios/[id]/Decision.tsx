'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Aprobar o no aprobar un negocio en revisión. Lo hace la Edge Function revisar-negocio con la
 * sesión de quien decide: comprueba is_admin() (MFA incluido), cambia el estado, borra la foto
 * del local y deja constancia en la bitácora.
 */
export function Decision({ businessId, name, pendingVideos }: { businessId: string; name: string; pendingVideos: string[] }) {
  const router = useRouter();
  const [rechazando, setRechazando] = useState(false);
  const [conVideos, setConVideos] = useState(true); // aprobar también los videos pendientes
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState<'' | 'publicado' | 'rechazado'>('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const decidir = async (decision: 'publicado' | 'rechazado') => {
    if (decision === 'publicado' && !confirm(`¿Publicar «${name}»? Lo verán todos los turistas.`)) return;
    if (decision === 'rechazado' && nota.trim().length < 10) {
      return setMsg({ tipo: 'error', texto: 'Escribe al negocio por qué no se aprueba (mínimo 10 caracteres). Lo verá en su panel.' });
    }
    setLoading(decision);
    setMsg(null);
    const { data, error } = await supabaseBrowser().functions.invoke('revisar-negocio', {
      body: { business_id: businessId, decision, nota: decision === 'rechazado' ? nota.trim() : undefined },
    });
    setLoading('');
    if (error) {
      let texto = 'No se pudo guardar la decisión.';
      try {
        const body = await (error as { context?: Response }).context?.json();
        const detalle = body?.error ?? body?.message;
        if (detalle) texto = `${texto} (${detalle})`;
      } catch {}
      return setMsg({ tipo: 'error', texto });
    }
    void data;
    // Si así se eligió, se aprueban también sus videos pendientes (cada uno queda en la bitácora).
    if (decision === 'publicado' && conVideos) {
      for (const id of pendingVideos) await supabaseBrowser().rpc('admin_revisar_video', { p_product: id, p_decision: 'aprobado' });
    }
    // De vuelta a la fila de revisión, con el aviso de lo que se hizo.
    router.push(`/negocios?hecho=${decision}&nombre=${encodeURIComponent(name)}`);
    router.refresh();
  };

  return (
    <div className="card stack">
      <h2>Decisión</h2>
      <p className="muted small">Al decidir, la foto del local se borra (ya no se necesita). La cédula o NIT se conserva como soporte.</p>
      {!rechazando ? (
        <div className="actions">
          {pendingVideos.length > 0 && (
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600, width: '100%' }}>
              <input type="checkbox" checked={conVideos} onChange={(e) => setConVideos(e.target.checked)} style={{ width: 20, height: 20 }} />
              Aprobar también {pendingVideos.length === 1 ? 'su video' : `sus ${pendingVideos.length} videos`} (revísalos abajo)
            </label>
          )}
          <button className="btn primary" onClick={() => decidir('publicado')} disabled={!!loading}>{loading === 'publicado' ? 'Publicando…' : 'Aprobar y publicar'}</button>
          <button className="btn danger" onClick={() => setRechazando(true)} disabled={!!loading}>No aprobar</button>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="nota">Motivo (lo verá el negocio)</label>
            <textarea id="nota" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: La foto no muestra el local. Toma una foto donde se vea la fachada o el puesto y envíalo de nuevo." />
          </div>
          <div className="actions">
            <button className="btn danger" onClick={() => decidir('rechazado')} disabled={!!loading}>{loading === 'rechazado' ? 'Guardando…' : 'No aprobar'}</button>
            <button className="btn outline" onClick={() => { setRechazando(false); setMsg(null); }} disabled={!!loading}>Cancelar</button>
          </div>
        </>
      )}
      {msg && <p className={`notice ${msg.tipo}`} role={msg.tipo === 'error' ? 'alert' : 'status'}>{msg.texto}</p>}
    </div>
  );
}
