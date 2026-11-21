import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { fecha } from '@/lib/format';

import { CambiarEstado } from './Acciones';

type Estado = 'activa' | 'en_preparacion' | 'proximamente';
type Ciudad = {
  codigo: string;
  nombre: string;
  departamento: string;
  estado: Estado;
  configurada: boolean;
  actualizado_en: string | null;
  publicados: number;
  en_revision: number;
  borradores: number;
  interesados: number;
};
type Interesado = {
  id: string;
  municipio_codigo: string;
  municipio: string;
  departamento: string;
  nombre_negocio: string;
  tipo: 'restaurante' | 'emprendimiento';
  nombre_contacto: string;
  whatsapp: string;
  created_at: string;
};

const TEXTO: Record<Estado, string> = { activa: 'Activa', en_preparacion: 'En preparación', proximamente: 'Próximamente' };
const PILL: Record<Estado, string> = { activa: 'publicado', en_preparacion: 'en_revision', proximamente: 'borrador' };

/** Igual que normalizar() de la base: minúsculas, sin tildes y solo letras y números. */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export default async function CiudadesPage({ searchParams }: { searchParams: Promise<{ buscar?: string; interesados?: string }> }) {
  const { buscar = '', interesados: filtro } = await searchParams;
  const { supabase, role } = await requireAdmin();
  const q = normalizar(buscar);
  const [{ data, error }, { data: intData }, { data: encontrados }] = await Promise.all([
    supabase.rpc('admin_ciudades'),
    supabase.rpc('admin_interesados', { p_municipio: filtro || null }),
    q.length >= 2
      ? supabase.from('municipios').select('codigo, nombre, departamento:departamentos(nombre)').like('nombre_busqueda', `%${q}%`).order('nombre').limit(15)
      : Promise.resolve({ data: [] as { codigo: string; nombre: string; departamento: { nombre: string } | { nombre: string }[] | null }[] }),
  ]);
  const ciudades = (data as Ciudad[] | null) ?? [];
  const interesados = (intData as Interesado[] | null) ?? [];
  const estadoDe = new Map(ciudades.map((c) => [c.codigo, c.estado]));
  const depto = (d: { nombre: string } | { nombre: string }[] | null) => (Array.isArray(d) ? d[0]?.nombre : d?.nombre) ?? '';

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Cobertura</p>
          <h1>Ciudades</h1>
          <p>
            Solo las ciudades activas muestran negocios en la app. Abrir una ciudad no aprueba negocios: cada uno se revisa en «Negocios».
            Cerrarla los oculta sin borrarlos. Cada cambio queda en la bitácora.
          </p>
        </div>
      </div>
      {error && <p className="notice error">No pudimos cargar las ciudades.</p>}
      {role !== 'admin' && <p className="notice warn" style={{ marginBottom: 16 }}>Solo el rol administrador puede cambiar el estado de una ciudad. Tú puedes consultarlas.</p>}

      <table>
        <thead>
          <tr><th>Ciudad</th><th>Estado</th><th>Publicados</th><th>En revisión</th><th>Sin terminar</th><th>Interesados</th>{role === 'admin' && <th>Cambiar estado</th>}</tr>
        </thead>
        <tbody>
          {ciudades.map((c) => (
            <tr key={c.codigo}>
              <td>
                <Link href={`/negocios?estado=publicado&municipio=${c.codigo}`}>{c.nombre}</Link>
                <div className="small muted">{c.departamento} · DANE {c.codigo}{c.actualizado_en ? ` · cambiado ${fecha(c.actualizado_en)}` : ''}</div>
              </td>
              <td><span className={`pill ${PILL[c.estado]}`}>{TEXTO[c.estado]}</span></td>
              <td>{c.publicados}{c.estado !== 'activa' && c.publicados > 0 && <div className="small muted">No se ven: ciudad cerrada</div>}</td>
              <td>{c.en_revision > 0 ? <Link href={`/negocios?estado=en_revision&municipio=${c.codigo}`}>{c.en_revision}</Link> : 0}</td>
              <td>{c.borradores}</td>
              <td>{c.interesados > 0 ? <Link href={`/ciudades?interesados=${c.codigo}#interesados`}>{c.interesados}</Link> : 0}</td>
              {role === 'admin' && <td><CambiarEstado codigo={c.codigo} nombre={c.nombre} actual={c.estado} /></td>}
            </tr>
          ))}
        </tbody>
      </table>

      {role === 'admin' && (
        <div className="card stack" style={{ marginTop: 24 }}>
          <h2>Configurar otra ciudad</h2>
          <form className="inline-form" method="get">
            <label style={{ flex: 1, minWidth: 220 }}>Municipio <input name="buscar" defaultValue={buscar} placeholder="Ej: Chía, Tunja, Armenia" /></label>
            <button className="btn">Buscar</button>
          </form>
          {q.length >= 2 && (encontrados ?? []).length === 0 && <p className="small muted">No encontramos ese municipio.</p>}
          {(encontrados ?? []).length > 0 && (
            <table>
              <thead><tr><th>Municipio</th><th>Estado</th><th>Cambiar estado</th></tr></thead>
              <tbody>
                {(encontrados ?? []).map((m) => {
                  const e = estadoDe.get(m.codigo) ?? 'proximamente';
                  return (
                    <tr key={m.codigo}>
                      <td>{m.nombre}<div className="small muted">{depto(m.departamento)} · DANE {m.codigo}</div></td>
                      <td><span className={`pill ${PILL[e]}`}>{TEXTO[e]}</span></td>
                      <td><CambiarEstado codigo={m.codigo} nombre={m.nombre} actual={e} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="page-head" id="interesados" style={{ marginTop: 32 }}>
        <div>
          <h2>Comerciantes interesados{filtro ? ` · ${interesados[0]?.municipio ?? filtro}` : ''}</h2>
          <p className="small muted">Negocios de ciudades que aún no abren y dejaron su contacto para la apertura. No son registros ni publicaciones.</p>
        </div>
        {filtro && <Link href="/ciudades#interesados">Ver todos</Link>}
      </div>
      {interesados.length === 0 ? (
        <div className="card"><p className="muted">Todavía no hay comerciantes interesados{filtro ? ' en esta ciudad' : ''}.</p></div>
      ) : (
        <table>
          <thead><tr><th>Fecha</th><th>Ciudad</th><th>Negocio</th><th>Contacto</th></tr></thead>
          <tbody>
            {interesados.map((i) => (
              <tr key={i.id}>
                <td className="small">{fecha(i.created_at)}</td>
                <td>{i.municipio}<div className="small muted">{i.departamento}</div></td>
                <td>{i.nombre_negocio}<div className="small muted">{i.tipo === 'restaurante' ? 'Restaurante' : 'Emprendimiento'}</div></td>
                <td>{i.nombre_contacto}<div className="small"><a href={`https://wa.me/${i.whatsapp}`} target="_blank" rel="noreferrer">+{i.whatsapp}</a></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
