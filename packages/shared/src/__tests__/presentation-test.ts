import { describe, expect, it } from '@jest/globals';

import { legacyCategoryFor } from '../categories';
import { availabilityLabels, catalogTitle, mainOf, productWord, visualOf, type Classified } from '../presentation';
import type { MainCategory } from '../types';

// Negocio con la clasificación real (la categoría vieja la calcula la base, igual que aquí).
const negocio = (main: MainCategory, sub: string): Classified => ({ mainCategory: main, subcategoryId: sub, category: legacyCategoryFor(sub, main) });

const restaurante = negocio('restaurantes', 'comida_tipica');
const cafeteria = negocio('restaurantes', 'cafeterias');
const heladeria = negocio('emprendimientos', 'heladerias');
const reposteria = negocio('emprendimientos', 'reposteria');
const artesanias = negocio('emprendimientos', 'artesanias');

// Regresión de la auditoría del 18-nov (UX2): la app de negocios decidía con category === 'comer',
// así una cafetería (categoría vieja "cafe_dulces") salía como «producto» sin secciones de menú.
describe('plato o producto según la categoría principal', () => {
  it('restaurante: plato y Menú', () => {
    expect(productWord(restaurante)).toBe('plato');
    expect(catalogTitle(restaurante)).toBe('Menú');
  });

  it('cafetería: es restaurante aunque su categoría vieja sea "cafe_dulces"', () => {
    expect(cafeteria.category).toBe('cafe_dulces');
    expect(productWord(cafeteria)).toBe('plato');
    expect(catalogTitle(cafeteria)).toBe('Menú');
    expect(availabilityLabels(cafeteria).on).toBe('Disponible hoy');
  });

  it('heladería y emprendimientos: producto y Catálogo', () => {
    for (const b of [heladeria, reposteria, artesanias]) {
      expect(productWord(b)).toBe('producto');
      expect(catalogTitle(b)).toBe('Catálogo');
      expect(availabilityLabels(b)).toMatchObject({ on: 'Disponible', off: 'Agotado' });
    }
  });

  it('datos anteriores sin categoría principal usan la vieja como respaldo', () => {
    expect(mainOf({ category: 'comer' })).toBe('restaurantes');
    expect(mainOf({ category: 'cafe_dulces' })).toBe('emprendimientos');
    expect(productWord({ mainCategory: null, category: 'comer' })).toBe('plato');
  });
});

// Regresión UX4: una heladería mostraba la ilustración de una taza de café.
describe('ilustración y colores coherentes con la subcategoría', () => {
  it('cada subcategoría con su dibujo', () => {
    expect(visualOf(heladeria).art).toBe('helado');
    expect(visualOf(reposteria).art).toBe('postre');
    expect(visualOf(cafeteria).art).toBe('taza');
    expect(visualOf(restaurante).art).toBe('plato');
    expect(visualOf(artesanias).art).toBe('artesania');
    expect(visualOf(negocio('emprendimientos', 'regalos_detalles')).art).toBe('artesania');
    expect(visualOf(negocio('restaurantes', 'pizzerias')).art).toBe('plato');
  });

  it('una heladería ya no se dibuja como taza', () => {
    expect(visualOf(heladeria).art).not.toBe('taza');
  });

  it('dos paletas: una por categoría principal', () => {
    expect(visualOf(heladeria).cover).toBe(visualOf(artesanias).cover);
    expect(visualOf(cafeteria).cover).toBe(visualOf(restaurante).cover);
    expect(visualOf(heladeria).cover).not.toBe(visualOf(restaurante).cover);
    const covers = new Set([restaurante, cafeteria, heladeria, reposteria, artesanias].map((b) => visualOf(b).cover));
    expect(covers.size).toBe(2);
  });

  it('una subcategoría nueva creada por el equipo usa el dibujo de su categoría principal', () => {
    expect(visualOf(negocio('emprendimientos', 'velas_aromaticas')).art).toBe('artesania');
    expect(visualOf(negocio('restaurantes', 'comida_de_mar')).art).toBe('plato');
  });
});
