'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

/** Destacar un negocio publicado entre dos fechas (admin_destacar, migración 0017). */
export function Destacar({ negocios, hoy }: { negocios: { id: string; name: string }[]; hoy: string }) {
  const router = useRouter();
  const [negocio, setNegocio] = useState('');
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState('');
  const [orden, setOrden] = useState('100');
  const [nota, setNota] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    setOk('');
    const { error: err } = await supabaseBrowser().rpc('admin_destacar', {
      p_business: negocio, p_desde: desde, p_hasta: hasta, p_orden: Number(orden) || 100, p_nota: nota || null,
    });
    setCargando(false);
    if (err) return setError(err.message);
    setOk(`Listo: ${negocios.find((n) => n.id === negocio)?.name ?? 'el negocio'} queda destacado del ${desde} al ${hasta}.`);
    setNegocio('');
    setHasta('');
    setNota('');
    router.refresh();
  };

  return (
    <form className="card stack" onSubmit={enviar} style={{ marginBottom: 24 }}>
      <h2>Destacar un negocio</h2>
      <div className="inline-form">
        <label>Negocio publicado
          <select value={negocio} onChange={(e) => setNegocio(e.target.value)} required style={{ font: 'inherit', padding: '9px 12px', borderRadius: 12, border: '1.5px solid var(--input)', minWidth: 240 }}>
            <option value="">Elige un negocio…</option>
            {negocios.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </label>
        <label>Desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required /></label>
        <label>Hasta (incluido) <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} required /></label>
        <label>Orden <input value={orden} onChange={(e) => setOrden(e.target.value.replace(/\D/g, ''))} inputMode="numeric" style={{ width: 70 }} /></label>
        <label style={{ flex: 1, minWidth: 220 }}>Nota interna (plan, pago…) <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder="Ej: Plan mensual, pagó el 16/11" /></label>
        <button className="btn primary" disabled={cargando}>{cargando ? 'Guardando…' : 'Destacar'}</button>
      </div>
      <p className="small muted">Orden: el número más bajo aparece primero. La nota solo la ve el equipo.</p>
      {!!error && <p className="notice error small" role="alert">{error}</p>}
      {!!ok && <p className="notice ok small" role="status">{ok}</p>}
    </form>
  );
}

/** Quitar un destacado: si ya empezó, termina ahora; si está programado, se borra. */
export function Quitar({ id, programado }: { id: string; programado: boolean }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <button
        className="btn danger"
        disabled={cargando}
        onClick={async () => {
          if (!confirm(programado ? '¿Cancelar este destacado programado?' : '¿Quitarlo del inicio desde ahora?')) return;
          setCargando(true);
          const { error: err } = await supabaseBrowser().rpc('admin_quitar_destacado', { p_id: id });
          setCargando(false);
          if (err) return setError(err.message);
          router.refresh();
        }}>
        {cargando ? 'Quitando…' : programado ? 'Cancelar' : 'Quitar'}
      </button>
      {!!error && <p className="notice error small" role="alert">{error}</p>}
    </>
  );
}
