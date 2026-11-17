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
    const list = await api.searchBusinesses();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((b) => b.status === 'publicado')).toBe(true);
  });

  it('busca por nombre, plato o producto y subcategoría, sin importar tildes', async () => {
    const api = createApi(null);
    expect((await api.searchBusinesses({ text: 'mama ines' })).map((b) => b.id)).toEqual(['b1']);
    expect((await api.searchBusinesses({ text: 'BANDEJA' })).map((b) => b.id)).toEqual(['b4']); // plato
    expect((await api.searchBusinesses({ text: 'cafeterías' })).map((b) => b.id)).toEqual(['b3']); // subcategoría
    expect(await api.searchBusinesses({ text: 'no existe nada así' })).toEqual([]);
  });

  it('filtra por categoría principal y subcategoría, y limita las páginas', async () => {
    const api = createApi(null);
    const rest = await api.searchBusinesses({ main: 'restaurantes' });
    expect(rest.length).toBeGreaterThan(0);
    expect(rest.every((b) => b.mainCategory === 'restaurantes')).toBe(true);
    expect((await api.searchBusinesses({ subcategory: 'reposteria' })).map((b) => b.id)).toEqual(['b7']);
    expect(await api.searchBusinesses({ limit: 2 })).toHaveLength(2);
    expect((await api.searchBusinesses({ limit: 500 })).length).toBeLessThanOrEqual(50);
  });

  it('ordena por calificación con los negocios de muchas reseñas primero', async () => {
    const api = createApi(null);
    const list = await api.searchBusinesses({ order: 'calificacion' });
    const ratings = list.map((b) => b.rating ?? 0);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it('guarda sección y disponibilidad de un plato, y la cambia con un toque', async () => {
    const api = createApi(null);
    const saved = await api.saveProduct('demo', 'b1', { name: 'Changua', priceCop: 9000, section: ' Desayunos ', available: true });
    expect(saved.section).toBe('Desayunos');
    await api.setProductAvailable(saved.id, false);
    expect((await api.listProducts('b1')).find((x) => x.id === saved.id)?.available).toBe(false);
  });

  it('guarda hasta 3 fotos adicionales con descripción, además de la principal', async () => {
    const api = createApi(null);
    const saved = await api.saveProduct('demo', 'b2', {
      name: 'Mochila',
      priceCop: 150000,
      photo: { uri: 'file://principal.jpg' },
      photoLabel: 'Clásica',
      extras: [
        { file: { uri: 'file://azul.jpg' }, label: 'Diseño azul' },
        { file: { uri: 'file://roja.jpg' }, label: 'Diseño rojo' },
        { file: { uri: 'file://verde.jpg' }, label: null },
        { file: { uri: 'file://sobra.jpg' }, label: 'No cabe' },
      ],
    });
    expect(saved.photoLabel).toBe('Clásica');
    expect(saved.photos.map((p) => p.label)).toEqual(['Diseño azul', 'Diseño rojo', null]);
    expect(saved.photos.map((p) => p.position)).toEqual([1, 2, 3]);
  });

  it('una foto adicional puede pasar a ser la principal', async () => {
    const api = createApi(null);
    const p = await api.saveProduct('demo', 'b2', { name: 'Sombrero', priceCop: 90000, photo: { uri: 'file://a.jpg' }, extras: [{ file: { uri: 'file://b.jpg' }, label: 'B' }] });
    const swapped = await api.saveProduct('demo', 'b2', { name: 'Sombrero', priceCop: 90000, photoUrl: 'file://b.jpg', photoLabel: 'B', extras: [{ url: 'file://a.jpg', label: 'A' }] }, p.id);
    expect(swapped.photoUrl).toBe('file://b.jpg');
    expect(swapped.photos.map((x) => x.url)).toEqual(['file://a.jpg']);
  });

  it('sin Supabase no hay destacados inventados', async () => {
    expect(await createApi(null).featuredBusinesses()).toEqual([]);
  });

  it('cuenta los negocios por categoría principal', async () => {
    const api = createApi(null);
    const n = await api.countByMainCategory();
    expect(n.emprendimientos + n.restaurantes).toBe((await api.searchBusinesses({ limit: 50 })).length);
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
