import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { dia } from '@/lib/format';

import { Destacar, Quitar } from './Acciones';

type Destacado = {
  id: string;
  business_id: string;
  negocio: string;
  estado_negocio: string;
  starts_at: string;
  ends_at: string;
  position: number;
  note: string | null;
  estado: 'vigente' | 'programado' | 'vencido';
};

const ETIQUETA = { vigente: 'En el inicio', programado: 'Programado', vencido: 'Terminado' } as const;
const PILL = { vigente: 'publicado', programado: 'en_revision', vencido: 'borrador' } as const;

/** Fecha de Colombia (AAAA-MM-DD) de un instante. */
const diaBogota = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
/** El fin se guarda como el inicio del día siguiente: se muestra el último día incluido. */
const ultimoDia = (iso: string) => diaBogota(new Date(new Date(iso).getTime() - 1000).toISOString());

export default async function DestacadosPage() {
  const { supabase, role } = await requireAdmin();
  const [{ data, error }, { data: negocios }] = await Promise.all([
    supabase.rpc('admin_destacados'),
    supabase.from('businesses').select('id, name').eq('status', 'publicado').order('name').limit(500),
  ]);
  const lista = (data as Destacado[] | null) ?? [];
  const hoy = diaBogota(new Date().toISOString());

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Negocios</p>
          <h1>Destacados</h1>
          <p>Los negocios con suscripción que aparecen en la sección «Destacados» del inicio de la app de clientes, entre las fechas que definas. El cobro se maneja por fuera de la app.</p>
        </div>
      </div>
      {error && <p className="notice error">No pudimos cargar los destacados.</p>}
      {role === 'admin' ? (
        <Destacar negocios={negocios ?? []} hoy={hoy} />
      ) : (
        <p className="notice warn" style={{ marginBottom: 16 }}>Solo el rol administrador puede destacar negocios. Tú puedes consultarlos.</p>
      )}

      {lista.length === 0 ? (
        <div className="card"><p className="muted">Aún no hay negocios destacados. Mientras no haya ninguno vigente, la sección no aparece en la app.</p></div>
      ) : (
        <table>
          <thead><tr><th>Negocio</th><th>Desde</th><th>Hasta (incluido)</th><th>Orden</th><th>Nota interna</th><th>Estado</th>{role === 'admin' && <th><span className="sr-only">Acciones</span></th>}</tr></thead>
          <tbody>
            {lista.map((d) => (
              <tr key={d.id}>
                <td><Link href={`/negocios/${d.business_id}`}>{d.negocio}</Link>{d.estado_negocio !== 'publicado' && <div className="small muted">No está publicado: no se muestra</div>}</td>
                <td>{dia(diaBogota(d.starts_at))}</td>
                <td>{dia(ultimoDia(d.ends_at))}</td>
                <td>{d.position}</td>
                <td className="small">{d.note ?? '—'}</td>
                <td><span className={`pill ${PILL[d.estado]}`}>{ETIQUETA[d.estado]}</span></td>
                {role === 'admin' && <td>{d.estado !== 'vencido' && <Quitar id={d.id} programado={d.estado === 'programado'} />}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
