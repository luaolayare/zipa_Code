-- Prueba de permisos para CI: simula cada operación de packages/shared/src/api.ts (y del futuro
-- panel administrativo, migración 0008) con los roles reales de la API (anon y authenticated) y comprueba qué debe funcionar y qué debe rechazarse.
-- Corre en una transacción que termina en ROLLBACK: no deja datos.

begin;

-- Ayudantes (en un esquema propio para que los roles de la API puedan usarlos) -----------------
create schema ci_pruebas;
grant usage on schema ci_pruebas to anon, authenticated;

create function ci_pruebas.debe_funcionar(sentencia text) returns void
language plpgsql as $$
begin
  execute sentencia;
exception when others then
  raise exception 'Debía funcionar (rol %): % → %', current_user, sentencia, sqlerrm;
end $$;

create function ci_pruebas.debe_fallar(sentencia text, patron text) returns void
language plpgsql as $$
begin
  begin
    execute sentencia;
  exception when others then
    if sqlerrm ilike patron then return; end if;
    raise exception 'Falló con otro error (rol %): % → % (se esperaba "%")', current_user, sentencia, sqlerrm, patron;
  end;
  raise exception 'Debía rechazarse y funcionó (rol %): %', current_user, sentencia;
end $$;

create function ci_pruebas.cuenta(consulta text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute 'select count(*) from (' || consulta || ') q' into n;
  return n;
end $$;

-- Filas que afecta una sentencia (para comprobar que RLS no deja tocar filas ajenas).
create function ci_pruebas.filas(sentencia text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute sentencia;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on all functions in schema ci_pruebas to anon, authenticated;

-- Datos de prueba (como postgres) ---------------------------------------------------------------
-- Al crear los usuarios corre el trigger on_auth_user_created (perfil y aceptaciones), aunque su
-- función ya no sea ejecutable por la API.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'duena@prueba.test',
   '{"full_name":"Dueña Prueba","consents":[{"document":"privacidad","version":"1.0","app":"negocios"}]}'),
  ('00000000-0000-0000-0000-0000000000c1', 'turista@prueba.test', '{"full_name":"Turista Prueba"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin@prueba.test', '{"full_name":"Admin Prueba"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'revisor@prueba.test', '{"full_name":"Revisor Prueba"}');
update auth.users set created_at = now() - interval '3 days' where email like '%@prueba.test';

insert into public.admin_users (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin'),
  ('00000000-0000-0000-0000-0000000000a2', 'revisor');

insert into public.businesses (id, owner_id, name, type, category, address, status) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1',
   'Negocio Publicado', 'emprendimiento', 'comer', 'Calle 1', 'publicado');

do $$ begin
  if not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'El trigger de registro no creó el perfil';
  end if;
  if not exists (select 1 from public.consents where user_id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'El trigger de registro no guardó la aceptación';
  end if;
end $$;

-- ANON: visitante sin sesión ----------------------------------------------------------------------
set local role anon;

do $$ begin
  -- Puede: lo que ve el turista sin cuenta (Explorar, detalle, productos, reseñas).
  if ci_pruebas.cuenta('select * from public.businesses_public') <> 1 then raise exception 'anon no ve businesses_public'; end if;
  perform ci_pruebas.debe_funcionar('select * from public.reviews_public');
  perform ci_pruebas.debe_funcionar('select * from public.products');
  -- No puede: escribir ni leer datos privados.
  perform ci_pruebas.debe_fallar($q$insert into public.reviews (business_id, user_id, stars, text) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 5, 'x')$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$insert into public.businesses (owner_id, name, type, category, address) values ('00000000-0000-0000-0000-0000000000c1', 'X', 'emprendimiento', 'comer', 'Y')$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar('select * from public.business_verifications', 'permission denied%');
  perform ci_pruebas.debe_fallar('select * from public.consents', 'permission denied%');
  perform ci_pruebas.debe_fallar('select * from public.reports', 'permission denied%');
  perform ci_pruebas.debe_fallar($q$update public.profiles set full_name = 'X'$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar('truncate public.reviews', 'permission denied%');
  perform ci_pruebas.debe_fallar('delete from public.businesses', 'permission denied%');
  -- Nada del panel administrativo.
  perform ci_pruebas.debe_fallar('select * from public.admin_users', 'permission denied%');
  perform ci_pruebas.debe_fallar('select * from public.admin_actions', 'permission denied%');
  perform ci_pruebas.debe_fallar('select public.admin_metrics()', 'permission denied%');
  perform ci_pruebas.debe_fallar('select public.is_admin()', 'permission denied%');
end $$;

reset role;

-- AUTHENTICATED: turista con sesión ----------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

do $$ begin
  -- Puede: reseñar, reportar, bloquear, aceptar documentos, cambiar su nombre.
  perform ci_pruebas.debe_fallar($q$insert into public.reviews (business_id, user_id, stars, text) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 5, 'Directo')$q$, 'permission denied%');
  perform ci_pruebas.debe_funcionar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000b1', 5, 'Deliciosa la arepa')$q$);
  if ci_pruebas.cuenta('select * from public.reviews_public') <> 1 then raise exception 'la turista no ve su reseña en reviews_public'; end if;
  perform ci_pruebas.debe_funcionar($q$insert into public.reports (reporter_id, target_type, target_id, reason) values ('00000000-0000-0000-0000-0000000000c1', 'business', '00000000-0000-0000-0000-0000000000b1', 'spam')$q$);
  perform ci_pruebas.debe_funcionar('select * from public.reports');
  perform ci_pruebas.debe_funcionar($q$insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1')$q$);
  perform ci_pruebas.debe_funcionar($q$delete from public.blocks where blocker_id = '00000000-0000-0000-0000-0000000000c1'$q$);
  perform ci_pruebas.debe_funcionar($q$insert into public.consents (user_id, document, version, app) values ('00000000-0000-0000-0000-0000000000c1', 'terminos_clientes', '1.0', 'clientes')$q$);
  perform ci_pruebas.debe_funcionar('select * from public.consents');
  perform ci_pruebas.debe_funcionar($q$update public.profiles set full_name = 'Turista Renombrada' where id = '00000000-0000-0000-0000-0000000000c1'$q$);
  -- El filtro de palabras sigue funcionando con permisos mínimos.
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000b1', 1, 'son unos malparidos')$q$, '%texto_ofensivo%');
  -- No puede: borrar o editar reseñas, cambiar la calificación, tocar datos privados ajenos.
  if ci_pruebas.filas('delete from public.reviews') <> 0 then raise exception 'la turista borró reseñas'; end if;
  perform ci_pruebas.debe_fallar('update public.reviews set stars = 1', 'permission denied%');
  perform ci_pruebas.debe_fallar('truncate public.consents', 'permission denied%');
  perform ci_pruebas.debe_fallar($q$update public.profiles set id = id$q$, 'permission denied%');
  if ci_pruebas.cuenta('select * from public.business_verifications') <> 0 then raise exception 'la turista ve verificaciones ajenas'; end if;
  -- No es administradora: no ve la lista de admins, la bitácora sale vacía y no hay métricas.
  if public.is_admin() then raise exception 'is_admin() es true para la turista'; end if;
  perform ci_pruebas.debe_fallar('select * from public.admin_users', 'permission denied%');
  if ci_pruebas.cuenta('select * from public.admin_actions') <> 0 then raise exception 'la turista ve la bitácora'; end if;
  perform ci_pruebas.debe_fallar('select public.admin_metrics()', 'No autorizado%');
  if ci_pruebas.filas($q$update public.reports set status = 'revisado'$q$) <> 0 then raise exception 'la turista cambió reportes'; end if;
end $$;

reset role;

-- AUTHENTICATED: dueña de negocio ------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';

do $$ begin
  -- Puede: registrar su negocio, enviarlo a revisión, guardar la verificación, productos, responder.
  perform ci_pruebas.debe_funcionar($q$insert into public.businesses (id, owner_id, name, type, category, address, status) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000d1', 'Negocio Nuevo', 'emprendimiento', 'comer', 'Calle 2', 'borrador')$q$);
  perform ci_pruebas.debe_funcionar($q$select * from public.businesses where owner_id = '00000000-0000-0000-0000-0000000000d1'$q$);
  perform ci_pruebas.debe_funcionar($q$update public.businesses set status = 'en_revision' where id = '00000000-0000-0000-0000-0000000000b2'$q$);
  perform ci_pruebas.debe_funcionar($q$insert into public.business_verifications (business_id, photo_path, id_number) values ('00000000-0000-0000-0000-0000000000b2', 'd1/b2/local.jpg', '900123456-7') on conflict (business_id) do update set photo_path = excluded.photo_path, id_number = excluded.id_number$q$);
  perform ci_pruebas.debe_funcionar($q$insert into public.business_verifications (business_id, photo_path, id_number) values ('00000000-0000-0000-0000-0000000000b2', 'd1/b2/otra.jpg', '900123456-7') on conflict (business_id) do update set photo_path = excluded.photo_path, id_number = excluded.id_number$q$);
  perform ci_pruebas.debe_funcionar($q$insert into public.products (business_id, name, price_cop) values ('00000000-0000-0000-0000-0000000000b2', 'Arepa', 7000)$q$);
  perform ci_pruebas.debe_funcionar($q$update public.products set name = 'Arepa de huevo', photo_url = 'https://ejemplo.test/a.jpg' where business_id = '00000000-0000-0000-0000-0000000000b2'$q$);
  -- El modelo 3D lo pone el proceso del servidor, nunca el dueño (migración 0009).
  perform ci_pruebas.debe_fallar($q$update public.products set model_url = 'https://x.test/m.glb' where business_id = '00000000-0000-0000-0000-0000000000b2'$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$insert into public.products (business_id, name, model_url, status) values ('00000000-0000-0000-0000-0000000000b2', 'Trampa', 'https://x.test/m.glb', 'listo')$q$, 'permission denied%');
  perform ci_pruebas.debe_funcionar($q$delete from public.products where business_id = '00000000-0000-0000-0000-0000000000b2' and name = 'Arepa de huevo'$q$);
  perform ci_pruebas.debe_funcionar($q$update public.reviews set reply = '¡Gracias!', replied_at = now() where business_id = '00000000-0000-0000-0000-0000000000b1'$q$);
  -- No puede: publicarse sola (RLS), borrar reseñas, ni leer reportes ajenos.
  perform ci_pruebas.debe_fallar($q$update public.businesses set status = 'publicado' where id = '00000000-0000-0000-0000-0000000000b2'$q$, '%equipo de revisión%');
  perform ci_pruebas.debe_fallar($q$update public.businesses set status = 'rechazado' where id = '00000000-0000-0000-0000-0000000000b2'$q$, '%equipo de revisión%');
  perform ci_pruebas.debe_fallar($q$update public.businesses set owner_id = '00000000-0000-0000-0000-0000000000c1' where id = '00000000-0000-0000-0000-0000000000b2'$q$, 'permission denied%');
  if ci_pruebas.filas('delete from public.reviews') <> 0 then raise exception 'la dueña borró reseñas'; end if;
  if ci_pruebas.cuenta('select * from public.reports') <> 0 then raise exception 'la dueña ve reportes ajenos'; end if;
end $$;

reset role;

-- ADMINISTRADORA SIN MFA (aal1): es admin en la tabla, pero sin segundo factor no tiene poderes --
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}';

do $$ begin
  if public.is_admin() then raise exception 'is_admin() es true sin MFA'; end if;
  if ci_pruebas.cuenta($q$select * from public.businesses where status <> 'publicado'$q$) <> 0 then raise exception 'admin sin MFA ve negocios no publicados'; end if;
  if ci_pruebas.cuenta('select * from public.business_verifications') <> 0 then raise exception 'admin sin MFA ve verificaciones'; end if;
  if ci_pruebas.cuenta('select * from public.reports') <> 0 then raise exception 'admin sin MFA ve reportes'; end if;
  perform ci_pruebas.debe_fallar('select public.admin_metrics()', 'No autorizado%');
  if ci_pruebas.filas('delete from public.reviews') <> 0 then raise exception 'admin sin MFA borró reseñas'; end if;
end $$;

reset role;

-- Un producto del negocio en revisión, para ver que el equipo lo puede revisar (migración 0010).
insert into public.products (business_id, name, price_cop) values ('00000000-0000-0000-0000-0000000000b2', 'Producto en revisión', 5000);

-- REVISORA CON MFA (aal2): ve todo para revisar, pero no borra reseñas ----------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';

do $$ begin
  if not public.is_admin() then raise exception 'is_admin() es false para la revisora con MFA'; end if;
  if public.is_admin('admin') then raise exception 'la revisora pasa como admin'; end if;
  if ci_pruebas.cuenta($q$select * from public.businesses where status = 'en_revision'$q$) <> 1 then raise exception 'la revisora no ve el negocio en revisión'; end if;
  if ci_pruebas.cuenta('select * from public.business_verifications') <> 1 then raise exception 'la revisora no ve la verificación'; end if;
  if ci_pruebas.cuenta($q$select * from public.products where business_id = '00000000-0000-0000-0000-0000000000b2'$q$) <> 1 then raise exception 'la revisora no ve los productos del negocio en revisión'; end if;
  if ci_pruebas.cuenta('select * from public.reports') <> 1 then raise exception 'la revisora no ve los reportes'; end if;
  perform ci_pruebas.debe_funcionar('select public.admin_metrics()');
  if ci_pruebas.filas('delete from public.reviews') <> 0 then raise exception 'la revisora borró reseñas'; end if;
  -- Ni la lista de admins ni la bitácora se escriben por la API.
  perform ci_pruebas.debe_fallar('select * from public.admin_users', 'permission denied%');
  perform ci_pruebas.debe_fallar($q$insert into public.admin_users (user_id, role) values ('00000000-0000-0000-0000-0000000000c1', 'admin')$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$insert into public.admin_actions (action, target_type) values ('x', 'y')$q$, 'permission denied%');
end $$;

reset role;

-- ADMINISTRADORA CON MFA (aal2): gestiona reportes y borra reseñas --------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';

do $$
declare m jsonb;
begin
  if not public.is_admin('admin') then raise exception 'is_admin(admin) es false para la admin con MFA'; end if;
  m := public.admin_metrics();
  if (m ->> 'usuarios')::int < 4 or (m ->> 'reportes_pendientes')::int <> 1
     or (m -> 'negocios_por_estado' ->> 'en_revision')::int <> 1 then
    raise exception 'admin_metrics() devolvió datos inesperados: %', m;
  end if;
  perform ci_pruebas.debe_funcionar('select * from public.admin_actions');
  -- Del reporte solo cambia el estado; la razón no.
  if ci_pruebas.filas($q$update public.reports set status = 'revisado'$q$) <> 1 then raise exception 'la admin no pudo marcar el reporte'; end if;
  perform ci_pruebas.debe_fallar($q$update public.reports set reason = 'otro'$q$, 'permission denied%');
  -- Puede retirar una reseña ofensiva o falsa.
  if ci_pruebas.filas('delete from public.reviews') <> 1 then raise exception 'la admin no pudo borrar la reseña'; end if;
  -- Publicar sigue siendo trabajo de la Edge Function revisar-negocio (service role), no de la API.
  if ci_pruebas.filas($q$update public.businesses set status = 'publicado' where id = '00000000-0000-0000-0000-0000000000b2'$q$) <> 0 then
    raise exception 'la admin publicó un negocio por la API';
  end if;
end $$;

reset role;

-- DUEÑA EDITA SU NEGOCIO PUBLICADO (migración 0009) ---------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';

do $$
declare estado text;
begin
  -- Cambiar horario o WhatsApp: sigue publicado.
  perform ci_pruebas.debe_funcionar($q$update public.businesses set hours = 'Todos los días', whatsapp = '3001234567' where id = '00000000-0000-0000-0000-0000000000b1'$q$);
  select status into estado from public.businesses where id = '00000000-0000-0000-0000-0000000000b1';
  if estado <> 'publicado' then raise exception 'cambiar el horario sacó al negocio de publicado (%)', estado; end if;
  -- Cambiar el nombre: vuelve a revisión.
  perform ci_pruebas.debe_funcionar($q$update public.businesses set name = 'Otro Nombre' where id = '00000000-0000-0000-0000-0000000000b1'$q$);
  select status into estado from public.businesses where id = '00000000-0000-0000-0000-0000000000b1';
  if estado <> 'en_revision' then raise exception 'cambiar el nombre no devolvió el negocio a revisión (%)', estado; end if;
  -- Nadie edita negocios ajenos.
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
  if ci_pruebas.filas($q$update public.businesses set hours = 'x' where id = '00000000-0000-0000-0000-0000000000b2'$q$) <> 0 then
    raise exception 'la turista editó un negocio ajeno';
  end if;
end $$;
reset role;

-- RESOLVER REPORTES CON admin_resolver_reporte (migración 0010) -----------------------------------
insert into public.reviews (id, business_id, user_id, stars, text) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 1, 'Reseña reportada de prueba');
insert into public.reports (id, reporter_id, target_type, target_id, reason) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'review', '00000000-0000-0000-0000-0000000000e1', 'falso');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.admin_resolver_reporte('00000000-0000-0000-0000-0000000000f1', 'revisado')$q$, 'No autorizado%');
  if ci_pruebas.cuenta('select * from public.businesses where review_note is not null') <> 0 then raise exception 'review_note visible sin motivo'; end if;
  perform ci_pruebas.debe_fallar('select review_note from public.businesses_public', '%review_note%');
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';
do $$ begin
  -- La revisora no borra reseñas, pero sí descarta reportes.
  perform ci_pruebas.debe_fallar($q$select public.admin_resolver_reporte('00000000-0000-0000-0000-0000000000f1', 'revisado', true)$q$, 'Solo un administrador%');
  perform ci_pruebas.debe_fallar($q$select public.admin_resolver_reporte('00000000-0000-0000-0000-0000000000f1', 'aprobado')$q$, 'Estado no válido%');
  perform ci_pruebas.debe_funcionar($q$select public.admin_resolver_reporte('00000000-0000-0000-0000-0000000000f1', 'descartado')$q$);
  if (select status from public.reports where id = '00000000-0000-0000-0000-0000000000f1') <> 'descartado' then raise exception 'el reporte no quedó descartado'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$select public.admin_resolver_reporte('00000000-0000-0000-0000-0000000000f1', 'revisado', true)$q$);
  if exists (select 1 from public.reviews where id = '00000000-0000-0000-0000-0000000000e1') then raise exception 'la admin no borró la reseña reportada'; end if;
  if ci_pruebas.cuenta($q$select * from public.admin_actions where action = 'borrar_resena'$q$) <> 1 then raise exception 'el borrado no quedó en la bitácora'; end if;
