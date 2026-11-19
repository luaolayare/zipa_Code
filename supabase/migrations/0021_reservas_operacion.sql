-- Zipa lo tiene Beta 2.2 (Entrega D): operación de las reservas.
--
-- 1. Vencimiento automático: cada 5 minutos el servidor vence las solicitudes pendientes cuyo plazo
--    para responder pasó (expirar_reservas, migración 0019). No depende de que una app esté abierta.
--    Cada vencimiento queda en el historial y encola el aviso al cliente (migración 0020).
-- 2. Retención: cada día se borran los avisos ya resueltos de hace más de 90 días (con sus intentos)
--    y los dispositivos desactivados hace más de 90 días. Las solicitudes NO se borran aquí: su plazo
--    de conservación está pendiente de la revisión legal (docs/PROPUESTA_TEXTOS_LEGALES_BETA_2_2.md).
-- 3. Estadísticas para el panel del equipo (revisor o admin, con MFA): solo cifras agregadas,
--    códigos de solicitud y nombres de restaurantes. Nunca teléfonos, nombres de clientes ni
--    observaciones. El equipo no puede confirmar ni cambiar reservas.
-- Migración solo aditiva.

-- 1. Vencimiento automático -------------------------------------------------------------------------
select cron.schedule('zipa-expirar-reservas', '*/5 * * * *', 'select public.expirar_reservas()');

-- 2. Retención de datos operativos ------------------------------------------------------------------
create function public.limpiar_avisos_antiguos() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_avisos int;
  v_tokens int;
begin
  delete from public.notifications
  where status in ('enviada', 'sin_dispositivos', 'fallida') and created_at < now() - interval '90 days';
  get diagnostics v_avisos = row_count;
  delete from public.push_tokens where not active and disabled_at < now() - interval '90 days';
  get diagnostics v_tokens = row_count;
  return jsonb_build_object('avisos', v_avisos, 'dispositivos', v_tokens);
end $$;
revoke execute on function public.limpiar_avisos_antiguos() from public, anon, authenticated;
-- 3:30 a. m. en Colombia (8:30 UTC).
select cron.schedule('zipa-limpiar-avisos', '30 8 * * *', 'select public.limpiar_avisos_antiguos()');

-- 3. Estadísticas de reservas para el panel ---------------------------------------------------------
-- Periodo: solicitudes creadas en los últimos p_dias días (en hora de Colombia).
create function public.admin_reservas(p_dias int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_dias int := least(greatest(coalesce(p_dias, 30), 1), 365);
  v_desde timestamptz := (date_trunc('day', now() at time zone 'America/Bogota') - make_interval(days => v_dias - 1)) at time zone 'America/Bogota';
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'dias', v_dias,
    'recibidas', (select count(*) from public.reservations where created_at >= v_desde),
    'por_estado', coalesce((select jsonb_object_agg(status, n) from (
      select status, count(*) n from public.reservations where created_at >= v_desde group by status) t), '{}'::jsonb),
    -- Desde que llega la solicitud hasta que el restaurante confirma o rechaza.
    'respuesta_promedio_min', (select round(avg(extract(epoch from decided_at - created_at)) / 60)::int
      from public.reservations where created_at >= v_desde and decided_at is not null and status <> 'pendiente'),
    'respuesta_mediana_min', (select round((percentile_cont(0.5) within group (order by extract(epoch from decided_at - created_at))) / 60)::int
      from public.reservations where created_at >= v_desde and decided_at is not null),
    'motivos_rechazo', coalesce((select jsonb_object_agg(reject_reason, n) from (
      select reject_reason, count(*) n from public.reservations where created_at >= v_desde and status = 'rechazada' group by reject_reason) t), '{}'::jsonb),
    'canceladas_por', coalesce((select jsonb_object_agg(cancelled_by, n) from (
      select cancelled_by, count(*) n from public.reservations where created_at >= v_desde and status = 'cancelada' group by cancelled_by) t), '{}'::jsonb),
    'restaurantes_con_reservas', (select count(*) from public.reservation_settings s join public.businesses b on b.id = s.business_id
      where s.enabled and b.status = 'publicado'),
    'personas_promedio', (select round(avg(party_size), 1) from public.reservations where created_at >= v_desde),
    'con_platos', (select count(distinct reservation_id) from public.reservation_items i join public.reservations r on r.id = i.reservation_id where r.created_at >= v_desde),
    'serie', coalesce((select jsonb_agg(jsonb_build_object('dia', d.dia, 'recibidas', coalesce(x.n, 0), 'confirmadas', coalesce(x.c, 0)) order by d.dia)
      from (select generate_series((v_desde at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::date, interval '1 day')::date as dia) d
      left join (select (created_at at time zone 'America/Bogota')::date as dia, count(*) n, count(*) filter (where status in ('confirmada', 'finalizada', 'no_asistio')) c
                 from public.reservations where created_at >= v_desde group by 1) x on x.dia = d.dia), '[]'::jsonb),
    'top_restaurantes', coalesce((select jsonb_agg(t) from (
      select b.id, b.name as nombre, count(*) as recibidas,
             count(*) filter (where r.status in ('confirmada', 'finalizada', 'no_asistio')) as confirmadas,
             count(*) filter (where r.status = 'expirada') as vencidas
      from public.reservations r join public.businesses b on b.id = r.business_id
      where r.created_at >= v_desde group by b.id, b.name order by recibidas desc limit 10) t), '[]'::jsonb),
    'avisos', coalesce((select jsonb_object_agg(status, n) from (
      select status, count(*) n from public.notifications where created_at >= v_desde group by status) t), '{}'::jsonb),
    'dispositivos_activos', (select jsonb_build_object(
      'negocios', count(*) filter (where app = 'negocios'), 'clientes', count(*) filter (where app = 'clientes'))
      from public.push_tokens where active),
    -- Incidencias operativas (sin datos personales).
    'avisos_fallidos', coalesce((select jsonb_agg(t) from (
      select n.id, n.created_at, n.kind, n.app, n.attempts, n.last_error, r.code, b.name as restaurante
      from public.notifications n join public.reservations r on r.id = n.reservation_id join public.businesses b on b.id = r.business_id
      where n.status = 'fallida' and n.created_at >= v_desde order by n.created_at desc limit 50) t), '[]'::jsonb),
    'avisos_atascados', (select count(*) from public.notifications
      where (status = 'pendiente' and next_attempt_at < now() - interval '10 minutes') or (status = 'enviando' and locked_until < now() - interval '10 minutes')),
    -- Si hay pendientes con el plazo vencido hace más de 15 minutos, la tarea de vencimiento no está corriendo.
    'vencimiento_atrasado', coalesce((select jsonb_agg(t) from (
      select r.code, b.name as restaurante, r.respond_by
      from public.reservations r join public.businesses b on b.id = r.business_id
      where r.status = 'pendiente' and r.respond_by < now() - interval '15 minutes' order by r.respond_by limit 50) t), '[]'::jsonb),
    'pendientes_por_vencer_1h', (select count(*) from public.reservations where status = 'pendiente' and respond_by between now() and now() + interval '1 hour'),
    'tareas', coalesce((select jsonb_agg(t) from (
      select j.jobname as tarea, j.schedule as cada,
             (select max(d.end_time) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'succeeded') as ultima_ok,
             (select d.status from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1) as ultimo_estado
      from cron.job j where j.jobname like 'zipa-%' order by j.jobname) t), '[]'::jsonb)
  );
end $$;
revoke execute on function public.admin_reservas(int) from public, anon;
grant execute on function public.admin_reservas(int) to authenticated;
