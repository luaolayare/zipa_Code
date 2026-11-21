-- LocalmenteTuyo: ciudades activas, municipio de cada negocio e interés comercial de otras ciudades.
--
-- Regla de visibilidad pública: un negocio aparece solo si está publicado (aprobado por el equipo) Y su
-- municipio está ACTIVO. Se aplica en la tabla (RLS), la vista pública, la búsqueda, los destacados, los
-- productos y sus videos; reservas, reseñas y visitas por QR se rechazan si el negocio no es público.
-- Cambiar el estado de una ciudad NO aprueba ni publica negocios: solo los muestra u oculta.
--
-- Migración solo aditiva. Los negocios existentes quedan en Zipaquirá (25899), la única ciudad activa.

-- 1. Estado comercial de las ciudades -----------------------------------------------------------
-- Solo se guardan las ciudades que el equipo configuró; las demás son «proximamente».
create table public.cobertura_municipios (
  municipio_codigo text primary key references public.municipios (codigo),
  estado text not null check (estado in ('activa', 'en_preparacion', 'proximamente')),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null
);
alter table public.cobertura_municipios enable row level security;
create policy "estado de ciudades visible" on public.cobertura_municipios for select using (true);
revoke insert, update, delete on public.cobertura_municipios from anon, authenticated;
grant select (municipio_codigo, estado) on public.cobertura_municipios to anon, authenticated;

insert into public.cobertura_municipios (municipio_codigo, estado) values ('25899', 'activa');

create function public.municipio_activo(p_codigo text) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.cobertura_municipios c where c.municipio_codigo = p_codigo and c.estado = 'activa');
$$;
grant execute on function public.municipio_activo(text) to anon, authenticated;

-- 2. Municipio y punto geográfico de cada negocio ------------------------------------------------
-- El default 25899 mantiene funcionando los APK anteriores, que no envían el municipio.
alter table public.businesses
  add column municipio_codigo text not null default '25899' references public.municipios (codigo),
  add column latitud numeric(8,5),
  add column longitud numeric(8,5),
  add constraint businesses_punto_completo check ((latitud is null) = (longitud is null)),
  add constraint businesses_punto_en_colombia check (latitud is null or (latitud between -5 and 14 and longitud between -82 and -66));
create index businesses_municipio_estado_idx on public.businesses (municipio_codigo, status);
grant update (municipio_codigo, latitud, longitud) on public.businesses to authenticated;

-- Al registrar un negocio desde la app, su ciudad debe estar activa o en preparación (en las demás se
-- registra el interés, no un negocio). No aplica al equipo (service role).
create function public.cuidar_ciudad_negocio() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if (tg_op = 'INSERT' or new.municipio_codigo is distinct from old.municipio_codigo)
     and not exists (select 1 from public.cobertura_municipios c
                     where c.municipio_codigo = new.municipio_codigo and c.estado in ('activa', 'en_preparacion')) then
    raise exception 'LocalmenteTuyo todavía no está disponible en ese municipio. Puedes registrar tu interés para una futura apertura'
      using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.cuidar_ciudad_negocio() from public, anon, authenticated;
create trigger businesses_cuidar_ciudad before insert or update of municipio_codigo on public.businesses
  for each row execute function public.cuidar_ciudad_negocio();

-- Un negocio publicado que cambia de municipio o mueve su punto más de 300 m vuelve a revisión
-- (igual que con el nombre o la dirección, migración 0009). Poner el punto por primera vez no lo exige.
create or replace function public.cuidar_estado_negocio() returns trigger
language plpgsql as $$
begin
  -- Solo aplica a la API (rol authenticated). service_role y postgres no pasan por aquí.
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'No se puede cambiar el dueño del negocio' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and new.status in ('publicado', 'rechazado') then
    raise exception 'Solo el equipo de revisión puede publicar o rechazar un negocio' using errcode = '42501';
  end if;
  if old.status = 'publicado'
     and ((new.name, new.address, new.type, new.category, new.municipio_codigo)
            is distinct from (old.name, old.address, old.type, old.category, old.municipio_codigo)
          or (old.latitud is not null and (new.latitud is null or
              sqrt(power((new.latitud - old.latitud) * 111.32, 2)
                   + power((new.longitud - old.longitud) * 111.32 * cos(radians(old.latitud)), 2)) > 0.3))) then
    new.status := 'en_revision';
  end if;
  return new;
end $$;
revoke execute on function public.cuidar_estado_negocio() from public, anon, authenticated;

-- 3. Visibilidad pública: publicado Y ciudad activa ----------------------------------------------
drop policy "negocios publicados" on public.businesses;
create policy "negocios publicados" on public.businesses for select
  using ((status = 'publicado' and public.municipio_activo(municipio_codigo)) or owner_id = auth.uid());