end $$;
reset role;

-- VIDEOS APROBADOS Y MI RESEÑA (migración 0011) ----------------------------------------------------
insert into public.businesses (id, owner_id, name, type, category, address, status) values
  ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000d1', 'Negocio Con Video', 'emprendimiento', 'comer', 'Calle 9', 'publicado');
insert into storage.objects (bucket_id, name) values
  ('videos', '00000000-0000-0000-0000-0000000000d1/b9/v1.mp4'),
  ('videos', '00000000-0000-0000-0000-0000000000d1/b9/v2.mp4');

-- La dueña sube un producto con video: queda pendiente y no puede aprobarlo ella misma.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$insert into public.products (business_id, name, video_path) values ('00000000-0000-0000-0000-0000000000b9', 'Con video', '00000000-0000-0000-0000-0000000000d1/b9/v1.mp4')$q$);
  if (select video_status from public.products where name = 'Con video') is distinct from 'pendiente' then raise exception 'el video nuevo no quedó pendiente'; end if;
  perform ci_pruebas.debe_fallar($q$update public.products set video_status = 'aprobado' where name = 'Con video'$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$select public.admin_revisar_video((select id from public.products where name = 'Con video'), 'aprobado')$q$, 'No autorizado%');
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000b9', 5, 'Mi propio negocio')$q$, 'No puedes calificar%');
end $$;
reset role;

-- Un visitante no ve el video pendiente.
set local role anon;
do $$ begin
  if ci_pruebas.cuenta($q$select * from storage.objects where bucket_id = 'videos' and name like '%/b9/%'$q$) <> 0 then raise exception 'anon ve un video pendiente'; end if;
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000b9', 5, 'x')$q$, 'permission denied%');
end $$;
reset role;

-- La revisora lo revisa: sin motivo no puede rechazar; luego lo aprueba.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.admin_revisar_video((select id from public.products where name = 'Con video'), 'rechazado', 'corto')$q$, 'Explica al negocio%');
  perform ci_pruebas.debe_funcionar($q$select public.admin_revisar_video((select id from public.products where name = 'Con video'), 'rechazado', 'Se ve muy oscuro, grábalo con más luz')$q$);
  perform ci_pruebas.debe_funcionar($q$select public.admin_revisar_video((select id from public.products where name = 'Con video'), 'aprobado')$q$);
  if (select video_status || '|' || coalesce(video_note, '') from public.products where name = 'Con video') <> 'aprobado|' then raise exception 'el video no quedó aprobado y sin nota'; end if;
end $$;
reset role;

-- Aprobado y con negocio publicado: el visitante sí lo ve (solo ese archivo).
set local role anon;
do $$ begin
  if ci_pruebas.cuenta($q$select * from storage.objects where bucket_id = 'videos' and name like '%/b9/%'$q$) <> 1 then raise exception 'anon no ve el video aprobado (o ve otros)'; end if;
end $$;
reset role;

-- Si la dueña cambia el video, vuelve a revisión.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$update public.products set video_path = '00000000-0000-0000-0000-0000000000d1/b9/v2.mp4' where name = 'Con video'$q$);
  if (select video_status from public.products where name = 'Con video') <> 'pendiente' then raise exception 'el video cambiado no volvió a revisión'; end if;
end $$;
reset role;

-- La turista califica dos veces el mismo negocio: queda UNA reseña, con lo último que escribió.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000b9', 3, 'Primera vez')$q$);
  perform ci_pruebas.debe_funcionar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000b9', 5, 'Volví y mejoró')$q$);
  if ci_pruebas.cuenta($q$select * from public.reviews where business_id = '00000000-0000-0000-0000-0000000000b9' and user_id = '00000000-0000-0000-0000-0000000000c1'$q$) <> 1 then raise exception 'hay más de una reseña por persona'; end if;
  if (select stars from public.reviews where business_id = '00000000-0000-0000-0000-0000000000b9' and user_id = '00000000-0000-0000-0000-0000000000c1') <> 5 then raise exception 'la reseña no se actualizó'; end if;
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000b9', 9, 'x')$q$, 'La calificación va de 1 a 5%');
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000b9', 1, 'son unos malparidos')$q$, '%texto_ofensivo%');
end $$;
reset role;

-- ANTISPAM DE RESEÑAS (migración 0012) ------------------------------------------------------------
-- Tres negocios publicados de "comer" y "artesanias", un competidor y cuentas nuevas.
insert into auth.users (id, email, raw_user_meta_data, created_at) values
  ('00000000-0000-0000-0000-0000000000c2', 'nueva@prueba.test', '{"full_name":"Cuenta Nueva"}', now()),
  ('00000000-0000-0000-0000-0000000000c3', 'competidor@prueba.test', '{"full_name":"Competidor"}', now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000c4', 'mala1@prueba.test', '{"full_name":"Mala Uno"}', now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000c5', 'mala2@prueba.test', '{"full_name":"Mala Dos"}', now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000c6', 'mala3@prueba.test', '{"full_name":"Mala Tres"}', now() - interval '3 days');
insert into public.businesses (id, owner_id, name, type, category, address, status) values
  ('00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-0000000000d1', 'Comida Atacada', 'emprendimiento', 'comer', 'Calle 10', 'publicado'),
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000c3', 'Negocio del Competidor', 'emprendimiento', 'comer', 'Calle 11', 'publicado'),
  ('00000000-0000-0000-0000-0000000000bc', '00000000-0000-0000-0000-0000000000d1', 'Artesanías Vecinas', 'emprendimiento', 'artesanias', 'Calle 12', 'publicado'),
  ('00000000-0000-0000-0000-0000000000bd', '00000000-0000-0000-0000-0000000000d1', 'Café de la Esquina', 'emprendimiento', 'cafe_dulces', 'Calle 13', 'publicado');

do $$ begin
  -- A. Cada negocio tiene su código de QR (también los creados después de la migración).
  if (select count(*) from public.business_qr where business_id in ('00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-0000000000bb')) <> 2 then
    raise exception 'los negocios nuevos no tienen código QR';
  end if;
end $$;

set local role anon;
do $$ begin
  perform ci_pruebas.debe_fallar('select * from public.business_qr', 'permission denied%');
  perform ci_pruebas.debe_fallar($q$select public.registrar_visita('00000000-0000-0000-0000-0000000000ba', 'x')$q$, 'permission denied%');
end $$;
reset role;

-- La turista no ve el código ajeno; con el código correcto queda como visitante.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$
declare v_token text;
begin
  if ci_pruebas.cuenta('select * from public.business_qr') <> 0 then raise exception 'la turista ve códigos QR ajenos'; end if;
  if public.registrar_visita('00000000-0000-0000-0000-0000000000ba', 'codigo-falso') then raise exception 'un código falso registró visita'; end if;
  reset role;
  select token into v_token from public.business_qr where business_id = '00000000-0000-0000-0000-0000000000ba';
  set local role authenticated;
  if not public.registrar_visita('00000000-0000-0000-0000-0000000000ba', v_token) then raise exception 'el código real no registró la visita'; end if;
  perform ci_pruebas.debe_funcionar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000ba', 4, 'Rico y rápido')$q$);
  if not (select visited from public.reviews where business_id = '00000000-0000-0000-0000-0000000000ba' and user_id = '00000000-0000-0000-0000-0000000000c1') then
    raise exception 'la reseña con visita no tiene el sello';
  end if;
  -- B. Foto: solo de su carpeta en el bucket de reseñas.
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000ba', 4, 'x', 'https://x.supabase.co/storage/v1/object/public/resenas/00000000-0000-0000-0000-0000000000c2/a.jpg')$q$, 'Foto no válida%');
  perform ci_pruebas.debe_funcionar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000ba', 4, 'Con foto', 'https://x.supabase.co/storage/v1/object/public/resenas/00000000-0000-0000-0000-0000000000c1/ba/foto.jpg')$q$);
  -- Ni la autora puede escribir la respuesta del negocio.
  perform ci_pruebas.debe_fallar($q$update public.reviews set photo_url = 'https://otra' where user_id = '00000000-0000-0000-0000-0000000000c1'$q$, 'permission denied%');
  -- D. Máximo 3 reseñas nuevas al día (cuentan las que existen hoy): la que pase de 3 se frena.
  perform ci_pruebas.debe_funcionar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000bc', 5, 'Bonitas')$q$);
  if (select count(*) from public.reviews where user_id = '00000000-0000-0000-0000-0000000000c1' and created_at > now() - interval '24 hours') < 3 then
    perform ci_pruebas.debe_funcionar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000b9', 5, 'Relleno')$q$);
  end if;
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000bd', 5, 'Una más')$q$, 'Llegaste al máximo%');
  perform ci_pruebas.debe_funcionar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000ba', 5, 'Edito la mía')$q$);
end $$;
reset role;

-- D. Cuenta creada hace menos de 24 horas.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000ba', 1, 'Malo')$q$, 'Podrás calificar 24 horas%');
end $$;
reset role;

-- C. El competidor (tiene un negocio de "comer") no califica otro de "comer", pero sí de otra categoría.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000ba', 1, 'Pésimo')$q$, 'Las cuentas con un negocio no pueden%');
  perform ci_pruebas.debe_funcionar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000bc', 5, 'Lindas artesanías')$q$);
end $$;
reset role;

-- E. Ráfaga: dos reseñas de 1 estrella publicadas; la tercera en pocas horas queda en espera.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}';
do $$ begin if public.guardar_mi_resena('00000000-0000-0000-0000-0000000000ba', 1, 'Horrible') <> 'publicada' then raise exception 'la primera mala no se publicó'; end if; end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated"}';
do $$ begin if public.guardar_mi_resena('00000000-0000-0000-0000-0000000000ba', 2, 'Feo') <> 'publicada' then raise exception 'la segunda mala no se publicó'; end if; end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c6","role":"authenticated"}';
do $$ begin
  if public.guardar_mi_resena('00000000-0000-0000-0000-0000000000ba', 1, 'Malísimo') <> 'en_espera' then raise exception 'la ráfaga no quedó en espera'; end if;
  -- La autora sí ve su reseña en espera.
  if ci_pruebas.cuenta($q$select * from public.reviews_public where business_id = '00000000-0000-0000-0000-0000000000ba' and status = 'en_espera'$q$) <> 1 then raise exception 'la autora no ve su reseña en espera'; end if;
end $$;
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  -- El público no la ve y no cuenta en la calificación.
  if ci_pruebas.cuenta($q$select * from public.reviews_public where business_id = '00000000-0000-0000-0000-0000000000ba' and status <> 'publicada'$q$) <> 0 then raise exception 'el público ve reseñas en espera'; end if;
  if (select review_count from public.businesses_public where id = '00000000-0000-0000-0000-0000000000ba') <> 3 then raise exception 'la reseña en espera cuenta en la calificación'; end if;
end $$;
reset role;

