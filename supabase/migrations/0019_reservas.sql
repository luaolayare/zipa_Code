-- Zipa lo tiene Beta 2.2 (Entrega B): solicitudes de reserva para restaurantes.
--
-- Principio: son SOLICITUDES con confirmación manual. No hay mesas, cupos ni disponibilidad
-- automática: los horarios del restaurante dicen cuándo se puede pedir, no que haya mesa. El
-- restaurante decide siempre. No hay cobros ni anticipos.
--
-- Zona horaria de operación: America/Bogota (UTC-5, sin horario de verano). Los instantes se
-- guardan como timestamptz; los horarios del restaurante (hora local) se comparan convirtiendo
-- el instante a hora de Bogotá.
--
-- Seguridad: las apps solo LEEN estas tablas (RLS). Toda escritura pasa por funciones del servidor
-- que validan permisos, fechas, personas y transiciones de estado, con la fila bloqueada
-- (FOR UPDATE): así dos decisiones simultáneas sobre la misma solicitud no pueden ganar las dos.
-- Migración solo aditiva.

-- 1. Configuración del restaurante ----------------------------------------------------------------
create table public.reservation_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  enabled boolean not null default false,
  max_party int not null default 8 check (max_party between 1 and 50),
  -- Anticipación mínima: al menos 1 hora, para que el restaurante alcance a responder.
  min_notice_minutes int not null default 120 check (min_notice_minutes between 60 and 10080),
  max_advance_days int not null default 30 check (max_advance_days between 1 and 90),
  -- Plazo para responder (política de expiración, ver respond_by).
  response_hours int not null default 24 check (response_hours between 1 and 72),
  slot_minutes int not null default 30 check (slot_minutes in (15, 30, 60)),
  instructions text check (instructions is null or char_length(btrim(instructions)) between 1 and 300),
  updated_at timestamptz not null default now()
);

-- Ventanas en las que pueden empezar las reservas, por día de la semana (ISO: 1 lunes … 7 domingo).
-- Una reserva puede empezar desde `starts` hasta antes de `ends`.
create table public.reservation_windows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.reservation_settings (business_id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  starts time not null,
  ends time not null,
  check (ends > starts)
);
create index reservation_windows_negocio_idx on public.reservation_windows (business_id, weekday);

create table public.reservation_blocked_dates (
  business_id uuid not null references public.reservation_settings (business_id) on delete cascade,
  day date not null,
  primary key (business_id, day)
);

-- 2. Solicitudes ----------------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^R-[A-Z2-9]{6}$'), -- lo que ve la persona: "R-7K3Q9P"
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null,
  party_size int not null check (party_size between 1 and 50),
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  contact_whatsapp text not null check (contact_whatsapp ~ '^[1-9][0-9]{7,14}$'), -- solo dígitos, con indicativo
  table_preference text check (table_preference is null or char_length(table_preference) between 1 and 80),
  notes text check (notes is null or char_length(notes) between 1 and 300),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmada', 'rechazada', 'cancelada', 'expirada', 'finalizada', 'no_asistio')),
  respond_by timestamptz not null, -- después de esto, si sigue pendiente, vence
  reject_reason text check (reject_reason in ('sin_mesas', 'sin_horario', 'cerrado_evento', 'grupo_grande', 'otro')),
  reject_note text check (reject_note is null or char_length(reject_note) between 1 and 200),
  cancelled_by text check (cancelled_by in ('cliente', 'restaurante')),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) between 1 and 200),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, idempotency_key),
  check ((status = 'rechazada') = (reject_reason is not null)),
  check ((status = 'cancelada') = (cancelled_by is not null))
);
-- La misma persona no puede tener dos solicitudes vivas para el mismo restaurante a la misma hora.
create unique index reservations_sin_duplicados on public.reservations (customer_id, business_id, starts_at)
  where status in ('pendiente', 'confirmada');
