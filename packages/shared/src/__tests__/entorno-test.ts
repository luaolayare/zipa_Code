import { describe, expect, test } from '@jest/globals';

import { PROYECTO_PRODUCCION, revisarEntorno, revisarEntornoPanel } from '../../entorno';

const PROD = `https://${PROYECTO_PRODUCCION}.supabase.co`;
const PRUEBAS = 'https://abcdefghijklmnopqrst.supabase.co';

describe('candado de entornos de EAS', () => {
  test('en local (sin perfil de EAS): pruebas o Supabase local sí; producción NO, sin excepción', () => {
    expect(revisarEntorno({ EXPO_PUBLIC_SUPABASE_URL: PRUEBAS }).destino).toBe('local');
    expect(revisarEntorno({ EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' }).destino).toBe('local');
    expect(revisarEntorno({}).destino).toBe('local');
    expect(() => revisarEntorno({ EXPO_PUBLIC_SUPABASE_URL: PROD })).toThrow(/desarrollo local apunta a PRODUCCIÓN/);
    expect(() => revisarEntorno({ EXPO_PUBLIC_SUPABASE_URL: PROD, ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS: '1' })).toThrow(/desarrollo local/);
  });

  test('producción contra producción: sí', () => {
    expect(revisarEntorno({ EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_SUPABASE_URL: PROD }).destino).toBe('produccion');
  });

  test('APK release de producción (production-apk): solo contra producción', () => {
    expect(revisarEntorno({ EAS_BUILD_PROFILE: 'production-apk', EXPO_PUBLIC_SUPABASE_URL: PROD }).destino).toBe('produccion');
    expect(() => revisarEntorno({ EAS_BUILD_PROFILE: 'production-apk', EXPO_PUBLIC_SUPABASE_URL: PRUEBAS })).toThrow(/no apunta al proyecto de producción/);
    expect(() => revisarEntorno({ EAS_BUILD_PROFILE: 'production-apk2', EXPO_PUBLIC_SUPABASE_URL: PROD })).toThrow(/apunta a PRODUCCIÓN/);
  });

  test('producción contra otro proyecto: se detiene', () => {
    expect(() => revisarEntorno({ EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_SUPABASE_URL: PRUEBAS })).toThrow(/no apunta al proyecto de producción/);
  });

  test('preview contra pruebas: sí', () => {
    expect(revisarEntorno({ EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_SUPABASE_URL: PRUEBAS }).destino).toBe('pruebas');
  });

  test('preview o development contra producción: se detiene', () => {
    expect(() => revisarEntorno({ EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_SUPABASE_URL: PROD })).toThrow(/apunta a PRODUCCIÓN/);
    expect(() => revisarEntorno({ EAS_BUILD_PROFILE: 'development', EXPO_PUBLIC_SUPABASE_URL: PROD })).toThrow(/apunta a PRODUCCIÓN/);
  });

  test('excepción consciente con ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS=1', () => {
    expect(revisarEntorno({ EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_SUPABASE_URL: PROD, ZIPA_PERMITIR_PRODUCCION_EN_PRUEBAS: '1' }).destino).toBe('produccion');
  });

  test('sin URL de Supabase en un build: se detiene', () => {
    expect(() => revisarEntorno({ EAS_BUILD_PROFILE: 'preview' })).toThrow(/no tiene EXPO_PUBLIC_SUPABASE_URL/);
  });
});

describe('candado del panel del equipo (Next.js)', () => {
  const dev = { desarrollo: true };
  test('desarrollo + pruebas (o Supabase local): permitido', () => {
    expect(revisarEntornoPanel({ NEXT_PUBLIC_SUPABASE_URL: PRUEBAS }, dev).destino).toBe('pruebas');
    expect(revisarEntornoPanel({ NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' }, dev).destino).toBe('pruebas');
  });

  test('desarrollo + producción: bloqueado, aunque se declare producción', () => {
    expect(() => revisarEntornoPanel({ NEXT_PUBLIC_SUPABASE_URL: PROD }, dev)).toThrow(/en desarrollo apunta a PRODUCCIÓN/);
    expect(() => revisarEntornoPanel({ NEXT_PUBLIC_SUPABASE_URL: PROD, ZIPA_ENTORNO: 'produccion' }, dev)).toThrow(/en desarrollo/);
  });

  test('producción declarada + producción: permitido', () => {
    expect(revisarEntornoPanel({ NEXT_PUBLIC_SUPABASE_URL: PROD, ZIPA_ENTORNO: 'produccion' }).destino).toBe('produccion');
  });

  test('producción declarada + pruebas (o sin URL): bloqueado', () => {
    expect(() => revisarEntornoPanel({ NEXT_PUBLIC_SUPABASE_URL: PRUEBAS, ZIPA_ENTORNO: 'produccion' })).toThrow(/no apunta al proyecto de producción/);
    expect(() => revisarEntornoPanel({ ZIPA_ENTORNO: 'produccion' })).toThrow(/no apunta/);
  });

  test('build o start sin declarar producción: pruebas sí, producción no', () => {
    expect(revisarEntornoPanel({ NEXT_PUBLIC_SUPABASE_URL: PRUEBAS }).destino).toBe('pruebas');
    expect(() => revisarEntornoPanel({ NEXT_PUBLIC_SUPABASE_URL: PROD })).toThrow(/sin declarar el entorno/);
    expect(() => revisarEntornoPanel({ NEXT_PUBLIC_SUPABASE_URL: PROD, ZIPA_ENTORNO: 'Produccion' })).toThrow(/sin declarar/);
  });
});