-- El equipo la modera.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.admin_moderar_resena((select id from public.reviews where user_id = '00000000-0000-0000-0000-0000000000c6'), 'publicada')$q$, 'No autorizado%');
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$select public.admin_moderar_resena((select id from public.reviews where user_id = '00000000-0000-0000-0000-0000000000c6'), 'rechazada')$q$);
  if (select status from public.reviews where user_id = '00000000-0000-0000-0000-0000000000c6') <> 'rechazada' then raise exception 'la reseña no quedó rechazada'; end if;
end $$;
reset role;

-- CATEGORÍAS, ETIQUETAS Y BÚSQUEDA (migración 0013) ------------------------------------------------
-- Una dueña nueva con dos negocios publicados y un borrador.
insert into auth.users (id, email, raw_user_meta_data, created_at) values
  ('00000000-0000-0000-0000-0000000000d2', 'duena2@prueba.test', '{"full_name":"Dueña Dos"}', now() - interval '3 days');

insert into public.businesses (id, owner_id, name, type, subcategory_id, address, status, specialty) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d2', 'Pizzería Doña Ñaña', 'emprendimiento', 'pizzerias', 'Calle 9', 'publicado', null),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d2', 'Helados del Páramo', 'emprendimiento', 'heladerias', 'Calle 10', 'publicado', 'Postres fríos'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000d2', 'Borrador Oculto', 'emprendimiento', 'pizzerias', 'Calle 11', 'borrador', null);
insert into public.products (business_id, name) values
  ('00000000-0000-0000-0000-0000000000e2', 'Paleta de Maracuyá'),
  ('00000000-0000-0000-0000-0000000000e3', 'Pizza secreta');

do $$ begin
  -- Compatibilidad: un negocio creado solo con la categoría vieja recibe subcategoría.
  if (select subcategory_id from public.businesses where id = '00000000-0000-0000-0000-0000000000b1') <> 'otros_restaurantes' then
    raise exception 'un negocio con categoría vieja "comer" no recibió la subcategoría Otros restaurantes';
  end if;
  -- Y uno creado con subcategoría recibe la categoría vieja (la leen las apps instaladas).
  if (select category from public.businesses where id = '00000000-0000-0000-0000-0000000000e1') <> 'comer' then
    raise exception 'pizzerías no quedó como "comer" para las apps viejas';
  end if;
  if (select category from public.businesses where id = '00000000-0000-0000-0000-0000000000e2') <> 'cafe_dulces' then
    raise exception 'heladerías no quedó como "cafe_dulces" para las apps viejas';
  end if;
  if (select count(*) from public.categories where parent_id is null) <> 2 then
    raise exception 'debe haber exactamente 2 categorías principales';
  end if;
  if (select count(*) from public.categories where parent_id is not null) <> 12 then
    raise exception 'faltan subcategorías iniciales';
  end if;
end $$;

-- El público: lee categorías y busca; no escribe categorías.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if ci_pruebas.cuenta('select * from public.categories') < 14 then raise exception 'anon no ve las categorías'; end if;
  perform ci_pruebas.debe_fallar($q$insert into public.categories (id, name) values ('hackeo', 'Hackeo')$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$update public.categories set active = false$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$select public.admin_guardar_categoria(null, 'restaurantes', 'Hackeo')$q$, 'permission denied%');

  -- Por nombre, sin tildes ni mayúsculas (ñ = n).
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios('dona nana') where id = '00000000-0000-0000-0000-0000000000e1'$q$) <> 1 then raise exception 'la búsqueda por nombre sin tildes no encuentra Doña Ñaña'; end if;
  -- Por producto o plato, con tildes y mayúsculas distintas.
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios('MARACUYÁ')$q$) <> 1 then raise exception 'la búsqueda por producto no encuentra la paleta de maracuyá'; end if;
  -- Por subcategoría escrita.
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios('heladerias') where id = '00000000-0000-0000-0000-0000000000e2'$q$) <> 1 then raise exception 'la búsqueda por subcategoría no funciona'; end if;
  -- Un borrador y sus productos no aparecen.
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios('secreta')$q$) <> 0 then raise exception 'la búsqueda muestra productos de un negocio sin publicar'; end if;
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios('oculto')$q$) <> 0 then raise exception 'la búsqueda muestra un borrador'; end if;
  -- Filtros de categoría principal y subcategoría.
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios(null, 'emprendimientos') where id = '00000000-0000-0000-0000-0000000000e1'$q$) <> 0 then raise exception 'una pizzería aparece en Emprendimientos'; end if;
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios(null, 'restaurantes') where id = '00000000-0000-0000-0000-0000000000e1'$q$) <> 1 then raise exception 'la pizzería no aparece en Restaurantes'; end if;
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios(null, null, 'heladerias')$q$) <> 1 then raise exception 'el filtro por subcategoría no funciona'; end if;
  -- Comodines de LIKE no sirven para listar todo con un texto raro; y el límite máximo es 50.
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios('zz%zz')$q$) <> 0 then raise exception 'el texto con %% se usó como comodín'; end if;
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios(null, null, null, 'calificacion', 500)$q$) > 50 then raise exception 'la búsqueda devolvió más de 50 filas'; end if;
  perform ci_pruebas.debe_funcionar($q$select * from public.buscar_negocios('pizza', null, null, 'recientes', 10, 0)$q$);
  -- La vista pública trae la clasificación.
  if (select main_category || '|' || subcategory_name from public.businesses_public where id = '00000000-0000-0000-0000-0000000000e1') <> 'restaurantes|Pizzerías' then
    raise exception 'businesses_public no trae categoría principal y subcategoría';
  end if;
end $$;
reset role;

-- La dueña: cambia su subcategoría y maneja sus etiquetas; nada más.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$update public.businesses set subcategory_id = 'comida_rapida' where id = '00000000-0000-0000-0000-0000000000e1'$q$);
  if (select category || '|' || status from public.businesses where id = '00000000-0000-0000-0000-0000000000e1') <> 'comer|publicado' then
    raise exception 'cambiar de pizzería a comida rápida no debe sacarla de publicación';
  end if;
  perform ci_pruebas.debe_fallar($q$update public.businesses set subcategory_id = 'restaurantes' where id = '00000000-0000-0000-0000-0000000000e1'$q$, 'Elige una subcategoría válida%');
  perform ci_pruebas.debe_fallar($q$update public.categories set name = 'Mía' where id = 'pizzerias'$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$select public.admin_guardar_categoria(null, 'restaurantes', 'Mía')$q$, 'No autorizado%');

  -- Etiquetas: hasta 3, subcategorías, sin repetir la principal, solo en su negocio.
  perform ci_pruebas.debe_funcionar($q$insert into public.business_tags (business_id, category_id) values ('00000000-0000-0000-0000-0000000000e1', 'pizzerias')$q$);
  perform ci_pruebas.debe_funcionar($q$insert into public.business_tags (business_id, category_id) values ('00000000-0000-0000-0000-0000000000e1', 'parrillas')$q$);
  perform ci_pruebas.debe_fallar($q$insert into public.business_tags (business_id, category_id) values ('00000000-0000-0000-0000-0000000000e1', 'comida_rapida')$q$, 'Esa ya es la subcategoría principal%');
  perform ci_pruebas.debe_fallar($q$insert into public.business_tags (business_id, category_id) values ('00000000-0000-0000-0000-0000000000e1', 'restaurantes')$q$, 'Las etiquetas deben ser subcategorías%');
  perform ci_pruebas.debe_funcionar($q$insert into public.business_tags (business_id, category_id) values ('00000000-0000-0000-0000-0000000000e1', 'reposteria')$q$);
  perform ci_pruebas.debe_fallar($q$insert into public.business_tags (business_id, category_id) values ('00000000-0000-0000-0000-0000000000e1', 'heladerias')$q$, 'Puedes agregar hasta 3%');
  perform ci_pruebas.debe_fallar($q$insert into public.business_tags (business_id, category_id) values ('00000000-0000-0000-0000-0000000000b1', 'parrillas')$q$, '%row-level security%');
  if ci_pruebas.filas($q$delete from public.business_tags where business_id = '00000000-0000-0000-0000-0000000000b1'$q$) <> 0 then raise exception 'la dueña borró etiquetas ajenas'; end if;
  perform ci_pruebas.debe_funcionar($q$delete from public.business_tags where business_id = '00000000-0000-0000-0000-0000000000e1' and category_id = 'reposteria'$q$);

  -- Si la etiqueta pasa a ser la principal, se quita de etiquetas (sin clasificación duplicada).
  perform ci_pruebas.debe_funcionar($q$update public.businesses set subcategory_id = 'pizzerias' where id = '00000000-0000-0000-0000-0000000000e1'$q$);
  if exists (select 1 from public.business_tags where business_id = '00000000-0000-0000-0000-0000000000e1' and category_id = 'pizzerias') then
    raise exception 'la subcategoría principal quedó también como etiqueta';
  end if;

  -- App vieja: cambia solo la categoría vieja → subcategoría equivalente.
  perform ci_pruebas.debe_funcionar($q$update public.businesses set category = 'artesanias' where id = '00000000-0000-0000-0000-0000000000e3'$q$);
  if (select subcategory_id from public.businesses where id = '00000000-0000-0000-0000-0000000000e3') <> 'artesanias' then
    raise exception 'la app vieja cambió la categoría y la subcategoría no la siguió';
  end if;
end $$;
reset role;

-- La búsqueda por etiqueta encuentra el negocio una sola vez.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios(null, null, 'parrillas') where id = '00000000-0000-0000-0000-0000000000e1'$q$) <> 1 then raise exception 'el filtro por etiqueta no encuentra el negocio una sola vez'; end if;
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios('parrilla') where id = '00000000-0000-0000-0000-0000000000e1'$q$) <> 1 then raise exception 'la búsqueda por etiqueta escrita no funciona'; end if;
  if ci_pruebas.cuenta($q$select * from public.business_tags where business_id = '00000000-0000-0000-0000-0000000000e1'$q$) <> 1 then raise exception 'anon no ve las etiquetas de un negocio publicado'; end if;
end $$;
reset role;

-- Administradora SIN MFA y revisora: no administran categorías.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.admin_guardar_categoria(null, 'restaurantes', 'Comida de mar')$q$, 'No autorizado%');
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.admin_guardar_categoria(null, 'restaurantes', 'Comida de mar')$q$, 'No autorizado%');
  perform ci_pruebas.debe_fallar($q$select public.admin_borrar_categoria('otros_restaurantes')$q$, 'No autorizado%');
end $$;
reset role;

-- Administradora con MFA: crea, edita, desactiva y borra solo lo que no está en uso.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$ begin
  if (select public.admin_guardar_categoria(null, 'restaurantes', 'Comida de mar', 60)) <> 'comida_de_mar' then raise exception 'no creó la subcategoría comida_de_mar'; end if;
  perform ci_pruebas.debe_fallar($q$select public.admin_guardar_categoria(null, 'restaurantes', 'COMIDA DE MAR')$q$, 'Ya existe%');
  perform ci_pruebas.debe_fallar($q$select public.admin_guardar_categoria(null, 'pizzerias', 'Nivel tres')$q$, 'Elige la categoría principal%');
  perform ci_pruebas.debe_fallar($q$select public.admin_guardar_categoria(null, 'restaurantes', ' x ')$q$, 'El nombre debe tener%');
  perform ci_pruebas.debe_funcionar($q$select public.admin_guardar_categoria('comida_de_mar', null, 'Pescados y mariscos', 55, false)$q$);
  if (select name || '|' || sort_order || '|' || active from public.categories where id = 'comida_de_mar') <> 'Pescados y mariscos|55|false' then
    raise exception 'no editó nombre, orden y estado';
  end if;
  if (select count(*) from public.admin_actions where action in ('crear_categoria', 'editar_categoria')) <> 2 then raise exception 'los cambios de categorías no quedaron en la bitácora'; end if;

  perform ci_pruebas.debe_fallar($q$select public.admin_borrar_categoria('pizzerias')$q$, 'Tiene % negocio(s) asociados%');
  perform ci_pruebas.debe_fallar($q$select public.admin_borrar_categoria('parrillas')$q$, 'Tiene % negocio(s) asociados%');
  perform ci_pruebas.debe_fallar($q$select public.admin_borrar_categoria('restaurantes')$q$, 'Las categorías principales no se borran%');
  perform ci_pruebas.debe_funcionar($q$select public.admin_borrar_categoria('comida_de_mar')$q$);
  if exists (select 1 from public.categories where id = 'comida_de_mar') then raise exception 'no borró la subcategoría sin uso'; end if;

  -- Desactiva Parrillas para probar que ya no se puede elegir.
  perform ci_pruebas.debe_funcionar($q$select public.admin_guardar_categoria('parrillas', null, 'Parrillas', null, false)$q$);
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$update public.businesses set subcategory_id = 'parrillas' where id = '00000000-0000-0000-0000-0000000000e2'$q$, 'Esa subcategoría ya no está disponible%');
  perform ci_pruebas.debe_fallar($q$insert into public.business_tags (business_id, category_id) values ('00000000-0000-0000-0000-0000000000e2', 'parrillas')$q$, 'Esa subcategoría ya no está disponible%');
  -- Editar otros datos de un negocio que ya tenía una subcategoría desactivada sigue funcionando.
  perform ci_pruebas.debe_funcionar($q$update public.businesses set hours = '9 a 5' where id = '00000000-0000-0000-0000-0000000000e1'$q$);
end $$;
reset role;

-- MENÚ DIGITAL (migración 0014) --------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$insert into public.products (business_id, name, price_cop, section, available, sort_order) values ('00000000-0000-0000-0000-0000000000e1', 'Pizza margarita', 28000, 'Platos fuertes', true, 1)$q$);
  perform ci_pruebas.debe_funcionar($q$update public.products set available = false, section = 'Pizzas' where name = 'Pizza margarita'$q$);
  if (select available::text || '|' || section from public.products where name = 'Pizza margarita') <> 'false|Pizzas' then raise exception 'no guardó disponibilidad y sección'; end if;
  perform ci_pruebas.debe_fallar($q$update public.products set section = '' where name = 'Pizza margarita'$q$, '%check constraint%');
  -- Productos ajenos: no.
  if ci_pruebas.filas($q$update public.products set available = false where business_id = '00000000-0000-0000-0000-0000000000b1'$q$) <> 0 then raise exception 'cambió la disponibilidad de productos ajenos'; end if;
  -- Cambiar disponibilidad no toca la aprobación del video.
  perform ci_pruebas.debe_fallar($q$update public.products set video_status = 'aprobado' where name = 'Pizza margarita'$q$, 'permission denied%');
end $$;
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if (select available from public.products where name = 'Pizza margarita') is distinct from false then raise exception 'el público no ve que el plato no está disponible'; end if;
  perform ci_pruebas.debe_fallar($q$update public.products set available = true$q$, 'permission denied%');
