-- Zipa lo tiene: lo que necesita el panel de negocios (MVP): fotos y videos de productos y editar el negocio.
--
-- - Foto del producto: es lo que ve el turista mientras no exista el modelo 3D. Bucket PÚBLICO
--   "productos" (los productos publicados son públicos), escritura solo en la carpeta del dueño.
-- - Video de ~20 s sin sonido: materia prima del modelo 3D. Bucket PRIVADO "videos": solo lo ven
--   su dueño y el equipo (is_admin, migración 0008), que lo procesará.
-- - "N en 3D" pasa a contar productos con modelo 3D real (model_url), no cualquier producto listo.
--
-- Convención de rutas (igual que verificaciones): <id del dueño>/<id del negocio>/<archivo>.
-- La Edge Function eliminar-cuenta borra ambas carpetas al eliminar la cuenta.
-- Ejecutar después de 0008_roles_admin.sql.

-- 1. Columna de la foto -------------------------------------------------------------------------
alter table public.products
  add column photo_url text check (photo_url is null or photo_url ~ '^https?://'),
  add column updated_at timestamptz not null default now();

-- 2. Buckets ------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('productos', 'productos', true, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp']),
  ('videos', 'videos', false, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Fotos: cada dueño sube, reemplaza y borra solo en su carpeta. La lectura es pública (URL).
create policy "subir foto de mi producto" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "reemplazar foto de mi producto" on storage.objects for update to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar foto de mi producto" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Videos: privados. El dueño sube, ve y borra los suyos; el equipo los ve para procesarlos.
create policy "subir video de mi producto" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ver video de mi producto" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar video de mi producto" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admin ve videos" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and public.is_admin());

-- 3. "N en 3D" = productos con modelo 3D ---------------------------------------------------------
-- Mismas columnas y en el mismo orden que en 0002 (create or replace no permite cambiarlas).
create or replace view public.businesses_public with (security_invoker = true) as
select b.*,
       (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.business_id = b.id) as rating,
       (select count(*)::int from public.reviews r where r.business_id = b.id) as review_count,
       (select count(*)::int from public.products p where p.business_id = b.id and p.model_url is not null) as product_count
from public.businesses b
where b.status = 'publicado';

-- 4. updated_at al editar un producto ------------------------------------------------------------
create function public.tocar_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.tocar_updated_at() from public, anon, authenticated;

create trigger products_updated_at before update on public.products
  for each row execute function public.tocar_updated_at();

-- 5. El dueño no puede marcar su producto como "con modelo 3D" ---------------------------------
-- model_url y status los pone el proceso 3D (service role), no la app. Antes de esta migración
-- el dueño tenía UPDATE sobre toda la fila; ahora solo sobre lo que edita en el panel.
revoke insert, update on public.products from authenticated;
grant insert (business_id, name, price_cop, description, photo_url, video_path) on public.products to authenticated;
grant update (name, price_cop, description, photo_url, video_path) on public.products to authenticated;

-- 6. El dueño puede editar su negocio, también cuando ya está publicado -------------------------
-- Antes, "editar mi negocio" solo dejaba editar en borrador o en revisión. Ahora:
-- - el dueño edita su negocio en cualquier estado (RLS: solo el suyo);
-- - publicar o rechazar sigue siendo exclusivo del equipo (Edge Function revisar-negocio);
-- - si un negocio publicado cambia nombre, dirección, tipo o categoría, vuelve a revisión,
--   para que nadie cambie un negocio ya verificado por otro distinto.
drop policy "editar mi negocio" on public.businesses;
create policy "editar mi negocio" on public.businesses for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create function public.cuidar_estado_negocio() returns trigger
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
     and (new.name, new.address, new.type, new.category) is distinct from (old.name, old.address, old.type, old.category) then
    new.status := 'en_revision';
  end if;
  return new;
end $$;
revoke execute on function public.cuidar_estado_negocio() from public, anon, authenticated;

create trigger businesses_cuidar_estado before update on public.businesses
  for each row execute function public.cuidar_estado_negocio();

-- Columnas que el dueño puede cambiar (antes: toda la fila).
revoke update on public.businesses from authenticated;
grant update (name, type, category, address, hours, whatsapp, specialty, price_level, status) on public.businesses to authenticated;
