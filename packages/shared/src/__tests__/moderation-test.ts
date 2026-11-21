import { describe, expect, it } from '@jest/globals';

import { OFFENSIVE_MESSAGE, OFFENSIVE_WORDS, OffensiveTextError, findOffensiveWords, reviewAllowedFrom } from '../moderation';

describe('findOffensiveWords', () => {
  it('detecta insultos sin importar mayúsculas ni tildes', () => {
    expect(findOffensiveWords('El mesero es un HIJUEPUTA')).toEqual(['hijueputa']);
    expect(findOffensiveWords('Qué imbécil')).toEqual(['imbecil']);
  });

  it('detecta plurales (caso real que se escapó en las pruebas)', () => {
    expect(findOffensiveWords('Atienden muy mal, son unos malparidos')).toEqual(['malparido']);
    expect(findOffensiveWords('unos maricones')).toEqual(['maricon']);
  });

  it('detecta palabras separadas por signos', () => {
    expect(findOffensiveWords('¡idiota!')).toEqual(['idiota']);
    expect(findOffensiveWords('hp...')).toEqual(['hp']);
  });

  it('no marca palabras normales que contienen o se parecen a un insulto', () => {
    expect(findOffensiveWords('Muy rica la arepa, volvería')).toEqual([]);
    expect(findOffensiveWords('cono de helado')).toEqual([]);
    expect(findOffensiveWords('Che Guevara')).toEqual([]);
    expect(findOffensiveWords('la computadora del hotel')).toEqual([]);
    expect(findOffensiveWords('')).toEqual([]);
  });

  it('la lista no tiene repetidos ni mayúsculas ni tildes', () => {
    expect(new Set(OFFENSIVE_WORDS).size).toBe(OFFENSIVE_WORDS.length);
    for (const w of OFFENSIVE_WORDS) expect(w).toMatch(/^[a-z]+$/);
  });
});

describe('OffensiveTextError', () => {
  it('lleva el mensaje en español para mostrar en pantalla', () => {
    const e = new OffensiveTextError();
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe(OFFENSIVE_MESSAGE);
  });
});

describe('reviewAllowedFrom (aviso de cuenta nueva antes de calificar)', () => {
  const now = new Date('2026-11-21T15:00:00Z');
  it('cuenta de hace 2 horas: avisa desde cuándo podrá calificar', () => {
    expect(reviewAllowedFrom('2026-11-21T13:00:00Z', now)).toBe('2026-11-22T13:00:00.000Z');
  });
  it('cuenta de más de 24 horas: sin aviso', () => {
    expect(reviewAllowedFrom('2026-11-20T14:59:00Z', now)).toBeNull();
  });
  it('sin fecha (datos de ejemplo) o fecha inválida: sin aviso', () => {
    expect(reviewAllowedFrom(undefined, now)).toBeNull();
    expect(reviewAllowedFrom('no es fecha', now)).toBeNull();
  });
});
