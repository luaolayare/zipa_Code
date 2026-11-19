// «Contacto y entregas» del negocio: redes sociales y modalidades de entrega (solo informativas:
// la app no toma pedidos, no cobra ni calcula envíos). WhatsApp sigue siendo el canal principal.
// La base de datos repite estas reglas (migración 0018), así que no se pueden saltar desde la app.
import { findOffensiveWords } from './moderation';
import type { MainCategory } from './types';

export type SocialNetwork = 'instagram' | 'facebook' | 'tiktok' | 'website';

export const SOCIAL_NETWORKS: { id: SocialNetwork; label: string; placeholder: string }[] = [
  { id: 'instagram', label: 'Instagram', placeholder: 'Ej: @tunegocio' },
  { id: 'facebook', label: 'Facebook', placeholder: 'Ej: facebook.com/tunegocio' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'Ej: @tunegocio' },
  { id: 'website', label: 'Sitio web', placeholder: 'Ej: tunegocio.com' },
];

export type DeliveryMode = 'presencial' | 'recogida' | 'a_convenir' | 'domicilio_local' | 'envios_nacionales' | 'envios_internacionales';

export const DELIVERY_MODES: { id: DeliveryMode; label: string }[] = [
  { id: 'presencial', label: 'Atención presencial' },
  { id: 'recogida', label: 'Recogida en el establecimiento' },
  { id: 'a_convenir', label: 'Entrega a convenir' },
  { id: 'domicilio_local', label: 'Domicilio local' },
  { id: 'envios_nacionales', label: 'Envíos nacionales' },
  { id: 'envios_internacionales', label: 'Envíos internacionales' },
];

export const DELIVERY_NOTE_MAX = 160;

export interface BusinessLinks {
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  website: string | null;
  deliveryModes: DeliveryMode[];
  deliveryNote: string | null;
}

export const emptyLinks: BusinessLinks = { instagram: null, facebook: null, tiktok: null, website: null, deliveryModes: [], deliveryNote: null };

export type LinkResult = { ok: true; url: string | null } | { ok: false; error: string };

// Acortadores: esconden el destino real del enlace, así que no se aceptan como sitio web.
const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'cutt.ly', 'is.gd', 'ow.ly', 'rebrand.ly', 'shorturl.at', 'tiny.cc', 'rb.gy'];

