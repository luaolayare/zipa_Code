// Reservas: cifras agregadas e incidencias operativas (migración 0021, admin_reservas).
// Sin datos personales: ni teléfonos, ni nombres de clientes, ni observaciones. El equipo no
// confirma ni cambia reservas: eso lo decide cada restaurante.
import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { dia, fecha, numero } from '@/lib/format';

type Reservas = {
  dias: number;
  recibidas: number;
  por_estado: Record<string, number>;
  respuesta_promedio_min: number | null;
  respuesta_mediana_min: number | null;
  motivos_rechazo: Record<string, number>;
  canceladas_por: Record<string, number>;
  restaurantes_con_reservas: number;
  personas_promedio: number | null;
  con_platos: number;
  serie: { dia: string; recibidas: number; confirmadas: number }[];
  top_restaurantes: { id: string; nombre: string; recibidas: number; confirmadas: number; vencidas: number }[];
  avisos: Record<string, number>;
  dispositivos_activos: { negocios: number; clientes: number };
  avisos_fallidos: { id: number; created_at: string; kind: string; app: string; attempts: number; last_error: string | null; code: string; restaurante: string }[];
  avisos_atascados: number;
  vencimiento_atrasado: { code: string; restaurante: string; respond_by: string }[];
  pendientes_por_vencer_1h: number;
  tareas: { tarea: string; cada: string; ultima_ok: string | null; ultimo_estado: string | null }[];
};