end $$;
reset role;

-- ANALÍTICA (migración 0015) -------------------------------------------------------------------------
-- El público registra eventos, pero no lee la tabla ni los agregados.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare i int;
begin
  perform ci_pruebas.debe_funcionar($q$select public.registrar_evento('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'clientes', 'app_open')$q$);
  perform ci_pruebas.debe_funcionar($q$select public.registrar_evento('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'clientes', 'business_view', '00000000-0000-0000-0000-0000000000e1')$q$);
  perform ci_pruebas.debe_funcionar($q$select public.registrar_evento('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'clientes', 'whatsapp_click', '00000000-0000-0000-0000-0000000000e1')$q$);
  perform ci_pruebas.debe_funcionar($q$select public.registrar_evento('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'clientes', 'category_view', null, null, 'pizzerias')$q$);
  -- Un negocio sin publicar no se registra (queda en null).
  perform ci_pruebas.debe_funcionar($q$select public.registrar_evento('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'clientes', 'business_view', '00000000-0000-0000-0000-0000000000e3')$q$);
  perform ci_pruebas.debe_fallar($q$select public.registrar_evento('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'clientes', 'robar_datos')$q$, 'Evento no válido%');
  perform ci_pruebas.debe_fallar($q$select public.registrar_evento(null, '22222222-0000-0000-0000-000000000001', 'clientes', 'app_open')$q$, 'Falta el identificador%');
  perform ci_pruebas.debe_fallar('select * from public.analytics_events', 'permission denied%');
  perform ci_pruebas.debe_fallar('select public.admin_analitica()', 'permission denied%');
  perform ci_pruebas.debe_fallar('select public.admin_sistema()', 'permission denied%');
  -- Búsquedas: la de 3 dispositivos distintos sale en el top; la de 1 solo, no.
  for i in 1..3 loop
    perform public.registrar_evento(('33333333-0000-0000-0000-00000000000' || i)::uuid, '22222222-0000-0000-0000-000000000002', 'clientes', 'search', null, null, null, 'Pizzería ', 4);
  end loop;
  perform public.registrar_evento('33333333-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000002', 'clientes', 'search', null, null, null, 'mi vecino juan perez', 0);
  -- Freno: el evento 61 del mismo dispositivo en un minuto se ignora.
  for i in 1..70 loop
    perform public.registrar_evento('44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 'clientes', 'app_open');
  end loop;
end $$;
reset role;

do $$ begin
  if (select count(*) from public.analytics_events where device_id = '44444444-0000-0000-0000-000000000001') <> 60 then raise exception 'el freno de 60 eventos por minuto no funciona'; end if;
  if exists (select 1 from public.analytics_events where business_id = '00000000-0000-0000-0000-0000000000e3') then raise exception 'se registró la visita a un negocio sin publicar'; end if;
  if (select search_term from public.analytics_events where name = 'search' and device_id = '33333333-0000-0000-0000-000000000001') <> 'pizzeria' then raise exception 'la búsqueda no se guardó normalizada'; end if;
end $$;

-- Turista con sesión: tampoco ve analítica.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar('select public.admin_analitica()', 'No autorizado%');
  perform ci_pruebas.debe_fallar('select public.admin_sistema()', 'No autorizado%');
  perform ci_pruebas.debe_fallar('select * from public.analytics_events', 'permission denied%');
end $$;
reset role;

-- Revisora con MFA: ve los agregados (sin búsquedas individuales); no limpia eventos.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';
do $$
declare a jsonb;
begin
  a := public.admin_analitica(30);
  if (a ->> 'activos_hoy')::int < 6 then raise exception 'activos_hoy no cuenta los dispositivos: %', a ->> 'activos_hoy'; end if;
  if (a -> 'totales' ->> 'whatsapp_click')::int <> 1 then raise exception 'no cuenta los clics en WhatsApp'; end if;
  if (a -> 'top_negocios' -> 0 ->> 'whatsapp')::int <> 1 then raise exception 'top_negocios no trae los clics'; end if;
  if (a -> 'top_categorias' -> 0 ->> 'id') <> 'pizzerias' then raise exception 'top_categorias no funciona'; end if;
  if jsonb_array_length(a -> 'top_busquedas') <> 1 or (a -> 'top_busquedas' -> 0 ->> 'termino') <> 'pizzeria' then raise exception 'top_busquedas muestra búsquedas individuales o no muestra la común: %', a -> 'top_busquedas'; end if;
  if (a ->> 'busquedas_sin_resultados')::int <> 1 then raise exception 'no cuenta las búsquedas sin resultados'; end if;
  if jsonb_array_length(a -> 'serie') <> 30 then raise exception 'la serie no tiene 30 días'; end if;
  if (public.admin_sistema() ->> 'tamano_base_bytes')::bigint <= 0 then raise exception 'admin_sistema no mide la base'; end if;
  perform ci_pruebas.debe_fallar('select public.admin_limpiar_eventos()', 'No autorizado%');
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$ begin
  perform ci_pruebas.debe_funcionar('select public.admin_limpiar_eventos()');
end $$;
reset role;

-- LOGO Y BÚSQUEDA RÁPIDA (migración 0016) ----------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  -- Logo en su propia carpeta del bucket "negocios": sí. De otro sitio o de otra persona: no.
  perform ci_pruebas.debe_funcionar($q$update public.businesses set logo_url = 'https://x.supabase.co/storage/v1/object/public/negocios/00000000-0000-0000-0000-0000000000d2/e1/logo.png' where id = '00000000-0000-0000-0000-0000000000e1'$q$);
  perform ci_pruebas.debe_fallar($q$update public.businesses set logo_url = 'https://otro-sitio.com/logo.png' where id = '00000000-0000-0000-0000-0000000000e1'$q$, 'Logo no válido%');
  perform ci_pruebas.debe_fallar($q$update public.businesses set logo_url = 'https://x.supabase.co/storage/v1/object/public/negocios/00000000-0000-0000-0000-0000000000d1/b1/logo.png' where id = '00000000-0000-0000-0000-0000000000e1'$q$, 'Logo no válido%');
  -- Cambiar el logo no saca el negocio de publicación.
  if (select status from public.businesses where id = '00000000-0000-0000-0000-0000000000e1') <> 'publicado' then raise exception 'cambiar el logo despublicó el negocio'; end if;
  -- Logo de un negocio ajeno: no.
  if ci_pruebas.filas($q$update public.businesses set logo_url = null where id = '00000000-0000-0000-0000-0000000000b1'$q$) <> 0 then raise exception 'cambió el logo de un negocio ajeno'; end if;
  -- Las columnas de búsqueda las calcula la base.
  perform ci_pruebas.debe_fallar($q$update public.products set nombre_busqueda = 'trampa' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%nombre_busqueda%');
  perform ci_pruebas.debe_fallar($q$update public.businesses set nombre_busqueda = 'trampa' where id = '00000000-0000-0000-0000-0000000000e1'$q$, '%nombre_busqueda%');
end $$;
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if (select logo_url from public.businesses_public where id = '00000000-0000-0000-0000-0000000000e1') not like '%/negocios/%' then raise exception 'el público no ve el logo'; end if;
  if (select nombre_busqueda from public.businesses_public where id = '00000000-0000-0000-0000-0000000000e1') <> 'pizzeria dona nana' then raise exception 'nombre_busqueda no quedó normalizado'; end if;
  -- La búsqueda sigue encontrando por nombre, producto y subcategoría con las columnas guardadas.
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios('DOÑA ÑAÑA')$q$) <> 1 then raise exception 'la búsqueda rápida no encuentra por nombre'; end if;
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios('maracuya')$q$) <> 1 then raise exception 'la búsqueda rápida no encuentra por producto'; end if;
end $$;
reset role;

-- GALERÍA Y DESTACADOS (migración 0017) ---------------------------------------------------------------
-- Una foto adicional en el borrador (no debe verse en público).
insert into public.product_photos (product_id, url, position)
select id, 'https://x.supabase.co/storage/v1/object/public/productos/00000000-0000-0000-0000-0000000000d2/e3/secreta.jpg', 1
from public.products where name = 'Pizza secreta';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$update public.products set photo_label = 'Margarita clásica' where name = 'Pizza margarita'$q$);
  perform ci_pruebas.debe_funcionar($q$insert into public.product_photos (product_id, url, label, position) select id, 'https://x.supabase.co/storage/v1/object/public/productos/00000000-0000-0000-0000-0000000000d2/e1/a.jpg', 'Con albahaca', 1 from public.products where name = 'Pizza margarita'$q$);
  perform ci_pruebas.debe_funcionar($q$insert into public.product_photos (product_id, url, label, position) select id, 'https://x.supabase.co/storage/v1/object/public/productos/00000000-0000-0000-0000-0000000000d2/e1/b.jpg', 'Familiar', 2 from public.products where name = 'Pizza margarita'$q$);
  perform ci_pruebas.debe_funcionar($q$insert into public.product_photos (product_id, url, position) select id, 'https://x.supabase.co/storage/v1/object/public/productos/00000000-0000-0000-0000-0000000000d2/e1/c.jpg', 3 from public.products where name = 'Pizza margarita'$q$);
  perform ci_pruebas.debe_fallar($q$insert into public.product_photos (product_id, url, position) select id, 'https://x.supabase.co/storage/v1/object/public/productos/00000000-0000-0000-0000-0000000000d2/e1/d.jpg', 3 from public.products where name = 'Pizza margarita'$q$, 'Cada producto puede tener hasta 4 fotos%');
  perform ci_pruebas.debe_fallar($q$update public.product_photos set url = 'https://otro-sitio.com/x.jpg' where label = 'Familiar'$q$, 'Foto no válida%');
  perform ci_pruebas.debe_fallar($q$update public.product_photos set label = repeat('x', 41) where label = 'Familiar'$q$, '%check constraint%');
  perform ci_pruebas.debe_funcionar($q$delete from public.product_photos where label = 'Familiar'$q$);
  if (select count(*) from public.product_photos f join public.products p on p.id = f.product_id where p.name = 'Pizza margarita') <> 2 then raise exception 'no quedaron 2 fotos adicionales'; end if;
  -- Destacados: el dueño no se destaca solo.
  perform ci_pruebas.debe_fallar($q$select public.admin_destacar('00000000-0000-0000-0000-0000000000e1', (now() at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::date + 30)$q$, 'No autorizado%');
  perform ci_pruebas.debe_fallar($q$insert into public.featured_placements (business_id, starts_at, ends_at) values ('00000000-0000-0000-0000-0000000000e1', now(), now() + interval '1 day')$q$, 'permission denied%');
end $$;
reset role;

-- Otra dueña no toca las fotos ajenas.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$insert into public.product_photos (product_id, url, position) select id, 'https://x.supabase.co/storage/v1/object/public/productos/00000000-0000-0000-0000-0000000000d2/e1/intruso.jpg', 1 from public.products where name = 'Pizza margarita'$q$, '%row-level security%');
  if ci_pruebas.filas($q$delete from public.product_photos$q$) <> 0 then raise exception 'borró fotos ajenas'; end if;
end $$;
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if ci_pruebas.cuenta($q$select * from public.product_photos f join public.products p on p.id = f.product_id where p.name = 'Pizza margarita'$q$) <> 2 then raise exception 'el público no ve la galería de un producto publicado'; end if;
  if ci_pruebas.cuenta($q$select * from public.product_photos where url like '%secreta%'$q$) <> 0 then raise exception 'el público ve fotos de un borrador'; end if;
  if ci_pruebas.cuenta('select * from public.negocios_destacados()') <> 0 then raise exception 'hay destacados sin que el equipo los cree'; end if;
  perform ci_pruebas.debe_fallar('select note from public.featured_placements', 'permission denied%');
  perform ci_pruebas.debe_fallar('select public.admin_destacados()', 'permission denied%');
end $$;
reset role;

-- Revisora: ve la lista, no destaca.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';
do $$ begin
  perform ci_pruebas.debe_funcionar('select public.admin_destacados()');
  perform ci_pruebas.debe_fallar($q$select public.admin_destacar('00000000-0000-0000-0000-0000000000e1', (now() at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::date + 30)$q$, 'No autorizado%');
end $$;
reset role;

-- Admin con MFA: destaca, programa y quita.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$select public.admin_destacar('00000000-0000-0000-0000-0000000000e1', (now() at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::date + 30, 1, 'Plan mensual')$q$);
  perform ci_pruebas.debe_funcionar($q$select public.admin_destacar('00000000-0000-0000-0000-0000000000e2', (now() at time zone 'America/Bogota')::date + 5, (now() at time zone 'America/Bogota')::date + 35)$q$);
  perform ci_pruebas.debe_fallar($q$select public.admin_destacar('00000000-0000-0000-0000-0000000000e3', (now() at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::date + 30)$q$, 'Solo se pueden destacar negocios publicados%');
  perform ci_pruebas.debe_fallar($q$select public.admin_destacar('00000000-0000-0000-0000-0000000000e1', (now() at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::date - 1)$q$, 'Revisa las fechas%');
  if jsonb_array_length(public.admin_destacados()) <> 2 then raise exception 'admin_destacados no lista los 2 destacados'; end if;
  if (public.admin_destacados() -> 0 ->> 'estado') <> 'vigente' then raise exception 'el vigente no va primero'; end if;
end $$;
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if (select string_agg(id::text, ',') from public.negocios_destacados()) <> '00000000-0000-0000-0000-0000000000e1' then raise exception 'negocios_destacados debe traer solo el vigente'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  -- La dueña ve sus dos destacados (el vigente y el programado).
  if ci_pruebas.cuenta('select id, starts_at, ends_at from public.featured_placements') <> 2 then raise exception 'la dueña no ve sus destacados'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$
declare v uuid; p uuid;
begin
  select id into v from public.featured_placements where business_id = '00000000-0000-0000-0000-0000000000e1';
  select id into p from public.featured_placements where business_id = '00000000-0000-0000-0000-0000000000e2';
  perform public.admin_quitar_destacado(v);
  perform public.admin_quitar_destacado(p);
  if exists (select 1 from public.featured_placements where id = p) then raise exception 'el programado no se borró'; end if;
  if not exists (select 1 from public.featured_placements where id = v and ends_at <= now()) then raise exception 'el vigente no terminó'; end if;
  if (select count(*) from public.admin_actions where action in ('destacar_negocio', 'quitar_destacado')) <> 4 then raise exception 'los destacados no quedaron en la bitácora'; end if;
end $$;
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if ci_pruebas.cuenta('select * from public.negocios_destacados()') <> 0 then raise exception 'sigue destacado después de quitarlo'; end if;
end $$;
reset role;

-- Contacto y entregas (migración 0018) --------------------------------------------------------------
-- Filas que no deben verse en público: la del negocio de la dueña 1 (en revisión desde que cambió
-- de nombre, más arriba) y la de un borrador de la dueña 2.
insert into public.business_links (business_id, instagram) values
  ('00000000-0000-0000-0000-0000000000b1', 'https://www.instagram.com/en.revision'),
  ('00000000-0000-0000-0000-0000000000e3', 'https://www.instagram.com/borrador');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  -- La dueña guarda los enlaces ya normalizados y las modalidades (sin repetidos, en orden).
  perform ci_pruebas.debe_funcionar($q$insert into public.business_links (business_id, instagram, facebook, tiktok, website, delivery_modes, delivery_note)
    values ('00000000-0000-0000-0000-0000000000e1', 'https://www.instagram.com/negocio.prueba', 'https://www.facebook.com/profile.php?id=100012345678',
            'https://www.tiktok.com/@negocio', 'https://negocio.com.co/menu', array['envios_nacionales', 'presencial', 'presencial'], '  Domicilio   en el centro ')$q$);
  if (select delivery_modes from public.business_links where business_id = '00000000-0000-0000-0000-0000000000e1') <> array['presencial', 'envios_nacionales'] then
    raise exception 'las modalidades no quedaron ordenadas y sin repetidos';
  end if;
  if (select delivery_note from public.business_links where business_id = '00000000-0000-0000-0000-0000000000e1') <> 'Domicilio en el centro' then
    raise exception 'las condiciones no quedaron con los espacios normalizados';
  end if;
  -- Enlaces que la app nunca guardaría: la base los rechaza igual.
  perform ci_pruebas.debe_fallar($q$update public.business_links set website = 'javascript:alert(1)' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_website_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set website = 'http://negocio.com' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_website_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set website = 'https://usuario@evil.com' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_website_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set website = 'https://192.168.0.1/admin' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_website_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set website = 'https://bit.ly/abc' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_website_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set website = 'https://negocio.com/"><script>' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_website_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set instagram = 'https://evil.com/negocio' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_instagram_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set facebook = 'https://www.facebook.com.evil.com/x' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_facebook_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set tiktok = 'https://www.tiktok.com/negocio' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_tiktok_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set delivery_modes = array['repartidores'] where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_delivery_modes_check%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set delivery_note = 'Envíos rápidos, malparido' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, 'Las condiciones tienen palabras%');
  perform ci_pruebas.debe_fallar($q$update public.business_links set delivery_note = repeat('a', 161) where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%business_links_delivery_note_check%');
  perform ci_pruebas.debe_funcionar($q$update public.business_links set website = null, tiktok = null where business_id = '00000000-0000-0000-0000-0000000000e1'$q$);
  -- No puede crear ni tocar el contacto de un negocio ajeno, ni ver el de uno ajeno sin publicar.
  perform ci_pruebas.debe_fallar($q$insert into public.business_links (business_id) values ('00000000-0000-0000-0000-0000000000b2')$q$, '%row-level security%');
  if ci_pruebas.filas($q$update public.business_links set instagram = null where business_id = '00000000-0000-0000-0000-0000000000b1'$q$) <> 0 then
    raise exception 'la dueña editó el contacto de un negocio ajeno';
  end if;
  if ci_pruebas.cuenta($q$select 1 from public.business_links where business_id = '00000000-0000-0000-0000-0000000000b1'$q$) <> 0 then
    raise exception 'la dueña ve el contacto de un negocio ajeno que no está publicado';
  end if;
  -- Una fila no se puede pasar a otro negocio (por eso la app actualiza y, si no hay fila, inserta).
  perform ci_pruebas.debe_fallar($q$update public.business_links set business_id = '00000000-0000-0000-0000-0000000000e2' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%permission denied%');
  -- updated_at no se puede escribir desde la API.
  perform ci_pruebas.debe_fallar($q$update public.business_links set updated_at = now() - interval '1 year' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$, '%permission denied%');
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
  if ci_pruebas.cuenta($q$select instagram from public.business_links where business_id = '00000000-0000-0000-0000-0000000000e1'$q$) <> 1 then
    raise exception 'el turista no ve el contacto de un negocio publicado';
  end if;
  perform ci_pruebas.debe_fallar($q$insert into public.business_links (business_id) values ('00000000-0000-0000-0000-0000000000e2')$q$, '%row-level security%');
  if ci_pruebas.filas($q$update public.business_links set instagram = 'https://www.instagram.com/hack' where business_id = '00000000-0000-0000-0000-0000000000e1'$q$) <> 0 then
    raise exception 'el turista editó un contacto ajeno';
  end if;
  if ci_pruebas.filas($q$delete from public.business_links where business_id = '00000000-0000-0000-0000-0000000000e1'$q$) <> 0 then
    raise exception 'el turista borró un contacto ajeno';
  end if;
end $$;
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if ci_pruebas.cuenta($q$select * from public.business_links$q$) <> 1 then
    raise exception 'anon debe ver solo el contacto del negocio publicado';
  end if;
  perform ci_pruebas.debe_fallar($q$insert into public.business_links (business_id) values ('00000000-0000-0000-0000-0000000000e1')$q$, '%permission denied%');
end $$;
reset role;

-- Al borrar el negocio (eliminar cuenta) se borra su contacto.
delete from public.businesses where id = '00000000-0000-0000-0000-0000000000e3';
do $$ begin
  if exists (select 1 from public.business_links where business_id = '00000000-0000-0000-0000-0000000000e3') then
    raise exception 'el contacto quedó huérfano al borrar el negocio';
  end if;
end $$;

-- Reservas (migración 0019) -------------------------------------------------------------------------
-- Pizzería e1 (Restaurantes, dueña 2, publicada) y heladería e2 (Emprendimientos, dueña 2).
-- Turista c1 hace las solicitudes; turista c9 es otra persona.
insert into auth.users (id, email, raw_user_meta_data, created_at) values
  ('00000000-0000-0000-0000-0000000000c9', 'turista9@prueba.test', '{"full_name":"Turista Tres"}', now() - interval '3 days');
insert into public.products (id, business_id, name, price_cop) values
  ('00000000-0000-0000-0000-0000000000f8', '00000000-0000-0000-0000-0000000000e1', 'Pizza margarita', 25000),
  ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000e2', 'Helado de mora', 5000);

-- Instante de una hora local de Bogotá dentro de `dias` días (para no depender de la hora de la prueba).
create function ci_pruebas.hora(dias int, hhmm text) returns timestamptz
language sql stable as $$ select (((now() at time zone 'America/Bogota')::date + dias) + hhmm::time) at time zone 'America/Bogota' $$;
-- Llama a solicitar_reserva con una clave fija (K + número) y valores normales que cada prueba cambia.
create function ci_pruebas.pedir(k int, cuando timestamptz, personas int default 4, negocio uuid default '00000000-0000-0000-0000-0000000000e1',
                                 wa text default '300 123 4567', notas text default 'Cumpleaños', platos jsonb default '[]')
returns jsonb language sql as $$
  select public.solicitar_reserva(negocio, cuando, personas, 'Ana Turista', wa, 'Terraza', notas, platos,
                                  ('00000000-0000-0000-0000-' || lpad(k::text, 12, '0'))::uuid)
$$;
-- Busca la solicitud sin pasar por RLS (security definer), para probar que otros no pueden tocarla.
create function ci_pruebas.reserva(k int) returns uuid
language sql stable security definer as $$ select id from public.reservations where idempotency_key = ('00000000-0000-0000-0000-' || lpad(k::text, 12, '0'))::uuid $$;
grant execute on all functions in schema ci_pruebas to anon, authenticated;

-- Configuración ---------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.guardar_config_reservas('00000000-0000-0000-0000-0000000000e1', true, 6, 120, 30, 24, 30, null, '[]', '[]')$q$, 'Agrega al menos un horario%');
  perform ci_pruebas.debe_fallar($q$select public.guardar_config_reservas('00000000-0000-0000-0000-0000000000e2', true, 6, 120, 30, 24, 30, null, '[{"weekday":1,"starts":"12:00","ends":"15:00"}]', '[]')$q$, 'Las reservas son solo para restaurantes%');
  perform ci_pruebas.debe_fallar($q$select public.guardar_config_reservas('00000000-0000-0000-0000-0000000000e1', true, 6, 120, 30, 24, 30, null, '[{"weekday":1,"starts":"12:00","ends":"15:00"},{"weekday":1,"starts":"14:00","ends":"18:00"}]', '[]')$q$, 'Hay horarios que se cruzan%');
  perform ci_pruebas.debe_fallar($q$select public.guardar_config_reservas('00000000-0000-0000-0000-0000000000e1', true, 6, 30, 30, 24, 30, null, '[{"weekday":1,"starts":"12:00","ends":"15:00"}]', '[]')$q$, '%reservation_settings_min_notice_minutes_check%');
  perform ci_pruebas.debe_fallar($q$select public.guardar_config_reservas('00000000-0000-0000-0000-0000000000e1', true, 6, 120, 30, 24, 30, 'No vengan malparidos', '[{"weekday":1,"starts":"12:00","ends":"15:00"}]', '[]')$q$, 'Las instrucciones tienen palabras%');
  -- Todos los días de 00:00 a 23:00 (a las 23:30 no), hasta 6 personas, 2 h de anticipación, 30 días,
  -- y un día bloqueado dentro de 5 días (la fecha pasada no se guarda).
  perform ci_pruebas.debe_funcionar($q$select public.guardar_config_reservas('00000000-0000-0000-0000-0000000000e1', true, 6, 120, 30, 24, 30, 'Llega 10 minutos antes',
    (select jsonb_agg(jsonb_build_object('weekday', d, 'starts', '00:00', 'ends', '23:00')) from generate_series(1, 7) d),
    jsonb_build_array(((now() at time zone 'America/Bogota')::date + 5)::text, '2000-01-01'))$q$);
  if (select count(*) from public.reservation_blocked_dates where business_id = '00000000-0000-0000-0000-0000000000e1') <> 1 then
    raise exception 'la fecha pasada no debía guardarse como bloqueada';
  end if;
  perform ci_pruebas.debe_fallar($q$update public.reservation_settings set max_party = 50$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$insert into public.reservation_windows (business_id, weekday, starts, ends) values ('00000000-0000-0000-0000-0000000000e1', 1, '00:00', '01:00')$q$, 'permission denied%');
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.guardar_config_reservas('00000000-0000-0000-0000-0000000000e1', false, 6, 120, 30, 24, 30, null, '[]', '[]')$q$, 'Solo el dueño del restaurante%');
end $$;
reset role;

-- Solicitar -----------------------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  -- Sin sesión no se puede solicitar, pero el formulario sí puede leer la configuración.
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(1, ci_pruebas.hora(2, '13:00'))$q$, 'permission denied%');
  if ci_pruebas.cuenta('select * from public.reservation_windows') <> 7 then raise exception 'anon no ve los horarios de reserva'; end if;
  perform ci_pruebas.debe_fallar('select * from public.reservations', 'permission denied%');
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$
declare r jsonb; r2 jsonb;
begin
  r := ci_pruebas.pedir(1, ci_pruebas.hora(2, '13:00'), 4, platos => '[{"product_id":"00000000-0000-0000-0000-0000000000f8","quantity":2}]');
  if r ->> 'status' <> 'pendiente' or (r ->> 'code') !~ '^R-[A-Z2-9]{6}$' or (r ->> 'repetida')::boolean then raise exception 'solicitud mal creada: %', r; end if;
  -- Reintento de red con la misma clave: la misma solicitud, no otra.
  r2 := ci_pruebas.pedir(1, ci_pruebas.hora(2, '13:00'), 4);
  if r2 ->> 'id' <> r ->> 'id' or not (r2 ->> 'repetida')::boolean then raise exception 'la clave de idempotencia no devolvió la misma solicitud: %', r2; end if;
  if ci_pruebas.cuenta('select * from public.reservations') <> 1 then raise exception 'el reintento creó otra solicitud'; end if;
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(1, ci_pruebas.hora(2, '13:00'), 5)$q$, 'Esa clave ya se usó para otra solicitud%');
  -- Datos guardados: WhatsApp con indicativo, platos con copia del nombre y precio, historial.
  if (select contact_whatsapp from public.reservations where id = ci_pruebas.reserva(1)) <> '573001234567' then raise exception 'el WhatsApp no quedó con indicativo'; end if;
  if (select name || '|' || quantity || '|' || unit_price_cop from public.reservation_items where reservation_id = ci_pruebas.reserva(1)) <> 'Pizza margarita|2|25000' then raise exception 'los platos no quedaron con su copia'; end if;
  if (select count(*) from public.reservation_events where reservation_id = ci_pruebas.reserva(1) and to_status = 'pendiente' and actor_role = 'cliente') <> 1 then raise exception 'falta el evento de creación'; end if;
  -- Política de respuesta: 24 h (la visita es en 2 días, así que no la recorta).
  if (select abs(extract(epoch from respond_by - (created_at + interval '24 hours'))) from public.reservations where id = ci_pruebas.reserva(1)) > 1 then raise exception 'el plazo para responder no es de 24 h'; end if;

  -- Validaciones del servidor (no se confía en la app).
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '13:00'))$q$, 'Ya tienes una solicitud para ese restaurante a esa hora%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '12:00'), 7)$q$, 'Este restaurante recibe solicitudes de 1 a 6 personas%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '12:00'), 0)$q$, 'Este restaurante recibe solicitudes de 1 a 6 personas%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '12:10'))$q$, 'Elige una de las horas%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, date_trunc('hour', now()) + interval '1 hour')$q$, 'Esa hora está muy cerca%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, now() - interval '1 day')$q$, '%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(40, '12:00'))$q$, 'Solo se puede solicitar con hasta 30 días%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(5, '12:00'))$q$, 'El restaurante no recibe solicitudes para ese día%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '23:30'))$q$, 'El restaurante no recibe solicitudes a esa hora%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '12:00'), wa => '12345')$q$, 'Escribe un número de WhatsApp válido%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '12:00'), notas => 'Mesa para el malparido')$q$, 'La solicitud tiene palabras%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '12:00'), platos => '[{"product_id":"00000000-0000-0000-0000-0000000000f9","quantity":1}]')$q$, 'Revisa los platos elegidos%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '12:00'), platos => '[{"product_id":"00000000-0000-0000-0000-0000000000f8","quantity":1},{"product_id":"00000000-0000-0000-0000-0000000000f8","quantity":2}]')$q$, 'Revisa los platos elegidos%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '12:00'), platos => '[{"product_id":"00000000-0000-0000-0000-0000000000f8","quantity":0}]')$q$, 'Revisa los platos elegidos%');
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(90, ci_pruebas.hora(2, '12:00'), negocio => '00000000-0000-0000-0000-0000000000e2')$q$, 'Este restaurante no está recibiendo solicitudes%');
  -- Escribir directo en las tablas: no.
  perform ci_pruebas.debe_fallar($q$insert into public.reservations (code, business_id, customer_id, starts_at, party_size, contact_name, contact_whatsapp, respond_by, idempotency_key) values ('R-AAAAAA', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', now() + interval '2 days', 2, 'Ana', '573001234567', now() + interval '1 day', gen_random_uuid())$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$update public.reservations set status = 'confirmada'$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$select public.expirar_reservas()$q$, 'permission denied%');

  -- Contra solicitudes masivas: hasta 3 pendientes por restaurante.
  perform ci_pruebas.pedir(2, ci_pruebas.hora(2, '14:00'));
  perform ci_pruebas.pedir(3, ci_pruebas.hora(2, '15:00'));
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(4, ci_pruebas.hora(2, '16:00'))$q$, 'Ya tienes 3 solicitudes pendientes%');
end $$;
reset role;

-- La dueña no puede reservar en su propio restaurante.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(80, ci_pruebas.hora(2, '13:00'))$q$, 'No puedes solicitar una reserva en tu propio restaurante%');
end $$;
reset role;

