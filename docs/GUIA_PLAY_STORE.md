# Guía para publicar en Google Play

**Fecha:** 20-nov-2026.
**Aplica a:** las dos apps, «Zipa lo tiene» (clientes) y «Zipa lo tiene Negocios».

> **Precios:** son de referencia y pueden cambiar. Confírmalos en la página oficial de cada servicio antes de pagar.

---

## 1. Qué hay que comprar o pagar

| Qué | ¿Obligatorio? | Costo aproximado | Para qué |
|---|---|---|---|
| **Cuenta de desarrollador de Google Play** | **Sí** | **US$25, un solo pago** | Publicar en Play Store. Una sola cuenta sirve para las dos apps |
| **Supabase Pro** (base de datos, inicio de sesión, archivos y funciones) | **Sí, para clientes reales** | **US$25 al mes** | El plan gratuito **pausa el proyecto** tras unos días sin uso, no garantiza copias de seguridad y solo da unos 5 GB de descarga al mes. Los videos lo agotan rápido: un video de ~6 MB visto 1.000 veces son 6 GB. Pro incluye unos 250 GB de descarga y 100 GB de archivos |
| **Dominio** (por ejemplo `zipalotiene.com` o `.co`) | **Muy recomendado** | `.com`: US$10–15 al año · `.co`: US$30–40 al año | 1) Correo profesional para enviar «recupera tu contraseña» y «verifica tu correo». 2) Publicar la política de privacidad y la página para borrar la cuenta, que Google exige como enlaces web. 3) Da confianza |
| **Servicio de correo (SMTP)**: Resend, Brevo o similar | **Sí** (para verificar correos y recuperar contraseñas) | Gratis hasta unos 3.000 correos al mes | El correo que trae Supabase envía muy pocos mensajes por hora y no sirve en producción |
| **Hosting de las páginas legales** | Sí (gratis) | US$0 con GitHub Pages, Vercel o Netlify | Publicar la política de privacidad, los términos y la página para borrar la cuenta |
| **Expo / EAS** | No (el plan gratis alcanza) | US$0 (30 builds al mes) · plan pago desde US$19 al mes | Compilar las apps y subirlas a Play. Ya lo usamos |
| **Firebase (avisos en Android)** | Ya está | US$0 | Notificaciones |
| **Cuenta de Apple Developer** | Solo si van a publicar en iPhone | US$99 al año | App Store y avisos en iPhone (P15) |
| **Correo con el dominio** (Google Workspace o Zoho) | Opcional | US$0–7 por persona al mes | `contacto@tudominio` para soporte |

**No hace falta comprar:**
- **Base de datos aparte:** Supabase ya la incluye.
- **Servidor propio:** la arquitectura no lo usa.
- **App de pago para compilar:** EAS compila en la nube.

**Presupuesto mínimo realista:**
- Al empezar: **US$25 una vez** (Google Play) más un dominio de **~US$15 al año**.
- Cada mes: **~US$25** (Supabase Pro).

---

## 2. Requisitos de Google Play que nos afectan

1. **Tipo de cuenta:**
   - **Personal:** Google exige una **prueba cerrada con al menos 12 personas durante 14 días seguidos** antes de dejar publicar.
   - **Organización:** es para una empresa con NIT y necesita un **número D-U-N-S**, que se pide gratis. Se salta esa prueba cerrada.
   - Hay que decidir el tipo de cuenta **antes** de crearla.
2. **Verificación de identidad** del dueño de la cuenta: documento y, en cuentas personales, un celular Android verificado.
3. **El paquete de cada app es permanente.** Hoy son `co.zipa.vitrinalocal` y `co.zipa.vitrinanegocios`. Una vez publicado, **no se puede cambiar nunca**.
   - Los usuarios no lo ven; solo aparece en el enlace de Play.
   - Si se quieren nombres sin «vitrina», hay que decidirlo **antes** de la primera publicación. Requiere tu autorización, porque cambia los identificadores.
4. **Formato AAB**, no APK. El perfil `production` de EAS ya genera AAB.
5. **Nivel de API reciente.** Expo SDK 58 ya apunta a la versión que pide Google.
6. **Política de privacidad en una URL pública.** Depende de P3: los textos legales deben cubrir reservas, avisos y conservación de datos.
7. **Borrar la cuenta:**
   - dentro de la app ya existe;
   - además Google pide **una página web** donde se pueda solicitar sin tener la app.
8. **Formulario de Seguridad de los datos**: qué datos se recogen y para qué, como el correo, el nombre, el WhatsApp de las reservas, el token de avisos y las fotos y videos de negocios.
9. **Clasificación de contenido** (cuestionario) y **público objetivo**: mayores de edad.
10. **Acceso para la revisión:** la app de negocios pide iniciar sesión, así que hay que darle a Google **un usuario y contraseña de prueba** en un **negocio de prueba visible solo para ellos**.
11. **Ficha de la tienda:**
    - ícono de 512×512;
    - imagen destacada de 1024×500;
    - de 2 a 8 capturas de celular;
    - descripción corta (80 caracteres) y larga;
    - correo de contacto.

---

## 3. Lo que falta en la app antes de publicar

Sale de la auditoría `AUDITORIA_GENERAL_BETA_2_2.md`.

| Pendiente | Por qué bloquea |
|---|---|
| **P3: textos legales** actualizados y revisados por una persona | La política es obligatoria y debe ser veraz (Ley 1581 de 2012, habeas data) |
| **P5: verificar el correo y recuperar la contraseña** | Necesita el dominio y el SMTP. Sin esto hay cuentas falsas y cuentas perdidas |
| **P6: ambiente de pruebas separado de producción** | Para que las pruebas no ensucien los datos reales |
| **P2: avisos probados en un celular real** | No se debe publicar una función sin probarla |
| **P11: texto del permiso de cámara** | Todavía menciona el 3D |
| Íconos e imágenes definitivas | Los actuales son provisionales |
| Página web para borrar la cuenta | Requisito de Google |

---

## 4. Pasos en orden

1. **Comprar el dominio.**
2. **Configurar el correo:** SMTP en Supabase y luego verificación y recuperación (P5).
3. **Publicar las páginas legales** y la de borrar la cuenta en el dominio (P3).
4. **Pasar Supabase a Pro** y crear el proyecto de pruebas (P6).
5. **Crear la cuenta de Google Play**, personal u organización, y verificar la identidad.
6. **Decidir los paquetes definitivos** (punto 2.3) e íconos finales.
7. **Compilar el AAB:** `eas build -p android --profile production` por app.
8. **Subir a prueba interna y luego a prueba cerrada.** En una cuenta personal, 12 personas durante 14 días.
9. **Llenar el formulario de datos, la clasificación y la ficha,** y enviar a revisión. Google suele tardar de 1 a 7 días.
10. **Publicar por etapas,** por ejemplo al 20 % de los usuarios, y vigilar los errores antes de llegar al 100 %.

**Cada paso con costo o que cambie producción requiere tu autorización.**
