-- LocalmenteTuyo: los registros de interés comercial se conservan como máximo 12 meses (política de
-- privacidad, /privacidad). La limpieza diaria que ya existe (0021, cron «zipa-limpiar-avisos», 3:30 a. m.
-- en Colombia) ahora también los borra. No cambia nada más: misma función, mismo horario.
create or replace function public.limpiar_avisos_antiguos() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_avisos int;
  v_tokens int;
  v_interes int;
begin
  delete from public.notifications
  where status in ('enviada', 'sin_dispositivos', 'fallida') and created_at < now() - interval '90 days';
  get diagnostics v_avisos = row_count;
  delete from public.push_tokens where not active and disabled_at < now() - interval '90 days';
  get diagnostics v_tokens = row_count;
  delete from public.interes_comercial where created_at < now() - interval '12 months';
  get diagnostics v_interes = row_count;
  return jsonb_build_object('avisos', v_avisos, 'dispositivos', v_tokens, 'interes_comercial', v_interes);
end $$;
revoke execute on function public.limpiar_avisos_antiguos() from public, anon, authenticated;