drop policy "productos visibles" on public.products;
create policy "productos visibles" on public.products for select
  using (exists (select 1 from public.businesses b where b.id = business_id
                 and ((b.status = 'publicado' and public.municipio_activo(b.municipio_codigo)) or b.owner_id = auth.uid())));

drop policy "escribir reseña" on public.reviews;
create policy "escribir reseña" on public.reviews for insert
  with check (user_id = auth.uid()
    and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'publicado'
                and public.municipio_activo(b.municipio_codigo) and b.owner_id <> auth.uid()));

drop policy "ver videos aprobados" on storage.objects;
create policy "ver videos aprobados" on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'videos'
    and exists (
      select 1 from public.products p
      join public.businesses b on b.id = p.business_id
      where p.video_path = storage.objects.name and p.video_status = 'aprobado' and b.status = 'publicado'
        and public.municipio_activo(b.municipio_codigo)
    )
  );

-- Vista pública: mismas columnas de la 0016, más el municipio y el punto al final.
create or replace view public.businesses_public with (security_invoker = true) as
select b.id, b.owner_id, b.name, b.type, b.category, b.address, b.hours, b.whatsapp, b.status,
       b.created_at, b.specialty, b.price_level,
       (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.business_id = b.id and r.status = 'publicada') as rating,
       (select count(*)::int from public.reviews r where r.business_id = b.id and r.status = 'publicada') as review_count,
       (select count(*)::int from public.products p where p.business_id = b.id and p.model_url is not null) as product_count,
       b.subcategory_id,
       c.parent_id as main_category,
       c.name as subcategory_name,
       coalesce((select array_agg(t.category_id order by t.category_id) from public.business_tags t where t.business_id = b.id), '{}'::text[]) as tags,
       b.logo_url,
       b.nombre_busqueda,
       b.especialidad_busqueda,
       b.municipio_codigo,
       m.nombre as municipio,
       d.nombre as departamento,
       b.latitud,
       b.longitud
from public.businesses b
join public.cobertura_municipios cm on cm.municipio_codigo = b.municipio_codigo and cm.estado = 'activa'
join public.municipios m on m.codigo = b.municipio_codigo
join public.departamentos d on d.codigo = m.departamento_codigo
left join public.categories c on c.id = b.subcategory_id
where b.status = 'publicado';

-- Búsqueda y listados: mismas reglas de la 0016 más el municipio (p_municipio null = todas las ciudades
-- activas, como antes: así siguen funcionando los APK anteriores).
drop function public.buscar_negocios(text, text, text, text, int, int);
create function public.buscar_negocios(
  p_texto text default null,
  p_categoria text default null,
  p_subcategoria text default null,
  p_orden text default 'relevancia',
  p_limite int default 30,
  p_desde int default 0,
  p_municipio text default null
) returns setof public.businesses_public
-- Sin "set search_path" (ver 0016): security invoker y todos los nombres llevan su esquema.
language sql stable security invoker as $$
  with q as (select nullif(public.normalizar(p_texto), '') as t)
  select bp.*
  from public.businesses_public bp cross join q
  where (p_municipio is null or bp.municipio_codigo = p_municipio)
    and (p_categoria is null or bp.main_category = p_categoria)
    and (p_subcategoria is null or bp.subcategory_id = p_subcategoria or p_subcategoria = any (bp.tags))
    and (q.t is null
      or bp.nombre_busqueda like '%' || q.t || '%'
      or bp.especialidad_busqueda like '%' || q.t || '%'
      or exists (select 1 from public.categories c
                 where (c.id = bp.subcategory_id or c.id = any (bp.tags)) and c.nombre_busqueda like '%' || q.t || '%')
      or exists (select 1 from public.products p
                 where p.business_id = bp.id and p.nombre_busqueda like '%' || q.t || '%'))
  order by
    case when p_orden = 'recientes' then bp.created_at end desc nulls last,
    case when p_orden = 'calificacion' then bp.review_count >= 5 end desc nulls last,
    case when p_orden = 'calificacion' then bp.rating end desc nulls last,
    case when q.t is not null then bp.nombre_busqueda like q.t || '%' end desc nulls last,
    case when q.t is not null then bp.nombre_busqueda like '%' || q.t || '%' end desc nulls last,
    bp.review_count >= 5 desc,
    bp.rating desc nulls last,
    bp.review_count desc,
    bp.name
  limit least(greatest(coalesce(p_limite, 30), 1), 50)
  offset greatest(coalesce(p_desde, 0), 0);
$$;
grant execute on function public.buscar_negocios(text, text, text, text, int, int, text) to anon, authenticated;

