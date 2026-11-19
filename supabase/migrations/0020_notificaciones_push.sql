-- Zipa lo tiene Beta 2.2 (Entrega C): notificaciones push de las reservas.
--
-- Cómo funciona:
-- 1. Cada app registra el token de Expo de su dispositivo (push_tokens), asociado a la sesión.
-- 2. Cada cambio de estado de una reserva (reservation_events, migración 0019) deja una notificación
--    en cola (notifications), dentro de la misma transacción. Encolar NO puede hacer fallar la
--    reserva: si algo sale mal, se registra un aviso y la reserva sigue.
-- 3. La Edge Function `enviar-notificaciones` toma la cola, envía por el servicio de Expo, guarda cada
--    intento (notification_deliveries), reintenta con espera creciente, desactiva tokens inválidos y
--    revisa los recibos. Las apps nunca envían push.
-- 4. Se despierta sola: al encolar (pg_net, después del commit) y cada minuto como respaldo
--    (pg_cron). Necesita dos secretos en Vault que NO están en este archivo (ver docs).
--
-- Privacidad: el texto de la notificación (visible con la pantalla bloqueada) no lleva nombres,
-- teléfonos ni observaciones; solo el restaurante, la fecha y el número de personas.
-- Migración solo aditiva.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- 1. Tokens por dispositivo -----------------------------------------------------------------------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique check (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$'),
  app text not null check (app in ('clientes', 'negocios')),
  platform text not null check (platform in ('android', 'ios')),
  active boolean not null default true,
  disabled_reason text check (disabled_reason in ('cierre_sesion', 'no_registrado', 'reemplazado')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz
);
create index push_tokens_usuario_idx on public.push_tokens (user_id, app) where active;
alter table public.push_tokens enable row level security;
-- Cada persona ve solo sus dispositivos. Nadie escribe directo: solo por las funciones de abajo.
create policy "mis dispositivos" on public.push_tokens for select to authenticated using (user_id = auth.uid());
grant select (id, app, platform, active, created_at, last_seen_at) on public.push_tokens to authenticated;

-- Registra o actualiza el token de este dispositivo para la sesión actual. Si el mismo celular
-- tenía otra cuenta, el token pasa a esta (así no le llegan avisos de la cuenta anterior).
create function public.registrar_token_push(p_token text, p_app text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Inicia sesión para activar las notificaciones' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$' then
    raise exception 'El token de notificaciones no es válido' using errcode = '22023';
  end if;
  if p_app not in ('clientes', 'negocios') or p_platform not in ('android', 'ios') then
    raise exception 'Datos del dispositivo no válidos' using errcode = '22023';
  end if;
  insert into public.push_tokens as t (user_id, token, app, platform)
  values (v_uid, p_token, p_app, p_platform)
  on conflict (token) do update set
    user_id = excluded.user_id, app = excluded.app, platform = excluded.platform,
    active = true, disabled_reason = null, disabled_at = null, last_seen_at = now();
  -- Máximo 10 dispositivos activos por persona y app: se desactivan los más viejos.
  update public.push_tokens set active = false, disabled_reason = 'reemplazado', disabled_at = now()
  where id in (
    select id from public.push_tokens where user_id = v_uid and app = p_app and active
    order by last_seen_at desc offset 10
  );
end $$;

-- Al cerrar sesión: este dispositivo deja de recibir avisos de esta cuenta.
create function public.desactivar_token_push(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.push_tokens set active = false, disabled_reason = 'cierre_sesion', disabled_at = now()
  where token = p_token and user_id = auth.uid();
end $$;

revoke execute on function public.registrar_token_push(text, text, text), public.desactivar_token_push(text) from public, anon;
grant execute on function public.registrar_token_push(text, text, text), public.desactivar_token_push(text) to authenticated;

-- 2. Cola de notificaciones -----------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  event_id bigint references public.reservation_events (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  app text not null check (app in ('clientes', 'negocios')),
  kind text not null check (kind in ('nueva_solicitud', 'confirmada', 'rechazada', 'cancelada_por_cliente', 'cancelada_por_restaurante', 'expirada')),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 180),
  data jsonb not null default '{}',
  status text not null default 'pendiente' check (status in ('pendiente', 'enviando', 'enviada', 'sin_dispositivos', 'fallida')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (event_id, recipient_id) -- un aviso por evento y destinatario: encolar dos veces no duplica
);
create index notifications_por_enviar_idx on public.notifications (next_attempt_at) where status in ('pendiente', 'enviando');
create index notifications_reserva_idx on public.notifications (reservation_id);

-- Cada intento de envío a cada dispositivo, con el ticket y el recibo de Expo.
create table public.notification_deliveries (
  id bigint generated always as identity primary key,
  notification_id bigint not null references public.notifications (id) on delete cascade,
  push_token_id uuid references public.push_tokens (id) on delete set null,
  attempt int not null,
  status text not null check (status in ('aceptada', 'error')),
  ticket_id text,
  error text,
  receipt_status text check (receipt_status in ('ok', 'error')),
  receipt_error text,
  receipt_checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index notification_deliveries_recibos_idx on public.notification_deliveries (created_at)
  where ticket_id is not null and receipt_status is null;
create index notification_deliveries_aviso_idx on public.notification_deliveries (notification_id);

-- Sin acceso desde las apps: solo el servidor (service_role) y las funciones de abajo.
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;

-- Fecha corta en hora de Bogotá: "sáb 21 nov., 7:30 p. m."
create function public.fecha_corta_bogota(ts timestamptz) returns text
language sql immutable set search_path = '' as $$
  select (array['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'])[extract(isodow from l)::int] || ' '
      || extract(day from l)::int || ' '
      || (array['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'])[extract(month from l)::int]
      || ', ' || ((extract(hour from l)::int + 11) % 12 + 1) || ':' || to_char(l, 'MI')
      || case when extract(hour from l) < 12 then ' a. m.' else ' p. m.' end
  from (select ts at time zone 'America/Bogota' as l) x
$$;

-- Encola el aviso que corresponde a cada cambio de estado.
create function public.encolar_notificacion_reserva() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  v_owner uuid;
  v_negocio text;
  v_cuando text;
  v_personas text;
  v_a uuid; v_app text; v_kind text; v_title text; v_body text; v_url text;
begin
  begin
    select * into r from public.reservations where id = new.reservation_id;
    select b.owner_id, b.name into v_owner, v_negocio from public.businesses b where b.id = r.business_id;
    v_cuando := public.fecha_corta_bogota(r.starts_at);
    v_personas := r.party_size || case when r.party_size = 1 then ' persona' else ' personas' end;

    if new.to_status = 'pendiente' and new.from_status is null then
      v_a := v_owner; v_app := 'negocios'; v_kind := 'nueva_solicitud';
      v_title := 'Tienes una nueva solicitud de reserva';
      v_body := format('Para el %s · %s. Ábrela para responder.', v_cuando, v_personas);
    elsif new.to_status = 'confirmada' then
      v_a := r.customer_id; v_app := 'clientes'; v_kind := 'confirmada';
      v_title := 'Tu reserva fue confirmada';
      v_body := format('%s · %s · %s.', v_negocio, v_cuando, v_personas);
    elsif new.to_status = 'rechazada' then
      v_a := r.customer_id; v_app := 'clientes'; v_kind := 'rechazada';
      v_title := 'Tu solicitud de reserva no pudo confirmarse';
      v_body := format('%s. Ábrela para ver el motivo o pedir otro horario.', v_negocio);
    elsif new.to_status = 'cancelada' and new.actor_role = 'cliente' then
      v_a := v_owner; v_app := 'negocios'; v_kind := 'cancelada_por_cliente';
      v_title := case when new.from_status = 'pendiente' then 'Un cliente retiró su solicitud' else 'Un cliente canceló su reserva' end;
      v_body := format('Era para el %s · %s.', v_cuando, v_personas);
    elsif new.to_status = 'cancelada' and new.actor_role = 'restaurante' then
      v_a := r.customer_id; v_app := 'clientes'; v_kind := 'cancelada_por_restaurante';
      v_title := 'El restaurante canceló tu reserva';
      v_body := format('%s · %s. Ábrela para ver el motivo.', v_negocio, v_cuando);
    elsif new.to_status = 'expirada' then
      v_a := r.customer_id; v_app := 'clientes'; v_kind := 'expirada';
      v_title := 'Tu solicitud de reserva venció';
      v_body := format('%s no respondió a tiempo. Puedes pedir otro horario.', v_negocio);
    else
      return null; -- finalizada / no asistió: sin aviso
    end if;
    v_url := case when v_app = 'negocios' then '/reservas/' else '/reserva/' end || r.id;

    insert into public.notifications (event_id, reservation_id, recipient_id, app, kind, title, body, data)
    values (new.id, r.id, v_a, v_app, v_kind, left(v_title, 80), left(v_body, 180),
            jsonb_build_object('url', v_url, 'reservationId', r.id, 'kind', v_kind))
    on conflict (event_id, recipient_id) do nothing;
  exception when others then
    -- Encolar nunca hace fallar la reserva: queda el aviso en el log de Postgres y la solicitud
    -- sigue visible en la bandeja.
    raise warning 'No se pudo encolar la notificación del evento %: %', new.id, sqlerrm;
  end;
  return null;
end $$;
revoke execute on function public.encolar_notificacion_reserva() from public, anon, authenticated;
create trigger reservation_events_notificar after insert on public.reservation_events
  for each row execute function public.encolar_notificacion_reserva();

-- 3. Para la Edge Function (solo service_role) --------------------------------------------------
-- Toma hasta p_limite avisos listos para enviar y los marca "enviando" por 5 minutos. SKIP LOCKED:
-- si corren dos envíos a la vez, cada aviso lo toma uno solo. Si un envío se cae a la mitad, el
-- aviso vuelve a estar disponible cuando pasa locked_until.
create function public.tomar_notificaciones(p_limite int default 50) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v jsonb;
begin
  with listas as (
    select id from public.notifications
    where (status = 'pendiente' and next_attempt_at <= now()) or (status = 'enviando' and locked_until < now())
    order by id
    limit least(greatest(coalesce(p_limite, 50), 1), 200)
    for update skip locked
  ), tomadas as (
    update public.notifications n set status = 'enviando', attempts = n.attempts + 1, locked_until = now() + interval '5 minutes'
    from listas l where n.id = l.id
    returning n.id, n.recipient_id, n.app, n.title, n.body, n.data, n.attempts
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'title', t.title, 'body', t.body, 'data', t.data, 'attempt', t.attempts,
    'tokens', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'token', p.token))
                        from public.push_tokens p where p.user_id = t.recipient_id and p.app = t.app and p.active), '[]'::jsonb)
  )), '[]'::jsonb) into v
  from tomadas t;
  return v;
