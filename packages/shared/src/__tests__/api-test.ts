import { describe, expect, it } from '@jest/globals';

import { OffensiveTextError } from '../moderation';
import { createApi, isValidIdNumber, normalizeIdNumber } from '../api';

describe('cédula o NIT', () => {
  it('quita puntos y espacios y conserva el guion del NIT', () => {
    expect(normalizeIdNumber('1.234.567')).toBe('1234567');
    expect(normalizeIdNumber(' 900.123.456 - 7 ')).toBe('900123456-7');
    expect(normalizeIdNumber('-123456-')).toBe('123456');
  });

  it('acepta cédulas y NIT válidos (misma regla que la base de datos)', () => {
    expect(isValidIdNumber('1.234.567')).toBe(true);
    expect(isValidIdNumber('900.123.456-7')).toBe(true);
    expect(isValidIdNumber('123456')).toBe(true);
  });

  it('rechaza valores inválidos', () => {
    expect(isValidIdNumber('12a')).toBe(false);
    expect(isValidIdNumber('12345')).toBe(false); // muy corta
    expect(isValidIdNumber('1234567890123')).toBe(false); // muy larga
    expect(isValidIdNumber('900123456-78')).toBe(false); // dígito de verificación de más
  });
});

// En las pruebas __DEV__ es true: createApi(null) usa los datos de ejemplo en memoria.
describe('createApi en modo demo', () => {
  it('lista los negocios de ejemplo', async () => {
    const api = createApi(null);
    expect(api.isDemo).toBe(true);
    const list = await api.listBusinesses();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((b) => b.status === 'publicado')).toBe(true);
  });

  it('rechaza reseñas con palabras ofensivas y publica las normales', async () => {
    const api = createApi(null);
    await expect(api.saveMyReview('b1', 'u-prueba', 'Prueba', 4, 'son unos malparidos')).rejects.toBeInstanceOf(OffensiveTextError);
    await api.saveMyReview('b1', 'u-prueba', 'Prueba', 5, 'Deliciosa la arepa');
    const reviews = await api.listReviews('b1');
    expect(reviews.some((r) => r.text === 'Deliciosa la arepa')).toBe(true);
  });

  it('una persona tiene UNA reseña por negocio: calificar otra vez la reemplaza', async () => {
    const api = createApi(null);
    await api.saveMyReview('b1', 'u-una', 'Una', 2, 'Regular');
    await api.saveMyReview('b1', 'u-una', 'Una', 5, 'Volví y mejoró');
    const mias = (await api.listReviews('b1')).filter((r) => r.userId === 'u-una');
    expect(mias).toHaveLength(1);
    expect(mias[0]).toMatchObject({ stars: 5, text: 'Volví y mejoró' });
    expect(await api.getMyReview('b1', 'u-una')).toMatchObject({ stars: 5 });
  });

  it('oculta las reseñas de una persona bloqueada y las muestra al desbloquear', async () => {
    const api = createApi(null);
    const autor = (await api.listReviews('b1'))[0];
    await api.blockUser('yo', autor.userId);
    expect((await api.listReviews('b1', 'yo')).some((r) => r.userId === autor.userId)).toBe(false);
    await api.unblockUser('yo', autor.userId);
    expect((await api.listReviews('b1', 'yo')).some((r) => r.userId === autor.userId)).toBe(true);
  });

  it('registra aceptaciones legales y las consulta por versión', async () => {
    const api = createApi(null);
    const consents = [{ document: 'privacidad' as const, version: '1.0', app: 'clientes' as const }];
    expect(await api.hasAccepted('yo', consents)).toBe(false);
    await api.recordConsents('yo', consents);
    expect(await api.hasAccepted('yo', consents)).toBe(true);
    expect(await api.hasAccepted('yo', [{ ...consents[0], version: '2.0' }])).toBe(false);
  });
});
