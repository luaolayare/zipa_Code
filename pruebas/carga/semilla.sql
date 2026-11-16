-- Datos de prueba para las pruebas de carga. SOLO para la base LOCAL de Docker (supabase start).
-- Nunca ejecutar en el proyecto real: crea cientos de cuentas y negocios ficticios.
--
-- Crea (si no existen): 250 negocios publicados repartidos en las 12 subcategorías, 10 productos
-- por negocio (2.500, con secciones de menú) y 20 reseñas por negocio (5.000) de 2.000 personas.
-- Uso: docker exec -i supabase_db_zipa-lo-tiene psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/semilla.sql

do $$
begin
  if exists (select 1 from auth.users where email like 'carga-%@prueba.local') then
    raise notice 'La semilla de carga ya existe: no se crea de nuevo';
    return;
  end if;

  -- Dueñas (250) y clientes (2.000). El trigger on_auth_user_created crea sus perfiles.
  insert into auth.users (id, email, raw_user_meta_data, created_at)
  select gen_random_uuid(), 'carga-duena-' || i || '@prueba.local', jsonb_build_object('full_name', 'Dueña ' || i), now() - interval '30 days'
  from generate_series(1, 250) i;
  insert into auth.users (id, email, raw_user_meta_data, created_at)
  select gen_random_uuid(), 'carga-cliente-' || i || '@prueba.local', jsonb_build_object('full_name', 'Cliente ' || i), now() - interval '30 days'
  from generate_series(1, 2000) i;

  -- Negocios publicados, uno por dueña, repartidos en las subcategorías.
  insert into public.businesses (owner_id, name, type, subcategory_id, address, whatsapp, status, specialty)
  select u.id,
         (array['Sabores', 'Rincón', 'Casa', 'Fogón', 'Taller', 'Dulce', 'Café', 'Parrilla'])[1 + (n % 8)] || ' ' ||
         (array['del Páramo', 'de la Sal', 'Zipa', 'Muisca', 'de la Catedral', 'del Centro', 'Andino', 'Real'])[1 + ((n / 8) % 8)] || ' ' || n,
         case when n % 3 = 0 then 'establecido' else 'emprendimiento' end::public.business_type,
         s.id,
         'Calle ' || n || ' # ' || (n % 30) || '-' || (n % 50),
         '300' || lpad(n::text, 7, '0'),
         'publicado',
         'Especialidad de la casa ' || n
  from (select id, row_number() over (order by email) as n from auth.users where email like 'carga-duena-%') u
  join (select id, row_number() over (order by id) - 1 as k from public.categories where parent_id is not null) s
    on s.k = u.n % 12;

  -- 10 productos por negocio.
  insert into public.products (business_id, name, price_cop, description, section, sort_order, available)
  select b.id,
         (array['Ajiaco', 'Empanada', 'Arepa', 'Chocolate', 'Pizza', 'Hamburguesa', 'Postre de natas', 'Mochila', 'Helado', 'Limonada'])[p] || ' ' || p,
         5000 + p * 2500,
         'Producto de prueba número ' || p,
         (array['Entradas', 'Platos fuertes', 'Sopas', 'Bebidas', 'Postres'])[1 + (p % 5)],
         p,
         p % 7 <> 0
  from public.businesses b cross join generate_series(1, 10) p
  where b.owner_id in (select id from auth.users where email like 'carga-duena-%');

  -- 20 reseñas por negocio, de clientes distintos.
  insert into public.reviews (business_id, user_id, stars, text, status)
  select b.id, c.id, 3 + ((b.n + c.n) % 3), 'Muy buena experiencia número ' || c.n, 'publicada'
  from (select id, row_number() over (order by id) as n from public.businesses where owner_id in (select id from auth.users where email like 'carga-duena-%')) b
  join (select id, row_number() over (order by email) as n from auth.users where email like 'carga-cliente-%') c
    on c.n between ((b.n - 1) * 8) % 1980 + 1 and ((b.n - 1) * 8) % 1980 + 20;

  analyze public.businesses; analyze public.products; analyze public.reviews;
  raise notice 'Semilla creada: % negocios, % productos, % reseñas',
    (select count(*) from public.businesses where status = 'publicado'),
    (select count(*) from public.products),
    (select count(*) from public.reviews);
end $$;
