-- Zipa lo tiene: galería de fotos por producto y negocios destacados (suscripción).
--
-- Galería: la foto principal sigue en products.photo_url (la leen y escriben las apps instaladas)
-- y ahora tiene descripción corta (photo_label). Hasta 3 fotos más en product_photos, con su
-- descripción. Total: 4 fotos por producto, más el video opcional de siempre.
--
-- Destacados: el equipo decide qué negocios salen en la sección «Destacados» del inicio y por
-- cuánto tiempo (el periodo de la suscripción). El cobro se maneja por fuera de la app.

-- 1. Galería ------------------------------------------------------------------------------------
alter table public.products
  add column photo_label text check (photo_label is null or char_length(btrim(photo_label)) between 1 and 40);
grant insert (photo_label), update (photo_label) on public.products to authenticated;

create table public.product_photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null check (url ~ '^https?://'),
  label text check (label is null or char_length(btrim(label)) between 1 and 40),
  position int not null default 1 check (position between 1 and 3),
  created_at timestamptz not null default now()
);
create index product_photos_producto_idx on public.product_photos (product_id, position);
alter table public.product_photos enable row level security;

-- Se ven si se ve el producto (la subconsulta respeta el RLS de products: negocio publicado,
-- dueño o equipo). Solo el dueño las agrega, cambia o quita.
create policy "fotos visibles" on public.product_photos for select
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "agregar fotos a mi producto" on public.product_photos for insert to authenticated
  with check (exists (select 1 from public.products p join public.businesses b on b.id = p.business_id where p.id = product_id and b.owner_id = auth.uid()));
create policy "editar fotos de mi producto" on public.product_photos for update to authenticated
  using (exists (select 1 from public.products p join public.businesses b on b.id = p.business_id where p.id = product_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.products p join public.businesses b on b.id = p.business_id where p.id = product_id and b.owner_id = auth.uid()));
create policy "quitar fotos de mi producto" on public.product_photos for delete to authenticated
  using (exists (select 1 from public.products p join public.businesses b on b.id = p.business_id where p.id = product_id and b.owner_id = auth.uid()));
grant select on public.product_photos to anon, authenticated;
grant insert (product_id, url, label, position), update (url, label, position), delete on public.product_photos to authenticated;

-- Máximo 3 fotos adicionales y siempre en la carpeta del dueño dentro del bucket "productos".
create function public.cuidar_foto_producto() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_owner uuid;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  select b.owner_id into v_owner from public.products p join public.businesses b on b.id = p.business_id where p.id = new.product_id;
  if new.url !~ ('^https?://[^ ]+/storage/v1/object/public/productos/' || v_owner::text || '/[^ ]+$') then
    raise exception 'Foto no válida: súbela desde la app' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.product_photos f where f.product_id = new.product_id) >= 3 then
    raise exception 'Cada producto puede tener hasta 4 fotos (la principal y 3 más)' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function public.cuidar_foto_producto() from public, anon, authenticated;
create trigger product_photos_cuidar before insert or update on public.product_photos
  for each row execute function public.cuidar_foto_producto();

-- 2. Destacados -----------------------------------------------------------------------------------
create table public.featured_placements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  position int not null default 100 check (position between 0 and 1000),
  note text check (note is null or char_length(note) <= 200), -- interna del equipo: plan, pago...
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index featured_placements_vigencia_idx on public.featured_placements (starts_at, ends_at);
alter table public.featured_placements enable row level security;

-- Público: solo los vigentes. Dueño: los de su negocio. Equipo: todos. La nota no es pública.
create policy "destacados vigentes" on public.featured_placements for select
  using (now() >= starts_at and now() < ends_at);
create policy "mis destacados" on public.featured_placements for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "equipo ve destacados" on public.featured_placements for select to authenticated
  using (public.is_admin());
grant select (id, business_id, starts_at, ends_at, position) on public.featured_placements to anon, authenticated;

-- Negocios destacados ahora mismo, en el orden que definió el equipo (solo publicados).
-- Sin "set search_path" para que Postgres la integre en la consulta (ver 0016).
create function public.negocios_destacados(p_limite int default 10) returns setof public.businesses_public
language sql stable security invoker as $$
  select bp.*
  from public.businesses_public bp
  join (
    select f.business_id, min(f.position) as pos
    from public.featured_placements f
    where now() >= f.starts_at and now() < f.ends_at
    group by f.business_id
  ) d on d.business_id = bp.id
  order by d.pos, bp.name
  limit least(greatest(coalesce(p_limite, 10), 1), 20);
$$;
grant execute on function public.negocios_destacados(int) to anon, authenticated;

-- El equipo (rol admin con MFA) destaca un negocio publicado entre dos fechas (días de Colombia,
-- ambos incluidos).
create function public.admin_destacar(p_business uuid, p_desde date, p_hasta date, p_orden int default 100, p_nota text default null)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
  v_nombre text;
begin
  if not public.is_admin('admin') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select name into v_nombre from public.businesses where id = p_business and status = 'publicado';
  if v_nombre is null then
    raise exception 'Solo se pueden destacar negocios publicados' using errcode = '22023';
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    raise exception 'Revisa las fechas: el final debe ser igual o posterior al inicio' using errcode = '22023';
  end if;
  insert into public.featured_placements (business_id, starts_at, ends_at, position, note, created_by)
  values (p_business,
          p_desde::timestamp at time zone 'America/Bogota',
          (p_hasta + 1)::timestamp at time zone 'America/Bogota',
          coalesce(p_orden, 100), nullif(btrim(coalesce(p_nota, '')), ''), auth.uid())
  returning id into v_id;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'destacar_negocio', 'business', p_business,
          jsonb_build_object('nombre', v_nombre, 'desde', p_desde, 'hasta', p_hasta, 'orden', p_orden));
  return v_id;
end $$;
revoke execute on function public.admin_destacar(uuid, date, date, int, text) from public, anon;
grant execute on function public.admin_destacar(uuid, date, date, int, text) to authenticated;

-- Quitar: si ya empezó, termina ahora (queda el historial); si aún no empieza, se borra.
create function public.admin_quitar_destacado(p_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  f public.featured_placements;
begin
  if not public.is_admin('admin') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into f from public.featured_placements where id = p_id;
  if not found then
    raise exception 'Ese destacado no existe' using errcode = '22023';
  end if;
  if f.starts_at > now() then
    delete from public.featured_placements where id = p_id;
  elsif f.ends_at > now() then
    update public.featured_placements set ends_at = now() where id = p_id;
  end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'quitar_destacado', 'business', f.business_id, jsonb_build_object('destacado', p_id));
end $$;
revoke execute on function public.admin_quitar_destacado(uuid) from public, anon;
grant execute on function public.admin_quitar_destacado(uuid) to authenticated;

-- Lista para el panel (revisor o admin), con la nota interna y el estado.
create function public.admin_destacados() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(t order by t.orden_estado, t.starts_at) from (
    select f.id, f.business_id, b.name as negocio, b.status as estado_negocio, f.starts_at, f.ends_at, f.position, f.note, f.created_at,
           case when now() < f.starts_at then 'programado' when now() < f.ends_at then 'vigente' else 'vencido' end as estado,
           case when now() < f.starts_at then 1 when now() < f.ends_at then 0 else 2 end as orden_estado
    from public.featured_placements f join public.businesses b on b.id = f.business_id
    order by f.starts_at desc limit 300) t), '[]'::jsonb);
end $$;
revoke execute on function public.admin_destacados() from public, anon;
grant execute on function public.admin_destacados() to authenticated;
