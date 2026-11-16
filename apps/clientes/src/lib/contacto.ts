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

// Aviso de "gracias" en el negocio después de publicar una reseña (lo lee la pantalla del negocio).
let thanksFor: string | null = null;
export const markReviewed = (businessId: string) => { thanksFor = businessId; };
export const takeReviewed = (businessId: string) => {
  const yes = thanksFor === businessId;
  if (yes) thanksFor = null;
  return yes;
};