-- Límite diario: 10 solicitudes en 24 horas por persona (las 10 anteriores ya canceladas).
insert into public.reservations (code, business_id, customer_id, starts_at, party_size, contact_name, contact_whatsapp, status, cancelled_by, respond_by, idempotency_key)
select 'R-CANC' || substr('ABCDEFGHJK', g, 1) || substr('ABCDEFGHJK', g, 1), '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c9',
       now() + make_interval(days => 2, hours => g), 2, 'Turista Tres', '573005556677', 'cancelada', 'cliente', now() + interval '1 day', gen_random_uuid()
from generate_series(1, 10) g;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select ci_pruebas.pedir(70, ci_pruebas.hora(3, '13:00'))$q$, 'Hiciste muchas solicitudes hoy%');
  -- Y no ve las solicitudes de otra persona (ni sus platos ni su historial).
  if ci_pruebas.cuenta('select * from public.reservations where id = ci_pruebas.reserva(1)') <> 0 then raise exception 'otra persona ve la solicitud de c1'; end if;
  if ci_pruebas.cuenta('select * from public.reservation_items') <> 0 or ci_pruebas.cuenta('select * from public.reservation_events') <> 0 then raise exception 'otra persona ve platos o historial ajenos'; end if;
  perform ci_pruebas.debe_fallar($q$select public.cancelar_reserva(ci_pruebas.reserva(1))$q$, 'No encontramos esa solicitud%');
