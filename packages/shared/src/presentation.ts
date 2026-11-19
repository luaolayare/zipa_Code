// Cómo se presenta un negocio según su clasificación de la Beta 2 (categoría principal y
// subcategoría), no según la categoría vieja (comer / artesanías / café y dulces).
// Todas las pantallas de clientes y negocios usan estas funciones, para que digan lo mismo.
import type { Category, MainCategory } from './types';

/** Lo mínimo para clasificar: negocio guardado, borrador del registro o fila de la vista pública. */
export interface Classified {
  mainCategory?: MainCategory | null;
  subcategoryId?: string | null;
  category: Category;
}

/** Categoría principal, con la categoría vieja como respaldo para datos anteriores a la 0013. */
export const mainOf = (b: Classified): MainCategory =>
  b.mainCategory ?? (b.category === 'comer' ? 'restaurantes' : 'emprendimientos');

/** Restaurantes: «Menú», «plato», secciones de menú y «Disponible hoy». */
export const restaurantOf = (b: Classified) => mainOf(b) === 'restaurantes';

/** «plato» (restaurantes) o «producto» (emprendimientos). */
export const productWord = (b: Classified) => (restaurantOf(b) ? 'plato' : 'producto');

/** «Menú» (restaurantes) o «Catálogo» (emprendimientos). */
export const catalogTitle = (b: Classified) => (restaurantOf(b) ? 'Menú' : 'Catálogo');

/** Texto del interruptor de disponibilidad y de la etiqueta cuando no lo está. */
export const availabilityLabels = (b: Classified) =>
  restaurantOf(b)
    ? { on: 'Disponible hoy', off: 'No disponible hoy', offHint: 'Sigue en tu menú, marcado como «No disponible hoy».' }
    : { on: 'Disponible', off: 'Agotado', offHint: 'Sigue en tu catálogo, marcado como «Agotado».' };

// --- Identidad visual por categoría ------------------------------------------------------------

/** Ilustración de respaldo cuando un producto no tiene foto. */
export type ArtKind = 'plato' | 'taza' | 'helado' | 'postre' | 'artesania';

/** Subcategorías con ilustración propia; las demás usan la de su categoría principal. */
const SUBCATEGORY_ART: Record<string, ArtKind> = {
  cafeterias: 'taza',
  heladerias: 'helado',
  reposteria: 'postre',
};

/**
 * Dos paletas, una por categoría principal, dentro del sistema de la marca: verde petróleo y
 * mostaza para Emprendimientos; terracota y mostaza para Restaurantes. cover: fondo de la
 * portada; inner: círculo central; art: tonos de la ilustración [principal, claro, acento].
 */
export const MAIN_PALETTES: Record<MainCategory, { cover: string; inner: string; art: [string, string, string] }> = {
  restaurantes: { cover: '#C2381B', inner: '#F2B134', art: ['#D9772B', '#F2B134', '#C2381B'] },
  emprendimientos: { cover: '#0F6E6E', inner: '#F2B134', art: ['#0F6E6E', '#F2B134', '#C2381B'] },
};

export interface Visual {
  main: MainCategory;
  art: ArtKind;
  cover: string;
  inner: string;
}

/** Ilustración y colores de un negocio (o de sus productos). */
export function visualOf(b: Classified): Visual {
  const main = mainOf(b);
  const art = (b.subcategoryId && SUBCATEGORY_ART[b.subcategoryId]) || (main === 'restaurantes' ? 'plato' : 'artesania');
  const { cover, inner } = MAIN_PALETTES[main];
  return { main, art, cover, inner };
}
