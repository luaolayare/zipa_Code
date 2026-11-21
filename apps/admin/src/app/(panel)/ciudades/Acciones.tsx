'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

type Estado = 'activa' | 'en_preparacion' | 'proximamente';
const TEXTO: Record<Estado, string> = { activa: 'Activa', en_preparacion: 'En preparación', proximamente: 'Próximamente' };
const AVISO: Record<Estado, string> = {
  activa: 'Los clientes podrán explorar la ciudad y verán sus negocios publicados. Ningún negocio pendiente se aprueba con este cambio.',
  en_preparacion: 'Los clientes verán «Próxima apertura». Los comerciantes pueden dejar su interés o registrarse si el equipo los invitó.',
  proximamente: 'Los negocios de la ciudad dejan de verse en la app (no se borran). Los comerciantes solo pueden dejar su interés.',
};

/** Cambia el estado comercial de una ciudad (admin_cambiar_estado_ciudad, migración 0024; queda en la bitácora). */
export function CambiarEstado({ codigo, nombre, actual }: { codigo: string; nombre: string; actual: Estado }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(actual);
  const [nota, setNota] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estado === actual) return;
    if (!window.confirm(`¿Cambiar ${nombre} a «${TEXTO[estado]}»?\n\n${AVISO[estado]}`)) return;
    setCargando(true);
    setError('');
    const { error: err } = await supabaseBrowser().rpc('admin_cambiar_estado_ciudad', { p_municipio: codigo, p_estado: estado, p_nota: nota || null });
    setCargando(false);
    if (err) return setError(err.message);
    setNota('');
    router.refresh();
  };

  return (
    <form className="inline-form" onSubmit={guardar}>
      <label className="sr-only" htmlFor={`estado-${codigo}`}>Estado de {nombre}</label>
      <select id={`estado-${codigo}`} value={estado} onChange={(e) => setEstado(e.target.value as Estado)} style={{ font: 'inherit', padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--input)' }}>
        {(Object.keys(TEXTO) as Estado[]).map((k) => <option key={k} value={k}>{TEXTO[k]}</option>)}
      </select>
      <label className="sr-only" htmlFor={`nota-${codigo}`}>Nota del cambio</label>
      <input id={`nota-${codigo}`} value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder="Nota (opcional)" style={{ minWidth: 140 }} />
      <button className="btn primary" disabled={cargando || estado === actual}>{cargando ? 'Guardando…' : 'Cambiar'}</button>
      {!!error && <span className="small" role="alert" style={{ color: 'var(--danger, #B42318)' }}>{error}</span>}
    </form>
  );
}
