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
                      'reviews', 'consents', 'reports', 'blocks', 'admin_users', 'admin_actions',
                      'categories', 'business_tags', 'analytics_events', 'product_photos', 'featured_placements',
                      'business_links', 'reservation_settings', 'reservation_windows', 'reservation_blocked_dates',
                      'reservations', 'reservation_items', 'reservation_events',
                      'push_tokens', 'notifications', 'notification_deliveries');
  if n <> 25 then
    raise exception 'Faltan tablas en public: se esperaban 25 y hay %', n;
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

  if not exists (select 1 from pg_trigger where tgname = 'reservation_events_notificar' and not tgisinternal) then
    raise exception 'Falta el trigger reservation_events_notificar (encola los avisos de reservas)';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'business_links_cuidar' and not tgisinternal) then
    raise exception 'Falta el trigger business_links_cuidar (contacto y entregas: filtro y orden)';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'businesses_clasificar' and not tgisinternal) then
    raise exception 'Falta el trigger businesses_clasificar (categoría vieja y subcategoría sincronizadas)';
  end if;

  -- 4b. Categorías y búsqueda (migración 0013).
  if (select count(*) from public.categories where parent_id is null) <> 2 then
    raise exception 'Deben existir las 2 categorías principales';
  end if;
  if exists (select 1 from public.businesses where subcategory_id is null) then
    raise exception 'Hay negocios sin subcategoría';
  end if;
  if to_regprocedure('public.buscar_negocios(text, text, text, text, integer, integer, text)') is null then
    raise exception 'Falta la función buscar_negocios';
  end if;
  if public.normalizar('  Doña ÑAÑA: ¡Café! ') <> 'dona nana cafe' then
    raise exception 'normalizar() no quita tildes, mayúsculas y signos: %', public.normalizar('  Doña ÑAÑA: ¡Café! ');
  end if;

  -- 4c. Logo y búsqueda rápida (migración 0016).
  if not exists (select 1 from storage.buckets where id = 'negocios' and public = true) then
    raise exception 'Falta el bucket público negocios (logos)';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'nombre_busqueda' and is_generated = 'ALWAYS') then
    raise exception 'Falta products.nombre_busqueda (columna generada)';
  end if;

  -- 5. Bucket privado de verificaciones.
  if not exists (select 1 from storage.buckets where id = 'verificaciones' and public = false) then
    raise exception 'Falta el bucket privado verificaciones';
  end if;

  -- 5b. Fotos de productos (públicas) y videos para el 3D (privados), migración 0009.
  if not exists (select 1 from storage.buckets where id = 'productos' and public = true) then
    raise exception 'Falta el bucket público productos';
  end if;
  if not exists (select 1 from storage.buckets where id = 'videos' and public = false) then
    raise exception 'Falta el bucket privado videos';
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
