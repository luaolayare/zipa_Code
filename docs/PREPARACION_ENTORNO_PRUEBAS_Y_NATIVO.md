# Preparación: entorno de pruebas, respaldo del código, Sentry y Android

**Fecha:** 21-nov-2026.
**Rama:** `feature/tipografia-espacios`.
**Qué no se hizo:** no se ejecutó ninguna operación remota (Supabase, EAS, GitHub ni Sentry), no se instaló software ni se compiló nada.
**Qué se hizo:** todo se preparó y validó en local.

---

## 1. Entorno Supabase de pruebas

### 1.1 Proyecto de producción que se preserva

| Dato | Valor |
|---|---|
| Proyecto | `zipa-lo-tiene`, ref **`auilsjqprobmhusvxmmz`** |
| Contenido | 22 migraciones; funciones `revisar-negocio` (v4), `eliminar-cuenta` (v4) y `enviar-notificaciones` (v3); secretos `CRON_SECRET` y Vault (`zipa_cron_secreto`, `zipa_funciones_url`) |
| Regla | No se toca durante la creación del entorno de pruebas. Ningún comando lleva su ref, salvo los de solo lectura que ya se usan |

### 1.2 Las 22 migraciones que se aplicarían (las mismas de producción, en orden)

| # | Migración |
|---|---|
| 0001 | `esquema_inicial` |
| 0002 | `datos_de_vitrina` |
| 0003 | `consentimientos` |
| 0004 | `reportes_y_bloqueos` |
| 0005 | `verificacion_privada` |
| 0006 | `filtro_plurales` |
| 0007 | `privilegios_minimos` |
| 0008 | `roles_admin` |
| 0009 | `panel_de_negocios` |
| 0010 | `revision_y_reportes` |
| 0011 | `videos_aprobados_y_mi_resena` |
| 0012 | `resenas_antispam` |
| 0013 | `categorias_y_busqueda` |
| 0014 | `menu_digital` |
| 0015 | `analitica` |
| 0016 | `logo_y_busqueda_rapida` |
| 0017 | `galeria_y_destacados` |
| 0018 | `contacto_y_entregas` |
| 0019 | `reservas` |
| 0020 | `notificaciones_push` |
| 0021 | `reservas_operacion` |
| 0022 | `avisos_por_app` |

**Validación previa sin costo:** al subir la rama, el CI de GitHub aplica las 22 desde cero en una base propia. Además, `supabase db push --dry-run` contra el proyecto de pruebas muestra la lista antes de aplicar.

### 1.3 Variables de entorno por app y entorno

| App | Pruebas | Producción |
|---|---|---|
| Clientes (EAS, proyecto `vitrina-local`) | Ambiente **`preview`**: `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` **del proyecto de pruebas** | Ambiente **`production`**: las de producción (como hoy) |
| Negocios (EAS, proyecto `vitrina-negocios`) | Igual, en su propio proyecto de EAS | Igual |
| Panel de administración (Next.js, local) | `apps/admin/.env.pruebas.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` de pruebas; se usa con `next dev --env-file` o copiándolo a `.env.local` | `apps/admin/.env.local` actual |
| Firebase (`GOOGLE_SERVICES_JSON`) | Se comparte: es el mismo paquete de la app | Igual |

**Notas:**
- **Hoy** el ambiente `preview` de EAS apunta a **producción** (es el P6 de la auditoría). El cambio es reemplazar esas 2 variables en `preview` de las 2 apps.
- **Nunca se guardan valores en el repositorio**, solo nombres. La clave `service_role` de pruebas no va a EAS ni a las apps: solo se usa al sembrar datos, en la terminal.

### 1.4 Cómo se evita que un build de pruebas apunte a producción (ya implementado, local)

- **Candado de compilación:** `packages/shared/entorno.js`, usado por `apps/{clientes,negocios}/app.config.js`.
  - Un build `preview` o `development` que apunte a `auilsjqprobmhusvxmmz` **se detiene** con un mensaje claro.
  - Un build `production` que **no** apunte a producción también se detiene.
  - Excepción consciente: `ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS=1`. Queda escrita en el registro del build y solo se usa con autorización; sirve para un APK de Beta 2.2 mientras no exista el entorno.
  - En `expo start` local no se aplica.
  - Pruebas: `packages/shared/src/__tests__/entorno-test.ts`, 7 casos ✅. También se probó con `expo config` (preview → producción se detiene; preview → pruebas pasa; local pasa).
