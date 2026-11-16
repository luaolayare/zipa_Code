-- Zipa lo tiene: menú digital.
--
-- Cada producto o plato puede tener una sección del menú ("Entradas", "Bebidas"...), un orden
-- dentro de ella y marcarse como no disponible hoy, sin borrarlo. Solo AGREGA columnas con valores
-- por defecto: los productos actuales quedan disponibles y sin sección. No cambia la aprobación
-- de videos (0011) ni ninguna política.

alter table public.products
  add column available boolean not null default true,
  add column section text check (section is null or char_length(btrim(section)) between 1 and 40),
  add column sort_order int not null default 0 check (sort_order between 0 and 10000);

create index products_menu_idx on public.products (business_id, section, sort_order);

-- El dueño las escribe junto con las demás columnas que ya editaba (0009).
grant insert (available, section, sort_order) on public.products to authenticated;
grant update (available, section, sort_order) on public.products to authenticated;