create index reservations_negocio_idx on public.reservations (business_id, status, starts_at);
create index reservations_cliente_idx on public.reservations (customer_id, created_at desc);
create index reservations_por_vencer_idx on public.reservations (respond_by) where status = 'pendiente';

-- Platos que la persona quisiera pedir: solo una preferencia. No están pagados ni garantizados.
-- Se guarda una copia del nombre y del precio de ese momento (informativo).
create table public.reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  quantity int not null check (quantity between 1 and 20),
  unit_price_cop int check (unit_price_cop is null or unit_price_cop >= 0)
);
create index reservation_items_reserva_idx on public.reservation_items (reservation_id);

-- Historial de cada cambio de estado (auditoría). En la Entrega C también será la fuente de las
-- notificaciones push. No guarda teléfonos.
create table public.reservation_events (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_role text not null check (actor_role in ('cliente', 'restaurante', 'sistema')),
  actor_id uuid references auth.users (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index reservation_events_reserva_idx on public.reservation_events (reservation_id, id);

-- 3. Quién ve qué ---------------------------------------------------------------------------------
alter table public.reservation_settings enable row level security;
alter table public.reservation_windows enable row level security;
alter table public.reservation_blocked_dates enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.reservation_events enable row level security;

-- La configuración se ve si se ve el negocio (publicado, dueño o equipo): la necesita el formulario.
create policy "config de reservas visible" on public.reservation_settings for select
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy "horarios de reservas visibles" on public.reservation_windows for select
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy "fechas bloqueadas visibles" on public.reservation_blocked_dates for select
  using (exists (select 1 from public.businesses b where b.id = business_id));

-- Una solicitud la ven solo quien la hizo y el dueño del restaurante. El equipo NO la ve fila por
-- fila (tiene teléfonos y observaciones); en el panel verá solo estadísticas (Entrega D).
create policy "mis reservas o las de mi restaurante" on public.reservations for select to authenticated
  using (customer_id = auth.uid()
         or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "platos de reservas visibles" on public.reservation_items for select to authenticated
  using (exists (select 1 from public.reservations r where r.id = reservation_id));
create policy "historial de reservas visible" on public.reservation_events for select to authenticated
  using (exists (select 1 from public.reservations r where r.id = reservation_id));

grant select on public.reservation_settings, public.reservation_windows, public.reservation_blocked_dates to anon, authenticated;
grant select on public.reservations, public.reservation_items, public.reservation_events to authenticated;
-- Sin insert/update/delete directos: todo por las funciones de abajo.

-- 4. Ayudantes ------------------------------------------------------------------------------------
-- Número de WhatsApp en dígitos con indicativo. Un celular colombiano sin indicativo (10 dígitos que
-- empiezan por 3) recibe el 57. Devuelve null si no parece un número válido.
create function public.normalizar_whatsapp(t text) returns text
language sql immutable set search_path = '' as $$
  with d as (select regexp_replace(coalesce(t, ''), '\D', '', 'g') as n)
  select case
    when n ~ '^3[0-9]{9}$' then '57' || n
    when n ~ '^[1-9][0-9]{7,14}$' then n
    else null end
  from d
$$;

create function public.es_restaurante(p_business uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select c.parent_id = 'restaurantes' from public.businesses b join public.categories c on c.id = b.subcategory_id where b.id = p_business), false)
$$;

-- Estado en palabras, para los mensajes de error.
create function public.estado_reserva_texto(s text) returns text
language sql immutable set search_path = '' as $$
  select case s when 'pendiente' then 'pendiente' when 'confirmada' then 'confirmada' when 'rechazada' then 'rechazada'
    when 'cancelada' then 'cancelada' when 'expirada' then 'vencida' when 'finalizada' then 'finalizada'
    when 'no_asistio' then 'marcada como «no asistió»' else s end
$$;

revoke execute on function public.normalizar_whatsapp(text), public.es_restaurante(uuid), public.estado_reserva_texto(text)
  from public, anon, authenticated;

-- 5. Configurar (dueño del restaurante) -----------------------------------------------------------
-- p_windows: [{"weekday":1,"starts":"12:00","ends":"15:00"}, …]   p_blocked: ["2026-12-24", …]
create function public.guardar_config_reservas(
  p_business uuid,
  p_enabled boolean,
  p_max_party int,
  p_min_notice_minutes int,
  p_max_advance_days int,
  p_response_hours int,
  p_slot_minutes int,
  p_instructions text,
  p_windows jsonb,
  p_blocked jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_hoy date := (now() at time zone 'America/Bogota')::date;
  v_inst text := nullif(btrim(coalesce(p_instructions, '')), '');
begin
  if not exists (select 1 from public.businesses b where b.id = p_business and b.owner_id = auth.uid()) then
    raise exception 'Solo el dueño del restaurante puede configurar las reservas' using errcode = '42501';
  end if;
  if p_enabled and not public.es_restaurante(p_business) then
    raise exception 'Las reservas son solo para restaurantes' using errcode = '22023';
  end if;
  if v_inst is not null and public.texto_ofensivo(v_inst) then
    raise exception 'Las instrucciones tienen palabras que no se permiten' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_windows, '[]')) <> 'array' or jsonb_array_length(coalesce(p_windows, '[]')) > 28 then
    raise exception 'Revisa los horarios' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_blocked, '[]')) <> 'array' or jsonb_array_length(coalesce(p_blocked, '[]')) > 60 then
    raise exception 'Puedes bloquear hasta 60 fechas' using errcode = '22023';
  end if;

  insert into public.reservation_settings as s (business_id, enabled, max_party, min_notice_minutes, max_advance_days, response_hours, slot_minutes, instructions, updated_at)
  values (p_business, p_enabled, p_max_party, p_min_notice_minutes, p_max_advance_days, p_response_hours, p_slot_minutes, v_inst, now())
  on conflict (business_id) do update set
    enabled = excluded.enabled, max_party = excluded.max_party, min_notice_minutes = excluded.min_notice_minutes,
    max_advance_days = excluded.max_advance_days, response_hours = excluded.response_hours,
    slot_minutes = excluded.slot_minutes, instructions = excluded.instructions, updated_at = now();

  delete from public.reservation_windows where business_id = p_business;
  insert into public.reservation_windows (business_id, weekday, starts, ends)
  select p_business, (w ->> 'weekday')::smallint, (w ->> 'starts')::time, (w ->> 'ends')::time
  from jsonb_array_elements(coalesce(p_windows, '[]')) w;

  -- Ventanas que se cruzan el mismo día.
  if exists (
    select 1 from public.reservation_windows a join public.reservation_windows b
      on a.business_id = b.business_id and a.weekday = b.weekday and a.id < b.id and a.starts < b.ends and b.starts < a.ends
    where a.business_id = p_business
  ) then
    raise exception 'Hay horarios que se cruzan el mismo día' using errcode = '22023';
  end if;
  if p_enabled and not exists (select 1 from public.reservation_windows where business_id = p_business) then
    raise exception 'Agrega al menos un horario para recibir solicitudes' using errcode = '22023';
  end if;

  delete from public.reservation_blocked_dates where business_id = p_business;
  insert into public.reservation_blocked_dates (business_id, day)
  select distinct p_business, (d #>> '{}')::date from jsonb_array_elements(coalesce(p_blocked, '[]')) d
  where (d #>> '{}')::date >= v_hoy;
end $$;

-- 6. Solicitar (cliente con sesión) ---------------------------------------------------------------
-- p_items: [{"product_id":"…","quantity":2}, …]. p_idempotency: la app genera una clave por envío;
-- si la red reintenta, se devuelve la misma solicitud en vez de crear otra.
create function public.solicitar_reserva(
  p_business uuid,
  p_starts_at timestamptz,
  p_party int,
  p_name text,
  p_whatsapp text,
  p_table text default null,
  p_notes text default null,
  p_items jsonb default '[]',
  p_idempotency uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_r public.reservations;
  v_s public.reservation_settings;
  v_owner uuid;
  v_status text;
  v_local timestamp;
  v_phone text;
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_table text := nullif(btrim(coalesce(p_table, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_items jsonb := coalesce(p_items, '[]');
  v_code text;
  v_n int;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para solicitar una reserva' using errcode = '42501';
  end if;
  if p_idempotency is null then
    raise exception 'Falta la clave de la solicitud' using errcode = '22023';
  end if;

  -- Una solicitud a la vez por persona: así los límites y la clave de idempotencia no fallan si
  -- llegan dos envíos al mismo tiempo.
  perform pg_advisory_xact_lock(hashtextextended('reserva:' || v_uid::text, 0));

  select * into v_r from public.reservations where customer_id = v_uid and idempotency_key = p_idempotency;
  if found then
    if v_r.business_id <> p_business or v_r.starts_at <> p_starts_at or v_r.party_size <> p_party then
      raise exception 'Esa clave ya se usó para otra solicitud' using errcode = '22023';
    end if;
    return jsonb_build_object('id', v_r.id, 'code', v_r.code, 'status', v_r.status, 'repetida', true);
  end if;

  select b.owner_id, b.status into v_owner, v_status from public.businesses b where b.id = p_business;
  select * into v_s from public.reservation_settings where business_id = p_business;
  if v_status is distinct from 'publicado' or not public.es_restaurante(p_business) or v_s.business_id is null or not v_s.enabled then
    raise exception 'Este restaurante no está recibiendo solicitudes de reserva' using errcode = '22023';
  end if;
  if v_owner = v_uid then
    raise exception 'No puedes solicitar una reserva en tu propio restaurante' using errcode = '22023';
  end if;

  -- Personas.
  if p_party is null or p_party < 1 or p_party > v_s.max_party then
    raise exception 'Este restaurante recibe solicitudes de 1 a % personas', v_s.max_party using errcode = '22023';
  end if;

  -- Fecha y hora (en hora de Bogotá).
  v_local := p_starts_at at time zone 'America/Bogota';
  if p_starts_at is null or extract(second from v_local) <> 0 or (extract(hour from v_local) * 60 + extract(minute from v_local))::int % v_s.slot_minutes <> 0 then
    raise exception 'Elige una de las horas que ofrece el restaurante' using errcode = '22023';
  end if;
  if p_starts_at < v_now + make_interval(mins => v_s.min_notice_minutes) then
    raise exception 'Esa hora está muy cerca: el restaurante pide al menos % minutos de anticipación', v_s.min_notice_minutes using errcode = '22023';
  end if;
  if v_local::date > (v_now at time zone 'America/Bogota')::date + v_s.max_advance_days then
    raise exception 'Solo se puede solicitar con hasta % días de anticipación', v_s.max_advance_days using errcode = '22023';
  end if;
  if exists (select 1 from public.reservation_blocked_dates d where d.business_id = p_business and d.day = v_local::date) then
    raise exception 'El restaurante no recibe solicitudes para ese día' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.reservation_windows w
    where w.business_id = p_business and w.weekday = extract(isodow from v_local)
      and v_local::time >= w.starts and v_local::time < w.ends
  ) then
    raise exception 'El restaurante no recibe solicitudes a esa hora' using errcode = '22023';
  end if;

  -- Datos de contacto.
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Escribe el nombre de quien reserva' using errcode = '22023';
  end if;
  v_phone := public.normalizar_whatsapp(p_whatsapp);
  if v_phone is null then
    raise exception 'Escribe un número de WhatsApp válido, con indicativo si no es de Colombia' using errcode = '22023';
  end if;
  if char_length(coalesce(v_table, '')) > 80 or char_length(coalesce(v_notes, '')) > 300 then
    raise exception 'La preferencia de mesa o las observaciones son demasiado largas' using errcode = '22023';
  end if;
  if public.texto_ofensivo(v_name) or (v_table is not null and public.texto_ofensivo(v_table)) or (v_notes is not null and public.texto_ofensivo(v_notes)) then
    raise exception 'La solicitud tiene palabras que no se permiten' using errcode = '22023';
  end if;

  -- Platos (opcionales): cada uno una vez, de 1 a 20 unidades y del mismo restaurante.
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) > 20 then
    raise exception 'Puedes elegir hasta 20 platos' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(v_items) e where jsonb_typeof(e) <> 'object')
     or exists (
       select 1 from jsonb_to_recordset(v_items) as i(product_id uuid, quantity int)
       where i.product_id is null or i.quantity is null or i.quantity not between 1 and 20
          or not exists (select 1 from public.products p where p.id = i.product_id and p.business_id = p_business))
     or (select count(distinct i.product_id) from jsonb_to_recordset(v_items) as i(product_id uuid, quantity int)) <> jsonb_array_length(v_items) then
    raise exception 'Revisa los platos elegidos: cada uno una vez, de 1 a 20 unidades y de este restaurante' using errcode = '22023';
  end if;

  -- Contra solicitudes masivas.
  select count(*) into v_n from public.reservations where customer_id = v_uid and business_id = p_business and status = 'pendiente';
  if v_n >= 3 then
    raise exception 'Ya tienes 3 solicitudes pendientes en este restaurante. Espera su respuesta o cancela alguna.' using errcode = '22023';
  end if;
  select count(*) into v_n from public.reservations where customer_id = v_uid and created_at > v_now - interval '24 hours';
  if v_n >= 10 then
    raise exception 'Hiciste muchas solicitudes hoy. Intenta de nuevo mañana.' using errcode = '22023';
  end if;
  if exists (select 1 from public.reservations where customer_id = v_uid and business_id = p_business and starts_at = p_starts_at and status in ('pendiente', 'confirmada')) then
    raise exception 'Ya tienes una solicitud para ese restaurante a esa hora' using errcode = '22023';
  end if;

  -- Identificador corto (sin letras que se confunden: I, L, O, 0, 1).
  loop
    select 'R-' || string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from public.reservations where code = v_code);
  end loop;

  insert into public.reservations (code, business_id, customer_id, starts_at, party_size, contact_name, contact_whatsapp,
                                   table_preference, notes, respond_by, idempotency_key)
  values (v_code, p_business, v_uid, p_starts_at, p_party, v_name, v_phone, v_table, v_notes,
          -- Plazo para responder: lo que ocurra primero entre `response_hours` y 30 minutos antes de la visita.
          least(v_now + make_interval(hours => v_s.response_hours), p_starts_at - interval '30 minutes'),
          p_idempotency)
  returning * into v_r;

  insert into public.reservation_items (reservation_id, product_id, name, quantity, unit_price_cop)
  select v_r.id, p.id, p.name, i.quantity, p.price_cop
  from jsonb_to_recordset(v_items) as i(product_id uuid, quantity int)
  join public.products p on p.id = i.product_id and p.business_id = p_business;

  insert into public.reservation_events (reservation_id, from_status, to_status, actor_role, actor_id)
  values (v_r.id, null, 'pendiente', 'cliente', v_uid);

  return jsonb_build_object('id', v_r.id, 'code', v_r.code, 'status', v_r.status, 'repetida', false);
end $$;

-- 7. Decidir y cambiar de estado ------------------------------------------------------------------
-- Transiciones permitidas (cualquier otra se rechaza):
--   pendiente  → confirmada   restaurante, antes del plazo para responder y de la hora de la visita
--   pendiente  → rechazada    restaurante, con motivo
--   pendiente  → cancelada    cliente (retira su solicitud)
--   pendiente  → expirada     sistema, al pasar el plazo para responder
--   confirmada → cancelada    cliente o restaurante, antes de la visita (el restaurante con motivo)
--   confirmada → finalizada   restaurante, desde la hora de la visita (asistió)
--   confirmada → no_asistio   restaurante, desde la hora de la visita

create function public.confirmar_reserva(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_r public.reservations;
begin
  select r.* into v_r from public.reservations r join public.businesses b on b.id = r.business_id
  where r.id = p_id and b.owner_id = auth.uid() for update of r;
  if not found then
    raise exception 'No encontramos esa solicitud' using errcode = '42501';
  end if;
  if v_r.status <> 'pendiente' then
    raise exception 'Esta solicitud ya está %', public.estado_reserva_texto(v_r.status) using errcode = '22023';
  end if;
  if now() >= v_r.respond_by then
    raise exception 'El plazo para responder esta solicitud ya venció' using errcode = '22023';
  end if;
  if now() >= v_r.starts_at then
    raise exception 'La hora de la reserva ya pasó' using errcode = '22023';
  end if;
  update public.reservations set status = 'confirmada', decided_by = auth.uid(), decided_at = now(), updated_at = now()
  where id = p_id;
  insert into public.reservation_events (reservation_id, from_status, to_status, actor_role, actor_id)
  values (p_id, 'pendiente', 'confirmada', 'restaurante', auth.uid());
  return jsonb_build_object('id', p_id, 'status', 'confirmada');
end $$;

create function public.rechazar_reserva(p_id uuid, p_reason text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_r public.reservations;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select r.* into v_r from public.reservations r join public.businesses b on b.id = r.business_id
  where r.id = p_id and b.owner_id = auth.uid() for update of r;
  if not found then
    raise exception 'No encontramos esa solicitud' using errcode = '42501';
  end if;
  if v_r.status <> 'pendiente' then
    raise exception 'Esta solicitud ya está %', public.estado_reserva_texto(v_r.status) using errcode = '22023';
  end if;
  if p_reason is null or p_reason not in ('sin_mesas', 'sin_horario', 'cerrado_evento', 'grupo_grande', 'otro') then
    raise exception 'Elige el motivo del rechazo' using errcode = '22023';
  end if;
  if p_reason = 'otro' and char_length(coalesce(v_note, '')) < 3 then
    raise exception 'Cuéntale al cliente el motivo' using errcode = '22023';
  end if;
  if char_length(coalesce(v_note, '')) > 200 then
    raise exception 'La observación puede tener hasta 200 caracteres' using errcode = '22023';
  end if;
  if v_note is not null and public.texto_ofensivo(v_note) then
    raise exception 'La observación tiene palabras que no se permiten' using errcode = '22023';
  end if;
  update public.reservations set status = 'rechazada', reject_reason = p_reason, reject_note = v_note,
    decided_by = auth.uid(), decided_at = now(), updated_at = now()
  where id = p_id;
  insert into public.reservation_events (reservation_id, from_status, to_status, actor_role, actor_id, reason)
  values (p_id, 'pendiente', 'rechazada', 'restaurante', auth.uid(), p_reason);
  return jsonb_build_object('id', p_id, 'status', 'rechazada');
end $$;

-- La cancela quien la hizo o el restaurante. El rol sale de la sesión, no de la app.
create function public.cancelar_reserva(p_id uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_r public.reservations;
  v_owner uuid;
  v_rol text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_r from public.reservations where id = p_id for update;
  if not found then
    raise exception 'No encontramos esa solicitud' using errcode = '42501';
  end if;
  select b.owner_id into v_owner from public.businesses b where b.id = v_r.business_id;
  v_rol := case when v_r.customer_id = auth.uid() then 'cliente' when v_owner = auth.uid() then 'restaurante' end;
  if v_rol is null then
    raise exception 'No encontramos esa solicitud' using errcode = '42501';
  end if;
  if v_r.status = 'pendiente' and v_rol = 'restaurante' then
    raise exception 'Una solicitud pendiente no se cancela: recházala con su motivo' using errcode = '22023';
  end if;
  if v_r.status not in ('pendiente', 'confirmada') then
    raise exception 'Esta solicitud ya está %', public.estado_reserva_texto(v_r.status) using errcode = '22023';
  end if;
  if now() >= v_r.starts_at then
    raise exception 'La hora de la reserva ya pasó' using errcode = '22023';
  end if;
  if v_rol = 'restaurante' and char_length(coalesce(v_reason, '')) < 3 then
    raise exception 'Cuéntale al cliente por qué cancelas la reserva' using errcode = '22023';
  end if;
  if char_length(coalesce(v_reason, '')) > 200 then
    raise exception 'El motivo puede tener hasta 200 caracteres' using errcode = '22023';
  end if;
  if v_reason is not null and public.texto_ofensivo(v_reason) then
    raise exception 'El motivo tiene palabras que no se permiten' using errcode = '22023';
  end if;
  update public.reservations set status = 'cancelada', cancelled_by = v_rol, cancel_reason = v_reason, updated_at = now()
  where id = p_id;
  insert into public.reservation_events (reservation_id, from_status, to_status, actor_role, actor_id, reason)
  values (p_id, v_r.status, 'cancelada', v_rol, auth.uid(), v_reason);
  return jsonb_build_object('id', p_id, 'status', 'cancelada');
end $$;

-- Después de la hora de la visita, el restaurante marca si la persona llegó.
create function public.marcar_asistencia(p_id uuid, p_asistio boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_r public.reservations;
  v_to text := case when p_asistio then 'finalizada' else 'no_asistio' end;
begin
  select r.* into v_r from public.reservations r join public.businesses b on b.id = r.business_id
  where r.id = p_id and b.owner_id = auth.uid() for update of r;
  if not found then
    raise exception 'No encontramos esa solicitud' using errcode = '42501';
  end if;
  if v_r.status <> 'confirmada' then
    raise exception 'Solo se marca la asistencia de reservas confirmadas' using errcode = '22023';
  end if;
  if now() < v_r.starts_at then
    raise exception 'La asistencia se marca desde la hora de la reserva' using errcode = '22023';
  end if;
  update public.reservations set status = v_to, updated_at = now() where id = p_id;
  insert into public.reservation_events (reservation_id, from_status, to_status, actor_role, actor_id)
  values (p_id, 'confirmada', v_to, 'restaurante', auth.uid());
  return jsonb_build_object('id', p_id, 'status', v_to);
end $$;

-- Vence las solicitudes pendientes cuyo plazo pasó. Idempotente y segura frente a una confirmación
-- simultánea: solo toma filas que no estén bloqueadas (SKIP LOCKED) y vuelve a comprobar el estado.
-- La programación automática (cada pocos minutos) llega en la Entrega D; no es ejecutable desde las apps.
create function public.expirar_reservas() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_n int;
begin
  with vencidas as (
    select id from public.reservations
    where status = 'pendiente' and respond_by <= now()
    for update skip locked
  ), cambiadas as (
    update public.reservations r set status = 'expirada', updated_at = now()
    from vencidas v where r.id = v.id and r.status = 'pendiente'
    returning r.id
  )
  insert into public.reservation_events (reservation_id, from_status, to_status, actor_role)
  select id, 'pendiente', 'expirada', 'sistema' from cambiadas;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke execute on function public.guardar_config_reservas(uuid, boolean, int, int, int, int, int, text, jsonb, jsonb),
  public.solicitar_reserva(uuid, timestamptz, int, text, text, text, text, jsonb, uuid),
  public.confirmar_reserva(uuid), public.rechazar_reserva(uuid, text, text),
  public.cancelar_reserva(uuid, text), public.marcar_asistencia(uuid, boolean),
  public.expirar_reservas()
  from public, anon;
grant execute on function public.guardar_config_reservas(uuid, boolean, int, int, int, int, int, text, jsonb, jsonb),
  public.solicitar_reserva(uuid, timestamptz, int, text, text, text, text, jsonb, uuid),
  public.confirmar_reserva(uuid), public.rechazar_reserva(uuid, text, text),
  public.cancelar_reserva(uuid, text), public.marcar_asistencia(uuid, boolean)
  to authenticated;
revoke execute on function public.expirar_reservas() from authenticated;
grant execute on function public.expirar_reservas() to service_role;