end $$;
reset role;

-- Quién ve qué: la dueña de otro negocio y el equipo no ven solicitudes.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
do $$ begin
  if ci_pruebas.cuenta('select * from public.reservations') <> 0 then raise exception 'otra dueña ve solicitudes ajenas'; end if;
  perform ci_pruebas.debe_fallar($q$select public.confirmar_reserva(ci_pruebas.reserva(1))$q$, 'No encontramos esa solicitud%');
  perform ci_pruebas.debe_fallar($q$select public.rechazar_reserva(ci_pruebas.reserva(1), 'sin_mesas')$q$, 'No encontramos esa solicitud%');
  perform ci_pruebas.debe_fallar($q$select public.cancelar_reserva(ci_pruebas.reserva(1), 'No')$q$, 'No encontramos esa solicitud%');
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$ begin
  if ci_pruebas.cuenta('select * from public.reservations') <> 0 then raise exception 'el equipo no debe ver solicitudes con teléfonos'; end if;
end $$;
reset role;

-- Decidir (dueña de la pizzería) -----------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  if ci_pruebas.cuenta($q$select contact_whatsapp from public.reservations where business_id = '00000000-0000-0000-0000-0000000000e1' and customer_id = '00000000-0000-0000-0000-0000000000c1'$q$) <> 3 then
    raise exception 'la dueña no ve las solicitudes de su restaurante';
  end if;
  perform ci_pruebas.debe_funcionar($q$select public.confirmar_reserva(ci_pruebas.reserva(1))$q$);
  if (select status || '|' || (decided_by = auth.uid()) from public.reservations where id = ci_pruebas.reserva(1)) <> 'confirmada|true' then raise exception 'no quedó confirmada por la dueña'; end if;
  -- Transiciones prohibidas.
  perform ci_pruebas.debe_fallar($q$select public.confirmar_reserva(ci_pruebas.reserva(1))$q$, 'Esta solicitud ya está confirmada%');
  perform ci_pruebas.debe_fallar($q$select public.rechazar_reserva(ci_pruebas.reserva(1), 'sin_mesas')$q$, 'Esta solicitud ya está confirmada%');
  perform ci_pruebas.debe_fallar($q$select public.rechazar_reserva(ci_pruebas.reserva(2), null)$q$, 'Elige el motivo del rechazo%');
  perform ci_pruebas.debe_fallar($q$select public.rechazar_reserva(ci_pruebas.reserva(2), 'porque si')$q$, 'Elige el motivo del rechazo%');
  perform ci_pruebas.debe_fallar($q$select public.rechazar_reserva(ci_pruebas.reserva(2), 'otro')$q$, 'Cuéntale al cliente el motivo%');
  perform ci_pruebas.debe_funcionar($q$select public.rechazar_reserva(ci_pruebas.reserva(2), 'sin_mesas', 'Ese día tenemos un evento')$q$);
  if (select status || '|' || reject_reason || '|' || reject_note from public.reservations where id = ci_pruebas.reserva(2)) <> 'rechazada|sin_mesas|Ese día tenemos un evento' then raise exception 'el rechazo no guardó el motivo'; end if;
  perform ci_pruebas.debe_fallar($q$select public.confirmar_reserva(ci_pruebas.reserva(2))$q$, 'Esta solicitud ya está rechazada%');
  perform ci_pruebas.debe_fallar($q$select public.cancelar_reserva(ci_pruebas.reserva(3), 'Ya no')$q$, 'Una solicitud pendiente no se cancela%');
  perform ci_pruebas.debe_fallar($q$select public.marcar_asistencia(ci_pruebas.reserva(1), true)$q$, 'La asistencia se marca desde la hora%');
  perform ci_pruebas.debe_fallar($q$select public.cancelar_reserva(ci_pruebas.reserva(1))$q$, 'Cuéntale al cliente por qué cancelas%');
end $$;
reset role;

-- Cliente: no decide, pero sí retira o cancela lo suyo ---------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.confirmar_reserva(ci_pruebas.reserva(3))$q$, 'No encontramos esa solicitud%');
  perform ci_pruebas.debe_fallar($q$select public.rechazar_reserva(ci_pruebas.reserva(3), 'sin_mesas')$q$, 'No encontramos esa solicitud%');
  perform ci_pruebas.debe_funcionar($q$select public.cancelar_reserva(ci_pruebas.reserva(3))$q$);
  perform ci_pruebas.debe_funcionar($q$select public.cancelar_reserva(ci_pruebas.reserva(1), 'Cambio de planes')$q$);
  if (select string_agg(status || ':' || cancelled_by, ',' order by idempotency_key) from public.reservations where id in (ci_pruebas.reserva(1), ci_pruebas.reserva(3))) <> 'cancelada:cliente,cancelada:cliente' then
    raise exception 'las cancelaciones del cliente no quedaron bien';
  end if;
  perform ci_pruebas.debe_fallar($q$select public.cancelar_reserva(ci_pruebas.reserva(2))$q$, 'Esta solicitud ya está rechazada%');
  -- Historial completo de la 1: creada, confirmada y cancelada.
  if (select string_agg(to_status, ',' order by id) from public.reservation_events where reservation_id = ci_pruebas.reserva(1)) <> 'pendiente,confirmada,cancelada' then
    raise exception 'el historial de la solicitud 1 está incompleto';
  end if;
  -- Para expiración y asistencia.
  perform ci_pruebas.pedir(5, ci_pruebas.hora(3, '13:00'));
  perform ci_pruebas.pedir(6, ci_pruebas.hora(3, '14:00'));
  perform ci_pruebas.pedir(7, ci_pruebas.hora(3, '15:00'));
end $$;
reset role;

-- Expiración -----------------------------------------------------------------------------------------
-- Se simula que pasó el plazo (como postgres). Aun sin la tarea programada, ya no se puede confirmar.
update public.reservations set respond_by = now() - interval '1 minute' where id in (ci_pruebas.reserva(5), ci_pruebas.reserva(6));
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.confirmar_reserva(ci_pruebas.reserva(6))$q$, 'El plazo para responder esta solicitud ya venció%');
  perform ci_pruebas.debe_funcionar($q$select public.confirmar_reserva(ci_pruebas.reserva(7))$q$);
end $$;
reset role;
do $$
declare n int;
begin
  n := public.expirar_reservas();
  if n <> 2 then raise exception 'expirar_reservas debía vencer 2 solicitudes y venció %', n; end if;
  if public.expirar_reservas() <> 0 then raise exception 'expirar_reservas no es idempotente'; end if;
  if (select count(*) from public.reservation_events where to_status = 'expirada' and actor_role = 'sistema') <> 2 then raise exception 'falta el historial de la expiración'; end if;
end $$;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.confirmar_reserva(ci_pruebas.reserva(5))$q$, 'Esta solicitud ya está vencida%');
end $$;
reset role;

-- Asistencia: después de la hora de la visita (se simula como postgres) -------------------------------
update public.reservations set starts_at = now() - interval '1 hour' where id = ci_pruebas.reserva(7);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.cancelar_reserva(ci_pruebas.reserva(7), 'Cerramos')$q$, 'La hora de la reserva ya pasó%');
  perform ci_pruebas.debe_funcionar($q$select public.marcar_asistencia(ci_pruebas.reserva(7), false)$q$);
  perform ci_pruebas.debe_fallar($q$select public.marcar_asistencia(ci_pruebas.reserva(7), true)$q$, 'Solo se marca la asistencia de reservas confirmadas%');
  if (select status from public.reservations where id = ci_pruebas.reserva(7)) <> 'no_asistio' then raise exception 'no quedó como no asistió'; end if;
end $$;
reset role;

-- Al eliminar la cuenta, se borran sus solicitudes (con platos e historial).
delete from auth.users where id = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  if exists (select 1 from public.reservations where customer_id = '00000000-0000-0000-0000-0000000000c1') then raise exception 'quedaron solicitudes de una cuenta eliminada'; end if;
end $$;

-- Notificaciones push (migración 0020) ---------------------------------------------------------------
-- Cliente nuevo cA (la c1 se eliminó arriba). La dueña d2 tiene la pizzería e1 con reservas activas.
insert into auth.users (id, email, raw_user_meta_data, created_at) values
  ('00000000-0000-0000-0000-0000000000ca', 'clientea@prueba.test', '{"full_name":"Cliente Ana"}', now() - interval '3 days');

grant usage on schema ci_pruebas to service_role;
grant execute on all functions in schema ci_pruebas to service_role;

-- Tokens --------------------------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.registrar_token_push('ExponentPushToken[aaaaaaaaaaaa]', 'clientes', 'android')$q$, 'permission denied%');
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$select public.registrar_token_push('ExponentPushToken[clienteA-111111]', 'clientes', 'android')$q$);
  perform ci_pruebas.debe_funcionar($q$select public.registrar_token_push('ExponentPushToken[clienteA-111111]', 'clientes', 'android')$q$); -- repetir = actualizar
  perform ci_pruebas.debe_fallar($q$select public.registrar_token_push('token-inventado', 'clientes', 'android')$q$, 'El token de notificaciones no es válido%');
  perform ci_pruebas.debe_fallar($q$select public.registrar_token_push('ExponentPushToken[clienteA-222222]', 'admin', 'android')$q$, 'Datos del dispositivo no válidos%');
  if ci_pruebas.cuenta('select id, app, platform, active from public.push_tokens') <> 1 then raise exception 'la persona debe ver solo su dispositivo'; end if;
  -- El token en sí no se puede leer desde la app, ni escribir directo.
  perform ci_pruebas.debe_fallar('select token from public.push_tokens', 'permission denied%');
  perform ci_pruebas.debe_fallar($q$insert into public.push_tokens (user_id, token, app, platform) values (auth.uid(), 'ExponentPushToken[directo-0000]', 'clientes', 'ios')$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$update public.push_tokens set active = true$q$, 'permission denied%');
  -- Nada de la cola de avisos.
  perform ci_pruebas.debe_fallar('select * from public.notifications', 'permission denied%');
  perform ci_pruebas.debe_fallar('select * from public.notification_deliveries', 'permission denied%');
  perform ci_pruebas.debe_fallar('select public.tomar_notificaciones(10)', 'permission denied%');
  perform ci_pruebas.debe_fallar($q$select public.registrar_envio_notificacion(1, '[]', null)$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar('select public.disparar_envio_notificaciones()', 'permission denied%');
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  -- Dos celulares del restaurante (varios dispositivos por negocio).
  perform ci_pruebas.debe_funcionar($q$select public.registrar_token_push('ExponentPushToken[duena2-celular1]', 'negocios', 'android')$q$);
  perform ci_pruebas.debe_funcionar($q$select public.registrar_token_push('ExponentPushToken[duena2-celular2]', 'negocios', 'ios')$q$);
  -- Desactivar un token ajeno no hace nada.
  perform public.desactivar_token_push('ExponentPushToken[clienteA-111111]');
end $$;
reset role;
do $$ begin
  if not (select active from public.push_tokens where token = 'ExponentPushToken[clienteA-111111]') then raise exception 'otra persona desactivó un token ajeno'; end if;
end $$;

-- El mismo celular inicia sesión con otra cuenta: el token pasa a la nueva cuenta.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$select public.registrar_token_push('ExponentPushToken[celular-compartido]', 'clientes', 'android')$q$);
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$select public.registrar_token_push('ExponentPushToken[celular-compartido]', 'clientes', 'android')$q$);
  -- Cerrar sesión en ese celular: se desactiva.
  perform ci_pruebas.debe_funcionar($q$select public.desactivar_token_push('ExponentPushToken[celular-compartido]')$q$);
end $$;
reset role;
do $$ begin
  if (select user_id::text || '|' || active || '|' || disabled_reason from public.push_tokens where token = 'ExponentPushToken[celular-compartido]')
     <> '00000000-0000-0000-0000-0000000000ca|false|cierre_sesion' then
    raise exception 'el token compartido no pasó a la nueva cuenta o no se desactivó al cerrar sesión';
  end if;
end $$;

-- La cola se llena sola con cada cambio de estado ----------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.pedir(101, ci_pruebas.hora(4, '13:00'), 3, wa => '3157778899', notas => 'Vamos con un bebé');
  perform ci_pruebas.pedir(102, ci_pruebas.hora(4, '14:00'));
  perform ci_pruebas.pedir(103, ci_pruebas.hora(4, '15:00'));
