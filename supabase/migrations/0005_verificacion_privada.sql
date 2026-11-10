-- Zipa lo tiene: documentos de verificación del negocio en almacenamiento privado.
-- La foto del local solo la ven su dueño y el equipo de revisión, y se borra al terminar la revisión
-- (Edge Function revisar-negocio). La cédula/NIT queda en business_verifications, que solo ve el dueño.
-- Ejecutar en el editor SQL de Supabase después de 0004_reportes_y_bloqueos.sql.

-- Bucket privado: sin URL pública. Fotos de hasta 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verificaciones', 'verificaciones', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Convención de rutas: verificaciones/<id del dueño>/<id del negocio>/<archivo>.
-- Cada dueño solo sube, ve y borra lo que está en su carpeta. El equipo usa la service key.
create policy "subir mi verificación" on storage.objects for insert to authenticated
  with check (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ver mi verificación" on storage.objects for select to authenticated
  using (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "borrar mi verificación" on storage.objects for delete to authenticated
  using (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = auth.uid()::text);

-- Después de la revisión la foto ya no existe: photo_path queda vacío y se registra cuándo se borró.
alter table public.business_verifications
  alter column photo_path drop not null,
  add column reviewed_at timestamptz,
  add column photo_deleted_at timestamptz;

-- La cédula o NIT: de 6 a 12 dígitos, con el dígito de verificación del NIT opcional ("900123456-7").
-- La app quita puntos y espacios antes de guardar.
alter table public.business_verifications
  add constraint id_number_formato check (id_number ~ '^[0-9]{6,12}(-[0-9])?$');