drop function public.negocios_destacados(int);
create function public.negocios_destacados(p_limite int default 10, p_municipio text default null) returns setof public.businesses_public
language sql stable security invoker as $$
  select bp.*
  from public.businesses_public bp
  join (
    select f.business_id, min(f.position) as pos
    from public.featured_placements f
    where now() >= f.starts_at and now() < f.ends_at
    group by f.business_id
  ) d on d.business_id = bp.id
  where p_municipio is null or bp.municipio_codigo = p_municipio
  order by d.pos, bp.name
  limit least(greatest(coalesce(p_limite, 10), 1), 20);
$$;
grant execute on function public.negocios_destacados(int, text) to anon, authenticated;

-- Reservas, reseñas nuevas y visitas por QR: solo en negocios públicos (también cuando entran por las
-- funciones solicitar_reserva, guardar_mi_resena y registrar_visita, que corren con permisos propios).
-- Aplica a lo que llega desde las apps (rol anon o authenticated, también dentro de esas funciones
-- SECURITY DEFINER, porque el rol de la petición no cambia); no a la carga de datos del equipo.
create function public.exigir_negocio_publico() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated') then
    return new;
  end if;
  if not exists (select 1 from public.businesses b
                 where b.id = new.business_id and b.status = 'publicado' and public.municipio_activo(b.municipio_codigo)) then
    raise exception 'Este negocio no está disponible en este momento' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.exigir_negocio_publico() from public, anon, authenticated;
create trigger reservations_negocio_publico before insert on public.reservations
  for each row execute function public.exigir_negocio_publico();
create trigger reviews_negocio_publico before insert on public.reviews
  for each row execute function public.exigir_negocio_publico();
create trigger business_visits_negocio_publico before insert or update on public.business_visits
  for each row execute function public.exigir_negocio_publico();

-- 4. Interés de comerciantes de ciudades que aún no abren ------------------------------------------
-- Datos mínimos (sin cédula, NIT, fotos ni documentos) y solo para avisarles cuando abra su ciudad.
create table public.interes_comercial (
  id uuid primary key default gen_random_uuid(),
  municipio_codigo text not null references public.municipios (codigo),
  nombre_negocio text not null check (char_length(nombre_negocio) between 2 and 80),
  tipo text not null check (tipo in ('restaurante', 'emprendimiento')),
  nombre_contacto text not null check (char_length(nombre_contacto) between 2 and 80),
  whatsapp text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  acepta_contacto boolean not null check (acepta_contacto),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index interes_comercial_municipio_idx on public.interes_comercial (municipio_codigo, created_at desc);
alter table public.interes_comercial enable row level security;
-- Sin políticas para anon ni authenticated: se escribe solo con registrar_interes_comercial y lo lee el
-- equipo con admin_interesados.
revoke all on public.interes_comercial from anon, authenticated;

create function public.registrar_interes_comercial(
  p_municipio text, p_nombre_negocio text, p_tipo text, p_nombre_contacto text, p_whatsapp text, p_acepta boolean
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_wa text := public.normalizar_whatsapp(p_whatsapp);
  v_nombre text;
  v_estado text;
  v_id uuid;
begin
  select m.nombre into v_nombre from public.municipios m where m.codigo = p_municipio;
  if v_nombre is null then
    raise exception 'Elige un municipio de la lista' using errcode = '22023';
  end if;
  select c.estado into v_estado from public.cobertura_municipios c where c.municipio_codigo = p_municipio;
  if v_estado = 'activa' then
    raise exception 'LocalmenteTuyo ya está disponible en %: puedes registrar tu negocio', v_nombre using errcode = '22023';
  end if;
  if coalesce(p_acepta, false) is not true then
    raise exception 'Necesitamos tu autorización para contactarte' using errcode = '22023';
  end if;
  if v_wa is null then
    raise exception 'Escribe un WhatsApp válido, por ejemplo 300 123 4567' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_nombre_negocio, ''))) < 2 or char_length(btrim(coalesce(p_nombre_contacto, ''))) < 2 then
    raise exception 'Escribe el nombre del negocio y el tuyo' using errcode = '22023';
  end if;
  if p_tipo not in ('restaurante', 'emprendimiento') then
    raise exception 'Elige si es restaurante o emprendimiento' using errcode = '22023';
  end if;
  -- El mismo WhatsApp en el mismo municipio el mismo día cuenta una sola vez.
  select i.id into v_id from public.interes_comercial i
  where i.whatsapp = v_wa and i.municipio_codigo = p_municipio and i.created_at > now() - interval '24 hours';
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'repetido', true);
  end if;
  if (select count(*) from public.interes_comercial i where i.whatsapp = v_wa and i.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Ya registraste varios negocios hoy. Intenta mañana' using errcode = '22023';
  end if;
  insert into public.interes_comercial (municipio_codigo, nombre_negocio, tipo, nombre_contacto, whatsapp, acepta_contacto, user_id)
  values (p_municipio, left(btrim(p_nombre_negocio), 80), p_tipo, left(btrim(p_nombre_contacto), 80), v_wa, true, auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'repetido', false);
end $$;
revoke execute on function public.registrar_interes_comercial(text, text, text, text, text, boolean) from public;
grant execute on function public.registrar_interes_comercial(text, text, text, text, text, boolean) to anon, authenticated;

-- 5. Equipo: ciudades, cambio de estado (con bitácora) e interesados ----------------------------
create function public.admin_ciudades() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(x order by (x ->> 'orden')::int, x ->> 'nombre')
    from (
      select jsonb_build_object(
        'codigo', m.codigo,
        'nombre', m.nombre,
        'departamento', d.nombre,
        'estado', coalesce(c.estado, 'proximamente'),
        'configurada', c.municipio_codigo is not null,
        'actualizado_en', c.actualizado_en,
        'publicados', (select count(*) from public.businesses b where b.municipio_codigo = m.codigo and b.status = 'publicado'),
        'en_revision', (select count(*) from public.businesses b where b.municipio_codigo = m.codigo and b.status = 'en_revision'),
        'borradores', (select count(*) from public.businesses b where b.municipio_codigo = m.codigo and b.status = 'borrador'),
        'interesados', (select count(*) from public.interes_comercial i where i.municipio_codigo = m.codigo),
        'orden', case coalesce(c.estado, 'proximamente') when 'activa' then 0 when 'en_preparacion' then 1 else 2 end
      ) as x
      from public.municipios m
      join public.departamentos d on d.codigo = m.departamento_codigo
      left join public.cobertura_municipios c on c.municipio_codigo = m.codigo
      where c.municipio_codigo is not null
         or exists (select 1 from public.businesses b where b.municipio_codigo = m.codigo)
         or exists (select 1 from public.interes_comercial i where i.municipio_codigo = m.codigo)
    ) t
  ), '[]'::jsonb);
