import { requireAdmin } from '@/lib/auth';
import { fecha } from '@/lib/format';

import { ListaTesters } from './Acciones';

export type SolicitudTester = { id: string; correo: string; apps: ('clientes' | 'negocios')[]; invitado_en: string | null; created_at: string };

/** Personas que se inscribieron como testers en localmentetuyo.com (migración 0026). */
export default async function TestersPage() {
  const { supabase, role } = await requireAdmin();
  const { data, error } = await supabase.rpc('admin_testers');
  const lista = (data as SolicitudTester[] | null) ?? [];
  const pendientes = lista.filter((t) => !t.invitado_en);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Google Play</p>
          <h1>Testers</h1>
          <p>
            Correos que dejaron en «Sé tester» de la web. Para invitarlos: copia los correos, pégalos en la lista de testers de la
            prueba cerrada de cada app en Play Console (Prueba → Prueba cerrada → Testers), envíales el correo con los enlaces y
            márcalos como invitados. Se borran solos a los 12 meses.
          </p>
        </div>
      </div>
      {error && <p className="notice error">No pudimos cargar la lista.</p>}
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          {lista.length} inscritos · {pendientes.length} sin invitar ·
          {' '}{lista.filter((t) => t.apps.includes('clientes')).length} para LocalmenteTuyo ·
          {' '}{lista.filter((t) => t.apps.includes('negocios')).length} para Negocios
        </p>
      </div>
      {lista.length === 0 ? (
        <div className="card"><p className="muted">Todavía nadie se ha inscrito desde la web.</p></div>
      ) : (
        <ListaTesters lista={lista.map((t) => ({ ...t, fecha: fecha(t.created_at), invitado: t.invitado_en ? fecha(t.invitado_en) : null }))} puedeMarcar={role === 'admin'} />
      )}
    </>
  );
}
