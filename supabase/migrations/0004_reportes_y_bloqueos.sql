-- Zipa lo tiene: reportes, bloqueos y filtro de palabras ofensivas.
-- Exigencias de App Store (1.2, contenido generado por usuarios) y Google Play (UGC):
-- filtrar contenido ofensivo, reportarlo, bloquear usuarios y actuar sobre los reportes.
-- Ejecutar en el editor SQL de Supabase después de 0003_consentimientos.sql.

-- Reportes ------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('review', 'business', 'user')),
  target_id uuid not null,  -- id de la reseña, del negocio o del perfil reportado
  reason text not null check (reason in ('ofensivo', 'falso', 'spam', 'datos_personales', 'otro')),
  details text check (char_length(details) <= 500),
  status text not null default 'pendiente' check (status in ('pendiente', 'revisado', 'descartado')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)  -- una vez por persona y contenido
);

create index reports_pendientes_idx on public.reports (status, created_at) where status = 'pendiente';

alter table public.reports enable row level security;

-- Cada quien crea y ve sus propios reportes. El equipo los revisa con la service key
-- (panel de Supabase), que no pasa por RLS. Nadie los edita desde las apps.
create policy "reportar" on public.reports for insert
  with check (reporter_id = auth.uid() and status = 'pendiente');

create policy "ver mis reportes" on public.reports for select
  using (reporter_id = auth.uid());

-- Bloqueos ------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "ver mis bloqueos" on public.blocks for select using (blocker_id = auth.uid());
create policy "bloquear" on public.blocks for insert with check (blocker_id = auth.uid());
create policy "desbloquear" on public.blocks for delete using (blocker_id = auth.uid());

-- Las reseñas de personas bloqueadas dejan de verse para quien las bloqueó.
create or replace view public.reviews_public with (security_invoker = true) as
select r.*, p.full_name as author_name
from public.reviews r
join public.profiles p on p.id = r.user_id
where not exists (
  select 1 from public.blocks bl
  where bl.blocker_id = auth.uid() and bl.blocked_id = r.user_id
);

-- Filtro de palabras ofensivas ------------------------------------------------
-- MISMA lista que packages/shared/src/moderation.ts (OFFENSIVE_WORDS). Si cambias una, cambia la otra.
create function public.texto_ofensivo(t text) returns boolean
language sql immutable as $$
  with limpio as (
    select ' ' || regexp_replace(translate(lower(coalesce(t, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g') || ' ' as s
  )
  select exists (
    select 1 from limpio, unnest(array[
      'hijueputa', 'hijuepucha', 'hpta', 'hp', 'gonorrea', 'malparido', 'malparida', 'malnacido', 'malnacida',
      'puta', 'puto', 'putas', 'putos', 'mierda', 'mierdero', 'pendejo', 'pendeja', 'imbecil', 'idiota',
      'estupido', 'estupida', 'perra', 'zorra', 'marica', 'maricon', 'careverga', 'verga', 'cabron', 'cabrona',
      'culo', 'culicagado', 'huevon', 'guevon', 'webon', 'gueva', 'carechimba', 'lameculos',
      'retrasado', 'mongolico', 'subnormal'
    ]) as palabra
    where position(' ' || palabra || ' ' in limpio.s) > 0
  );
$$;

-- Aplica el filtro a reseñas y respuestas del negocio, aunque se publiquen sin pasar por la app.
create function public.revisar_texto_resena() returns trigger
language plpgsql as $$
begin
  if public.texto_ofensivo(new.text) or public.texto_ofensivo(new.reply) then
    raise exception 'texto_ofensivo' using errcode = 'check_violation',
      hint = 'La reseña o la respuesta tiene palabras ofensivas.';
  end if;
  return new;
end;
$$;

create trigger reviews_filtro_ofensivo
  before insert or update of text, reply on public.reviews
  for each row execute function public.revisar_texto_resena();
