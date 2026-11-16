-- Zipa lo tiene: el equipo aprueba los videos de los productos, y cada persona califica un
-- negocio una sola vez (puede editar su reseña).
--
-- Por ahora no se genera 3D: el producto se muestra con su video tal cual, después de que el
-- equipo lo apruebe. Las columnas model_url siguen ahí para cuando exista el 3D.
--
-- Ejecutar después de 0010_revision_y_reportes.sql.

-- 1. Estado del video de cada producto ---------------------------------------------------------
alter table public.products
  add column video_status text check (video_status in ('pendiente', 'aprobado', 'rechazado')),
  add column video_note text check (char_length(video_note) <= 300);

-- Los videos que ya existen quedan pendientes de revisión.
update public.products set video_status = 'pendiente' where video_path is not null;

-- Cuando el dueño sube o cambia el video, vuelve a revisión. El dueño no puede marcarlo aprobado
-- (no tiene permiso sobre video_status); solo el equipo con admin_revisar_video().
create function public.estado_video_producto() returns trigger
language plpgsql as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.video_path is null then
    new.video_status := null;
    new.video_note := null;
  elsif tg_op = 'INSERT' or new.video_path is distinct from old.video_path then
    new.video_status := 'pendiente';
    new.video_note := null;
  end if;
  return new;
end $$;
revoke execute on function public.estado_video_producto() from public, anon, authenticated;

create trigger products_estado_video before insert or update on public.products
  for each row execute function public.estado_video_producto();

-- 2. El equipo aprueba o no un video ------------------------------------------------------------
create function public.admin_revisar_video(p_product uuid, p_decision text, p_nota text default null)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_business uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_decision not in ('aprobado', 'rechazado') then
    raise exception 'Decisión no válida: %', p_decision using errcode = '22023';
  end if;
  if p_decision = 'rechazado' and char_length(trim(coalesce(p_nota, ''))) < 10 then
    raise exception 'Explica al negocio por qué no se aprueba el video (mínimo 10 caracteres)' using errcode = '22023';
  end if;

  update public.products
     set video_status = p_decision,
         video_note = case when p_decision = 'rechazado' then left(trim(p_nota), 300) else null end
   where id = p_product and video_path is not null
  returning business_id into v_business;
  if v_business is null then
    raise exception 'El producto no existe o no tiene video' using errcode = 'P0002';
  end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_decision = 'aprobado' then 'aprobar_video' else 'rechazar_video' end,
          'product', p_product, jsonb_build_object('negocio', v_business, 'nota', nullif(trim(coalesce(p_nota, '')), '')));
end $$;
revoke execute on function public.admin_revisar_video(uuid, text, text) from public, anon;
grant execute on function public.admin_revisar_video(uuid, text, text) to authenticated;

-- 3. Los turistas ven los videos aprobados de negocios publicados --------------------------------
-- El bucket sigue siendo privado: las apps piden un enlace firmado y solo lo obtienen si el video
-- está aprobado y el negocio publicado.
create policy "ver videos aprobados" on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'videos'
    and exists (
      select 1 from public.products p
      join public.businesses b on b.id = p.business_id
      where p.video_path = storage.objects.name and p.video_status = 'aprobado' and b.status = 'publicado'
    )
  );

-- 4. Mi reseña: crear o editar (una por persona y negocio) ---------------------------------------
-- La tabla ya tenía unique (business_id, user_id). Esta función guarda la reseña de quien llama:
-- la crea o reemplaza estrellas y texto. El filtro de palabras (trigger) sigue aplicando.
create function public.guardar_mi_resena(p_business uuid, p_stars int, p_text text)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para calificar' using errcode = '42501';
  end if;
  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'La calificación va de 1 a 5 estrellas' using errcode = '22023';
  end if;
  if not exists (select 1 from public.businesses b where b.id = p_business and b.status = 'publicado' and b.owner_id <> v_uid) then
    raise exception 'No puedes calificar este negocio' using errcode = '42501';
  end if;

  insert into public.reviews (business_id, user_id, stars, text)
  values (p_business, v_uid, p_stars, left(coalesce(trim(p_text), ''), 600))
  on conflict (business_id, user_id) do update
    set stars = excluded.stars, text = excluded.text, created_at = now()
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.guardar_mi_resena(uuid, int, text) from public, anon;
grant execute on function public.guardar_mi_resena(uuid, int, text) to authenticated;
