-- Zipa lo tiene: logo del negocio, búsqueda más rápida y reseñas por páginas.
--
-- Solo agrega columnas, un bucket, políticas, un índice y un trigger; recrea la vista pública
-- (mismas columnas y tres nuevas al final) y la función de búsqueda (misma firma y resultado).

-- 1. Logo del negocio ---------------------------------------------------------------------------
alter table public.businesses add column logo_url text check (logo_url is null or logo_url ~ '^https?://');
grant update (logo_url) on public.businesses to authenticated;

-- Bucket público "negocios" (eliminar-cuenta ya lo limpia). Cada dueño escribe solo en su carpeta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('negocios', 'negocios', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "subir logo de mi negocio" on storage.objects for insert to authenticated
  with check (bucket_id = 'negocios' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "reemplazar logo de mi negocio" on storage.objects for update to authenticated
  using (bucket_id = 'negocios' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'negocios' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar logo de mi negocio" on storage.objects for delete to authenticated
  using (bucket_id = 'negocios' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage solo borra o reemplaza un archivo si quien lo pide también puede LEERLO por la API. Los
-- buckets públicos "productos" (0009) y "resenas" (0012) no tenían esa política, así que al cambiar
-- una foto el archivo viejo quedaba huérfano. Cada dueño ve solo su carpeta (los demás siguen
-- viendo las fotos por la dirección pública, como antes).
create policy "ver mis archivos de logo" on storage.objects for select to authenticated
  using (bucket_id = 'negocios' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ver mis fotos de productos" on storage.objects for select to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ver mis fotos de reseñas" on storage.objects for select to authenticated
  using (bucket_id = 'resenas' and (storage.foldername(name))[1] = auth.uid()::text);

-- El logo debe estar en la carpeta del dueño: nadie pone de logo una imagen de otro sitio.
create function public.cuidar_logo_negocio() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated'
     and new.logo_url is not null
     and new.logo_url is distinct from (case when tg_op = 'UPDATE' then old.logo_url end)
     and new.logo_url !~ ('^https?://[^ ]+/storage/v1/object/public/negocios/' || new.owner_id::text || '/[^ ]+$') then
    raise exception 'Logo no válido: súbelo desde la app' using errcode = '22023';
  end if;
  return new;
end $$;
revoke execute on function public.cuidar_logo_negocio() from public, anon, authenticated;
create trigger businesses_logo before insert or update of logo_url on public.businesses
  for each row execute function public.cuidar_logo_negocio();

-- 2. Búsqueda con texto ya normalizado ---------------------------------------------------------
-- Las pruebas de carga (docs/PRUEBAS_DE_CARGA.md) mostraron que normalizar cada nombre en cada
-- búsqueda era el cuello de botella. Ahora se guarda normalizado al escribir.
alter table public.businesses
  add column nombre_busqueda text generated always as (public.normalizar(name)) stored,
  add column especialidad_busqueda text generated always as (public.normalizar(specialty)) stored;
alter table public.products add column nombre_busqueda text generated always as (public.normalizar(name)) stored;
alter table public.categories add column nombre_busqueda text generated always as (public.normalizar(name)) stored;

-- Vista pública: mismas columnas de la 0013, más logo y los dos textos de búsqueda al final.
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
       b.especialidad_busqueda
from public.businesses b
left join public.categories c on c.id = b.subcategory_id
where b.status = 'publicado';

-- Misma firma, mismas reglas que en la 0013; solo compara contra las columnas guardadas.
create or replace function public.buscar_negocios(
  p_texto text default null,
  p_categoria text default null,
  p_subcategoria text default null,
  p_orden text default 'relevancia',
  p_limite int default 30,
  p_desde int default 0
) returns setof public.businesses_public
-- Sin "set search_path": así Postgres la integra en la consulta y la planifica con los valores reales
-- (con esa cláusula tardaba ~19 ms; sin ella, ~4 ms, medido con la semilla de carga). Es segura:
-- corre con los permisos de quien consulta (security invoker) y todos los nombres llevan su esquema.
language sql stable security invoker as $$
  with q as (select nullif(public.normalizar(p_texto), '') as t)
  select bp.*
  from public.businesses_public bp cross join q
  where (p_categoria is null or bp.main_category = p_categoria)
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

-- 3. Reseñas por páginas (las más recientes primero) --------------------------------------------
create index reviews_negocio_fecha_idx on public.reviews (business_id, created_at desc);
