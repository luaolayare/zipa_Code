-- LocalmenteTuyo: lista de espera de testers desde la web (localmentetuyo.com).
-- La persona deja su correo de Google (con su autorización) para que el equipo la agregue a las pruebas cerradas
-- de Google Play y le envíe los enlaces. Solo se escribe con registrar_tester (la llama la función /api/tester de
-- Cloudflare Pages) y solo la lee el equipo con admin_testers. Se borra a los 12 meses (limpieza diaria de la 0021).

create table public.solicitudes_tester (
  id uuid primary key default gen_random_uuid(),
  correo text not null unique check (char_length(correo) between 6 and 254 and correo = lower(correo)),
  apps text[] not null check (cardinality(apps) between 1 and 2 and apps <@ array['clientes', 'negocios']::text[]),
  acepta boolean not null check (acepta),
  invitado_en timestamptz,
  created_at timestamptz not null default now()
);
create index solicitudes_tester_fecha_idx on public.solicitudes_tester (created_at desc);
alter table public.solicitudes_tester enable row level security;
revoke all on public.solicitudes_tester from anon, authenticated;

-- Registro público. No revela si el correo ya estaba (responde igual), suma las apps nuevas y limita el volumen.
create function public.registrar_tester(p_correo text, p_apps text[], p_acepta boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_correo text := lower(btrim(coalesce(p_correo, '')));
  v_apps text[];
begin
  if coalesce(p_acepta, false) is not true then
    raise exception 'Necesitamos tu autorización para usar tu correo' using errcode = '22023';
  end if;
  if char_length(v_correo) > 254 or v_correo !~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$' then
    raise exception 'Escribe un correo válido' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct a order by a), '{}') into v_apps
  from unnest(coalesce(p_apps, '{}')) a where a in ('clientes', 'negocios');
  if cardinality(v_apps) = 0 then
    raise exception 'Elige al menos una app' using errcode = '22023';
  end if;
  -- Freno contra envíos masivos: como máximo 300 correos nuevos por hora en total.
  if not exists (select 1 from public.solicitudes_tester s where s.correo = v_correo)
     and (select count(*) from public.solicitudes_tester s where s.created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Recibimos muchas solicitudes. Intenta de nuevo en un rato' using errcode = '22023';
  end if;
  insert into public.solicitudes_tester (correo, apps, acepta) values (v_correo, v_apps, true)
  on conflict (correo) do update
    set apps = (select array_agg(distinct a order by a) from unnest(public.solicitudes_tester.apps || excluded.apps) a);
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.registrar_tester(text, text[], boolean) from public;
grant execute on function public.registrar_tester(text, text[], boolean) to anon, authenticated;

-- Equipo: lista de solicitudes (las pendientes primero).
create function public.admin_testers(p_limite int default 500) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(t) from (
    select s.id, s.correo, s.apps, s.invitado_en, s.created_at
    from public.solicitudes_tester s
    order by (s.invitado_en is not null), s.created_at desc
    limit least(greatest(coalesce(p_limite, 500), 1), 2000)) t), '[]'::jsonb);
end $$;
revoke execute on function public.admin_testers(int) from public, anon;
grant execute on function public.admin_testers(int) to authenticated;

-- Equipo: marca como invitados (ya agregados a Play Console y con los enlaces enviados). Queda en la bitácora.
create function public.admin_marcar_testers_invitados(p_ids uuid[]) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_n int;
begin
  if not public.is_admin('admin') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.solicitudes_tester set invitado_en = now() where id = any (coalesce(p_ids, '{}')) and invitado_en is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into public.admin_actions (admin_id, action, target_type, target_id, details)
    values (auth.uid(), 'marcar_testers_invitados', 'solicitud_tester', null, jsonb_build_object('cantidad', v_n));
  end if;
  return v_n;
end $$;
revoke execute on function public.admin_marcar_testers_invitados(uuid[]) from public, anon;
grant execute on function public.admin_marcar_testers_invitados(uuid[]) to authenticated;

-- Limpieza diaria (misma función y horario de la 0021/0025): ahora también borra las solicitudes de más de 12 meses.
create or replace function public.limpiar_avisos_antiguos() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_avisos int;
  v_tokens int;
  v_interes int;
  v_testers int;
begin
  delete from public.notifications
  where status in ('enviada', 'sin_dispositivos', 'fallida') and created_at < now() - interval '90 days';
  get diagnostics v_avisos = row_count;
  delete from public.push_tokens where not active and disabled_at < now() - interval '90 days';
  get diagnostics v_tokens = row_count;
  delete from public.interes_comercial where created_at < now() - interval '12 months';
  get diagnostics v_interes = row_count;
  delete from public.solicitudes_tester where created_at < now() - interval '12 months';
  get diagnostics v_testers = row_count;
  return jsonb_build_object('avisos', v_avisos, 'dispositivos', v_tokens, 'interes_comercial', v_interes, 'testers', v_testers);
end $$;
revoke execute on function public.limpiar_avisos_antiguos() from public, anon, authenticated;
