-- Zipa lo tiene Beta 2.2 (correcciones prioritarias, P1): la cola de avisos indica a qué app va
-- cada uno. Clientes y negocios son dos proyectos de Expo y Expo rechaza entera una petición que los
-- mezcle; la Edge Function `enviar-notificaciones` ahora envía app por app y usa este dato.
-- Solo redefine tomar_notificaciones (migración 0020) agregando "app" al resultado. Compatible: la
-- función de envío también deduce la app si este campo no viene.

create or replace function public.tomar_notificaciones(p_limite int default 50) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v jsonb;
begin
  with listas as (
    select id from public.notifications
    where (status = 'pendiente' and next_attempt_at <= now()) or (status = 'enviando' and locked_until < now())
    order by id
    limit least(greatest(coalesce(p_limite, 50), 1), 200)
    for update skip locked
  ), tomadas as (
    update public.notifications n set status = 'enviando', attempts = n.attempts + 1, locked_until = now() + interval '5 minutes'
    from listas l where n.id = l.id
    returning n.id, n.recipient_id, n.app, n.title, n.body, n.data, n.attempts
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'app', t.app, 'title', t.title, 'body', t.body, 'data', t.data, 'attempt', t.attempts,
    'tokens', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'token', p.token))
                        from public.push_tokens p where p.user_id = t.recipient_id and p.app = t.app and p.active), '[]'::jsonb)
  )), '[]'::jsonb) into v
  from tomadas t;
  return v;
end $$;

revoke execute on function public.tomar_notificaciones(int) from public, anon, authenticated;
grant execute on function public.tomar_notificaciones(int) to service_role;
