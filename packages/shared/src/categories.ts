import type { BusinessType, Category } from './types';

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
