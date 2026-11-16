-- Prueba de permisos para CI: simula cada operación de packages/shared/src/api.ts con los roles
-- reales de la API (anon y authenticated) y comprueba qué debe funcionar y qué debe rechazarse.
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

grant execute on all functions in schema ci_pruebas to anon, authenticated;

-- Datos de prueba (como postgres) ---------------------------------------------------------------
-- Al crear los usuarios corre el trigger on_auth_user_created (perfil y aceptaciones), aunque su
-- función ya no sea ejecutable por la API.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'duena@prueba.test',
   '{"full_name":"Dueña Prueba","consents":[{"document":"privacidad","version":"1.0","app":"negocios"}]}'),
  ('00000000-0000-0000-0000-0000000000c1', 'turista@prueba.test', '{"full_name":"Turista Prueba"}');

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
  perform ci_pruebas.debe_fallar('delete from public.reviews', 'permission denied%');
  perform ci_pruebas.debe_fallar('update public.reviews set stars = 1', 'permission denied%');
  perform ci_pruebas.debe_fallar('truncate public.consents', 'permission denied%');
  perform ci_pruebas.debe_fallar($q$update public.profiles set id = id$q$, 'permission denied%');
  if ci_pruebas.cuenta('select * from public.business_verifications') <> 0 then raise exception 'la turista ve verificaciones ajenas'; end if;
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
  perform ci_pruebas.debe_funcionar($q$update public.reviews set reply = '¡Gracias!', replied_at = now() where business_id = '00000000-0000-0000-0000-0000000000b1'$q$);
  -- No puede: publicarse sola (RLS), borrar reseñas, ni leer reportes ajenos.
  perform ci_pruebas.debe_fallar($q$update public.businesses set status = 'publicado' where id = '00000000-0000-0000-0000-0000000000b2'$q$, '%row-level security%');
  perform ci_pruebas.debe_fallar('delete from public.reviews', 'permission denied%');
  if ci_pruebas.cuenta('select * from public.reports') <> 0 then raise exception 'la dueña ve reportes ajenos'; end if;
end $$;

reset role;

-- Tablas futuras: no deben quedar expuestas solas ---------------------------------------------------
create table public.ci_tabla_nueva (id int);
do $$ begin
  if exists (select 1 from information_schema.role_table_grants
             where table_schema = 'public' and table_name = 'ci_tabla_nueva' and grantee in ('anon', 'authenticated')) then
    raise exception 'Una tabla nueva quedó expuesta a anon/authenticated sin grant explícito';
  end if;
  raise notice 'Permisos verificados: anon, turista y dueña se comportan como se espera';
end $$;

rollback;
