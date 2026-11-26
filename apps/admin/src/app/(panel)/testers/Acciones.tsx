'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

type Fila = { id: string; correo: string; apps: ('clientes' | 'negocios')[]; fecha: string; invitado: string | null };
type Filtro = 'pendientes' | 'todos';
type App = 'todas' | 'clientes' | 'negocios';

const NOMBRE = { clientes: 'LocalmenteTuyo', negocios: 'Negocios' } as const;

/** Tabla con filtros, «Copiar correos» (separados por coma, como los pide Play Console) y «Marcar como invitados». */
export function ListaTesters({ lista, puedeMarcar }: { lista: Fila[]; puedeMarcar: boolean }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [app, setApp] = useState<App>('todas');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  const visibles = useMemo(
    () => lista.filter((t) => (filtro === 'todos' || !t.invitado) && (app === 'todas' || t.apps.includes(app))),
    [lista, filtro, app],
  );

  const copiar = async () => {
    const texto = visibles.map((t) => t.correo).join(', ');
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(`Copiados ${visibles.length} correos.`);
    } catch {
      setAviso('No se pudo copiar automáticamente: selecciona la lista de abajo y cópiala.');
    }
  };

  const marcar = async () => {
    const ids = visibles.filter((t) => !t.invitado).map((t) => t.id);
    if (!ids.length) return;
    if (!window.confirm(`¿Marcar ${ids.length} personas como invitadas?\n\nHazlo después de agregarlas en Play Console y enviarles el correo.`)) return;
    setCargando(true);
    const { data, error } = await supabaseBrowser().rpc('admin_marcar_testers_invitados', { p_ids: ids });
    setCargando(false);
    if (error) return setAviso(error.message);
    setAviso(`Marcadas ${data ?? 0} como invitadas.`);
    router.refresh();
  };

  const selector = { font: 'inherit', padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--input)' } as const;
  return (
    <div className="stack">
      <div className="inline-form">
        <label>Mostrar{' '}
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} style={selector}>
            <option value="pendientes">Sin invitar</option>
            <option value="todos">Todos</option>
          </select>
        </label>
        <label>App{' '}
          <select value={app} onChange={(e) => setApp(e.target.value as App)} style={selector}>
            <option value="todas">Todas</option>
            <option value="clientes">LocalmenteTuyo (clientes)</option>
            <option value="negocios">LocalmenteTuyo Negocios</option>
          </select>
        </label>
        <button className="btn primary" type="button" onClick={copiar} disabled={!visibles.length}>Copiar {visibles.length} correos</button>
        {puedeMarcar && (
          <button className="btn" type="button" onClick={marcar} disabled={cargando || !visibles.some((t) => !t.invitado)}>
            {cargando ? 'Guardando…' : 'Marcar como invitados'}
          </button>
        )}
        {!!aviso && <span className="small" role="status">{aviso}</span>}
      </div>
      <textarea readOnly value={visibles.map((t) => t.correo).join(', ')} rows={3} aria-label="Correos separados por coma" style={{ width: '100%', font: 'inherit', fontSize: 14, padding: 10, borderRadius: 10, border: '1.5px solid var(--input)' }} />
      <table>
        <thead><tr><th>Correo</th><th>Quiere probar</th><th>Inscrito</th><th>Invitado</th></tr></thead>
        <tbody>
          {visibles.map((t) => (
            <tr key={t.id}>
              <td>{t.correo}</td>
              <td>{t.apps.map((a) => NOMBRE[a]).join(' y ')}</td>
              <td className="small">{t.fecha}</td>
              <td className="small">{t.invitado ?? <span className="pill en_revision">Pendiente</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
