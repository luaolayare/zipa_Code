import { BRAND } from '@zipa/shared';

/** Enlace de WhatsApp para un número colombiano escrito como sea ("300 123 4567", "+57 300…"). */
export function whatsappUrl(raw: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('3')) digits = '57' + digits; // celular sin indicativo
  if (digits.length < 11) return null;
  return `https://wa.me/${digits}`;
}

/** Búsqueda de la dirección en Google Maps (abre la app de mapas si está instalada). */
export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${BRAND.city}, Colombia`)}`;

// Aviso después de publicar una reseña (lo lee la pantalla del negocio): publicada o en revisión.
let reviewed: { businessId: string; status: string } | null = null;
export const markReviewed = (businessId: string, status: string) => { reviewed = { businessId, status }; };
export const takeReviewed = (businessId: string): string | null => {
  if (reviewed?.businessId !== businessId) return null;
  const s = reviewed.status;
  reviewed = null;
  return s;
};

// Visita desde el QR del mostrador cuando la persona aún no ha iniciado sesión: se registra
// apenas entre (ver la pantalla del negocio).
let pendingVisit: { businessId: string; token: string } | null = null;
export const setPendingVisit = (businessId: string, token: string) => { pendingVisit = { businessId, token }; };
export const takePendingVisit = () => {
  const v = pendingVisit;
  pendingVisit = null;
  return v;
};