end $$;
reset role;
do $$
declare n public.notifications;
begin
  select * into n from public.notifications where reservation_id = ci_pruebas.reserva(101);
  if n.recipient_id <> '00000000-0000-0000-0000-0000000000d2' or n.app <> 'negocios' or n.kind <> 'nueva_solicitud'
     or n.title <> 'Tienes una nueva solicitud de reserva' or n.data ->> 'url' <> '/reservas/' || ci_pruebas.reserva(101) then
    raise exception 'el aviso de nueva solicitud no es el esperado: %', row_to_json(n);
  end if;
  -- Nada personal en el texto visible con la pantalla bloqueada.
  if n.body ~ '(Ana|Turista|3157778899|bebé|Terraza)' or n.body !~ '3 personas' then raise exception 'el texto del aviso tiene datos personales o le falta el número de personas: %', n.body; end if;
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
do $$ begin
  perform public.confirmar_reserva(ci_pruebas.reserva(101));
  perform public.rechazar_reserva(ci_pruebas.reserva(102), 'sin_horario');
  perform public.confirmar_reserva(ci_pruebas.reserva(103));
  perform public.cancelar_reserva(ci_pruebas.reserva(103), 'Cerramos por mantenimiento');
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}';
do $$ begin
  perform public.cancelar_reserva(ci_pruebas.reserva(101));
  perform ci_pruebas.pedir(104, ci_pruebas.hora(7, '13:00'));
end $$;
reset role;
update public.reservations set respond_by = now() - interval '1 minute' where id = ci_pruebas.reserva(104);
select public.expirar_reservas();

do $$
declare v text;
begin
  select string_agg(n.kind || '>' || n.app || '>' || case when n.recipient_id = '00000000-0000-0000-0000-0000000000ca' then 'cliente' else 'restaurante' end, ',' order by n.id)
    into v from public.notifications n where n.reservation_id in (ci_pruebas.reserva(101), ci_pruebas.reserva(102), ci_pruebas.reserva(103), ci_pruebas.reserva(104));
  if v <> 'nueva_solicitud>negocios>restaurante,nueva_solicitud>negocios>restaurante,nueva_solicitud>negocios>restaurante,confirmada>clientes>cliente,rechazada>clientes>cliente,confirmada>clientes>cliente,cancelada_por_restaurante>clientes>cliente,cancelada_por_cliente>negocios>restaurante,nueva_solicitud>negocios>restaurante,expirada>clientes>cliente' then
    raise exception 'los avisos encolados no son los esperados: %', v;
  end if;
  if (select title from public.notifications where reservation_id = ci_pruebas.reserva(102) and kind = 'rechazada') <> 'Tu solicitud de reserva no pudo confirmarse' then raise exception 'título del rechazo'; end if;
  if (select title from public.notifications where reservation_id = ci_pruebas.reserva(101) and kind = 'confirmada') <> 'Tu reserva fue confirmada' then raise exception 'título de la confirmación'; end if;
  -- Un aviso por evento y destinatario.
  if exists (select 1 from public.notifications group by event_id, recipient_id having count(*) > 1) then raise exception 'hay avisos duplicados'; end if;
end $$;

-- Si encolar falla, la reserva NO falla (se simula una falla con una restricción temporal).
alter table public.notifications add constraint ci_falla_a_proposito check (kind <> 'nueva_solicitud') not valid;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_funcionar($q$select ci_pruebas.pedir(105, ci_pruebas.hora(8, '13:00'))$q$);
end $$;
reset role;
alter table public.notifications drop constraint ci_falla_a_proposito;
do $$ begin
  if ci_pruebas.reserva(105) is null then raise exception 'la reserva falló porque falló el aviso'; end if;
  if exists (select 1 from public.notifications where reservation_id = ci_pruebas.reserva(105)) then raise exception 'no debía quedar aviso de la 105'; end if;
end $$;

-- Envío (como la Edge Function, con service_role) ------------------------------------------------------
-- Para no depender del resto, se dejan en cola solo los avisos de esta prueba.
update public.notifications set status = 'enviada' where reservation_id not in (ci_pruebas.reserva(101), ci_pruebas.reserva(102), ci_pruebas.reserva(103), ci_pruebas.reserva(104));
set local role service_role;
do $$
declare
  lote jsonb; a jsonb; nueva bigint; conf bigint; e text; r int;
begin
  lote := public.tomar_notificaciones(50);
  if jsonb_array_length(lote) <> 10 then raise exception 'tomar_notificaciones debía traer 10 avisos y trajo %', jsonb_array_length(lote); end if;
  -- Ya tomados: otra llamada no los vuelve a traer (no hay doble envío).
  if jsonb_array_length(public.tomar_notificaciones(50)) <> 0 then raise exception 'los avisos tomados se volvieron a entregar'; end if;
  select (x ->> 'id')::bigint into nueva from jsonb_array_elements(lote) x where x -> 'data' ->> 'reservationId' = ci_pruebas.reserva(101)::text and x -> 'data' ->> 'kind' = 'nueva_solicitud';
  select (x ->> 'id')::bigint into conf from jsonb_array_elements(lote) x where x -> 'data' ->> 'reservationId' = ci_pruebas.reserva(101)::text and x -> 'data' ->> 'kind' = 'confirmada';
  -- Cada aviso indica su app (migración 0022): la Edge Function envía app por app (P1).
  if (select x ->> 'app' from jsonb_array_elements(lote) x where (x ->> 'id')::bigint = nueva) <> 'negocios'
     or (select x ->> 'app' from jsonb_array_elements(lote) x where (x ->> 'id')::bigint = conf) <> 'clientes' then
    raise exception 'tomar_notificaciones no indica la app de cada aviso';
  end if;
  -- El aviso al restaurante va a sus 2 celulares; el del cliente, solo a su token activo de la app clientes.
  select x into a from jsonb_array_elements(lote) x where (x ->> 'id')::bigint = nueva;
  if jsonb_array_length(a -> 'tokens') <> 2 then raise exception 'el aviso al restaurante debía ir a 2 dispositivos: %', a -> 'tokens'; end if;
  select x into a from jsonb_array_elements(lote) x where (x ->> 'id')::bigint = conf;
  if jsonb_array_length(a -> 'tokens') <> 1 or a -> 'tokens' -> 0 ->> 'token' <> 'ExponentPushToken[clienteA-111111]' then raise exception 'el aviso al cliente no va a su dispositivo: %', a -> 'tokens'; end if;

  -- Un celular aceptado y el otro ya no existe: queda enviada y ese token se desactiva.
  e := public.registrar_envio_notificacion(nueva, jsonb_build_array(
    jsonb_build_object('token_id', (select id from public.push_tokens where token = 'ExponentPushToken[duena2-celular1]'), 'status', 'ok', 'ticket_id', 'ticket-1'),
    jsonb_build_object('token_id', (select id from public.push_tokens where token = 'ExponentPushToken[duena2-celular2]'), 'status', 'error', 'error', 'DeviceNotRegistered')));
  if e <> 'enviada' then raise exception 'debía quedar enviada y quedó %', e; end if;
  if (select active from public.push_tokens where token = 'ExponentPushToken[duena2-celular2]') then raise exception 'el token no registrado debía desactivarse'; end if;
  -- Registrar dos veces el mismo resultado no duplica.
  if public.registrar_envio_notificacion(nueva, '[{"status":"ok"}]') <> 'enviada' or (select count(*) from public.notification_deliveries where notification_id = nueva) <> 2 then
    raise exception 'registrar el resultado dos veces duplicó entregas';
  end if;

  -- Falla general (Expo caído): se reintenta en 2 minutos; al quinto intento queda fallida.
  e := public.registrar_envio_notificacion(conf, '[]', 'HTTP 503');
  if e <> 'pendiente' or (select abs(extract(epoch from next_attempt_at - (now() + interval '2 minutes'))) from public.notifications where id = conf) > 2 then
    raise exception 'la falla general debía reintentarse en 2 minutos (%)', e;
  end if;
  update public.notifications set attempts = 4, next_attempt_at = now() where id = conf; -- ya van 4 intentos
  perform 1 from jsonb_array_elements(public.tomar_notificaciones(50)) x where (x ->> 'id')::bigint = conf;
  if not found then raise exception 'el reintento no volvió a tomar el aviso'; end if;
  if public.registrar_envio_notificacion(conf, '[]', 'HTTP 503') <> 'fallida' then raise exception 'al quinto intento debía quedar fallida'; end if;
  if (select last_error from public.notifications where id = conf) <> 'HTTP 503' then raise exception 'falta el último error'; end if;

  -- Recibos: el ticket aceptado hace más de 15 minutos aparece; un recibo DeviceNotRegistered desactiva el token.
  update public.notification_deliveries set created_at = now() - interval '20 minutes' where ticket_id = 'ticket-1';
  if (select count(*) from jsonb_array_elements(public.recibos_pendientes(100)) x where x ->> 'ticket_id' = 'ticket-1') <> 1 then raise exception 'falta el recibo pendiente'; end if;
  r := public.registrar_recibos((select jsonb_agg(jsonb_build_object('id', id, 'status', 'error', 'error', 'DeviceNotRegistered')) from public.notification_deliveries where ticket_id = 'ticket-1'));
  if r <> 1 or (select active from public.push_tokens where token = 'ExponentPushToken[duena2-celular1]') then raise exception 'el recibo no desactivó el token'; end if;
  if jsonb_array_length(public.recibos_pendientes(100)) <> 0 then raise exception 'el recibo ya revisado sigue pendiente'; end if;
end $$;
reset role;

-- Sin dispositivos activos: el aviso queda "sin_dispositivos" (la solicitud sigue en la bandeja).
set local role service_role;
do $$
declare x jsonb; e text;
begin
  update public.notifications set status = 'pendiente', next_attempt_at = now(), attempts = 0
  where reservation_id = ci_pruebas.reserva(102) and kind = 'nueva_solicitud';
  select y into x from jsonb_array_elements(public.tomar_notificaciones(50)) y where y -> 'data' ->> 'reservationId' = ci_pruebas.reserva(102)::text limit 1;
  if jsonb_array_length(x -> 'tokens') <> 0 then raise exception 'la dueña ya no debía tener dispositivos activos'; end if;
  e := public.registrar_envio_notificacion((x ->> 'id')::bigint, '[]', null);
  if e <> 'sin_dispositivos' then raise exception 'debía quedar sin_dispositivos y quedó %', e; end if;
end $$;
reset role;

-- Despertar el envío sin los secretos de Vault no hace nada (ni falla). Y la tarea programada existe.
-- (Si la base local tiene los secretos de prueba, se quitan solo dentro de esta transacción.)
delete from vault.secrets where name in ('zipa_funciones_url', 'zipa_cron_secreto');
do $$
declare antes int;
begin
  select count(*) into antes from net.http_request_queue;
  perform public.disparar_envio_notificaciones();
  if (select count(*) from net.http_request_queue) <> antes then raise exception 'sin secretos no debía llamar a la función'; end if;
  if not exists (select 1 from cron.job where jobname = 'zipa-enviar-notificaciones' and schedule = '* * * * *') then raise exception 'falta la tarea programada de envío'; end if;
end $$;

-- Operación de reservas (migración 0021) ---------------------------------------------------------------
-- Tareas programadas: vencimiento cada 5 minutos, envío de avisos cada minuto y limpieza diaria.
do $$ begin
  if (select string_agg(jobname || '=' || schedule, ',' order by jobname) from cron.job where jobname like 'zipa-%')
     <> 'zipa-enviar-notificaciones=* * * * *,zipa-expirar-reservas=*/5 * * * *,zipa-limpiar-avisos=30 8 * * *' then
    raise exception 'faltan tareas programadas: %', (select string_agg(jobname || '=' || schedule, ',') from cron.job);
  end if;
end $$;

-- Estadísticas: solo el equipo con MFA, y sin datos personales.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar('select public.admin_reservas(30)', 'No autorizado%');
  perform ci_pruebas.debe_fallar('select public.limpiar_avisos_antiguos()', 'permission denied%');
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal1"}';
do $$ begin
  perform ci_pruebas.debe_fallar('select public.admin_reservas(30)', 'No autorizado%');
end $$;
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  perform ci_pruebas.debe_fallar('select public.admin_reservas(30)', 'permission denied%');
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';
do $$
declare a jsonb;
begin
  a := public.admin_reservas(30);
  if (a ->> 'recibidas')::int < 5 or (a -> 'por_estado' ->> 'rechazada')::int < 1 or (a -> 'por_estado' ->> 'confirmada') is null and (a -> 'por_estado' ->> 'cancelada') is null then
    raise exception 'las cifras de reservas no son las esperadas: %', a -> 'por_estado';
  end if;
  if (a ->> 'restaurantes_con_reservas')::int < 1 or a ->> 'respuesta_promedio_min' is null then raise exception 'faltan restaurantes activos o tiempo de respuesta: %', a; end if;
  if (a -> 'motivos_rechazo' ->> 'sin_mesas')::int < 1 then raise exception 'faltan los motivos de rechazo: %', a -> 'motivos_rechazo'; end if;
  if jsonb_array_length(a -> 'tareas') <> 3 then raise exception 'el panel debe ver las 3 tareas programadas'; end if;
  if (a -> 'avisos' ->> 'fallida') is null then raise exception 'faltan los avisos fallidos: %', a -> 'avisos'; end if;
  if jsonb_array_length(a -> 'avisos_fallidos') < 1 or a -> 'avisos_fallidos' -> 0 ->> 'code' !~ '^R-' then raise exception 'falta la incidencia del aviso fallido'; end if;
  -- Nada personal: ni teléfonos, ni nombres de contacto, ni observaciones, ni ids de clientes.
  if a::text ~ '(57300|3157778899|3001234567|Ana Turista|Cliente Ana|Cumpleaños|bebé|Terraza|0000000000c9|0000000000ca)' then
    raise exception 'las estadísticas exponen datos personales';
  end if;
end $$;
reset role;

-- El equipo sigue sin poder confirmar ni ver solicitudes una por una.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$ begin
  if ci_pruebas.cuenta('select * from public.reservations') <> 0 then raise exception 'el equipo ve solicitudes'; end if;
  perform ci_pruebas.debe_fallar($q$select public.confirmar_reserva(ci_pruebas.reserva(2))$q$, 'No encontramos esa solicitud%');
end $$;
reset role;