- **Marca del entorno en la app:** `extra.entorno` (`local`, `pruebas` o `produccion`) queda en la configuración. Sirve para Sentry (§3) y, si se aprueba, para mostrar una cinta «PRUEBAS» (no implementada: es interfaz nueva).
- **Scripts:** `sembrar-pruebas.js` y `verificar-entorno.js` se niegan a correr si la URL es la de producción (comprobado).

### 1.5 Datos ficticios

**`pruebas/entorno/sembrar-pruebas.js`:**
- **Crea:**
  - 1 administrador;
  - 1 dueña de restaurante, con reservas activas;
  - 1 dueña de emprendimiento;
  - 3 clientes, todos con correos `@pruebas.zipa.test`;
  - productos, reseñas, un destacado y una solicitud pendiente.
- **No se repite:** correrlo dos veces no duplica nada.
- **Variables al ejecutarlo:**
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` del proyecto de pruebas;
  - `ZIPA_CLAVE_PRUEBAS`, la contraseña de las cuentas ficticias.

  Ninguna se guarda.
- **Validado en local:** ✅ dos ejecuciones sin duplicar; rechaza la URL de producción.
- **Nunca se copian datos reales** de producción.

### 1.6 Comprobación de RLS, autenticación y funciones

1. **SQL de esquema y permisos:** `supabase/ci/verificar_esquema.sql` y `probar_permisos.sql`, los mismos del CI, contra la base de pruebas con `psql "<cadena de conexión de pruebas>" -f ...`.
   - Requiere la contraseña de la base de pruebas.
   - `probar_permisos.sql` trabaja dentro de una transacción que se deshace.
2. **Prueba de humo `pruebas/entorno/verificar-entorno.js`** (14 casos), como lo haría la app, con la clave pública:
   - sin sesión: no se leen reservas ni se insertan reseñas;
   - la clave incorrecta se rechaza;
   - cada quien ve solo lo suyo;
   - un token de QR falso no registra visita;
   - nadie inserta reseñas directo ni marca «con QR»;
   - la cliente no es administradora;
   - la dueña no edita negocios ajenos;
   - las tres funciones rechazan llamadas sin secreto o sin sesión.

   **Validado en local: 14/14 ✅.**
3. **Suites de punta a punta** (`pruebas/auditoria/*`): siguen siendo locales. Contra el entorno de pruebas se usa la prueba de humo, más la prueba manual con los APK.

### 1.7 Operaciones remotas que requieren autorización y costo

| # | Operación | Dónde | Costo |
|---|---|---|---|
| R1 | Crear el proyecto `zipa-lo-tiene-pruebas` (región igual a producción) | Panel de Supabase (tú) o CLI | **US$0** (plan gratis; se pausa tras ~1 semana sin uso). Si no se quiere pausa: US$25 al mes |
| R2 | `npx supabase link --project-ref <ref-pruebas>` y `npx supabase db push --dry-run`, luego `db push` | CLI contra **pruebas** | US$0 |
| R3 | Desplegar las 3 funciones y crear secretos **propios**: `CRON_SECRET` nuevo y Vault con la URL de pruebas | CLI contra pruebas | US$0 |
| R4 | Sembrar datos ficticios y correr las verificaciones (§1.5 y §1.6) | Pruebas | US$0 |
| R5 | Cambiar en EAS el ambiente `preview` de las 2 apps a las variables de pruebas | EAS | US$0 |
| R6 | (Opcional) Leer las variables actuales de EAS para confirmar el estado (`eas env:list`, solo lectura) | EAS | US$0 |

**Precaución:** después de R2, la CLI queda enlazada al proyecto de pruebas. Para cualquier operación en producción se exigirá `--project-ref auilsjqprobmhusvxmmz` explícito y tu autorización.

---

## 2. Respaldo del código (32 commits locales)

### 2.1 Auditoría

| Dato | Resultado |
|---|---|
| Commits | **32 sin subir**: 3 en `feature/beta-2-2-reservas` (`39ff45e`, `2702da2`, `586d9ae`) y 29 encima, en `feature/tipografia-espacios` (rediseño, auditorías, diagnóstico, plan, Bloque 1 y este paquete) |
| Secretos | **Ninguno.** Sin `.env`, `google-services`, keystores, claves `service_role` ni tokens. Las únicas claves que aparecen son las de demostración que trae la CLI local de Supabase, y no están en los commits |
| Datos personales | **Ninguno real.** Solo correos ficticios (`@local.test` y `@pruebas.zipa.test`) y nombres de ejemplo. La contraseña `secreta123` es de cuentas ficticias locales |
| Ref de producción | Aparece en documentos, pero ya era pública en `origin` |
| Peso | ~28 MB de imágenes (123 archivos: capturas y bocetos). Ninguna pasa el límite de 100 MB de GitHub |
| `main` | No se toca: sigue en `49d1cf4` |

### 2.2 Estrategia propuesta (requiere que autorices el destino)

1. **Primero, respaldo fuera de la carpeta temporal** (local, sin internet). Las dos copias de trabajo viven en una carpeta temporal de Windows que puede limpiarse:

   ```
   git bundle create "%USERPROFILE%\Documents\zipa-respaldo-2026-11-21.bundle" --all
   ```

   Es un solo archivo con todo el historial. Se restaura con `git clone archivo.bundle`. **Necesito tu autorización para escribir en Documentos.**
2. **Subir a GitHub sin tocar `main`:**
   - `git push origin feature/beta-2-2-reservas`: avanza esa rama con sus 3 commits, sin reescribir nada;
   - `git push -u origin feature/tipografia-espacios`: rama **nueva** con todo.
3. **Sin pull request ni merge.** El CI corre solo en `feature/**`: typecheck, lint, pruebas y las 22 migraciones desde cero, sin secretos y gratis en un repositorio público. Su resultado sirve de validación extra.
4. **Más adelante**, con autorización: PR de `feature/tipografia-espacios` → `main`.

---

## 3. Sentry (dos proyectos gratuitos)

1. sentry.io → crear cuenta con un correo del equipo → plan **Developer** (gratis) → organización `zipa-lo-tiene`.
2. **Projects → Create Project → React Native** dos veces: `zipa-clientes` y `zipa-negocios`.
3. **Separación de entornos sin pagar más:** un solo proyecto por app. El entorno va como etiqueta `environment`, tomada de `extra.entorno` (`pruebas` o `produccion`; `local` no envía nada).
   - En Sentry se filtra por entorno.
   - Las alertas se configuran **solo** para `produccion`.
4. **Protección de datos, en cada proyecto** (Settings → Security & Privacy):
   - **Data Scrubber: ON**;
   - **Use Default Scrubbers: ON**;
   - **Prevent Storing of IP Addresses: ON**;
   - **Additional Sensitive Fields:** `email, correo, whatsapp, telefono, contact_name, contactName, notes, observaciones, token, password, apikey, authorization`.
5. **Protección en la app** (código que se preparará después; quedará apagado si no hay DSN):
   - `sendDefaultPii: false`;
   - sin Session Replay;
   - `tracesSampleRate: 0` al inicio;
   - `beforeSend` y `beforeBreadcrumb` que quitan cuerpos de peticiones, parámetros de URL (`apikey`, tokens) y migas de consola;
   - el usuario solo con un id anónimo (sin correo ni nombre).
6. **Lo que necesito de ti:** el **DSN** de cada proyecto (Settings → Client Keys). No es secreto, pero se guardará como variable de EAS (`EXPO_PUBLIC_SENTRY_DSN`) en `preview` y `production`.
7. **Secreto** (no por chat): un **Auth Token** de la organización con `project:releases`, para los mapas de código. Se carga **tú mismo** en EAS como variable secreta `SENTRY_AUTH_TOKEN`.
8. **Límites del plan gratis:** ~5.000 errores al mes y 1 usuario. Si se supera, se descartan eventos; no hay cobro automático.
9. **Antes de activar:** revisar juntos el punto 5 y agregar a la política de privacidad (P3) el uso de un servicio de reporte de errores.

---

## 4. Android en este computador

### 4.1 Inventario (solo lectura)

| Elemento | Estado |
|---|---|
| Android Studio | ❌ No instalado |
| SDK de Android (`%LOCALAPPDATA%\Android\Sdk`) | ❌ No existe |
| `adb`, `emulator`, `sdkmanager`, `avdmanager` | ❌ No encontrados |
| Java (JDK) | ✅ Temurin 21 (sirve para las herramientas del SDK) |
| Equipo | ✅ Ryzen 7 7700X (8 núcleos), **31 GB de RAM**, virtualización activa en el firmware |
| Hipervisor | ✅ Presente (Docker/WSL usan Hyper-V) |
| Espacio libre en C: | ✅ 122 GB |
| «Plataforma del hipervisor de Windows» | ❓ No se pudo consultar sin administrador. **El emulador la necesita** cuando Hyper-V está activo |

**Conclusión:** **sí se puede usar un emulador.** El equipo es más que suficiente. Falta instalar las herramientas y, posiblemente, activar esa función de Windows.

### 4.2 Opciones (requieren autorización; no instalé nada)

| Opción | Qué se instala | Descarga aproximada |
|---|---|---|
| **A. Liviana (recomendada)** | Solo las herramientas de línea de comandos del SDK, `platform-tools` (`adb`), `emulator` y **una** imagen de sistema (Android 14, x86_64, con Google Play) | ~2,5–3,5 GB |
| B. Android Studio completo | El IDE y lo de la opción A | ~5–8 GB |

**Pasos de la opción A:**
1. **(Administrador, puede pedir reinicio)** Activar «Plataforma del hipervisor de Windows»: Características de Windows, o `Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform`.
2. Descargar «Command line tools only» de developer.android.com y descomprimir en `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest`.
3. Instalar los paquetes:

   ```
   sdkmanager "platform-tools" "emulator" "system-images;android-34;google_apis_playstore;x86_64"
   ```

4. Crear el emulador:

   ```
   avdmanager create avd -n zipa_android14 -k "system-images;android-34;google_apis_playstore;x86_64" -d pixel_7
   ```

5. Definir `ANDROID_HOME`. Arrancar con `emulator -avd zipa_android14`.

**Qué permite:**
- **Sin compilar nada:**
  - abrir las apps en **Expo Go de Android**, con `npx expo start --android` o el enlace `exp://`;
  - **Logcat** (`adb logcat`) para cualquier cierre;
  - letra grande;
  - imágenes con `resizeMethod`.
- **Con APK (requiere autorizar EAS):** avisos push reales en el emulador con Google Play. Los APK de `preview` exigirán el entorno de pruebas, o la excepción `ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS=1` autorizada.

---

## 5. Archivos preparados en este paquete

| Archivo | Para qué | Validación local |
|---|---|---|
| `packages/shared/entorno.js` (+ `.d.ts`) | Candado de entornos | 7 pruebas ✅; `expo config` ✅ |
| `apps/{clientes,negocios}/app.config.js` | Aplican el candado y exponen `extra.entorno` | Typecheck ✅ |
| `pruebas/entorno/sembrar-pruebas.js` | Datos ficticios | 2 corridas en local ✅; rechaza producción ✅ |
| `pruebas/entorno/verificar-entorno.js` | RLS, autenticación y funciones | 14/14 en local ✅ |

**Además:** typecheck y lint sin errores; **Jest 141/141**.

---

## 6. Autorizaciones que necesito (en orden sugerido)

1. **Respaldo local** en `Documentos` (§2.2, paso 1). Sin costo y sin internet.
2. **Subir las 2 ramas** a GitHub (§2.2, paso 2), sin tocar `main`.
3. **Crear el proyecto de pruebas** y R2 a R5 (§1.7). Sin costo en el plan gratis.
4. **Sentry:** que crees los proyectos y me pases los DSN (§3). Activarlo después de revisar la privacidad.
5. **Android:** opción A (§4.2), incluida la función de Windows (administrador y posible reinicio).
6. **APK de prueba** (EAS), cuando el entorno de pruebas exista.
