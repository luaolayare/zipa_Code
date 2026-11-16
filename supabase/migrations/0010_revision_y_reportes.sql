-- Zipa lo tiene: lo que necesita el panel administrativo para revisar negocios y reportes.
--
-- 1. Motivo del rechazo: el dueño ve en su panel por qué no se aprobó su negocio.
--    Lo escribe solo la Edge Function revisar-negocio (service role); el dueño lo lee y no lo edita.
--    No se publica: la vista businesses_public se creó con las columnas de antes (b.* se fija al crearla).
-- 2. El equipo ve los productos de un negocio en revisión (antes solo los veía si estaba publicado).
-- 3. admin_resolver_reporte(): marca un reporte como revisado o descartado y, si es una reseña y
--    quien decide es administrador (no revisor), la borra. Todo queda en admin_actions.
--
-- Ejecutar después de 0009_panel_de_negocios.sql.

alter table public.businesses
  add column review_note text check (char_length(review_note) <= 500);

create policy "admin ve productos" on public.products for select to authenticated
  using (public.is_admin());

create function public.admin_resolver_reporte(p_report uuid, p_estado text, p_borrar_resena boolean default false)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.reports;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_estado not in ('revisado', 'descartado') then
    raise exception 'Estado no válido: %', p_estado using errcode = '22023';
  end if;

  select * into r from public.reports where id = p_report for update;
  if not found then
    raise exception 'El reporte no existe' using errcode = 'P0002';
  end if;

  if p_borrar_resena then
    if not public.is_admin('admin') then
      raise exception 'Solo un administrador puede borrar reseñas' using errcode = '42501';
    end if;
    if r.target_type <> 'review' then
      raise exception 'Desde un reporte solo se pueden borrar reseñas' using errcode = '22023';
    end if;
    delete from public.reviews where id = r.target_id;
  end if;

  -- Se cierran juntos todos los reportes pendientes del mismo contenido.
  update public.reports set status = p_estado
  where id = p_report or (target_type = r.target_type and target_id = r.target_id and status = 'pendiente');

  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    case when p_borrar_resena then 'borrar_resena' else 'reporte_' || p_estado end,
    r.target_type,
    r.target_id,
    jsonb_build_object('reporte', p_report, 'motivo', r.reason)
  );
end $$;

revoke execute on function public.admin_resolver_reporte(uuid, text, boolean) from public, anon;
grant execute on function public.admin_resolver_reporte(uuid, text, boolean) to authenticated;
