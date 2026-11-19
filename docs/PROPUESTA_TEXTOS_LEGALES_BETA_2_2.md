# Propuesta de cambios legales para Beta 2.2

> **Estado: borrador para revisión humana o legal.** Ningún texto de las apps se modificó.
>
> Los textos vigentes siguen siendo la versión 1.0 de `packages/shared/src/legal/`. Si se aprueban estos cambios hay que subir `VERSION`, y con eso todos los usuarios deberán aceptar de nuevo al entrar.
>
> **No se deben publicar las reservas ni las notificaciones a usuarios reales sin resolver esta revisión.**

Beta 2.2 agrega tratamientos de datos que la política actual no menciona:

| Novedad | Datos | Quién los ve |
|---|---|---|
| Solicitudes de reserva | Nombre de contacto, WhatsApp, fecha y hora, número de personas, preferencia de mesa, observaciones, platos de preferencia | Solo quien la hizo y el restaurante elegido |
| Notificaciones push | Identificador del dispositivo para notificaciones (token de Expo), app y sistema operativo | Nadie en las apps; solo el servidor |
| Redes y entregas del negocio | Enlaces a redes sociales y sitio web, modalidades de entrega y condiciones | Públicos, como el resto de la ficha |

## 1. Política de privacidad: cambios propuestos

### 2. Datos que recogemos (agregar)

- *De los clientes:* «Si solicitas una reserva: el nombre de contacto, tu número de WhatsApp, la fecha y hora, el número de personas, la preferencia de mesa, las observaciones que escribas y, si los eliges, los platos que te gustaría pedir.»
- *De los negocios:* «Si lo llenas: los enlaces de tus redes sociales y sitio web, cómo entregas y tus condiciones de entrega.»
- *Datos técnicos:* «Si activas las notificaciones: un identificador de tu dispositivo para enviarte avisos (no permite ver tus contactos, fotos ni ubicación).»

### 3. Para qué usamos tus datos (agregar)

- «Enviar tu solicitud de reserva al restaurante que elegiste y permitir que te contacte por WhatsApp para coordinarla. El restaurante decide si la confirma; la app no cobra ni garantiza mesas.»
- «Enviarte notificaciones sobre tus reservas (nueva solicitud, confirmación, rechazo, cancelación o vencimiento), solo si las activas. Puedes desactivarlas en los ajustes del celular o cerrando sesión.»

### 6. Encargados del tratamiento (ajustar)

- Cambiar «Expo (EAS): compilación de la app y entrega de actualizaciones» por «Expo: compilación de la app, entrega de actualizaciones y **envío de notificaciones**».
- Agregar: «Google (Firebase Cloud Messaging) y Apple (Apple Push Notification service): entrega de las notificaciones a tu celular».
- Revisar también la línea `[NOMBRE DEL SERVICIO 3D]`, pendiente desde la Beta 2.1.

### 8. Información pública en la app (ajustar)

«Es pública para cualquier usuario: la información del negocio publicado (sin la cédula o NIT), **sus redes sociales, sitio web y modalidades de entrega**, sus fotos y productos, y las reseñas con el nombre de quien las escribe. **Las solicitudes de reserva no son públicas.**»

### 9. Seguridad y conservación (agregar; los plazos son la decisión clave)

**Propuesta técnica, para validar:**
- **Solicitudes de reserva:** se conservan [12 MESES] después de la fecha de la visita y luego se borran, o se anonimizan los datos de contacto. *Hoy no se borran automáticamente: falta decidir el plazo.*
- **Avisos enviados y su registro técnico:** 90 días. *Ya implementado: limpieza diaria.*
- **Identificadores de dispositivo:** se desactivan al cerrar sesión y se borran 90 días después. *Ya implementado.*
- **Al eliminar la cuenta:** se borran de inmediato sus solicitudes de reserva, dispositivos y avisos. *Ya implementado.*

## 2. Términos para clientes: cambios propuestos

Nueva sección «Solicitudes de reserva»:

> «Algunos restaurantes reciben solicitudes de reserva desde la app. Una solicitud no es una reserva confirmada: solo queda confirmada cuando el restaurante la acepta, y puede rechazarla o dejarla vencer. La app no cobra anticipos ni garantiza mesas, y los platos que elijas son solo una preferencia, no están pagados ni garantizados. Cualquier condición (anticipo, tiempo de espera, cancelación) la acuerdas directamente con el restaurante. Si no puedes asistir, cancela la solicitud o la reserva desde la app.»

En «Contenido prohibido», agregar: no hacer solicitudes falsas ni masivas. La app limita a 3 pendientes por restaurante y 10 al día.

## 3. Términos para negocios: cambios propuestos

**Nueva sección «Reservas» (solo restaurantes):**

> «Si activas las reservas, los clientes te enviarán solicitudes en los horarios que configures. Tú decides si confirmas cada una; los horarios no son una promesa de disponibilidad. Responde a tiempo: si no lo haces, la solicitud vence y se le avisa al cliente. Usa los datos de contacto del cliente solo para gestionar esa reserva; no los uses para publicidad ni los compartas. La app no procesa pagos ni anticipos.»

**En «Información y precios», agregar:** «Los enlaces a redes sociales y sitio web deben ser tuyos y no pueden llevar a contenido engañoso o peligroso. El equipo puede quitarlos.»

**Revisar en la misma pasada** (heredado de la Beta 2.1):
- la sección «4. Fotos, videos y modelos 3D que subes»;
- el permiso de cámara de la app de negocios en `apps/negocios/app.json`, que todavía dice «…con el que creamos la vista 3D». Promete un 3D que hoy no se ofrece en general.

## 4. Decisiones que debe tomar el responsable

1. **Plazo de conservación de las solicitudes de reserva.** La propuesta es 12 meses tras la visita.
2. **Aprobar los textos.** Al aprobarlos se sube `VERSION` y todos los usuarios aceptan de nuevo.
3. **Completar los marcadores pendientes:** `[CORREO DE SOPORTE]`, `[PAÍSES DE LOS SERVIDORES]`, `[PLAZO DE BORRADO]`, `[EDAD MÍNIMA]`, `[NOMBRE DEL RESPONSABLE]` y `[NOMBRE DEL SERVICIO 3D]`.
