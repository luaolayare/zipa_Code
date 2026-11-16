-- Verificación del esquema para CI (se ejecuta contra la base local que levanta la CLI de Supabase).
-- Falla con un error claro si las migraciones no dejaron la base como esperamos.
-- No modifica datos: solo consulta.

do $$
declare
  n int;
  sin_rls text;
begin
  -- 1. Las tablas que usan las apps existen.
  select count(*) into n from pg_tables
  where schemaname = 'public'
    and tablename in ('profiles', 'businesses', 'business_verifications', 'products',
                      'reviews', 'consents', 'reports', 'blocks', 'admin_users', 'admin_actions');
  if n <> 10 then
    raise exception 'Faltan tablas en public: se esperaban 10 y hay %', n;
  end if;

  -- 2. Toda tabla de public tiene RLS activado.
  select string_agg(tablename, ', ') into sin_rls
  from pg_tables t join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
  where t.schemaname = 'public' and not c.relrowsecurity;
  if sin_rls is not null then
    raise exception 'Tablas sin RLS: %', sin_rls;
  end if;

  -- 3. Vistas públicas.
  select count(*) into n from information_schema.views
  where table_schema = 'public' and table_name in ('businesses_public', 'reviews_public');
  if n <> 2 then
    raise exception 'Faltan vistas públicas: hay % de 2', n;
  end if;

  -- 4. Triggers propios.
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and not tgisinternal) then
    raise exception 'Falta el trigger on_auth_user_created (perfil y aceptaciones al registrarse)';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'reviews_filtro_ofensivo' and not tgisinternal) then
    raise exception 'Falta el trigger reviews_filtro_ofensivo';
  end if;

  -- 5. Bucket privado de verificaciones.
  if not exists (select 1 from storage.buckets where id = 'verificaciones' and public = false) then
    raise exception 'Falta el bucket privado verificaciones';
  end if;

  -- 6. Filtro de palabras ofensivas (misma regla que packages/shared/src/moderation.ts).
  if not public.texto_ofensivo('son unos malparidos') then
    raise exception 'texto_ofensivo no detecta plurales';
  end if;
  if public.texto_ofensivo('Che Guevara') or public.texto_ofensivo('cono de helado') then
    raise exception 'texto_ofensivo marca textos normales';
  end if;

  raise notice 'Esquema verificado: tablas, RLS, vistas, triggers, bucket y filtro OK';
end
$$;
