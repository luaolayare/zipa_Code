import { describe, expect, it } from '@jest/globals';

import {
  MIN_REVIEWS_FOR_RANKING,
  businessCover,
  businessSpecialty,
  businessTypeLabel,
  categoryLabel,
  formatCop,
  formatDistance,
  formatPriceLevel,
  formatRating,
  isRestaurant,
  legacyCategoryFor,
  normalize,
  subcategoriesOf,
  DEMO_CATEGORIES,
  MAIN_CATEGORIES,
  groupMenu,
} from '../categories';
import { CREDITS } from '../brand';
import { DEMO_BUSINESSES, DEMO_PRODUCTS } from '../demo';

const base = DEMO_BUSINESSES[0];

describe('textos de categorías y tipos', () => {
  it('traduce categorías y tipos', () => {
    expect(categoryLabel('cafe_dulces')).toBe('Café y dulces');
    expect(businessTypeLabel('emprendimiento')).toBe('Emprendimiento local');
    expect(businessTypeLabel('establecido')).toBe('Clásico de la zona');
  });
});

describe('normalize (búsqueda tolerante)', () => {
  it('quita tildes, mayúsculas y espacios de los extremos', () => {
    expect(normalize('  Café Sierra Viva ')).toBe('cafe sierra viva');
    expect(normalize('MAMÁ INÉS')).toBe('mama ines');
  });
});

describe('formatos', () => {
  it('calificación con coma decimal o "Nuevo"', () => {
    expect(formatRating(4.8)).toBe('4,8');
    expect(formatRating(5)).toBe('5,0');
    expect(formatRating(null)).toBe('Nuevo');
  });

  it('distancia en metros o kilómetros', () => {
    expect(formatDistance(200)).toBe('200 m');
    expect(formatDistance(1234)).toBe('1,2 km');
    expect(formatDistance(null)).toBeNull();
  });

  it('nivel de precio', () => {
    expect(formatPriceLevel(1)).toBe('$');
    expect(formatPriceLevel(3)).toBe('$$$');
    expect(formatPriceLevel(null)).toBeNull();
  });

  it('precio en pesos colombianos', () => {
    expect(formatCop(null)).toBe('Sin precio');
    expect(formatCop(7000)).toMatch(/^\$7.?000$/);
  });
});

describe('datos de presentación del negocio', () => {
  it('usa la especialidad o, si no hay, la categoría', () => {
    expect(businessSpecialty({ ...base, specialty: 'Comida callejera' })).toBe('Comida callejera');
    expect(businessSpecialty({ ...base, specialty: null, subcategoryName: null, category: 'artesanias' })).toBe('Artesanías');
  });

  it('portada: colores propios de los negocios de ejemplo y por categoría para los nuevos', () => {
    expect(businessCover(base)).toEqual({ cover: '#C2381B', inner: '#F2B134' });
    expect(businessCover({ ...base, id: 'nuevo', category: 'artesanias' })).toEqual({ cover: '#0F6E6E', inner: '#C2381B' });
  });

  it('el ranking exige un mínimo de reseñas', () => {
    expect(MIN_REVIEWS_FOR_RANKING).toBeGreaterThanOrEqual(5);
  });
});

describe('categorías de la Beta 2', () => {
  it('hay dos categorías principales con sus subcategorías iniciales', () => {
    expect(MAIN_CATEGORIES.map((m) => m.id)).toEqual(['emprendimientos', 'restaurantes']);
    expect(subcategoriesOf(DEMO_CATEGORIES, 'emprendimientos').map((c) => c.name)).toEqual([
      'Artesanías', 'Repostería', 'Heladerías', 'Productos locales', 'Regalos y detalles', 'Otros emprendimientos',
    ]);
    expect(subcategoriesOf(DEMO_CATEGORIES, 'restaurantes').map((c) => c.name)).toEqual([
      'Comida típica', 'Comida rápida', 'Parrillas', 'Pizzerías', 'Cafeterías', 'Otros restaurantes',
    ]);
  });

  it('oculta subcategorías desactivadas y respeta el orden del equipo', () => {
    const all = DEMO_CATEGORIES.map((c) => (c.id === 'parrillas' ? { ...c, active: false } : c.id === 'pizzerias' ? { ...c, sortOrder: 1 } : c));
    const names = subcategoriesOf(all, 'restaurantes').map((c) => c.id);
    expect(names).not.toContain('parrillas');
    expect(names[0]).toBe('pizzerias');
  });

  it('la categoría vieja sale igual que en la base (categoria_heredada)', () => {
    expect(legacyCategoryFor('pizzerias', 'restaurantes')).toBe('comer');
    expect(legacyCategoryFor('cafeterias', 'restaurantes')).toBe('cafe_dulces');
    expect(legacyCategoryFor('heladerias', 'emprendimientos')).toBe('cafe_dulces');
    expect(legacyCategoryFor('artesanias', 'emprendimientos')).toBe('artesanias');
    expect(legacyCategoryFor('nueva_del_equipo', 'emprendimientos')).toBe('artesanias');
    expect(legacyCategoryFor('nueva_del_equipo', 'restaurantes')).toBe('comer');
  });

  it('distingue restaurantes de emprendimientos', () => {
    expect(isRestaurant({ mainCategory: 'restaurantes', category: 'cafe_dulces' })).toBe(true);
    expect(isRestaurant({ mainCategory: 'emprendimientos', category: 'cafe_dulces' })).toBe(false);
    expect(isRestaurant({ mainCategory: null, category: 'comer' })).toBe(true);
  });

  it('la subcategoría reemplaza a la categoría vieja como especialidad por defecto', () => {
    expect(businessSpecialty({ ...base, specialty: null, subcategoryName: 'Pizzerías' })).toBe('Pizzerías');
  });

  it('los créditos de «Acerca de» están en un solo lugar', () => {
    expect(CREDITS.developedBy).toBe('SCALIX Cloud');
    expect(CREDITS.site).toMatch(/^https:\/\//);
  });
});

describe('menú digital', () => {
  const p = (name: string, section: string | null, available = true, sortOrder = 0) => ({ ...DEMO_PRODUCTS[0], id: name, name, section, available, sortOrder });

  it('agrupa por secciones en el orden del menú y deja al final lo que no tiene sección', () => {
    const groups = groupMenu([p('Limonada', 'Bebidas'), p('Ajiaco', 'Sopas'), p('Suelto', null), p('Empanadas', 'Entradas'), p('Especial', 'Desayunos')]);
    expect(groups.map((g) => g.section)).toEqual(['Entradas', 'Sopas', 'Bebidas', 'Desayunos', null]);
  });

  it('dentro de cada sección, los disponibles primero y luego por orden', () => {
    const [g] = groupMenu([p('B', 'Postres', true, 2), p('A', 'Postres', false, 0), p('C', 'Postres', true, 1)]);
    expect(g.items.map((x) => x.name)).toEqual(['C', 'B', 'A']);
  });

  it('trata igual una sección con espacios de más', () => {
    expect(groupMenu([p('A', 'Bebidas '), p('B', 'Bebidas')])).toHaveLength(1);
  });
});
