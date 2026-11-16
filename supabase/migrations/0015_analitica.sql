-- Zipa lo tiene: analítica de uso y estado del sistema para el panel del equipo.
--
-- Privacidad:
-- - No se guarda la cuenta, el correo, la IP ni la ubicación. Cada instalación de la app genera un
--   identificador aleatorio (device_id) que solo sirve para contar dispositivos activos.
-- - Las búsquedas se guardan normalizadas y cortas (40 caracteres), y el panel solo muestra las que
--   hicieron al menos 3 dispositivos distintos (así una búsqueda individual no se puede rastrear).
-- - Nadie lee la tabla por la API: el equipo ve solo agregados con admin_analitica().
-- Retención: se pueden borrar los eventos de más de 13 meses con admin_limpiar_eventos().

create table public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  device_id uuid not null,
  session_id uuid not null,
  app text not null check (app in ('clientes', 'negocios')),
  name text not null check (name in ('app_open', 'session_start', 'search', 'category_view', 'business_view', 'product_view', 'whatsapp_click', 'maps_click')),
  business_id uuid references public.businesses (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  category text,
  search_term text check (search_term is null or char_length(search_term) <= 40),
  results int check (results is null or results >= 0)
);
create index analytics_events_fecha_idx on public.analytics_events (created_at);
create index analytics_events_nombre_idx on public.analytics_events (name, created_at);
create index analytics_events_device_idx on public.analytics_events (device_id, created_at);
alter table public.analytics_events enable row level security;
-- Sin políticas ni grants: solo se escribe con registrar_evento() y se lee con admin_analitica().

