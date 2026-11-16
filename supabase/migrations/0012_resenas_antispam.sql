-- Zipa lo tiene: reseñas más difíciles de usar para atacar a un negocio.
--
-- A. Visita verificada: el QR del mostrador lleva un código propio del negocio. Quien lo escanea
--    queda registrado como visitante 30 días y su reseña sale con el sello "Visitó el negocio".
-- B. Foto en la reseña (bucket público "resenas", cada quien en su carpeta).
-- C. Una cuenta con negocio no califica negocios de su misma categoría (su competencia).
-- D. Frenos: una cuenta nueva espera 24 horas para su primera reseña; máximo 3 reseñas nuevas al día.
-- E. Retención: si un negocio recibe varias reseñas de 1–2 estrellas en pocas horas, las nuevas
--    quedan "en espera" hasta que el equipo las revise (admin_moderar_resena).
--
-- Ejecutar después de 0011_videos_aprobados_y_mi_resena.sql.

-- 1. Columnas nuevas de las reseñas -----------------------------------------------------------
alter table public.reviews
  add column status text not null default 'publicada' check (status in ('publicada', 'en_espera', 'rechazada')),
  add column visited boolean not null default false,
  add column photo_url text check (photo_url is null or photo_url ~ '^https?://');

-- Las reseñas en espera o rechazadas no cuentan ni se muestran (salvo a su autor).
-- Columnas explícitas (no b.*): businesses tiene review_note desde la 0010 y no debe ser pública.
create or replace view public.businesses_public with (security_invoker = true) as
select b.id, b.owner_id, b.name, b.type, b.category, b.address, b.hours, b.whatsapp, b.status,
       b.created_at, b.specialty, b.price_level,
       (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.business_id = b.id and r.status = 'publicada') as rating,
       (select count(*)::int from public.reviews r where r.business_id = b.id and r.status = 'publicada') as review_count,
       (select count(*)::int from public.products p where p.business_id = b.id and p.model_url is not null) as product_count
from public.businesses b
where b.status = 'publicado';

-- reviews_public se recrea para incluir las columnas nuevas (r.* se fija al crear la vista).
drop view public.reviews_public;
create view public.reviews_public with (security_invoker = true) as
select r.id, r.business_id, r.user_id, r.stars, r.text, r.reply, r.replied_at, r.created_at,
       r.status, r.visited, r.photo_url,
       p.full_name as author_name
from public.reviews r
join public.profiles p on p.id = r.user_id
where (r.status = 'publicada' or r.user_id = auth.uid())
  and not exists (
    select 1 from public.blocks bl
    where bl.blocker_id = auth.uid() and bl.blocked_id = r.user_id
  );
grant select on public.reviews_public to anon, authenticated;

-- Las reseñas ya no se insertan directo: solo con guardar_mi_resena() (aplica las reglas).
revoke insert on public.reviews from authenticated;

-- 2. Fotos de reseñas --------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resenas', 'resenas', true, 8388608, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "subir foto de mi reseña" on storage.objects for insert to authenticated
  with check (bucket_id = 'resenas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar foto de mi reseña" on storage.objects for delete to authenticated
  using (bucket_id = 'resenas' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Código del QR y visitas -------------------------------------------------------------------
-- El código no está en businesses (que es pública): solo lo leen su dueño y el equipo.
create table public.business_qr (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
alter table public.business_qr enable row level security;
create policy "mi código QR" on public.business_qr for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()) or public.is_admin());
grant select on public.business_qr to authenticated;

insert into public.business_qr (business_id) select id from public.businesses on conflict do nothing;

create function public.crear_codigo_qr() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.business_qr (business_id) values (new.id) on conflict do nothing;
  return new;
end $$;
revoke execute on function public.crear_codigo_qr() from public, anon, authenticated;
create trigger businesses_codigo_qr after insert on public.businesses
  for each row execute function public.crear_codigo_qr();

create table public.business_visits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  visited_at timestamptz not null default now(),
  primary key (user_id, business_id)
);
alter table public.business_visits enable row level security;
create policy "mis visitas" on public.business_visits for select to authenticated using (user_id = auth.uid());
grant select on public.business_visits to authenticated;

