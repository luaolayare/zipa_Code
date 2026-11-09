-- Vitrina Local: esquema inicial
-- Ejecutar en el editor SQL de Supabase.

-- Perfiles de usuario (clientes y dueños de negocio) -------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Negocios ----------------------------------------------------------------
create type public.business_type as enum ('emprendimiento', 'establecido');
create type public.business_category as enum ('comer', 'artesanias', 'cafe_dulces');
create type public.business_status as enum ('borrador', 'en_revision', 'publicado', 'rechazado');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  type public.business_type not null,
  category public.business_category not null,
  address text not null,
  hours text,
  whatsapp text,
  status public.business_status not null default 'borrador',
  created_at timestamptz not null default now()
);
create index businesses_status_idx on public.businesses (status);

-- Datos de verificación: solo los ve el dueño (y el equipo, con la service key).
create table public.business_verifications (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  photo_path text not null,  -- ruta en Supabase Storage
  id_number text not null,   -- cédula o NIT
  created_at timestamptz not null default now()
);

-- Productos y platos en 3D ---------------------------------------------------
create type public.product_status as enum ('procesando', 'listo', 'error');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  price_cop integer check (price_cop >= 0),
  description text,
  video_path text,  -- video original grabado por el negocio
  model_url text,   -- modelo 3D generado (.glb / .usdz)
  status public.product_status not null default 'procesando',
  created_at timestamptz not null default now()
);
create index products_business_idx on public.products (business_id);

-- Reseñas -------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  text text not null default '',
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)  -- una reseña por cliente y negocio
);

-- Vistas públicas que usan las apps ----------------------------------------------
create view public.businesses_public with (security_invoker = true) as
select b.*,
       round(avg(r.stars)::numeric, 1) as rating,
       count(r.id)::int as review_count
from public.businesses b
left join public.reviews r on r.business_id = b.id
where b.status = 'publicado'
group by b.id;

create view public.reviews_public with (security_invoker = true) as
select r.*, p.full_name as author_name
from public.reviews r
join public.profiles p on p.id = r.user_id;

-- Seguridad (Row Level Security) ---------------------------------------------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_verifications enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;

-- Perfiles: el nombre es público; cada quien edita el suyo.
create policy "perfiles visibles" on public.profiles for select using (true);
create policy "editar mi perfil" on public.profiles for update using (auth.uid() = id);

-- Negocios: publicados visibles para todos; el dueño ve y edita el suyo.
-- El dueño nunca puede marcarse como publicado: eso lo hace el equipo de revisión.
create policy "negocios publicados" on public.businesses for select
  using (status = 'publicado' or owner_id = auth.uid());
create policy "registrar negocio" on public.businesses for insert
  with check (owner_id = auth.uid() and status in ('borrador', 'en_revision'));
create policy "editar mi negocio" on public.businesses for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status in ('borrador', 'en_revision'));

-- Verificación: solo el dueño.
create policy "mi verificación" on public.business_verifications for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- Productos: visibles si el negocio está publicado; el dueño administra los suyos.
create policy "productos visibles" on public.products for select
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'publicado' or b.owner_id = auth.uid())));
create policy "administrar mis productos" on public.products for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- Reseñas: públicas; un cliente con sesión crea la suya; el dueño solo responde.
create policy "reseñas visibles" on public.reviews for select using (true);
create policy "escribir reseña" on public.reviews for insert
  with check (user_id = auth.uid()
    and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'publicado' and b.owner_id <> auth.uid()));
create policy "responder reseña" on public.reviews for update
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
revoke update on public.reviews from authenticated;
grant update (reply, replied_at) on public.reviews to authenticated;
