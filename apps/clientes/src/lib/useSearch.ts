import { createPager, useAuth, type Business } from '@zipa/shared';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

export type SearchStatus = 'vacio' | 'escribiendo' | 'cargando' | 'listo' | 'error';

/** Resultados por página (la base entrega como máximo 50). */
export const SEARCH_PAGE = 20;

/**
 * Búsqueda en el servidor mientras la persona escribe, con «Ver más»:
 * - espera 300 ms sin teclear y pide la primera página (20);
 * - «Ver más» pide la siguiente con offset, sin duplicar resultados ni pedir dos veces a la vez;
 * - cambiar el texto reinicia la paginación y descarta respuestas viejas (createPager).
 */
export function useSearch(query: string) {
  const { api } = useAuth();
  const pager = useMemo(
    () => createPager<Business>((text, offset, limit) => api.searchBusinesses({ text, offset, limit }), SEARCH_PAGE),
    [api],
  );
  const state = useSyncExternalStore(pager.subscribe, pager.getState, pager.getState);
  const [attempt, setAttempt] = useState(0);
  const text = query.trim();

  useEffect(() => {
    if (text.length < 2) {
      pager.clear();
      return;
    }
    const timer = setTimeout(() => { pager.search(text); }, 300);
    return () => clearTimeout(timer);
  }, [pager, text, attempt]);

  const current = state.query === text;
  const status: SearchStatus = !text
    ? 'vacio'
    : text.length < 2
      ? 'escribiendo'
      : !current || state.loading || !state.loaded
        ? 'cargando'
        : state.error
          ? 'error'
          : 'listo';

  // Analítica: una búsqueda cuenta cuando su resultado se queda en pantalla 1,5 s.
  const shown = status === 'listo' ? state.items.length : -1;
  useEffect(() => {
    if (shown < 0) return;
    const t = setTimeout(() => { api.track('search', { search: text, results: shown }); }, 1500);
    return () => clearTimeout(t);
  }, [api, text, shown]);

  // Mientras llega la primera página de una búsqueda nueva se siguen viendo los anteriores.
  const results = text.length >= 2 ? state.items : [];
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const loadMore = useCallback(() => { pager.more(); }, [pager]);
  return {
    results,
    status,
    retry,
    loadMore,
    hasMore: status === 'listo' && state.hasMore,
    loadingMore: state.loadingMore,
    moreError: state.moreError,
  };
}
