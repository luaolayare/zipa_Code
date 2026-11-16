import type { Business, BusinessType, Category, CategoryNode, MainCategory } from './types';

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

/** Lo que vende el negocio en sus palabras, o su subcategoría si no lo escribió. */
export const businessSpecialty = (b: Business) => b.specialty ?? b.subcategoryName ?? categoryLabel(b.category);

// --- Categorías de la Beta 2 (migración 0013) ---------------------------------------------------

/** Las dos categorías principales, con su texto para la pantalla de inicio. */
export const MAIN_CATEGORIES: { id: MainCategory; name: string; description: string }[] = [
  { id: 'emprendimientos', name: 'Emprendimientos', description: 'Artesanías, repostería, helados y regalos hechos aquí' },
  { id: 'restaurantes', name: 'Restaurantes', description: 'Comida típica, parrillas, pizzerías y cafeterías' },
];

/**
 * Subcategorías iniciales. La lista real vive en Supabase (el equipo la administra); esta copia
 * solo se usa en desarrollo sin Supabase y en las pruebas.
 */
export const DEMO_CATEGORIES: CategoryNode[] = [
  { id: 'emprendimientos', parentId: null, name: 'Emprendimientos', sortOrder: 1, active: true },
  { id: 'restaurantes', parentId: null, name: 'Restaurantes', sortOrder: 2, active: true },
  { id: 'artesanias', parentId: 'emprendimientos', name: 'Artesanías', sortOrder: 10, active: true },
  { id: 'reposteria', parentId: 'emprendimientos', name: 'Repostería', sortOrder: 20, active: true },
  { id: 'heladerias', parentId: 'emprendimientos', name: 'Heladerías', sortOrder: 30, active: true },
  { id: 'productos_locales', parentId: 'emprendimientos', name: 'Productos locales', sortOrder: 40, active: true },
  { id: 'regalos_detalles', parentId: 'emprendimientos', name: 'Regalos y detalles', sortOrder: 50, active: true },
  { id: 'otros_emprendimientos', parentId: 'emprendimientos', name: 'Otros emprendimientos', sortOrder: 90, active: true },
  { id: 'comida_tipica', parentId: 'restaurantes', name: 'Comida típica', sortOrder: 10, active: true },
  { id: 'comida_rapida', parentId: 'restaurantes', name: 'Comida rápida', sortOrder: 20, active: true },
  { id: 'parrillas', parentId: 'restaurantes', name: 'Parrillas', sortOrder: 30, active: true },
  { id: 'pizzerias', parentId: 'restaurantes', name: 'Pizzerías', sortOrder: 40, active: true },
  { id: 'cafeterias', parentId: 'restaurantes', name: 'Cafeterías', sortOrder: 50, active: true },
  { id: 'otros_restaurantes', parentId: 'restaurantes', name: 'Otros restaurantes', sortOrder: 90, active: true },
];

/** Subcategorías activas de una categoría principal, en el orden que definió el equipo. */
export const subcategoriesOf = (all: CategoryNode[], main: MainCategory) =>
  all.filter((c) => c.parentId === main && c.active).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'));

/** Misma regla que public.categoria_heredada() (migración 0013). */
export const legacyCategoryFor = (subcategoryId: string, main: MainCategory | null): Category =>
  ['cafeterias', 'reposteria', 'heladerias'].includes(subcategoryId) ? 'cafe_dulces' : main === 'restaurantes' ? 'comer' : 'artesanias';

/** "Restaurantes" o "Emprendimientos". */
export const mainCategoryName = (main: MainCategory | null) => MAIN_CATEGORIES.find((m) => m.id === main)?.name ?? null;

/** Para los textos de la app de negocios: un restaurante tiene platos; un emprendimiento, productos. */
export const isRestaurant = (b: Pick<Business, 'mainCategory' | 'category'>) =>
  b.mainCategory ? b.mainCategory === 'restaurantes' : b.category === 'comer';

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
