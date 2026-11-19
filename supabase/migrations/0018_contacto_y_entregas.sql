-- Zipa lo tiene Beta 2.2 (Entrega A): «Contacto y entregas» del negocio.
--
-- Redes sociales (Instagram, Facebook, TikTok, sitio web) y modalidades de entrega, todo opcional
-- e informativo: la app no toma pedidos, no cobra ni calcula envíos. WhatsApp sigue en businesses.
--
-- Va en una tabla aparte (una fila por negocio) para no tocar la vista pública businesses_public
-- ni buscar_negocios, que están afinadas para la búsqueda (docs/PRUEBAS_DE_CARGA.md). La ficha del
-- negocio la lee aparte. Migración solo aditiva: no cambia ni borra datos existentes.
--
-- Las reglas de los enlaces repiten las de packages/shared/src/contact.ts (la app ya los guarda
-- normalizados); aquí impiden que alguien guarde otra cosa llamando a la API directamente.

create table public.business_links (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  instagram text check (instagram is null or instagram ~ '^https://www\.instagram\.com/[A-Za-z0-9._]{1,30}$'),
  facebook text check (facebook is null or facebook ~ '^https://www\.facebook\.com/([A-Za-z0-9.-]{2,100}|profile\.php\?id=[0-9]{5,20})$'),
  tiktok text check (tiktok is null or tiktok ~ '^https://www\.tiktok\.com/@[A-Za-z0-9._]{2,24}$'),
  -- https, dominio con extensión de letras (sin IP, usuario ni puerto), sin caracteres que rompan
  -- el enlace y sin acortadores que escondan el destino.
  website text check (website is null or (
    char_length(website) <= 200
    and website ~ '^https://[a-z0-9]([a-z0-9-]{0,62})(\.[a-z0-9-]{1,63})*\.[a-z]{2,24}([/?#][^[:space:]<>"''`\\]*)?$'
    and website !~ '^https://(bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|is\.gd|ow\.ly|rebrand\.ly|shorturl\.at|tiny\.cc|rb\.gy)([/?#]|$)'
  )),
  delivery_modes text[] not null default '{}' check (
    delivery_modes <@ array['presencial', 'recogida', 'a_convenir', 'domicilio_local', 'envios_nacionales', 'envios_internacionales']::text[]
  ),
  delivery_note text check (delivery_note is null or char_length(btrim(delivery_note)) between 1 and 160),
  updated_at timestamptz not null default now()
);
alter table public.business_links enable row level security;

-- Se ve si se ve el negocio (la subconsulta respeta el RLS de businesses: publicado, dueño o
-- equipo). Solo el dueño crea, cambia o quita la fila de su negocio.
create policy "contacto visible" on public.business_links for select
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy "crear contacto de mi negocio" on public.business_links for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "editar contacto de mi negocio" on public.business_links for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "quitar contacto de mi negocio" on public.business_links for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

grant select on public.business_links to anon, authenticated;
grant insert (business_id, instagram, facebook, tiktok, website, delivery_modes, delivery_note),
      update (instagram, facebook, tiktok, website, delivery_modes, delivery_note),
      delete on public.business_links to authenticated;

-- Fecha de cambio y filtro de palabras ofensivas en las condiciones (el mismo de las reseñas).
create function public.cuidar_contacto_negocio() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.delivery_note := nullif(btrim(regexp_replace(coalesce(new.delivery_note, ''), '\s+', ' ', 'g')), '');
  -- Sin repetidos, en el orden de la lista. Si trae una modalidad desconocida no se toca: así la
  -- rechaza la restricción de la columna en vez de descartarla en silencio.
  if new.delivery_modes <@ array['presencial', 'recogida', 'a_convenir', 'domicilio_local', 'envios_nacionales', 'envios_internacionales']::text[] then
    new.delivery_modes := array(
      select m from unnest(array['presencial', 'recogida', 'a_convenir', 'domicilio_local', 'envios_nacionales', 'envios_internacionales']) with ordinality as t(m, i)
      where m = any (new.delivery_modes) order by i
    );
  end if;
  if new.delivery_note is not null and public.texto_ofensivo(new.delivery_note) then
    raise exception 'Las condiciones tienen palabras que no se permiten' using errcode = '22023';
  end if;
  return new;
end $$;
revoke execute on function public.cuidar_contacto_negocio() from public, anon, authenticated;
create trigger business_links_cuidar before insert or update on public.business_links
  for each row execute function public.cuidar_contacto_negocio();
