-- Zipa lo tiene: roles administrativos para el futuro panel privado (Next.js).
--
-- Principio: el panel NUNCA usa la service role key en el navegador. El administrador entra con
-- su propia cuenta; sus permisos salen de admin_users y de políticas RLS, y siempre con MFA
-- (sesión aal2). Las decisiones que cambian datos ajenos pasan por Edge Functions
-- (revisar-negocio) que validan el rol y dejan constancia en admin_actions.
--
-- Solo AGREGA tablas, funciones y políticas: no cambia ni borra ninguna política existente.
-- Ejecutar después de 0007_privilegios_minimos.sql.

-- 1. Quién es administrador ---------------------------------------------------------------------
-- RLS activo y sin políticas: nadie la lee ni la escribe por la API. Las altas y bajas se hacen
-- por SQL (editor de Supabase) con una migración o un script revisado.
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'revisor')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
alter table public.admin_users enable row level security;

-- 2. is_admin(): rol suficiente Y sesión con MFA ------------------------------------------------
-- 'admin' incluye todo lo de 'revisor'. Sin aal2 (segundo factor verificado) devuelve false,
-- aunque la persona esté en admin_users.
create function public.is_admin(min_role text default 'revisor') returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
     and exists (
       select 1 from public.admin_users a
       where a.user_id = auth.uid()
         and (a.role = 'admin' or (a.role = 'revisor' and min_role = 'revisor'))
     );
$$;
revoke execute on function public.is_admin(text) from public, anon;
grant execute on function public.is_admin(text) to authenticated;

-- 3. Bitácora de decisiones ---------------------------------------------------------------------
-- Solo escriben las Edge Functions (service role). Los administradores la leen.
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_actions_fecha_idx on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security;

create policy "admin ve la bitácora" on public.admin_actions for select to authenticated
  using (public.is_admin());
grant select on public.admin_actions to authenticated;

-- 4. Políticas adicionales para el equipo -------------------------------------------------------
-- Se suman a las existentes (RLS combina las políticas permisivas con OR).
create policy "admin ve todos los negocios" on public.businesses for select to authenticated
  using (public.is_admin());

create policy "admin ve verificaciones" on public.business_verifications for select to authenticated
  using (public.is_admin());

create policy "admin ve reportes" on public.reports for select to authenticated
  using (public.is_admin());
create policy "admin gestiona reportes" on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Del reporte, el equipo solo cambia el estado.
grant update (status) on public.reports to authenticated;

create policy "admin borra reseñas" on public.reviews for delete to authenticated
  using (public.is_admin('admin'));
grant delete on public.reviews to authenticated;

-- Foto del local: el equipo la ve (con signed URL de corta duración) mientras dura la revisión.
create policy "admin ve fotos de verificación" on storage.objects for select to authenticated
  using (bucket_id = 'verificaciones' and public.is_admin());

-- 5. Métricas del panel -------------------------------------------------------------------------
-- Agregados sin datos personales. Así el panel no necesita leer auth.users.
create function public.admin_metrics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'usuarios', (select count(*) from auth.users),
    'negocios_por_estado', coalesce(
      (select jsonb_object_agg(status::text, n) from (select status, count(*) n from public.businesses group by status) s),
      '{}'::jsonb),
    'resenas', (select count(*) from public.reviews),
    'reportes_pendientes', (select count(*) from public.reports where status = 'pendiente')
  );
end $$;
revoke execute on function public.admin_metrics() from public, anon;
grant execute on function public.admin_metrics() to authenticated;
