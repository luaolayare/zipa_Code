import { describe, expect, it } from '@jest/globals';

import { createPager, mergeUnique } from '../pagination';

type Item = { id: string; q: string };

/** "Servidor" falso: 45 resultados por búsqueda; cada llamada queda pendiente hasta resolverla. */
function servidor(total = 45) {
  const llamadas: { query: string; offset: number; limit: number; resolver: () => void; fallar: () => void }[] = [];
  const fetchPage = (query: string, offset: number, limit: number) =>
    new Promise<Item[]>((resolve, reject) => {
      const datos = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => ({ id: `${query}-${offset + i}`, q: query }));
      llamadas.push({ query, offset, limit, resolver: () => resolve(datos), fallar: () => reject(new Error('sin conexión')) });
    });
  return { fetchPage, llamadas };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('mergeUnique', () => {
  it('agrega sin repetir por id', () => {
    expect(mergeUnique([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

// Regresión UX6: la búsqueda del inicio mostraba como máximo 30 resultados, sin poder seguir.
describe('paginación de la búsqueda en el servidor', () => {
  it('primera página, «Ver más» con offset y fin cuando no hay más', async () => {
    const s = servidor(45);
    const pager = createPager<Item>(s.fetchPage, 20);
    const p1 = pager.search('pizza');
    expect(pager.getState()).toMatchObject({ loading: true, query: 'pizza' });
    s.llamadas[0].resolver(); await p1;
    expect(pager.getState()).toMatchObject({ hasMore: true, loading: false });
    expect(pager.getState().items).toHaveLength(20);

    const p2 = pager.more(); s.llamadas[1].resolver(); await p2;
    expect(s.llamadas[1].offset).toBe(20);
    const p3 = pager.more(); s.llamadas[2].resolver(); await p3;
    expect(s.llamadas[2].offset).toBe(40);
    expect(pager.getState().items).toHaveLength(45);
    expect(pager.getState().hasMore).toBe(false); // la última página trajo 5 < 20

    await pager.more();
    expect(s.llamadas).toHaveLength(3); // sin más páginas no vuelve a pedir
  });

  it('no pide «Ver más» dos veces al mismo tiempo', async () => {
    const s = servidor(100);
    const pager = createPager<Item>(s.fetchPage, 20);
    const p1 = pager.search('arepa'); s.llamadas[0].resolver(); await p1;
    const a = pager.more();
    const b = pager.more(); // doble toque
    expect(s.llamadas).toHaveLength(2);
    s.llamadas[1].resolver(); await Promise.all([a, b]);
    expect(pager.getState().items).toHaveLength(40);
  });

  it('cambiar rápido de búsqueda reinicia y descarta las respuestas viejas', async () => {
    const s = servidor(45);
    const pager = createPager<Item>(s.fetchPage, 20);
    const viejo = pager.search('piz');
    const nuevo = pager.search('pizza');
    s.llamadas[1].resolver(); await nuevo; // llega primero la nueva
    s.llamadas[0].resolver(); await viejo; // la vieja llega tarde: se ignora
    expect(pager.getState().query).toBe('pizza');
    expect(pager.getState().items.every((x) => x.q === 'pizza')).toBe(true);
    expect(pager.getState().items).toHaveLength(20);
  });

  it('«Ver más» de una búsqueda anterior no se mezcla con la nueva', async () => {
    const s = servidor(45);
    const pager = createPager<Item>(s.fetchPage, 20);
    const p1 = pager.search('cafe'); s.llamadas[0].resolver(); await p1;
    const mas = pager.more(); // página 2 de "cafe" en camino
    const p2 = pager.search('helado'); s.llamadas[2].resolver(); await p2;
    s.llamadas[1].resolver(); await mas;
    expect(pager.getState().items.every((x) => x.q === 'helado')).toBe(true);
    expect(pager.getState().items).toHaveLength(20);
  });

  it('error de conexión: en la primera página y en «Ver más» (conserva lo cargado)', async () => {
    const s = servidor(45);
    const pager = createPager<Item>(s.fetchPage, 20);
    const p1 = pager.search('mochila'); s.llamadas[0].fallar(); await p1;
    expect(pager.getState()).toMatchObject({ error: true, loading: false, items: [] });

    const p2 = pager.search('mochila'); s.llamadas[1].resolver(); await p2;
    const m = pager.more(); s.llamadas[2].fallar(); await m;
    expect(pager.getState()).toMatchObject({ moreError: true, loadingMore: false });
    expect(pager.getState().items).toHaveLength(20);

    const m2 = pager.more(); s.llamadas[3].resolver(); await m2; // reintento
    expect(pager.getState()).toMatchObject({ moreError: false });
    expect(pager.getState().items).toHaveLength(40);
  });

  it('limpiar descarta lo pendiente y avisa a la pantalla', async () => {
    const s = servidor(45);
    const pager = createPager<Item>(s.fetchPage, 20);
    let avisos = 0;
    const quitar = pager.subscribe(() => { avisos++; });
    const p = pager.search('ajiaco');
    pager.clear();
    s.llamadas[0].resolver(); await p; await tick();
    expect(pager.getState()).toMatchObject({ query: '', items: [], loading: false });
    expect(avisos).toBeGreaterThan(0);
    quitar();
  });
});
