'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Eliminar un negocio (Edge Function eliminar-negocio): solo admin con segundo factor. Pide escribir el
 * nombre exacto y un motivo; queda en la bitácora. Borra el negocio, sus productos, reseñas, reservas y
 * archivos. La cuenta del dueño no se borra.
 */
export function Eliminar({ businessId, name, productos, resenas, reservas }: { businessId: string; name: string; productos: number; resenas: number; reservas: number }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const eliminar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim() !== name) return setError('Escribe el nombre exacto del negocio para confirmar.');
    if (motivo.trim().length < 5) return setError('Escribe el motivo (mínimo 5 caracteres).');
    setCargando(true);
    setError('');
    const { data, error: err } = await supabaseBrowser().functions.invoke('eliminar-negocio', {
      body: { business_id: businessId, nombre: nombre.trim(), motivo: motivo.trim() },
    });
    setCargando(false);
    if (err) {
      let texto = 'No se pudo eliminar el negocio.';
      try {
        const body = await (err as { context?: Response }).context?.json();
        if (body?.error) texto = `${texto} (${body.error})`;
      } catch {}
      return setError(texto);
    }
    const aviso = (data as { aviso?: string } | null)?.aviso;
    router.push(`/negocios?estado=publicado&hecho=eliminado&nombre=${encodeURIComponent(name)}${aviso ? `&aviso=${encodeURIComponent(aviso)}` : ''}`);
    router.refresh();
  };

  if (!abierto) {
    return (
      <div className="card stack">
        <h3>Eliminar negocio</h3>
        <p className="small muted">Para negocios de prueba, duplicados o que no deben estar en la app. No se puede deshacer.</p>
        <button type="button" className="btn danger" onClick={() => setAbierto(true)}>Eliminar este negocio…</button>
      </div>
    );
  }

  return (
    <form className="card stack" onSubmit={eliminar} style={{ borderColor: 'var(--danger, #B42318)' }}>
      <h3>Eliminar «{name}»</h3>
      <p className="small">
        Se borrarán para siempre el negocio, sus {productos} {productos === 1 ? 'producto' : 'productos'}, {resenas} {resenas === 1 ? 'reseña' : 'reseñas'},{' '}
        {reservas} {reservas === 1 ? 'reserva' : 'reservas'}, su código QR y sus fotos y videos. La cuenta del dueño no se borra. Queda registrado en la bitácora.
      </p>
      <label>Motivo
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} placeholder="Ej: negocio de prueba" required />
      </label>
      <label>Escribe el nombre del negocio para confirmar: <strong>{name}</strong>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" required />
      </label>
      {!!error && <p className="notice error small" role="alert">{error}</p>}
      <div className="inline-form">
        <button className="btn danger" disabled={cargando || nombre.trim() !== name}>{cargando ? 'Eliminando…' : 'Eliminar para siempre'}</button>
        <button type="button" className="btn outline" onClick={() => { setAbierto(false); setError(''); }} disabled={cargando}>Cancelar</button>
      </div>
    </form>
  );
}
