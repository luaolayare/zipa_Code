import { describe, expect, test } from '@jest/globals';

import { PHOTO_PRESETS, resizeFor } from '../photos';

// Bloque 1, punto 3: los logos nuevos se reducen y comprimen ANTES de subirse (LogoPicker → pickPhoto('logo')).
describe('logos livianos', () => {
  test('el logo se guarda a 512 px como máximo y con compresión de 0,8 o menos', () => {
    expect(PHOTO_PRESETS.logo.maxSide).toBeLessThanOrEqual(512);
    expect(PHOTO_PRESETS.logo.compress).toBeLessThanOrEqual(0.8);
  });

  test('un logo de 4000×3000 (como los de 3,6 MB que hay hoy) queda en 512 de ancho', () => {
    expect(resizeFor(4000, 3000, PHOTO_PRESETS.logo.maxSide)).toEqual({ width: 512 });
    expect(resizeFor(3000, 4000, PHOTO_PRESETS.logo.maxSide)).toEqual({ height: 512 });
  });

  test('un logo que ya es pequeño no se agranda', () => {
    expect(resizeFor(400, 400, PHOTO_PRESETS.logo.maxSide)).toBeNull();
  });
});