-- 1. Registrar un evento (apps, con o sin sesión) ------------------------------------------------
create function public.registrar_evento(
  p_device uuid, p_session uuid, p_app text, p_name text,
  p_business uuid default null, p_product uuid default null, p_category text default null,
  p_search text default null, p_results int default null
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_search text;
begin
  if p_device is null or p_session is null then
    raise exception 'Falta el identificador del dispositivo o de la sesión' using errcode = '22023';
  end if;
  if p_app not in ('clientes', 'negocios')
     or p_name not in ('app_open', 'session_start', 'search', 'category_view', 'business_view', 'product_view', 'whatsapp_click', 'maps_click') then
    raise exception 'Evento no válido' using errcode = '22023';
  end if;
  -- Freno contra abuso: máximo 60 eventos por dispositivo y minuto (los demás se ignoran).
  if (select count(*) from public.analytics_events e where e.device_id = p_device and e.created_at > now() - interval '1 minute') >= 60 then
    return;
  end if;
  v_search := nullif(left(public.normalizar(p_search), 40), '');
  insert into public.analytics_events (device_id, session_id, app, name, business_id, product_id, category, search_term, results)
  values (
    p_device, p_session, p_app, p_name,
    (select b.id from public.businesses b where b.id = p_business and b.status = 'publicado'),
    (select p.id from public.products p where p.id = p_product),
    (select c.id from public.categories c where c.id = p_category),
    case when p_name = 'search' then v_search end,
    case when p_name = 'search' then least(greatest(coalesce(p_results, 0), 0), 1000) end
  );
end $$;
revoke execute on function public.registrar_evento(uuid, uuid, text, text, uuid, uuid, text, text, int) from public;
grant execute on function public.registrar_evento(uuid, uuid, text, text, uuid, uuid, text, text, int) to anon, authenticated;

-- 2. Analítica agregada para el panel (revisor o admin, con MFA) ---------------------------------
-- Días en hora de Colombia. "Activos" = dispositivos distintos con algún evento (no cuentas).
create function public.admin_analitica(p_dias int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_dias int := least(greatest(coalesce(p_dias, 30), 1), 365);
  v_desde timestamptz := (date_trunc('day', now() at time zone 'America/Bogota') - make_interval(days => v_dias - 1)) at time zone 'America/Bogota';
  v_hoy timestamptz := date_trunc('day', now() at time zone 'America/Bogota') at time zone 'America/Bogota';
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'dias', v_dias,
    'cuentas_registradas', (select count(*) from auth.users),
    'cuentas_activas_30d', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'activos_15min', (select count(distinct device_id) from public.analytics_events where created_at > now() - interval '15 minutes'),
    'activos_hoy', (select count(distinct device_id) from public.analytics_events where created_at >= v_hoy),
    'activos_7d', (select count(distinct device_id) from public.analytics_events where created_at > now() - interval '7 days'),
    'activos_30d', (select count(distinct device_id) from public.analytics_events where created_at > now() - interval '30 days'),
    'totales', coalesce((select jsonb_object_agg(name, n) from (
      select name, count(*) n from public.analytics_events where created_at >= v_desde group by name) t), '{}'::jsonb),
    'busquedas_sin_resultados', (select count(*) from public.analytics_events where name = 'search' and results = 0 and created_at >= v_desde),
    'serie', coalesce((select jsonb_agg(jsonb_build_object('dia', d.dia, 'activos', coalesce(x.activos, 0), 'aperturas', coalesce(x.aperturas, 0), 'sesiones', coalesce(x.sesiones, 0)) order by d.dia)
      from (select generate_series((v_desde at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::date, interval '1 day')::date as dia) d
      left join (
        select (created_at at time zone 'America/Bogota')::date as dia,
               count(distinct device_id) as activos,
               count(*) filter (where name = 'app_open') as aperturas,
               count(*) filter (where name = 'session_start') as sesiones
        from public.analytics_events where created_at >= v_desde group by 1) x on x.dia = d.dia), '[]'::jsonb),
    'top_categorias', coalesce((select jsonb_agg(t) from (
      select c.id, c.name as nombre, count(*) as vistas
      from public.analytics_events e join public.categories c on c.id = e.category
      where e.name = 'category_view' and e.created_at >= v_desde
      group by c.id, c.name order by vistas desc limit 10) t), '[]'::jsonb),
    'top_negocios', coalesce((select jsonb_agg(t) from (
      select b.id, b.name as nombre,
             count(*) filter (where e.name = 'business_view') as vistas,
             count(*) filter (where e.name = 'whatsapp_click') as whatsapp,
             count(*) filter (where e.name = 'maps_click') as como_llegar
      from public.analytics_events e join public.businesses b on b.id = e.business_id
      where e.name in ('business_view', 'whatsapp_click', 'maps_click') and e.created_at >= v_desde
      group by b.id, b.name order by vistas desc, whatsapp desc limit 10) t), '[]'::jsonb),
    'top_productos', coalesce((select jsonb_agg(t) from (
      select p.id, p.name as nombre, b.name as negocio, count(*) as vistas
      from public.analytics_events e join public.products p on p.id = e.product_id join public.businesses b on b.id = p.business_id
      where e.name = 'product_view' and e.created_at >= v_desde
      group by p.id, p.name, b.name order by vistas desc limit 10) t), '[]'::jsonb),
    -- Solo búsquedas hechas por 3 o más dispositivos distintos.
    'top_busquedas', coalesce((select jsonb_agg(t) from (
      select search_term as termino, count(*) as veces, count(distinct device_id) as dispositivos
      from public.analytics_events where name = 'search' and search_term is not null and created_at >= v_desde
      group by search_term having count(distinct device_id) >= 3 order by veces desc limit 10) t), '[]'::jsonb),
    'ultimo_evento', (select max(created_at) from public.analytics_events)
  );
end $$;
revoke execute on function public.admin_analitica(int) from public, anon;
grant execute on function public.admin_analitica(int) to authenticated;

-- 3. Uso de la base de datos (página Sistema) ------------------------------------------------------
create function public.admin_sistema() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'tamano_base_bytes', pg_database_size(current_database()),
    'conexiones', (select count(*) from pg_stat_activity where datname = current_database()),
    'version_postgres', current_setting('server_version'),
    'tablas', coalesce((select jsonb_agg(t) from (
      select c.relname as tabla, c.reltuples::bigint as filas_aprox, pg_total_relation_size(c.oid) as bytes
      from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
      order by pg_total_relation_size(c.oid) desc limit 12) t), '[]'::jsonb),
    'eventos_analitica', (select count(*) from public.analytics_events),
    'migraciones', (select count(*) from supabase_migrations.schema_migrations)
  );
end $$;
revoke execute on function public.admin_sistema() from public, anon;
grant execute on function public.admin_sistema() to authenticated;

-- 4. Retención: borra eventos de más de 13 meses (solo admin; queda en la bitácora) -------------
create function public.admin_limpiar_eventos() returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  n int;
begin
  if not public.is_admin('admin') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from public.analytics_events where created_at < now() - interval '13 months';
  get diagnostics n = row_count;
  insert into public.admin_actions (admin_id, action, target_type, details)
  values (auth.uid(), 'limpiar_eventos', 'analytics', jsonb_build_object('borrados', n));
  return n;
end $$;
revoke execute on function public.admin_limpiar_eventos() from public, anon;
grant execute on function public.admin_limpiar_eventos() to authenticated;
