-- Zipa lo tiene: categorías administrables, etiquetas secundarias y búsqueda en el servidor.
--
-- Dos categorías principales (Emprendimientos y Restaurantes) con subcategorías que el equipo
-- administra desde el panel. Cada negocio tiene UNA subcategoría principal (de ahí sale su
-- categoría principal) y hasta 3 etiquetas secundarias.
--
-- Compatibilidad:
-- - No borra ni renombra nada. La columna vieja businesses.category (comer / artesanias /
--   cafe_dulces) se conserva y se mantiene sincronizada por trigger, porque las apps ya
--   instaladas la leen y la escriben.
-- - Los negocios actuales reciben una subcategoría según su categoría vieja:
--     comer → Otros restaurantes · artesanias → Artesanías · cafe_dulces → Cafeterías
--   El dueño puede cambiarla desde su panel.
-- - Si una app vieja cambia solo la categoría vieja, el trigger elige la subcategoría equivalente.
-- - La regla de competencia de guardar_mi_resena() (0012) sigue usando la categoría vieja: no cambia.

-- 1. Normalizar textos para buscar (sin tildes, mayúsculas ni signos) --------------------------
-- Misma idea que normalize() de packages/shared/src/categories.ts. Quita también % y _, así que
-- el texto del usuario no puede usarse como comodín en LIKE.
create function public.normalizar(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select btrim(regexp_replace(
    lower(translate(coalesce(p, ''),
      'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãéèëêíìïîóòöôõúùüûñç',
      'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc')),
    '[^a-z0-9]+', ' ', 'g'));
$$;

-- 2. Categorías ------------------------------------------------------------------------------------
create table public.categories (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  parent_id text references public.categories (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index categories_parent_idx on public.categories (parent_id, sort_order);
alter table public.categories enable row level security;

-- Todos leen (también las inactivas, para mostrar el nombre de la de un negocio). Nadie escribe
-- por la API: el equipo usa admin_guardar_categoria() y admin_borrar_categoria().
create policy "categorías visibles" on public.categories for select using (true);
grant select on public.categories to anon, authenticated;

insert into public.categories (id, parent_id, name, sort_order) values
  ('emprendimientos', null, 'Emprendimientos', 1),
  ('restaurantes', null, 'Restaurantes', 2),
  ('artesanias', 'emprendimientos', 'Artesanías', 10),
  ('reposteria', 'emprendimientos', 'Repostería', 20),
  ('heladerias', 'emprendimientos', 'Heladerías', 30),
  ('productos_locales', 'emprendimientos', 'Productos locales', 40),
  ('regalos_detalles', 'emprendimientos', 'Regalos y detalles', 50),
  ('otros_emprendimientos', 'emprendimientos', 'Otros emprendimientos', 90),
  ('comida_tipica', 'restaurantes', 'Comida típica', 10),
  ('comida_rapida', 'restaurantes', 'Comida rápida', 20),
  ('parrillas', 'restaurantes', 'Parrillas', 30),
  ('pizzerias', 'restaurantes', 'Pizzerías', 40),
  ('cafeterias', 'restaurantes', 'Cafeterías', 50),
  ('otros_restaurantes', 'restaurantes', 'Otros restaurantes', 90);

-- Las subcategorías cuelgan de una categoría principal (solo dos niveles).
create function public.cuidar_categoria() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.parent_id is not null
     and not exists (select 1 from public.categories c where c.id = new.parent_id and c.parent_id is null) then
    raise exception 'Una subcategoría debe pertenecer a una categoría principal' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function public.cuidar_categoria() from public, anon, authenticated;
create trigger categories_cuidar before insert or update on public.categories
  for each row execute function public.cuidar_categoria();

-- Categoría vieja equivalente a una subcategoría (para las apps instaladas y los colores).
create function public.categoria_heredada(p_sub text) returns public.business_category
language sql stable set search_path = '' as $$
  select (case
    when c.id in ('cafeterias', 'reposteria', 'heladerias') then 'cafe_dulces'
    when c.parent_id = 'restaurantes' then 'comer'
    else 'artesanias'
  end)::public.business_category
  from public.categories c where c.id = p_sub;
$$;
grant execute on function public.categoria_heredada(text) to anon, authenticated;

-- 3. Subcategoría principal de cada negocio ---------------------------------------------------------
alter table public.businesses add column subcategory_id text references public.categories (id) on delete restrict;

update public.businesses set subcategory_id = case category
  when 'comer' then 'otros_restaurantes'
  when 'artesanias' then 'artesanias'
  when 'cafe_dulces' then 'cafeterias'
end;

alter table public.businesses alter column subcategory_id set not null;
create index businesses_subcategory_idx on public.businesses (subcategory_id);

-- El dueño puede cambiar la subcategoría (además de las columnas de la 0009).
grant update (subcategory_id) on public.businesses to authenticated;

-- Mantiene la categoría vieja y la nueva de acuerdo. Se llama "businesses_clasificar" para
-- correr antes que businesses_cuidar_estado (los triggers BEFORE corren en orden alfabético):
-- así, si cambia la categoría vieja de un negocio publicado, vuelve a revisión como antes.
create function public.clasificar_negocio() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_parent text;
  v_active boolean;
begin
  if tg_op = 'INSERT' and new.subcategory_id is null
     or tg_op = 'UPDATE' and new.subcategory_id is not distinct from old.subcategory_id
        and new.category is distinct from old.category then
    -- App anterior: solo trae la categoría vieja.
    new.subcategory_id := case new.category
      when 'comer' then 'otros_restaurantes'
      when 'artesanias' then 'artesanias'
      when 'cafe_dulces' then 'cafeterias'
    end;
  end if;

  select c.parent_id, c.active into v_parent, v_active from public.categories c where c.id = new.subcategory_id;
  if v_parent is null then
    raise exception 'Elige una subcategoría válida para tu negocio' using errcode = '23514';
  end if;
  if (tg_op = 'INSERT' or new.subcategory_id is distinct from old.subcategory_id)
     and not v_active and current_user = 'authenticated' then
    raise exception 'Esa subcategoría ya no está disponible. Elige otra' using errcode = '23514';
  end if;

  new.category := public.categoria_heredada(new.subcategory_id);
  return new;
end $$;
revoke execute on function public.clasificar_negocio() from public, anon, authenticated;
create trigger businesses_clasificar before insert or update on public.businesses
  for each row execute function public.clasificar_negocio();

-- 4. Etiquetas secundarias ("también ofrece") -------------------------------------------------------
create table public.business_tags (
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id text not null references public.categories (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (business_id, category_id)
);
create index business_tags_category_idx on public.business_tags (category_id);
alter table public.business_tags enable row level security;

-- Se ven si se ve el negocio (la subconsulta respeta el RLS de businesses: publicado, dueño o equipo).
create policy "etiquetas visibles" on public.business_tags for select
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy "agregar etiqueta a mi negocio" on public.business_tags for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "quitar etiqueta de mi negocio" on public.business_tags for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
grant select on public.business_tags to anon, authenticated;
grant insert (business_id, category_id), delete on public.business_tags to authenticated;

create function public.cuidar_etiqueta() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_parent text;
  v_active boolean;
begin
  select c.parent_id, c.active into v_parent, v_active from public.categories c where c.id = new.category_id;
  if v_parent is null then
    raise exception 'Las etiquetas deben ser subcategorías' using errcode = '23514';
  end if;
  if not v_active and current_user = 'authenticated' then
    raise exception 'Esa subcategoría ya no está disponible' using errcode = '23514';
  end if;
  -- Sin duplicar la clasificación: la etiqueta no puede ser la subcategoría principal.
  if exists (select 1 from public.businesses b where b.id = new.business_id and b.subcategory_id = new.category_id) then
    raise exception 'Esa ya es la subcategoría principal de tu negocio' using errcode = '23514';
  end if;
  if (select count(*) from public.business_tags t where t.business_id = new.business_id) >= 3 then
    raise exception 'Puedes agregar hasta 3 etiquetas' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function public.cuidar_etiqueta() from public, anon, authenticated;
create trigger business_tags_cuidar before insert on public.business_tags
  for each row execute function public.cuidar_etiqueta();

-- Si la subcategoría principal pasa a ser una que estaba como etiqueta, se quita la etiqueta.
create function public.quitar_etiqueta_principal() returns trigger
language plpgsql set search_path = '' as $$
begin
  delete from public.business_tags t where t.business_id = new.id and t.category_id = new.subcategory_id;
  return null;
end $$;
revoke execute on function public.quitar_etiqueta_principal() from public, anon, authenticated;
create trigger businesses_quitar_etiqueta_principal after update of subcategory_id on public.businesses
  for each row execute function public.quitar_etiqueta_principal();

-- 5. Vista pública con la clasificación ----------------------------------------------------------
-- Mismas columnas de la 0012 (en el mismo orden) y cuatro nuevas al final.
create or replace view public.businesses_public with (security_invoker = true) as
select b.id, b.owner_id, b.name, b.type, b.category, b.address, b.hours, b.whatsapp, b.status,
       b.created_at, b.specialty, b.price_level,
       (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.business_id = b.id and r.status = 'publicada') as rating,
       (select count(*)::int from public.reviews r where r.business_id = b.id and r.status = 'publicada') as review_count,
       (select count(*)::int from public.products p where p.business_id = b.id and p.model_url is not null) as product_count,
       b.subcategory_id,
       c.parent_id as main_category,
       c.name as subcategory_name,
       coalesce((select array_agg(t.category_id order by t.category_id) from public.business_tags t where t.business_id = b.id), '{}'::text[]) as tags
from public.businesses b
left join public.categories c on c.id = b.subcategory_id
where b.status = 'publicado';

-- 6. Búsqueda en el servidor -------------------------------------------------------------------------
-- Busca por nombre del negocio, lo que vende, nombre de un producto o plato, y subcategoría
-- (principal o etiqueta). Filtra por categoría principal y subcategoría. Devuelve páginas de
-- hasta 50: el celular nunca descarga todos los negocios para filtrarlos.
-- Órdenes: 'relevancia' (por defecto), 'calificacion' y 'recientes'. En 'calificacion' van
-- primero los negocios con al menos 5 reseñas (MIN_REVIEWS_FOR_RANKING en la app).
-- security invoker: aplica el RLS de quien consulta (solo negocios publicados y sus productos).
create function public.buscar_negocios(
  p_texto text default null,
  p_categoria text default null,
  p_subcategoria text default null,
  p_orden text default 'relevancia',
  p_limite int default 30,
  p_desde int default 0
) returns setof public.businesses_public
language sql stable security invoker set search_path = '' as $$
  with q as (select nullif(public.normalizar(p_texto), '') as t)
  select bp.*
  from public.businesses_public bp cross join q
  where (p_categoria is null or bp.main_category = p_categoria)
    and (p_subcategoria is null or bp.subcategory_id = p_subcategoria or p_subcategoria = any (bp.tags))
    and (q.t is null
      or public.normalizar(bp.name) like '%' || q.t || '%'
      or public.normalizar(bp.specialty) like '%' || q.t || '%'
      or public.normalizar(bp.subcategory_name) like '%' || q.t || '%'
      or exists (select 1 from public.products p
                 where p.business_id = bp.id and public.normalizar(p.name) like '%' || q.t || '%')
      or exists (select 1 from public.business_tags bt join public.categories c on c.id = bt.category_id
                 where bt.business_id = bp.id and public.normalizar(c.name) like '%' || q.t || '%'))
  order by
    case when p_orden = 'recientes' then bp.created_at end desc nulls last,
    case when p_orden = 'calificacion' then bp.review_count >= 5 end desc nulls last,
    case when p_orden = 'calificacion' then bp.rating end desc nulls last,
    case when q.t is not null then public.normalizar(bp.name) like q.t || '%' end desc nulls last,
    case when q.t is not null then public.normalizar(bp.name) like '%' || q.t || '%' end desc nulls last,
    bp.review_count >= 5 desc,
    bp.rating desc nulls last,
    bp.review_count desc,
    bp.name
  limit least(greatest(coalesce(p_limite, 30), 1), 50)
  offset greatest(coalesce(p_desde, 0), 0);
$$;
grant execute on function public.buscar_negocios(text, text, text, text, int, int) to anon, authenticated;

-- 7. Administración de categorías (panel del equipo, rol admin con MFA) ------------------------
-- Crea una subcategoría (p_id null) o edita nombre, orden y estado de una existente.
-- No se crean categorías principales nuevas ni se cambia de qué principal cuelga una subcategoría
-- (movería negocios de sección sin que su dueño lo sepa).
create function public.admin_guardar_categoria(p_id text, p_parent text, p_nombre text, p_orden int default null, p_activa boolean default null)
returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id text := p_id;
  v_parent text;
  v_nombre text := btrim(coalesce(p_nombre, ''));
begin
  if not public.is_admin('admin') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if char_length(v_nombre) not between 2 and 40 then
    raise exception 'El nombre debe tener entre 2 y 40 caracteres' using errcode = '22023';
  end if;

  if v_id is null then
    if not exists (select 1 from public.categories c where c.id = p_parent and c.parent_id is null) then
      raise exception 'Elige la categoría principal' using errcode = '22023';
    end if;
    v_parent := p_parent;
    v_id := left(replace(public.normalizar(v_nombre), ' ', '_'), 40);
    if char_length(v_id) < 2 then
      raise exception 'El nombre debe tener letras o números' using errcode = '22023';
    end if;
    if exists (select 1 from public.categories c where c.id = v_id or public.normalizar(c.name) = public.normalizar(v_nombre)) then
      raise exception 'Ya existe una categoría con ese nombre' using errcode = '23505';
    end if;
    insert into public.categories (id, parent_id, name, sort_order, active)
    values (v_id, v_parent, v_nombre, coalesce(p_orden, 100), coalesce(p_activa, true));
  else
    select c.parent_id into v_parent from public.categories c where c.id = v_id;
    if not found then
      raise exception 'Esa categoría no existe' using errcode = '22023';
    end if;
    if exists (select 1 from public.categories c where c.id <> v_id and public.normalizar(c.name) = public.normalizar(v_nombre)) then
      raise exception 'Ya existe una categoría con ese nombre' using errcode = '23505';
    end if;
    update public.categories c
    set name = v_nombre, sort_order = coalesce(p_orden, c.sort_order), active = coalesce(p_activa, c.active)
    where c.id = v_id;
  end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_id is null then 'crear_categoria' else 'editar_categoria' end, 'category', null,
          jsonb_build_object('categoria', v_id, 'principal', v_parent, 'nombre', v_nombre, 'orden', p_orden, 'activa', p_activa));
  return v_id;
end $$;
revoke execute on function public.admin_guardar_categoria(text, text, text, int, boolean) from public, anon;
grant execute on function public.admin_guardar_categoria(text, text, text, int, boolean) to authenticated;

-- Borra una subcategoría sin uso. Con negocios asociados no se borra: se desactiva.
create function public.admin_borrar_categoria(p_id text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_parent text;
  v_usos int;
begin
  if not public.is_admin('admin') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select c.parent_id into v_parent from public.categories c where c.id = p_id;
  if not found then
    raise exception 'Esa categoría no existe' using errcode = '22023';
  end if;
  if v_parent is null then
    raise exception 'Las categorías principales no se borran' using errcode = '42501';
  end if;
  select (select count(*) from public.businesses b where b.subcategory_id = p_id)
       + (select count(*) from public.business_tags t where t.category_id = p_id) into v_usos;
  if v_usos > 0 then
    raise exception 'Tiene % negocio(s) asociados: desactívala en lugar de borrarla', v_usos using errcode = '23503';
  end if;
  delete from public.categories where id = p_id;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'borrar_categoria', 'category', null, jsonb_build_object('categoria', p_id, 'principal', v_parent));
end $$;
revoke execute on function public.admin_borrar_categoria(text) from public, anon;
grant execute on function public.admin_borrar_categoria(text) to authenticated;