-- La app la llama al abrir un negocio desde su QR. Devuelve true si el código es el del negocio.
create function public.registrar_visita(p_business uuid, p_token text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then return false; end if;
  if not exists (select 1 from public.business_qr q where q.business_id = p_business and q.token = p_token) then
    return false;
  end if;
  insert into public.business_visits (user_id, business_id) values (auth.uid(), p_business)
  on conflict (user_id, business_id) do update set visited_at = now();
  return true;
end $$;
revoke execute on function public.registrar_visita(uuid, text) from public, anon;
grant execute on function public.registrar_visita(uuid, text) to authenticated;

-- 4. Guardar mi reseña con todas las reglas ----------------------------------------------------
drop function public.guardar_mi_resena(uuid, int, text);

create function public.guardar_mi_resena(p_business uuid, p_stars int, p_text text, p_photo_url text default null)
returns text -- estado en que quedó: 'publicada' o 'en_espera'
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_cat public.business_category;
  v_existe boolean;
  v_visita boolean;
  v_estado text := 'publicada';
begin
  if v_uid is null then
    raise exception 'Inicia sesión para calificar' using errcode = '42501';
  end if;
  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'La calificación va de 1 a 5 estrellas' using errcode = '22023';
  end if;
  select category into v_cat from public.businesses where id = p_business and status = 'publicado' and owner_id <> v_uid;
  if v_cat is null then
    raise exception 'No puedes calificar este negocio' using errcode = '42501';
  end if;

  -- C. Competencia: quien tiene un negocio no califica negocios de su misma categoría.
  if exists (select 1 from public.businesses b where b.owner_id = v_uid and b.category = v_cat and b.status <> 'rechazado') then
    raise exception 'Las cuentas con un negocio no pueden calificar negocios de su misma categoría' using errcode = '42501';
  end if;

  select exists (select 1 from public.reviews where business_id = p_business and user_id = v_uid) into v_existe;

  if not v_existe then
    -- D. Cuenta nueva y límite diario (editar una reseña propia no cuenta).
    if (select created_at from auth.users where id = v_uid) > now() - interval '24 hours' then
      raise exception 'Podrás calificar 24 horas después de crear tu cuenta' using errcode = '42501';
    end if;
    if (select count(*) from public.reviews where user_id = v_uid and created_at > now() - interval '24 hours') >= 3 then
      raise exception 'Llegaste al máximo de 3 reseñas por día. Intenta mañana' using errcode = '42501';
    end if;
  end if;

  -- B. La foto debe estar en el bucket de reseñas, en la carpeta de quien califica.
  if p_photo_url is not null and p_photo_url !~ ('^https?://[^ ]+/storage/v1/object/public/resenas/' || v_uid::text || '/[^ ]+$') then
    raise exception 'Foto no válida' using errcode = '22023';
  end if;

  -- A. Visita verificada en los últimos 30 días.
  select exists (select 1 from public.business_visits where user_id = v_uid and business_id = p_business and visited_at > now() - interval '30 days') into v_visita;

  -- E. Ráfaga de reseñas malas en las últimas 6 horas: la nueva queda en espera.
  if p_stars <= 2 and (
    select count(*) from public.reviews
    where business_id = p_business and user_id <> v_uid and stars <= 2 and created_at > now() - interval '6 hours'
  ) >= 2 then
    v_estado := 'en_espera';
  end if;

  insert into public.reviews (business_id, user_id, stars, text, status, visited, photo_url)
  values (p_business, v_uid, p_stars, left(coalesce(trim(p_text), ''), 600), v_estado, v_visita, p_photo_url)
  on conflict (business_id, user_id) do update
    set stars = excluded.stars,
        text = excluded.text,
        visited = public.reviews.visited or excluded.visited,
        photo_url = coalesce(excluded.photo_url, public.reviews.photo_url),
        -- Si ya estaba publicada y la edita, sigue publicada salvo que caiga en una ráfaga.
        status = case when public.reviews.status = 'rechazada' then 'en_espera' else excluded.status end,
        created_at = now();

  return (select status from public.reviews where business_id = p_business and user_id = v_uid);
end $$;
revoke execute on function public.guardar_mi_resena(uuid, int, text, text) from public, anon;
grant execute on function public.guardar_mi_resena(uuid, int, text, text) to authenticated;

-- 5. El equipo modera las reseñas en espera ----------------------------------------------------
create function public.admin_moderar_resena(p_review uuid, p_decision text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_business uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_decision not in ('publicada', 'rechazada') then
    raise exception 'Decisión no válida: %', p_decision using errcode = '22023';
  end if;
  update public.reviews set status = p_decision where id = p_review returning business_id into v_business;
  if v_business is null then
    raise exception 'La reseña no existe' using errcode = 'P0002';
  end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_decision = 'publicada' then 'publicar_resena' else 'rechazar_resena' end,
          'review', p_review, jsonb_build_object('negocio', v_business));
end $$;
revoke execute on function public.admin_moderar_resena(uuid, text) from public, anon;
grant execute on function public.admin_moderar_resena(uuid, text) to authenticated;
