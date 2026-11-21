import { describe, expect, test } from '@jest/globals';

import { remotePushAvailable } from '../push';

describe('remotePushAvailable (Bloque 1, punto 2)', () => {
  test('APK o compilación nativa en un celular real: sí', () => {
    expect(remotePushAvailable({ os: 'android', isDevice: true, expoGo: false })).toBe(true);
    expect(remotePushAvailable({ os: 'ios', isDevice: true, expoGo: false })).toBe(true);
  });

  test('dentro de Expo Go: no (ni en Android ni en iPhone)', () => {
    expect(remotePushAvailable({ os: 'android', isDevice: true, expoGo: true })).toBe(false);
    expect(remotePushAvailable({ os: 'ios', isDevice: true, expoGo: true })).toBe(false);
  });

  test('emulador o simulador y web: no', () => {
    expect(remotePushAvailable({ os: 'android', isDevice: false, expoGo: false })).toBe(false);
    expect(remotePushAvailable({ os: 'web', isDevice: true, expoGo: false })).toBe(false);
  });
});