const PERIODOS = [7, 30, 90];
const MOTIVOS: Record<string, string> = {
  sin_mesas: 'No hay mesas disponibles',
  sin_horario: 'No hay disponibilidad en ese horario',
  cerrado_evento: 'Cerrado o evento privado',
  grupo_grande: 'No se puede atender ese número de personas',
  otro: 'Otro motivo',
};
const AVISO: Record<string, string> = {
  nueva_solicitud: 'Nueva solicitud (al restaurante)',
  confirmada: 'Confirmada (al cliente)',
  rechazada: 'No confirmada (al cliente)',
  cancelada_por_cliente: 'Cancelada por el cliente (al restaurante)',
  cancelada_por_restaurante: 'Cancelada por el restaurante (al cliente)',
  expirada: 'Vencida (al cliente)',
};
const TAREA: Record<string, string> = {
  'zipa-enviar-notificaciones': 'Envío de notificaciones',
  'zipa-expirar-reservas': 'Vencimiento de solicitudes',
  'zipa-limpiar-avisos': 'Limpieza de avisos antiguos',
};
const minutos = (m: number | null) => (m == null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

export default async function ReservasPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias: d } = await searchParams;
  const dias = PERIODOS.includes(Number(d)) ? Number(d) : 30;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc('admin_reservas', { p_dias: dias });
  const a = data as Reservas | null;
  const e = (k: string) => a?.por_estado?.[k] ?? 0;
  const confirmadas = e('confirmada') + e('finalizada') + e('no_asistio');
  const decididas = confirmadas + e('rechazada');
  const max = Math.max(1, ...(a?.serie ?? []).map((s) => s.recibidas));
  const fallidos = a?.avisos?.fallida ?? 0;
  const incidencias = (a?.avisos_fallidos.length ?? 0) + (a?.vencimiento_atrasado.length ?? 0) + (a?.avisos_atascados ?? 0);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Reservas</p>
          <h1>Solicitudes de reserva</h1>
          <p>Cifras de todos los restaurantes. Por privacidad no se muestran datos de los clientes, y el equipo no confirma reservas: lo decide cada restaurante.</p>
        </div>
        <nav className="tabs" aria-label="Periodo">
          {PERIODOS.map((p) => (
            <Link key={p} href={`/reservas?dias=${p}`} aria-current={p === dias ? 'true' : undefined}>{p} días</Link>
          ))}
        </nav>
      </div>
      {error && <p className="notice error">No pudimos cargar las reservas.</p>}

      {a && (
        <>
          <h2 className="section-title">Solicitudes en {a.dias} días</h2>
          <div className="grid grid-4" style={{ marginBottom: 16 }}>
            <div className="card"><p className="stat-number">{numero(a.recibidas)}</p><p className="stat-label">Recibidas</p></div>
            <div className="card"><p className="stat-number">{numero(e('pendiente'))}</p><p className="stat-label">Pendientes ({numero(a.pendientes_por_vencer_1h)} vencen en menos de 1 hora)</p></div>
            <div className="card"><p className="stat-number">{numero(confirmadas)}</p><p className="stat-label">Confirmadas{decididas ? ` (${Math.round((confirmadas / decididas) * 100)} % de las respondidas)` : ''}</p></div>
            <div className="card"><p className="stat-number">{numero(e('rechazada'))}</p><p className="stat-label">No confirmadas</p></div>
            <div className="card"><p className="stat-number">{numero(e('cancelada'))}</p><p className="stat-label">Canceladas (clientes {numero(a.canceladas_por.cliente ?? 0)} · restaurantes {numero(a.canceladas_por.restaurante ?? 0)})</p></div>
            <div className="card"><p className="stat-number">{numero(e('expirada'))}</p><p className="stat-label">Vencidas sin respuesta</p></div>
            <div className="card"><p className="stat-number">{minutos(a.respuesta_promedio_min)}</p><p className="stat-label">Tiempo promedio de respuesta (mediana {minutos(a.respuesta_mediana_min)})</p></div>
            <div className="card"><p className="stat-number">{numero(a.restaurantes_con_reservas)}</p><p className="stat-label">Restaurantes con reservas activas</p></div>
          </div>
          <p className="small muted" style={{ marginBottom: 24 }}>
            Finalizadas: {numero(e('finalizada'))} · No asistió: {numero(e('no_asistio'))} · Personas por solicitud: {a.personas_promedio ?? '—'} · Con platos elegidos: {numero(a.con_platos)}.
          </p>

          <div className="card stack" style={{ marginBottom: 24 }}>
            <h2>Solicitudes por día</h2>
            <div className="bars" role="img" aria-label={`Solicitudes por día en los últimos ${a.dias} días`}>
              {a.serie.map((s) => (
                <div key={s.dia} className="bar-col" title={`${dia(s.dia)}: ${s.recibidas} recibidas, ${s.confirmadas} confirmadas`}>
                  <div className="bar" style={{ height: `${(s.recibidas / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="bars-axis small muted">
              <span>{a.serie[0] ? dia(a.serie[0].dia) : ''}</span>
              <span>Máximo: {max} por día</span>
              <span>Hoy</span>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 24 }}>
            <div className="card stack">
              <h2>Motivos de rechazo</h2>
              {Object.keys(a.motivos_rechazo).length === 0 ? <p className="muted small">Ningún rechazo en el periodo.</p> : (
                <div style={{ overflowX: 'auto' }}><table>
                  <thead><tr><th>Motivo</th><th>Veces</th></tr></thead>
                  <tbody>{Object.entries(a.motivos_rechazo).sort((x, y) => y[1] - x[1]).map(([k, n]) => <tr key={k}><td>{MOTIVOS[k] ?? k}</td><td>{n}</td></tr>)}</tbody>
                </table></div>
              )}
            </div>
            <div className="card stack">
              <h2>Restaurantes con más solicitudes</h2>
              {a.top_restaurantes.length === 0 ? <p className="muted small">Aún no hay solicitudes.</p> : (
                <div style={{ overflowX: 'auto' }}><table>
                  <thead><tr><th>Restaurante</th><th>Recibidas</th><th>Confirmadas</th><th>Vencidas</th></tr></thead>
                  <tbody>{a.top_restaurantes.map((r) => <tr key={r.id}><td><Link href={`/negocios/${r.id}`}>{r.nombre}</Link></td><td>{r.recibidas}</td><td>{r.confirmadas}</td><td>{r.vencidas}</td></tr>)}</tbody>
                </table></div>
              )}
            </div>
          </div>

          <h2 className="section-title">Notificaciones</h2>
          <div className="grid grid-4" style={{ marginBottom: 16 }}>
            <div className="card"><p className="stat-number">{numero(a.avisos.enviada ?? 0)}</p><p className="stat-label">Enviadas</p></div>
            <div className="card"><p className="stat-number">{numero(fallidos)}</p><p className="stat-label">Fallidas (después de 5 intentos)</p></div>
            <div className="card"><p className="stat-number">{numero(a.avisos.sin_dispositivos ?? 0)}</p><p className="stat-label">Sin dispositivos con avisos activos</p></div>
            <div className="card"><p className="stat-number">{numero(a.dispositivos_activos.negocios)} · {numero(a.dispositivos_activos.clientes)}</p><p className="stat-label">Dispositivos activos: negocios · clientes</p></div>
          </div>
          <p className="small muted" style={{ marginBottom: 24 }}>
            «Enviada» significa que el servicio de notificaciones la aceptó, no que la persona la haya visto. Si una notificación falla, la solicitud sigue en la bandeja del restaurante.
          </p>

          <h2 className="section-title">Incidencias {incidencias ? `(${incidencias})` : ''}</h2>
          {incidencias === 0 && <p className="notice" style={{ marginBottom: 16 }}>Sin incidencias en el periodo.</p>}
          {a.vencimiento_atrasado.length > 0 && (
            <div className="card stack" style={{ marginBottom: 16 }}>
              <h2>Solicitudes que ya debían vencer</h2>
              <p className="small">El vencimiento automático corre cada 5 minutos; si aparecen aquí, revisa las tareas programadas.</p>
              <div style={{ overflowX: 'auto' }}><table>
                <thead><tr><th>Código</th><th>Restaurante</th><th>Plazo</th></tr></thead>
                <tbody>{a.vencimiento_atrasado.map((v) => <tr key={v.code}><td><code>{v.code}</code></td><td>{v.restaurante}</td><td>{fecha(v.respond_by)}</td></tr>)}</tbody>
              </table></div>
            </div>
          )}
          {a.avisos_atascados > 0 && <p className="notice warn" style={{ marginBottom: 16 }}>{a.avisos_atascados} notificaciones esperan envío hace más de 10 minutos. Revisa la función de envío y sus secretos.</p>}
          {a.avisos_fallidos.length > 0 && (
            <div className="card stack" style={{ marginBottom: 16 }}>
              <h2>Notificaciones fallidas</h2>
              <div style={{ overflowX: 'auto' }}><table>
                <thead><tr><th>Fecha</th><th>Código</th><th>Restaurante</th><th>Aviso</th><th>Intentos</th><th>Último error</th></tr></thead>
                <tbody>{a.avisos_fallidos.map((f) => <tr key={f.id}><td>{fecha(f.created_at)}</td><td><code>{f.code}</code></td><td>{f.restaurante}</td><td>{AVISO[f.kind] ?? f.kind}</td><td>{f.attempts}</td><td className="small">{f.last_error ?? '—'}</td></tr>)}</tbody>
              </table></div>
            </div>
          )}

          <div className="card stack">
            <h2>Tareas programadas</h2>
            <div style={{ overflowX: 'auto' }}><table>
              <thead><tr><th>Tarea</th><th>Frecuencia</th><th>Última ejecución correcta</th><th>Último estado</th></tr></thead>
              <tbody>{a.tareas.map((tarea) => (
                <tr key={tarea.tarea}><td>{TAREA[tarea.tarea] ?? tarea.tarea}</td><td><code>{tarea.cada}</code></td><td>{tarea.ultima_ok ? fecha(tarea.ultima_ok) : 'Aún no ha corrido'}</td><td>{tarea.ultimo_estado === 'succeeded' ? 'Correcta' : tarea.ultimo_estado ?? '—'}</td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </>
      )}
    </>
  );
}
