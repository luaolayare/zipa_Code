import type { Business, BusinessType, Category } from './types';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'comer', label: 'Comer' },
  { id: 'artesanias', label: 'Artesanías' },
  { id: 'cafe_dulces', label: 'Café y dulces' },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

export const businessTypeLabel = (t: BusinessType) =>
  t === 'emprendimiento' ? 'Emprendimiento local' : 'Clásico de la zona';

export const formatCop = (value: number | null) =>
  value == null ? 'Sin precio' : '$' + value.toLocaleString('es-CO');

/** Quita tildes y mayúsculas para que la búsqueda por nombre sea tolerante. */
export const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** "4,8" con coma decimal, o "Nuevo" si aún no tiene reseñas. */
export const formatRating = (rating: number | null) =>
  rating == null ? 'Nuevo' : rating.toFixed(1).replace('.', ',');

/** "200 m" o "1,2 km". */
export const formatDistance = (meters: number | null) =>
  meters == null ? null : meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`;

export const formatPriceLevel = (level: Business['priceLevel']) => (level ? '$'.repeat(level) : null);

/** Lo que vende el negocio en sus palabras, o la categoría si no lo escribió. */
export const businessSpecialty = (b: Business) => b.specialty ?? categoryLabel(b.category);

// Portadas de color mientras no haya fotos (docs/diseno/ESPECIFICACION.md).
const DEMO_COVERS: Record<string, [string, string]> = {
  b1: ['#C2381B', '#F2B134'], // Arepas Mamá Inés
  b2: ['#0F6E6E', '#C2381B'], // Tejidos Kaashi
  b3: ['#5A3A22', '#F2E6D0'], // Café Sierra Viva
  b4: ['#9A3412', '#F5F1E6'], // La Fogata de Doña Rosa
  b5: ['#7A4B00', '#EDE0C2'], // Galería Manos de Bolívar
  b6: ['#0F3D3E', '#D9772B'], // Mar y Coco
  b7: ['#B45309', '#F3E3C3'], // Dulces de Palenque
};

const CATEGORY_COVERS: Record<Category, [string, string]> = {
  comer: ['#C2381B', '#F2B134'],
  artesanias: ['#0F6E6E', '#C2381B'],
  cafe_dulces: ['#5A3A22', '#F2E6D0'],
};

/** Color de fondo y del círculo interior de la portada de un negocio. */
export const businessCover = (b: Business) => {
  const [cover, inner] = DEMO_COVERS[b.id] ?? CATEGORY_COVERS[b.category];
  return { cover, inner };
};

/**
 * Reseñas mínimas para aparecer en "Lo más destacado". Con 1 o 2 reseñas, llamar
 * a un negocio "el mejor" sería engañoso.
 */
export const MIN_REVIEWS_FOR_RANKING = 5;
