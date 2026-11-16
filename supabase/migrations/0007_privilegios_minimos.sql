-- Zipa lo tiene: privilegios mínimos para los roles de la API (anon y authenticated).
--
-- Antes: por la opción "Automatically expose new tables", anon y authenticated tenían TODOS los
-- privilegios de tabla (incluidos TRUNCATE, TRIGGER y REFERENCES) en todo el esquema public, y
-- cualquier tabla nueva quedaba expuesta sola. RLS ya limitaba las filas; esta migración limita
-- además las OPERACIONES a las que usan las apps (packages/shared/src/api.ts).
--
-- No cambia ninguna política RLS ni ningún dato. service_role y postgres no se tocan.
-- Ejecutar después de 0006_filtro_plurales.sql.

-- 1. Quitar todo lo heredado -------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

-- 2. Lectura pública (anon y authenticated) ----------------------------------------------------
-- Las vistas usan security_invoker: quien las consulta necesita SELECT también sobre las tablas
-- que leen por dentro (businesses_public → businesses, reviews, products;
-- reviews_public → reviews, profiles, blocks). RLS sigue filtrando las filas.
grant select on public.businesses_public, public.reviews_public to anon, authenticated;
grant select on public.businesses, public.reviews, public.products, public.profiles, public.blocks
  to anon, authenticated;

-- 3. Escritura con sesión (authenticated), solo donde la app escribe --------------------------
-- Negocio propio: registrar, enviar a revisión (RLS: dueño; nunca puede marcarse "publicado").
grant insert, update on public.businesses to authenticated;

-- Verificación: upsert de foto y cédula/NIT (RLS: solo el dueño del negocio).
grant select, insert, update on public.business_verifications to authenticated;

-- Productos del negocio propio (RLS "administrar mis productos").
grant insert, update, delete on public.products to authenticated;

-- Reseñas: publicar; el negocio solo puede responder (columnas reply y replied_at).
grant insert on public.reviews to authenticated;
grant update (reply, replied_at) on public.reviews to authenticated;

-- Perfil propio: solo el nombre.
grant update (full_name) on public.profiles to authenticated;

-- Aceptaciones legales, reportes y bloqueos propios.
grant select, insert on public.consents to authenticated;
grant select, insert on public.reports to authenticated;
grant insert, delete on public.blocks to authenticated;

-- 4. Funciones -------------------------------------------------------------------------------
-- Funciones de trigger: nadie debe llamarlas por la API. (PostgreSQL no comprueba EXECUTE al
-- disparar un trigger, así que los triggers siguen funcionando.)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.revisar_texto_resena() from public, anon, authenticated;
-- texto_ofensivo() se mantiene ejecutable: revisar_texto_resena() la llama con los permisos
-- de quien publica la reseña (security invoker).

-- 5. Tablas futuras: no exponerlas solas ------------------------------------------------------
-- Cada tabla nueva tendrá que declarar sus grant en su propia migración.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
