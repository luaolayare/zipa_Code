-- Vitrina Local: registro de aceptación de la política de privacidad y los términos.
-- Prueba de la autorización del titular (Ley 1581 de 2012, art. 9; Decreto 1377 de 2013, art. 8).
-- Ejecutar en el editor SQL de Supabase después de 0002_datos_de_vitrina.sql.

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document text not null check (document in ('privacidad', 'terminos_clientes', 'terminos_negocios')),
  version text not null check (char_length(version) between 1 and 20),
  app text not null check (app in ('clientes', 'negocios')),
  accepted_at timestamptz not null default now()  -- la fecha la pone el servidor, no el celular
);

create index consents_user_idx on public.consents (user_id, document, accepted_at desc);

-- Es un historial: cada aceptación es una fila nueva. Nadie edita ni borra filas desde las apps
-- (se borran solas con la cuenta, por el on delete cascade).
alter table public.consents enable row level security;

create policy "ver mis aceptaciones" on public.consents for select
  using (user_id = auth.uid());

create policy "registrar mi aceptación" on public.consents for insert
  with check (user_id = auth.uid());

-- Al crear la cuenta, guarda lo que la persona aceptó en el formulario de registro.
-- Las apps lo envían en raw_user_meta_data.consents: [{ "document", "version", "app" }].
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.consents (user_id, document, version, app)
  select new.id, c ->> 'document', c ->> 'version', c ->> 'app'
  from jsonb_array_elements(coalesce(new.raw_user_meta_data -> 'consents', '[]'::jsonb)) as c;

  return new;
end;
$$;