end $$;

-- Guarda el resultado de un intento. p_tickets: [{"token_id":"…","status":"ok","ticket_id":"…"},
-- {"token_id":"…","status":"error","error":"DeviceNotRegistered"}]. p_error: falla general del envío
-- (red, 429, 5xx…), en cuyo caso no hay tickets.
create function public.registrar_envio_notificacion(p_id bigint, p_tickets jsonb, p_error text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  n public.notifications;
  v_ok int;
  v_err int;
  v_permanente boolean;
  v_estado text;
  v_activos int;
begin
  select * into n from public.notifications where id = p_id for update;
  if not found or n.status <> 'enviando' then
    return coalesce(n.status, 'no_existe'); -- ya la resolvió otro envío: no se duplica
  end if;

  insert into public.notification_deliveries (notification_id, push_token_id, attempt, status, ticket_id, error)
  select p_id, (t ->> 'token_id')::uuid, n.attempts, case when t ->> 'status' = 'ok' then 'aceptada' else 'error' end,
         nullif(t ->> 'ticket_id', ''), left(nullif(t ->> 'error', ''), 200)
  from jsonb_array_elements(coalesce(p_tickets, '[]')) t;

  -- Tokens que Expo dice que ya no existen: se desactivan.
  update public.push_tokens set active = false, disabled_reason = 'no_registrado', disabled_at = now()
  where id in (select (t ->> 'token_id')::uuid from jsonb_array_elements(coalesce(p_tickets, '[]')) t where t ->> 'error' = 'DeviceNotRegistered');

  select count(*) filter (where t ->> 'status' = 'ok'), count(*) filter (where t ->> 'status' <> 'ok')
    into v_ok, v_err from jsonb_array_elements(coalesce(p_tickets, '[]')) t;
  select bool_and(t ->> 'error' in ('DeviceNotRegistered', 'MessageTooBig')) into v_permanente
    from jsonb_array_elements(coalesce(p_tickets, '[]')) t where t ->> 'status' <> 'ok';
  select count(*) into v_activos from public.push_tokens where user_id = n.recipient_id and app = n.app and active;

  if v_ok > 0 then
    v_estado := 'enviada';
  elsif p_error is null and v_err = 0 then
    v_estado := 'sin_dispositivos'; -- la persona no tiene dispositivos con avisos activos
  elsif p_error is null and coalesce(v_permanente, false) and v_activos = 0 then
    v_estado := 'sin_dispositivos';
  elsif n.attempts >= 5 then
    v_estado := 'fallida';
  else
    v_estado := 'pendiente';
  end if;

  update public.notifications set
    status = v_estado,
    locked_until = null,
    sent_at = case when v_estado = 'enviada' then now() else sent_at end,
    last_error = case when v_estado = 'enviada' then null else left(coalesce(p_error, (select string_agg(distinct t ->> 'error', ', ') from jsonb_array_elements(coalesce(p_tickets, '[]')) t where t ->> 'status' <> 'ok')), 300) end,
    -- Reintento con espera creciente: 2, 4, 8, 16 minutos.
    next_attempt_at = case when v_estado = 'pendiente' then now() + make_interval(mins => power(2, n.attempts)::int) else next_attempt_at end
  where id = p_id;
  return v_estado;
end $$;

-- Tickets aceptados hace más de 15 minutos (y menos de 23 horas) que aún no tienen recibo.
create function public.recibos_pendientes(p_limite int default 300) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'ticket_id', d.ticket_id)), '[]'::jsonb)
  from (
    select id, ticket_id from public.notification_deliveries
    where ticket_id is not null and receipt_status is null
      and created_at < now() - interval '15 minutes' and created_at > now() - interval '23 hours'
    order by id limit least(greatest(coalesce(p_limite, 300), 1), 1000)
  ) d