/** Separa "https://www.Algo.com/ruta?x" en dominio (en minúsculas, sin "www.") y el resto. */
function split(raw: string): { host: string; rest: string } | null {
  const s = raw.trim().replace(/^https?:\/\//i, '');
  if (!s || /\s/.test(s)) return null;
  const cut = s.search(/[/?#]/);
  const host = (cut < 0 ? s : s.slice(0, cut)).toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  return { host, rest: cut < 0 ? '' : s.slice(cut) };
}

const handleOf = (raw: string, domains: string[], prefix = ''): string | null => {
  const s = raw.trim();
  // Solo el usuario ("@tunegocio", "tu.negocio"): no es enlace si no tiene "/" ni el dominio de la red.
  const looksLikeLink = s.includes('/') || domains.some((d) => s.toLowerCase().includes(d));
  if (!looksLikeLink) return s.replace(/^@/, '');
  const parts = split(s);
  if (!parts || !domains.includes(parts.host)) return null;
  const first = parts.rest.replace(/^\//, '').split(/[/?#]/)[0] ?? '';
  return prefix ? (first.startsWith(prefix) ? first.slice(prefix.length) : null) : first;
};

/**
 * Valida y deja en una forma única (https) el enlace de una red social o del sitio web.
 * Vacío = sin enlace (válido). Acepta "@usuario", "usuario" o el enlace completo.
 */
export function normalizeSocialLink(network: SocialNetwork, raw: string): LinkResult {
  const s = (raw ?? '').trim();
  if (!s) return { ok: true, url: null };
  if (s.length > 200) return { ok: false, error: 'El enlace es demasiado largo.' };

  if (network === 'instagram') {
    const h = handleOf(s, ['instagram.com']);
    if (!h || !/^[A-Za-z0-9._]{1,30}$/.test(h)) return { ok: false, error: 'Escribe tu usuario de Instagram, por ejemplo @tunegocio.' };
    return { ok: true, url: `https://www.instagram.com/${h}` };
  }
  if (network === 'tiktok') {
    const h = handleOf(s, ['tiktok.com'], '@');
    if (!h || !/^[A-Za-z0-9._]{2,24}$/.test(h)) return { ok: false, error: 'Escribe tu usuario de TikTok, por ejemplo @tunegocio.' };
    return { ok: true, url: `https://www.tiktok.com/@${h}` };
  }
  if (network === 'facebook') {
    const isLink = s.includes('/') || /(facebook|fb)\.com/i.test(s);
    const parts = isLink ? split(s) : { host: 'facebook.com', rest: `/${s.replace(/^@/, '')}` };
    if (!parts || !['facebook.com', 'fb.com'].includes(parts.host)) return { ok: false, error: 'Pega el enlace de tu página de Facebook, por ejemplo facebook.com/tunegocio.' };
    const id = parts.rest.match(/^\/profile\.php\?id=(\d{5,20})/);
    if (id) return { ok: true, url: `https://www.facebook.com/profile.php?id=${id[1]}` };
    const page = parts.rest.replace(/^\//, '').split(/[/?#]/)[0] ?? '';
    if (!/^[A-Za-z0-9.-]{2,100}$/.test(page)) return { ok: false, error: 'Pega el enlace de tu página de Facebook, por ejemplo facebook.com/tunegocio.' };
    return { ok: true, url: `https://www.facebook.com/${page}` };
  }

  // Sitio web.
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return { ok: false, error: 'Escribe la dirección de tu sitio web, por ejemplo tunegocio.com.' };
  const parts = split(s);
  const invalid = { ok: false as const, error: 'Escribe la dirección de tu sitio web, por ejemplo tunegocio.com.' };
  if (!parts) return invalid;
  // Dominio con extensión de letras (no IP, no "localhost", sin usuario ni puerto).
  if (!/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})*\.[a-z]{2,24}$/.test(parts.host)) return invalid;
  if (SHORTENERS.includes(parts.host)) return { ok: false, error: 'Usa la dirección completa de tu sitio, no un enlace acortado.' };
  if (/[<>"'`\\\s]/.test(parts.rest)) return invalid;
  const rest = parts.rest === '/' ? '' : parts.rest;
  return { ok: true, url: `https://${parts.host}${rest}` };
}

/** Lo que se muestra en el botón: "@tunegocio", "tunegocio.com"… */
export function socialLabel(network: SocialNetwork, url: string): string {
  if (network === 'instagram') return '@' + url.replace('https://www.instagram.com/', '');
  if (network === 'tiktok') return url.replace('https://www.tiktok.com/', '');
  if (network === 'facebook') return url.replace('https://www.', '');
  return url.replace(/^https:\/\//, '').replace(/\/$/, '');
}

/** Redes configuradas, en orden fijo, para mostrar solo esas. */
export const configuredSocial = (links: BusinessLinks | null) =>
  links ? SOCIAL_NETWORKS.filter((n) => !!links[n.id]).map((n) => ({ ...n, url: links[n.id] as string })) : [];

/** "Domicilio local · Envíos nacionales" (en el orden de la lista, sin repetidos). */
export const deliverySummary = (modes: DeliveryMode[]) =>
  DELIVERY_MODES.filter((m) => modes.includes(m.id)).map((m) => m.label).join(' · ');

/** Valida todo el formulario de «Contacto y entregas». Devuelve los datos listos o el primer error. */
export function validateLinks(input: Record<SocialNetwork, string> & { deliveryModes: DeliveryMode[]; deliveryNote: string }):
  { ok: true; links: BusinessLinks } | { ok: false; field: SocialNetwork | 'deliveryNote'; error: string } {
  const links: BusinessLinks = { ...emptyLinks, deliveryModes: DELIVERY_MODES.map((m) => m.id).filter((id) => input.deliveryModes.includes(id)) };
  for (const n of SOCIAL_NETWORKS) {
    const r = normalizeSocialLink(n.id, input[n.id]);
    if (!r.ok) return { ok: false, field: n.id, error: r.error };
    links[n.id] = r.url;
  }
  const note = input.deliveryNote.trim().replace(/\s+/g, ' ');
  if (note.length > DELIVERY_NOTE_MAX) return { ok: false, field: 'deliveryNote', error: `Las condiciones pueden tener hasta ${DELIVERY_NOTE_MAX} caracteres.` };
  if (note && findOffensiveWords(note).length) return { ok: false, field: 'deliveryNote', error: 'Revisa el texto de las condiciones: tiene palabras que no se permiten.' };
  links.deliveryNote = note || null;
  return { ok: true, links };
}

/** Ayuda para elegir la categoría: se clasifica por lo que se vende principalmente. */
export const CLASSIFICATION_EXAMPLES: { sells: string; main: MainCategory; subcategoryId: string; subcategory: string }[] = [
  { sells: 'Café empacado', main: 'emprendimientos', subcategoryId: 'productos_locales', subcategory: 'Productos locales' },
  { sells: 'Café preparado para tomar ahí', main: 'restaurantes', subcategoryId: 'cafeterias', subcategory: 'Cafeterías' },
  { sells: 'Artesanías', main: 'emprendimientos', subcategoryId: 'artesanias', subcategory: 'Artesanías' },
  { sells: 'Tortas y postres por encargo', main: 'emprendimientos', subcategoryId: 'reposteria', subcategory: 'Repostería' },
  { sells: 'Almuerzos y platos del día', main: 'restaurantes', subcategoryId: 'comida_tipica', subcategory: 'Comida típica' },
];
