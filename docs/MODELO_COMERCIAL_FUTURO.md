# Modelo comercial futuro

> **Documento de planeación. No hay cobros implementados en la app.**
>
> No existen suscripciones, pagos por reserva, pasarelas ni cobros recurrentes, y Beta 2.2 no los agrega. Hoy el único plan pago, «Destacados», se cobra por fuera de la app y el equipo lo activa a mano desde el panel (migración 0017).

## Principios

- **Lo esencial es gratis:** descubrir negocios y contactarlos directamente nunca se cobra, ni a clientes ni a negocios.
- **Sin comisiones por venta o reserva:** la app no intermedia pagos. El negocio y el cliente acuerdan todo por WhatsApp.
- **Un cobro debe reflejar un beneficio medible para el negocio,** con datos que ya muestra el panel (visitas, clics en WhatsApp, solicitudes).
- **Antes de cobrar algo nuevo:** validar uso real, costos (infraestructura y soporte) y aceptación de los negocios piloto.

## Planes

### Gratis (hoy, para todos los negocios)

- **Descubrimiento:** aparece en las búsquedas, en su categoría y en la ficha.
- **Catálogo o menú:** productos y platos, fotos (hasta 4 por producto) y video aprobado.
- **Reseñas:** recibirlas y responderlas.
- **Contacto:** WhatsApp y «Cómo llegar».
- **Redes sociales y modalidades de entrega** (Beta 2.2).
- **Reservas con confirmación manual** (Beta 2.2): gratis durante la Beta 2.2 para los restaurantes piloto (ver «Reservas premium futuras»).

### Destacados (existe hoy; cobro por fuera de la app)

- **Qué es:** visibilidad promocional por un periodo (fecha de inicio y fin) en la sección «Destacados» del inicio.
- **Cómo se activa:** el equipo lo hace desde el panel. La nota interna registra el plan o el pago, que se maneja fuera de la app.
- **Posibles mejoras futuras:**
  - destacados por categoría;
  - destacado en la búsqueda, marcado claramente como promocionado;
  - informe de resultados del periodo (vistas y clics antes, durante y después).

### Pro (futuro, por validar)

- **Analítica avanzada para el negocio:** visitas a su ficha, clics en WhatsApp y «Cómo llegar», productos más vistos, búsquedas en las que aparece, comparación por periodo.
- **Herramientas comerciales:**
  - más fotos por producto;
  - promociones con fecha;
  - QR personalizados por mesa o campaña;
  - varios usuarios del mismo negocio (personal autorizado para reservas).
- **Condición:** que existan suficientes datos de uso para que la analítica sea útil (hoy la analítica es solo para el equipo).

### Reservas premium (futuro, solo si se valida)

**Antes de considerar cualquier cobro hay que validar:**
1. **Uso:** cuántos restaurantes las activan y cuántas solicitudes reciben y confirman por mes (panel → Reservas).
2. **Calidad del servicio:** tiempo de respuesta, porcentaje de vencidas y motivos de rechazo.
3. **Costos:** notificaciones (Expo y Firebase son gratis hasta ciertos volúmenes), base de datos y soporte.
4. **Aceptación:** encuesta y entrevistas con los restaurantes piloto.

**Ideas posibles, sin compromiso:**
- recordatorios automáticos al cliente;
- varios usuarios por restaurante;
- reportes de ocupación;
- integración con el calendario del restaurante.

**Se descarta, por ahora y por principio:**
- cobrar por cada reserva;
- cobrar anticipos dentro de la app;
- asignación automática de mesas.

## Lo que NO se implementa

Coincide con las restricciones de Beta 2.2: carrito de compras, pagos dentro de la app, cobros por reservas, domicilios automáticos, repartidores, integración con transportadoras, chat interno y suscripciones pagadas.

## Próximos pasos sugeridos

1. Pilotear las reservas gratis con un grupo pequeño de restaurantes de Zipaquirá durante al menos 2 meses.
2. Medir con el panel «Reservas» y «Analítica».
3. Revisar este documento con los resultados antes de definir precios.
