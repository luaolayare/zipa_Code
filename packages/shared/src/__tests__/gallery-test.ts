import { describe, expect, it } from '@jest/globals';

import { slideIndex } from '../gallery';

// Regresión de la auditoría Beta 2 (C10): al abrir un producto, el contador marcaba «2 de 4»
// mostrando el primero, porque un desplazamiento llegaba antes de medir el ancho.
describe('posición de la galería', () => {
  it('sin ancho medido siempre es la primera', () => {
    expect(slideIndex(1, 0, 4)).toBe(0);
    expect(slideIndex(350, 0, 4)).toBe(0);
  });

  it('redondea a la foto más cercana', () => {
    expect(slideIndex(0, 350, 4)).toBe(0);
    expect(slideIndex(170, 350, 4)).toBe(0);
    expect(slideIndex(180, 350, 4)).toBe(1);
    expect(slideIndex(700, 350, 4)).toBe(2);
  });

  it('no se sale del rango', () => {
    expect(slideIndex(-50, 350, 4)).toBe(0);
    expect(slideIndex(5000, 350, 4)).toBe(3);
    expect(slideIndex(100, 350, 0)).toBe(0);
  });
});
