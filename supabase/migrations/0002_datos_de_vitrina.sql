-- Vitrina Local: datos que muestra la pantalla Explorar del diseño.
-- Ejecutar en el editor SQL de Supabase después de 0001_esquema_inicial.sql.

alter table public.businesses
  add column specialty text check (char_length(specialty) <= 40),          -- "Comida callejera", "Artesanías wayuu"
  add column price_level smallint check (price_level between 1 and 3);     -- $, $$ o $$$

-- La vista se recrea porque cambian sus columnas (b.* y el conteo de productos en 3D).
drop view public.businesses_public;

create view public.businesses_public with (security_invoker = true) as
select b.*,
       (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.business_id = b.id) as rating,
       (select count(*)::int from public.reviews r where r.business_id = b.id) as review_count,
       (select count(*)::int from public.products p where p.business_id = b.id and p.status = 'listo') as product_count
from public.businesses b
where b.status = 'publicado';
