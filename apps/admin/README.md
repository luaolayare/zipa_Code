# Panel del equipo (apps/admin)

Panel privado en Next.js 16 para revisar negocios, resolver reportes y ver la bitácora. No es una web
pública: no se indexa y solo entra el equipo.

## Seguridad (por qué no hay "contraseña de administrador")

- Usa **solo la clave publicable** de Supabase. Nunca la service role key.
- Cada persona entra con **su propia cuenta** y **verificación en dos pasos** (TOTP: Google
  Authenticator, Microsoft Authenticator…). Sin el segundo factor, la base de datos no le da ningún
  permiso del equipo.
- Los permisos salen de `admin_users` (migración 0008):
  - `revisor`: aprueba negocios y resuelve reportes;
  - `admin`: además borra reseñas.
- Las decisiones sobre negocios pasan por la Edge Function `revisar-negocio`. Todo queda en `admin_actions`.

## Correr el panel
Ver **docs/GUIA_LEVANTAR_SERVICIOS.md** (secciones 1 a 3):
- `npm run admin` → http://localhost:3000 con datos de **pruebas** (`apps/admin/.env.development.local`).
- Con datos reales solo con `ZIPA_ENTORNO=produccion`, `npm run build` y `npm run start` (usa `apps/admin/.env.local`).

## Agregar a alguien al equipo

1. La persona crea su cuenta normal (en la app de clientes o de negocios).
2. Un administrador la agrega por SQL (editor de Supabase o una migración revisada):

   ```sql
   insert into public.admin_users (user_id, role, created_by)
   select id, 'revisor', null from auth.users where email = 'correo@ejemplo.com';
   ```

3. La persona entra al panel. La primera vez configura su app de autenticación.

Para quitarle el acceso: `delete from public.admin_users where user_id = '…';`
