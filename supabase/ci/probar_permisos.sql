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
  perform ci_pruebas.debe_funcionar($q$insert into public.reviews (business_id, user_id, stars, text) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 5, 'Deliciosa la arepa')$q$);
  if ci_pruebas.cuenta('select * from public.reviews_public') <> 1 then raise exception 'la turista no ve su reseña en reviews_public'; end if;
  perform ci_pruebas.debe_funcionar($q$insert into public.reports (reporter_id, target_type, target_id, reason) values ('00000000-0000-0000-0000-0000000000c1', 'business', '00000000-0000-0000-0000-0000000000b1', 'spam')$q$);
  perform ci_pruebas.debe_funcionar('select * from public.reports');
  perform ci_pruebas.debe_funcionar($q$insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1')$q$);
  perform ci_pruebas.debe_funcionar($q$delete from public.blocks where blocker_id = '00000000-0000-0000-0000-0000000000c1'$q$);
  perform ci_pruebas.debe_funcionar($q$insert into public.consents (user_id, document, version, app) values ('00000000-0000-0000-0000-0000000000c1', 'terminos_clientes', '1.0', 'clientes')$q$);
  perform ci_pruebas.debe_funcionar('select * from public.consents');
  perform ci_pruebas.debe_funcionar($q$update public.profiles set full_name = 'Turista Renombrada' where id = '00000000-0000-0000-0000-0000000000c1'$q$);
  -- El filtro de palabras sigue funcionando con permisos mínimos.
  perform ci_pruebas.debe_fallar($q$insert into public.reviews (business_id, user_id, stars, text) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 1, 'son unos malparidos')$q$, '%texto_ofensivo%');
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

-- REVISORA CON MFA (aal2): ve todo para revisar, pero no borra reseñas ----------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","aal":"aal2"}';

do $$ begin
  if not public.is_admin() then raise exception 'is_admin() es false para la revisora con MFA'; end if;
  if public.is_admin('admin') then raise exception 'la revisora pasa como admin'; end if;
  if ci_pruebas.cuenta($q$select * from public.businesses where status = 'en_revision'$q$) <> 1 then raise exception 'la revisora no ve el negocio en revisión'; end if;
  if ci_pruebas.cuenta('select * from public.business_verifications') <> 1 then raise exception 'la revisora no ve la verificación'; end if;
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
