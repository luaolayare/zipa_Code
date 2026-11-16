'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

export type Categoria = { id: string; parentId: string | null; name: string; sortOrder: number; active: boolean; usos: number };

/** Crear, renombrar, ordenar, activar, desactivar y borrar subcategorías (RPC de la migración 0013). */
export function Categorias({ lista, puedeEditar }: { lista: Categoria[]; puedeEditar: boolean }) {
  const principales = lista.filter((c) => !c.parentId);
  return (
    <div className="stack">
      {principales.map((p) => (
        <section key={p.id} className="card stack" aria-labelledby={`cat-${p.id}`}>
          <h2 id={`cat-${p.id}`}>{p.name}</h2>
          <table>
            <thead><tr><th>Subcategoría</th><th>Orden</th><th>Negocios</th><th>Estado</th>{puedeEditar && <th><span className="sr-only">Acciones</span></th>}</tr></thead>
            <tbody>
              {lista.filter((c) => c.parentId === p.id).sort((a, b) => a.sortOrder - b.sortOrder).map((c) => (
                <Fila key={c.id} c={c} puedeEditar={puedeEditar} />
              ))}
            </tbody>
          </table>
          {puedeEditar && <Nueva principal={p.id} />}
        </section>
      ))}
    </div>
  );
}

function useAccion() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn: string, args: Record<string, unknown>) => {
    setCargando(true);
    setError('');
    const { error: e } = await supabaseBrowser().rpc(fn, args);
    setCargando(false);
    if (e) {
      setError(e.message);
      return false;
    }
    router.refresh();
    return true;
  };
  return { run, cargando, error };
}

function Fila({ c, puedeEditar }: { c: Categoria; puedeEditar: boolean }) {
  const { run, cargando, error } = useAccion();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(c.name);
  const [orden, setOrden] = useState(String(c.sortOrder));

  if (editando) {
    return (
      <tr>
        <td colSpan={puedeEditar ? 5 : 4}>
          <form
            className="inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run('admin_guardar_categoria', { p_id: c.id, p_parent: null, p_nombre: nombre, p_orden: Number(orden) || 0, p_activa: null })) setEditando(false);
            }}>
            <label>Nombre <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} required /></label>
            <label>Orden <input value={orden} onChange={(e) => setOrden(e.target.value.replace(/\D/g, ''))} inputMode="numeric" style={{ width: 70 }} /></label>
            <button className="btn primary" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar'}</button>
            <button type="button" className="btn ghost" onClick={() => setEditando(false)}>Cancelar</button>
          </form>
          {!!error && <p className="notice error small" role="alert">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{c.name}<div className="small muted">{c.id}</div>{!!error && <p className="notice error small" role="alert">{error}</p>}</td>
      <td>{c.sortOrder}</td>
      <td>{c.usos}</td>
      <td><span className={`pill ${c.active ? 'publicado' : 'rechazado'}`}>{c.active ? 'Activa' : 'Desactivada'}</span></td>
      {puedeEditar && (
        <td>
          <div className="actions">
            <button className="btn ghost" onClick={() => setEditando(true)}>Editar</button>
            <button className="btn ghost" disabled={cargando} onClick={() => run('admin_guardar_categoria', { p_id: c.id, p_parent: null, p_nombre: c.name, p_orden: null, p_activa: !c.active })}>
              {c.active ? 'Desactivar' : 'Activar'}
            </button>
            {c.usos === 0 && (
              <button className="btn danger" disabled={cargando} onClick={() => confirm(`¿Borrar «${c.name}»? No tiene negocios.`) && run('admin_borrar_categoria', { p_id: c.id })}>
                Borrar
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

function Nueva({ principal }: { principal: string }) {
  const { run, cargando, error } = useAccion();
  const [nombre, setNombre] = useState('');
  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run('admin_guardar_categoria', { p_id: null, p_parent: principal, p_nombre: nombre, p_orden: 80, p_activa: true })) setNombre('');
      }}>
      <label>Nueva subcategoría <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Ej: Panaderías" required /></label>
      <button className="btn primary" disabled={cargando}>{cargando ? 'Creando…' : 'Crear'}</button>
      {!!error && <p className="notice error small" role="alert">{error}</p>}
    </form>
  );
}
