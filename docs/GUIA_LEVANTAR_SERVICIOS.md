# Cómo levantar los servicios de LocalmenteTuyo

Todo se ejecuta desde `C:\app_busqueda`, en PowerShell o en la terminal de VS Code.

| Proyecto de Supabase | ID | Se usa en |
|---|---|---|
| **Pruebas** | `ayvugzpidvafjiqzlqwc` | Desarrollo: panel con `npm run admin`, apps en Expo Go, APK `preview` |
| **Producción** | `auilsjqprobmhusvxmmz` | APK/AAB `production` y el panel en modo producción |

El **candado** impide que el desarrollo use producción. Si un comando se detiene con un mensaje `[Zipa] …`, el candado está haciendo su trabajo: lee el mensaje antes de cambiar nada.

## 0. Una sola vez (o después de actualizar el código)

```powershell
npm install
```

Contraseña de las cuentas de pruebas (`*@pruebas.zipa.test`): está en tu gestor de contraseñas o con
`[Environment]::GetEnvironmentVariable('ZIPA_CLAVE_PRUEBAS','User')`.

---

## 1. Panel del equipo con datos de PRUEBAS (lo normal)

```powershell
npm run admin
```

Abre **http://localhost:3000**.

1. Entra con `admin@pruebas.zipa.test` y la contraseña de pruebas.
2. La **primera vez** el panel muestra un código QR: escanéalo con Google Authenticator o Microsoft
   Authenticator y escribe el código de 6 dígitos. Las siguientes veces solo pide el código.
3. Secciones: Resumen, Analítica, Reservas, **Negocios** (aprobar o rechazar, con filtro por municipio),
   Destacados, Categorías, **Ciudades** (abrir o cerrar ciudades e interesados), Videos, Reseñas,
   Reportes, Bitácora y Sistema.

Para detenerlo: `Ctrl + C` en la terminal.

**Archivos que usa:** `apps/admin/.env.development.local`, que apunta a pruebas. Next lo prefiere sobre `.env.local` solo en desarrollo. No lo borres ni lo cambies a producción.

| Problema | Qué hacer |
|---|---|
| `[Zipa] El panel en desarrollo apunta a PRODUCCIÓN` | `apps/admin/.env.development.local` no existe o tiene la URL de producción. Pon ahí la URL y la clave publicable de **pruebas**. |
| `Port 3000 is in use` | Cierra el otro panel, o usa `cd apps/admin; npx next dev --port 3001` y abre http://localhost:3001. |
| Te manda a «Sin acceso» | La cuenta no está en `admin_users` (ver sección 3). |
| Perdiste el celular con el autenticador | Otro administrador borra tu factor en Supabase → Authentication → Users → tu usuario → MFA. Al entrar de nuevo, configuras uno nuevo. |

---

## 2. Panel del equipo con datos REALES (producción)

Úsalo solo para gestionar negocios reales: lo que apruebes, rechaces o cambies aquí lo ven los clientes.
`npm run admin` nunca se conecta a producción, a propósito. En modo producción hay que declararlo:

```powershell
cd apps/admin
$env:ZIPA_ENTORNO = 'produccion'
npm run build
npm run start
```

Abre **http://localhost:3000** y entra con **tu cuenta de producción** (sección 3).

- Usa `apps/admin/.env.local`, que tiene la URL y la clave publicable de producción.
- Al terminar: `Ctrl + C` y cierra esa terminal, para que no quede `ZIPA_ENTORNO` activo.
- Si sale `[Zipa] ZIPA_ENTORNO=produccion, pero el panel no apunta al proyecto de producción`, revisa
  `apps/admin/.env.local`.

---

## 3. Dar acceso al panel a una persona (pruebas o producción)

1. La persona crea su cuenta normal en la app de clientes o de negocios del entorno que corresponda.
2. En **Supabase → el proyecto correcto → SQL Editor**:
   ```sql
   insert into public.admin_users (user_id, role, created_by)
   select id, 'admin', null from auth.users where email = 'correo@ejemplo.com';
   ```
   El rol `revisor` revisa negocios y reportes. El rol `admin` además cambia el estado de las ciudades y gestiona destacados.
3. La persona entra al panel y configura su autenticador.

Para quitar el acceso: `delete from public.admin_users where user_id = (select id from auth.users where email = 'correo@ejemplo.com');`

---

## 4. Apps en desarrollo (Expo Go, datos de PRUEBAS)

1. **Emulador.** Abre Android Studio → Device Manager → `zipa_android14` → ▶.
   También desde PowerShell: `& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd zipa_android14`.
2. **Servidores**, cada uno en su propia terminal:
   ```powershell
   npm run clientes                    # puerto 8081
   npm run negocios -- --port 8082     # otro puerto, para tener las dos a la vez
   ```
3. En la terminal de Expo, pulsa `a` para abrir la app en el emulador.
4. Vista web, solo para revisar pantallas: `npm run clientes:web` o `npm run negocios:web`.

Usan `apps/clientes/.env.development.local` y `apps/negocios/.env.development.local`, que apuntan a pruebas.

| Problema | Qué hacer |
|---|---|
| El emulador no arranca (`WHPX: Failed to setup partition`) | Reinicia Windows. No tengas Docker Desktop abierto al mismo tiempo que el emulador. |
| `Unable to resolve "expo-notifications"` o similar | Cierra Expo y vuelve a abrir con `npm run clientes -- --clear`. |
| `Cannot find native module 'ExpoApplication'` | Pasa al cambiar entre clientes y negocios dentro de Expo Go: cierra Expo Go por completo y ábrelo de nuevo. |
| `Port 8081 is being used` | Ya hay otro Expo abierto: ciérralo o usa otro puerto (`-- --port 8083`). |

---

## 5. Generar las apps (EAS)

Desde la carpeta de cada app (`cd apps/clientes` o `cd apps/negocios`):

| Para qué | Comando | Se conecta a |
|---|---|---|
| APK para probar | `npx eas-cli build -p android --profile preview` | Pruebas |
| AAB para Google Play | `npx eas-cli build -p android --profile production` | Producción |
| APK instalable de la misma versión | `npx eas-cli build -p android --profile production-apk` | Producción |

- Primero el AAB y luego el APK: el AAB sube el código de versión y el APK usa ese mismo.
- Las llaves de firma están guardadas en EAS. No las borres desde expo.dev.
- Para subir de versión visible (1.0.0 → 1.0.1), cambia `version` en `app.json` de cada app.

---

## 6. Base de datos (migraciones)

La carpeta principal está **vinculada a PRODUCCIÓN** (`supabase/.temp/project-ref`). Antes de cualquier `db push`:

1. Respaldo de producción.
2. `npx supabase db push --remote --dry-run`: revisa el nombre del proyecto que imprime y que solo
   aparezcan las migraciones nuevas.
3. `npx supabase db push --remote`.

Para trabajar contra pruebas, vincula primero (`npx supabase link --project-ref ayvugzpidvafjiqzlqwc`). Al terminar, vuelve a vincular producción si es lo que esperas.

No necesitas Docker para nada de esto. Además, Docker impide arrancar el emulador.