$$;

-- p_recibos: [{"id": 12, "status": "ok"}, {"id": 13, "status": "error", "error": "DeviceNotRegistered"}]
create function public.registrar_recibos(p_recibos jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_n int;
begin
  update public.notification_deliveries d set
    receipt_status = case when r ->> 'status' = 'ok' then 'ok' else 'error' end,
    receipt_error = left(nullif(r ->> 'error', ''), 200),
    receipt_checked_at = now()
  from jsonb_array_elements(coalesce(p_recibos, '[]')) r
  where d.id = (r ->> 'id')::bigint and d.receipt_status is null;
  get diagnostics v_n = row_count;
  update public.push_tokens set active = false, disabled_reason = 'no_registrado', disabled_at = now()
  where id in (
    select d.push_token_id from public.notification_deliveries d
    join jsonb_array_elements(coalesce(p_recibos, '[]')) r on d.id = (r ->> 'id')::bigint
    where r ->> 'error' = 'DeviceNotRegistered'
  );
  return v_n;
end $$;

revoke execute on function public.tomar_notificaciones(int), public.registrar_envio_notificacion(bigint, jsonb, text),
  public.recibos_pendientes(int), public.registrar_recibos(jsonb), public.fecha_corta_bogota(timestamptz)
  from public, anon, authenticated;
grant execute on function public.tomar_notificaciones(int), public.registrar_envio_notificacion(bigint, jsonb, text),
  public.recibos_pendientes(int), public.registrar_recibos(jsonb)
  to service_role;

-- 4. Despertar el envío -----------------------------------------------------------------------------
-- Llama a la Edge Function con pg_net (la petición sale después del commit; si la transacción se
-- deshace, no sale). Necesita en Vault:
--   zipa_funciones_url  → https://<proyecto>.supabase.co/functions/v1
--   zipa_cron_secreto   → el mismo valor que el secreto CRON_SECRET de la función
-- Sin esos secretos no hace nada (no falla).
create function public.disparar_envio_notificaciones() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secreto text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'zipa_funciones_url';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'zipa_cron_secreto';
  if v_url is null or v_secreto is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/enviar-notificaciones',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-zipa-cron', v_secreto),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
exception when others then
  raise warning 'No se pudo programar el envío de notificaciones: %', sqlerrm;
end $$;
revoke execute on function public.disparar_envio_notificaciones() from public, anon, authenticated;

-- Al encolar un aviso, se despierta el envío (una vez por sentencia).
create function public.despertar_envio() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.disparar_envio_notificaciones();
  return null;
end $$;
revoke execute on function public.despertar_envio() from public, anon, authenticated;
create trigger notifications_despertar after insert on public.notifications
  for each statement execute function public.despertar_envio();

-- Respaldo cada minuto: reintentos pendientes y recibos. Solo llama si hay trabajo.
create function public.envio_programado() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.notifications where (status = 'pendiente' and next_attempt_at <= now()) or (status = 'enviando' and locked_until < now()))
     or exists (select 1 from public.notification_deliveries where ticket_id is not null and receipt_status is null
                and created_at < now() - interval '15 minutes' and created_at > now() - interval '23 hours') then
    perform public.disparar_envio_notificaciones();
  end if;
end $$;
revoke execute on function public.envio_programado() from public, anon, authenticated;
select cron.schedule('zipa-enviar-notificaciones', '* * * * *', 'select public.envio_programado()');