-- Retención: se borran solo los avisos resueltos de más de 90 días y los dispositivos desactivados hace más de 90 días.
do $$
declare viejo bigint; nuevo bigint; r jsonb;
begin
  select id into viejo from public.notifications where status in ('enviada', 'sin_dispositivos', 'fallida') order by id limit 1;
  select id into nuevo from public.notifications where status in ('enviada', 'sin_dispositivos', 'fallida') and id <> viejo order by id limit 1;
  update public.notifications set created_at = now() - interval '91 days' where id = viejo;
  update public.push_tokens set disabled_at = now() - interval '91 days' where token = 'ExponentPushToken[duena2-celular2]';
  r := public.limpiar_avisos_antiguos();
  if exists (select 1 from public.notifications where id = viejo) or not exists (select 1 from public.notifications where id = nuevo) then raise exception 'la limpieza borró de más o de menos: %', r; end if;
  if exists (select 1 from public.push_tokens where token = 'ExponentPushToken[duena2-celular2]') then raise exception 'no se borró el dispositivo desactivado hace más de 90 días'; end if;
  if (select count(*) from public.reservations) = 0 then raise exception 'la limpieza no debe tocar las solicitudes'; end if;
end $$;

-- Al eliminar la cuenta se borran sus dispositivos y sus avisos.
delete from auth.users where id = '00000000-0000-0000-0000-0000000000ca';
do $$ begin
  if exists (select 1 from public.push_tokens where user_id = '00000000-0000-0000-0000-0000000000ca')
     or exists (select 1 from public.notifications where recipient_id = '00000000-0000-0000-0000-0000000000ca') then
    raise exception 'quedaron dispositivos o avisos de una cuenta eliminada';
  end if;
end $$;

-- CIUDADES Y VISIBILIDAD POR MUNICIPIO (migraciones 0023 y 0024) ----------------------------------
-- Zipaquirá (25899) es la única ciudad activa. Tunja (15001) no está configurada (próximamente).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f7', 'tunja@prueba.test', '{"full_name":"Dueña Tunja"}'),
  ('00000000-0000-0000-0000-0000000000f8', 'pasto@prueba.test', '{"full_name":"Dueña Pasto"}'),
  ('00000000-0000-0000-0000-0000000000f9', 'cliente.bogota@prueba.test', '{"full_name":"Cliente Bogotá"}');
update auth.users set created_at = now() - interval '3 days' where email like '%@prueba.test';
-- Un negocio publicado (aprobado) en Tunja, con un producto y su QR: no debe verse mientras Tunja no abra.
insert into public.businesses (id, owner_id, name, type, category, address, status, municipio_codigo) values
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000f7', 'Almojábanas de Tunja', 'emprendimiento', 'comer', 'Calle 19', 'publicado', '15001');
insert into public.products (id, business_id, name) values ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000f6', 'Almojábana');
insert into public.business_qr (business_id, token) values ('00000000-0000-0000-0000-0000000000f6', 'qr-tunja-prueba')
  on conflict (business_id) do update set token = excluded.token;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if ci_pruebas.cuenta($q$select * from public.municipios$q$) < 1100 then raise exception 'anon no ve el catálogo de municipios'; end if;
  if ci_pruebas.cuenta($q$select municipio_codigo from public.cobertura_municipios where estado = 'activa'$q$) <> 1 then raise exception 'debería haber una sola ciudad activa'; end if;
  if ci_pruebas.cuenta($q$select * from public.businesses where id = '00000000-0000-0000-0000-0000000000f6'$q$) <> 0 then raise exception 'anon ve un negocio de una ciudad no activa (tabla)'; end if;
  if ci_pruebas.cuenta($q$select * from public.businesses_public where id = '00000000-0000-0000-0000-0000000000f6'$q$) <> 0 then raise exception 'anon ve un negocio de una ciudad no activa (vista)'; end if;
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios(p_texto => 'almojabana')$q$) <> 0 then raise exception 'la búsqueda muestra un negocio de una ciudad no activa'; end if;
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios(p_municipio => '15001')$q$) <> 0 then raise exception 'el listado de Tunja muestra negocios sin estar activa'; end if;
  if ci_pruebas.cuenta($q$select * from public.products where id = '00000000-0000-0000-0000-0000000000f5'$q$) <> 0 then raise exception 'anon ve productos de una ciudad no activa'; end if;
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios(p_municipio => '25899') where municipio_codigo <> '25899'$q$) <> 0 then raise exception 'el listado de Zipaquirá mezcla otras ciudades'; end if;
  -- Escribir el catálogo, el estado de las ciudades o leer los interesados: no.
  perform ci_pruebas.debe_fallar($q$insert into public.cobertura_municipios (municipio_codigo, estado) values ('15001', 'activa')$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$update public.municipios set nombre = 'x' where codigo = '25899'$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$select * from public.interes_comercial$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$select public.admin_cambiar_estado_ciudad('15001', 'activa')$q$, 'permission denied%');
  -- Interés comercial desde Tunja: sí (sin cuenta); desde Zipaquirá (activa): no, que se registre.
  perform ci_pruebas.debe_funcionar($q$select public.registrar_interes_comercial('15001', 'Arepas Boyacenses', 'restaurante', 'Marta', '300 111 2233', true)$q$);
  if (public.registrar_interes_comercial('15001', 'Arepas Boyacenses', 'restaurante', 'Marta', '3001112233', true) ->> 'repetido')::boolean is not true then
    raise exception 'el mismo interés el mismo día se guardó dos veces';
  end if;
  perform ci_pruebas.debe_fallar($q$select public.registrar_interes_comercial('25899', 'Algo', 'restaurante', 'Ana', '3001112233', true)$q$, 'LocalmenteTuyo ya está disponible en Zipaquirá%');
  perform ci_pruebas.debe_fallar($q$select public.registrar_interes_comercial('52001', 'Algo', 'restaurante', 'Ana', '3001112233', false)$q$, 'Necesitamos tu autorización%');
  perform ci_pruebas.debe_fallar($q$select public.registrar_interes_comercial('99999', 'Algo', 'restaurante', 'Ana', '3001112233', true)$q$, 'Elige un municipio%');
end $$;
reset role;

-- Cliente de otra ciudad (su cuenta no depende de dónde esté): explora Zipaquirá, pero no puede reseñar
-- ni registrar visitas en un negocio de una ciudad no activa, aunque tenga su id o su QR.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f9","role":"authenticated"}';
do $$ begin
  if ci_pruebas.cuenta($q$select * from public.businesses_public where municipio_codigo = '25899'$q$) < 1 then raise exception 'el cliente no ve Zipaquirá'; end if;
  perform ci_pruebas.debe_fallar($q$select public.guardar_mi_resena('00000000-0000-0000-0000-0000000000f6', 5, 'Muy buenas')$q$, '%');
  if exists (select 1 from public.reviews where business_id = '00000000-0000-0000-0000-0000000000f6') then raise exception 'se guardó una reseña en un negocio de una ciudad no activa'; end if;
  perform ci_pruebas.debe_fallar($q$select public.registrar_visita('00000000-0000-0000-0000-0000000000f6', 'qr-tunja-prueba')$q$, 'Este negocio no está disponible%');
  perform ci_pruebas.debe_fallar($q$select public.admin_ciudades()$q$, 'No autorizado%');
  perform ci_pruebas.debe_fallar($q$select public.admin_cambiar_estado_ciudad('15001', 'activa')$q$, 'No autorizado%');
  perform ci_pruebas.debe_fallar($q$select public.admin_interesados()$q$, 'No autorizado%');
end $$;
reset role;

-- Dueña en una ciudad que no abre (Pasto): no puede registrar un negocio (solo interés).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f8","role":"authenticated"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$insert into public.businesses (owner_id, name, type, category, address, municipio_codigo) values ('00000000-0000-0000-0000-0000000000f8', 'Cuyes de Pasto', 'establecido', 'comer', 'Calle 18', '52001')$q$, 'LocalmenteTuyo todavía no está disponible%');
end $$;
reset role;
-- La dueña de Tunja ve su propio negocio aunque Tunja no esté activa, y no puede abrir su ciudad.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f7","role":"authenticated"}';
do $$ begin
  if ci_pruebas.cuenta($q$select * from public.businesses where id = '00000000-0000-0000-0000-0000000000f6'$q$) <> 1 then raise exception 'la dueña no ve su negocio de una ciudad no activa'; end if;
  perform ci_pruebas.debe_fallar($q$update public.cobertura_municipios set estado = 'activa' where municipio_codigo = '15001'$q$, 'permission denied%');
  perform ci_pruebas.debe_fallar($q$select public.admin_cambiar_estado_ciudad('15001', 'activa')$q$, 'No autorizado%');
end $$;
reset role;

-- Revisora (aal2): ve ciudades e interesados, pero no cambia el estado de una ciudad (solo admin).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';
do $$ begin
  if jsonb_array_length(public.admin_ciudades()) < 2 then raise exception 'la revisora no ve las ciudades'; end if;
  if jsonb_array_length(public.admin_interesados('15001')) <> 1 then raise exception 'la revisora no ve el interesado de Tunja'; end if;
  perform ci_pruebas.debe_fallar($q$select public.admin_cambiar_estado_ciudad('15001', 'activa')$q$, 'No autorizado%');
end $$;
reset role;
-- Admin SIN segundo factor: no.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal1"}';
do $$ begin
  perform ci_pruebas.debe_fallar($q$select public.admin_cambiar_estado_ciudad('15001', 'activa')$q$, 'No autorizado%');
end $$;
reset role;

-- Admin con aal2 abre Tunja: queda en la bitácora, no aprueba negocios pendientes y el negocio
-- publicado de Tunja aparece. Al cerrarla, deja de verse sin borrar nada.
insert into public.businesses (id, owner_id, name, type, category, address, status, municipio_codigo) values
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000f8', 'Pendiente de Tunja', 'emprendimiento', 'comer', 'Calle 20', 'en_revision', '15001');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$ begin
  perform public.admin_cambiar_estado_ciudad('15001', 'activa', 'Apertura de prueba');
end $$;
reset role;
do $$ begin
  if (select status from public.businesses where id = '00000000-0000-0000-0000-0000000000f4') <> 'en_revision' then raise exception 'activar la ciudad aprobó un negocio pendiente'; end if;
  if not exists (select 1 from public.admin_actions where action = 'cambiar_estado_ciudad' and details ->> 'codigo' = '15001' and details ->> 'a' = 'activa') then raise exception 'el cambio de ciudad no quedó en la bitácora'; end if;
end $$;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if ci_pruebas.cuenta($q$select * from public.buscar_negocios(p_municipio => '15001')$q$) <> 1 then raise exception 'Tunja activa no muestra su negocio publicado'; end if;
  if ci_pruebas.cuenta($q$select * from public.businesses_public where id = '00000000-0000-0000-0000-0000000000f4'$q$) <> 0 then raise exception 'se ve un negocio pendiente'; end if;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","aal":"aal2"}';
do $$ begin
  perform public.admin_cambiar_estado_ciudad('15001', 'proximamente', 'Cierre de prueba');
end $$;
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if ci_pruebas.cuenta($q$select * from public.businesses_public where municipio_codigo = '15001'$q$) <> 0 then raise exception 'al cerrar Tunja sus negocios siguen visibles'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.businesses where municipio_codigo = '15001') <> 2 then raise exception 'cerrar la ciudad borró negocios'; end if;
end $$;

-- Dueña de un negocio publicado que mueve el punto poco (sigue publicado) o cambia de municipio
-- (vuelve a revisión). Chía (25175) en preparación solo para esta prueba.
insert into public.cobertura_municipios (municipio_codigo, estado) values ('25175', 'en_preparacion');
insert into public.businesses (id, owner_id, name, type, category, address, status, latitud, longitud) values
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f9', 'Mueve Municipio', 'emprendimiento', 'comer', 'Calle 3', 'publicado', 5.02548, -73.99444);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f9","role":"authenticated"}';
do $$
declare estado text;
begin
  perform ci_pruebas.debe_funcionar($q$update public.businesses set latitud = 5.0260, longitud = -73.9950 where id = '00000000-0000-0000-0000-0000000000f3'$q$);
  select status into estado from public.businesses where id = '00000000-0000-0000-0000-0000000000f3';
  if estado <> 'publicado' then raise exception 'mover el punto menos de 300 m no debería pedir revisión (%)', estado; end if;
  perform ci_pruebas.debe_funcionar($q$update public.businesses set latitud = 5.0400, longitud = -73.9950 where id = '00000000-0000-0000-0000-0000000000f3'$q$);
  select status into estado from public.businesses where id = '00000000-0000-0000-0000-0000000000f3';
  if estado <> 'en_revision' then raise exception 'mover el punto más de 300 m no devolvió el negocio a revisión (%)', estado; end if;
  perform ci_pruebas.debe_fallar($q$update public.businesses set municipio_codigo = '52001' where id = '00000000-0000-0000-0000-0000000000f3'$q$, 'LocalmenteTuyo todavía no está disponible%');
  perform ci_pruebas.debe_funcionar($q$update public.businesses set municipio_codigo = '25175' where id = '00000000-0000-0000-0000-0000000000f3'$q$);
end $$;
reset role;
-- Republicado por el equipo y luego la dueña cambia de municipio: vuelve a revisión.
update public.businesses set status = 'publicado', municipio_codigo = '25899' where id = '00000000-0000-0000-0000-0000000000f3';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f9","role":"authenticated"}';
do $$
declare estado text;
begin
  perform ci_pruebas.debe_funcionar($q$update public.businesses set municipio_codigo = '25175' where id = '00000000-0000-0000-0000-0000000000f3'$q$);
  select status into estado from public.businesses where id = '00000000-0000-0000-0000-0000000000f3';
  if estado <> 'en_revision' then raise exception 'cambiar de municipio no devolvió el negocio a revisión (%)', estado; end if;
end $$;
reset role;

-- VENCIMIENTO DEL INTERÉS COMERCIAL (0025): la limpieza diaria borra los de más de 12 meses ------------
insert into public.interes_comercial (municipio_codigo, nombre_negocio, tipo, nombre_contacto, whatsapp, acepta_contacto, created_at) values
  ('52001', 'Interés viejo', 'restaurante', 'Ana', '573001110001', true, now() - interval '13 months'),
  ('52001', 'Interés reciente', 'restaurante', 'Ana', '573001110002', true, now() - interval '11 months');
do $$ begin
  perform public.limpiar_avisos_antiguos();
  if exists (select 1 from public.interes_comercial where nombre_negocio = 'Interés viejo') then raise exception 'no se borró el interés de más de 12 meses'; end if;
  if not exists (select 1 from public.interes_comercial where nombre_negocio = 'Interés reciente') then raise exception 'se borró un interés de menos de 12 meses'; end if;
end $$;

-- Tablas futuras: no deben quedar expuestas solas ---------------------------------------------------
create table public.ci_tabla_nueva (id int);
do $$ begin
  if exists (select 1 from information_schema.role_table_grants
             where table_schema = 'public' and table_name = 'ci_tabla_nueva' and grantee in ('anon', 'authenticated')) then
    raise exception 'Una tabla nueva quedó expuesta a anon/authenticated sin grant explícito';
  end if;
  raise notice 'Permisos verificados: anon, turista, dueña, revisora y admin se comportan como se espera';
end $$;

rollback;
