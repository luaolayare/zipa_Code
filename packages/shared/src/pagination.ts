// Paginación en el servidor para listas que se piden por páginas (búsqueda del inicio).
// No descarga todo: pide una página, y «Ver más» pide la siguiente con offset.

/** Agrega una página sin repetir elementos que ya estaban (por id). */
export function mergeUnique<T extends { id: string }>(list: T[], page: T[]): T[] {
  const seen = new Set(list.map((x) => x.id));
  const out = [...list];
  for (const item of page) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export interface PagerState<T> {
  query: string; // búsqueda a la que pertenecen los resultados
  items: T[];
  hasMore: boolean;
  loading: boolean; // primera página
  loadingMore: boolean; // «Ver más»
  error: boolean; // falló la primera página
  moreError: boolean; // falló «Ver más» (los resultados anteriores siguen)
  loaded: boolean; // ya respondió la primera página
}

const initial = <T>(query: string): PagerState<T> => ({
  query,
  items: [],
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: false,
  moreError: false,
  loaded: false,
});

export type FetchPage<T> = (query: string, offset: number, limit: number) => Promise<T[]>;

/**
 * Paginador con estas garantías:
 * - Una búsqueda nueva reinicia la lista y descarta las respuestas de búsquedas anteriores
 *   (si llega tarde la de "piz", no se mezcla con la de "pizza").
 * - «Ver más» no se pide dos veces al mismo tiempo ni mientras carga la primera página.
 * - Los elementos repetidos entre páginas se descartan.
 * - Si una página trae menos de `pageSize`, ya no hay más.
 */
export function createPager<T extends { id: string }>(fetchPage: FetchPage<T>, pageSize = 20) {
  let state: PagerState<T> = initial<T>('');
  let generation = 0;
  const listeners = new Set<() => void>();
  const set = (patch: Partial<PagerState<T>>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  return {
    pageSize,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Primera página de una búsqueda (reinicia la paginación). */
    async search(query: string) {
      const mine = ++generation;
      set({ ...initial<T>(query), loading: true });
      try {
        const page = await fetchPage(query, 0, pageSize);
        if (mine !== generation) return;
        set({ items: mergeUnique([], page), hasMore: page.length === pageSize, loading: false, loaded: true });
      } catch {
        if (mine === generation) set({ loading: false, error: true, loaded: true });
      }
    },
    /** Siguiente página de la búsqueda actual. */
    async more() {
      if (state.loading || state.loadingMore || !state.hasMore || !state.loaded) return;
      const mine = generation;
      set({ loadingMore: true, moreError: false });
      try {
        const page = await fetchPage(state.query, state.items.length, pageSize);
        if (mine !== generation) return;
        set({ items: mergeUnique(state.items, page), hasMore: page.length === pageSize, loadingMore: false });
      } catch {
        if (mine === generation) set({ loadingMore: false, moreError: true });
      }
    },
    /** Sin búsqueda (texto vacío o muy corto): descarta lo pendiente. */
    clear() {
      generation++;
      if (state.query !== '' || state.items.length || state.loading || state.loadingMore) set(initial<T>(''));
    },
  };
}

export type Pager<T extends { id: string }> = ReturnType<typeof createPager<T>>;
