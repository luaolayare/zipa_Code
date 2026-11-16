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
  normalize,
} from '../categories';
import { DEMO_BUSINESSES } from '../demo';

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
    expect(businessSpecialty({ ...base, specialty: null, category: 'artesanias' })).toBe('Artesanías');
  });

  it('portada: colores propios de los negocios de ejemplo y por categoría para los nuevos', () => {
    expect(businessCover(base)).toEqual({ cover: '#C2381B', inner: '#F2B134' });
    expect(businessCover({ ...base, id: 'nuevo', category: 'artesanias' })).toEqual({ cover: '#0F6E6E', inner: '#C2381B' });
  });

  it('el ranking exige un mínimo de reseñas', () => {
    expect(MIN_REVIEWS_FOR_RANKING).toBeGreaterThanOrEqual(5);
  });
});
