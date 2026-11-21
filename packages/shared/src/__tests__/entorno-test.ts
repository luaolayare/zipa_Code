import { describe, expect, test } from '@jest/globals';

import { PROYECTO_PRODUCCION, revisarEntorno } from '../../entorno';

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