end $$;
revoke execute on function public.admin_ciudades() from public, anon;
grant execute on function public.admin_ciudades() to authenticated;

create function public.admin_cambiar_estado_ciudad(p_municipio text, p_estado text, p_nota text default null) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_nombre text;
  v_antes text;
begin
  if not public.is_admin('admin') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_estado not in ('activa', 'en_preparacion', 'proximamente') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  select m.nombre into v_nombre from public.municipios m where m.codigo = p_municipio;
  if v_nombre is null then
    raise exception 'Municipio no encontrado' using errcode = '22023';
  end if;
  select c.estado into v_antes from public.cobertura_municipios c where c.municipio_codigo = p_municipio;
  if coalesce(v_antes, 'proximamente') = p_estado then
    return;
  end if;
  -- Solo cambia el estado de la ciudad: ningún negocio se aprueba, publica ni borra aquí.
  insert into public.cobertura_municipios (municipio_codigo, estado, actualizado_en, actualizado_por)
  values (p_municipio, p_estado, now(), auth.uid())
  on conflict (municipio_codigo) do update set estado = excluded.estado, actualizado_en = now(), actualizado_por = auth.uid();
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'cambiar_estado_ciudad', 'municipio', null,
          jsonb_build_object('codigo', p_municipio, 'nombre', v_nombre, 'de', coalesce(v_antes, 'proximamente'), 'a', p_estado,
                             'nota', nullif(btrim(coalesce(p_nota, '')), '')));
end $$;
revoke execute on function public.admin_cambiar_estado_ciudad(text, text, text) from public, anon;
grant execute on function public.admin_cambiar_estado_ciudad(text, text, text) to authenticated;

create function public.admin_interesados(p_municipio text default null, p_limite int default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', i.id, 'municipio_codigo', i.municipio_codigo, 'municipio', m.nombre, 'departamento', d.nombre,
      'nombre_negocio', i.nombre_negocio, 'tipo', i.tipo, 'nombre_contacto', i.nombre_contacto,
      'whatsapp', i.whatsapp, 'created_at', i.created_at) order by i.created_at desc)
    from (select * from public.interes_comercial i2
          where p_municipio is null or i2.municipio_codigo = p_municipio
          order by i2.created_at desc
          limit least(greatest(coalesce(p_limite, 200), 1), 500)) i
    join public.municipios m on m.codigo = i.municipio_codigo
    join public.departamentos d on d.codigo = m.departamento_codigo
  ), '[]'::jsonb);
end $$;
revoke execute on function public.admin_interesados(text, int) from public, anon;
grant execute on function public.admin_interesados(text, int) to authenticated;
