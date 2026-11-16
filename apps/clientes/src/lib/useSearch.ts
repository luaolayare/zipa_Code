import { useAuth, type Business } from '@zipa/shared';
import { useCallback, useEffect, useState } from 'react';

export type SearchStatus = 'vacio' | 'escribiendo' | 'cargando' | 'listo' | 'error';

type Answer = { key: string; results: Business[]; error: boolean };

/**
 * Búsqueda en el servidor mientras la persona escribe: espera 300 ms sin teclear, pide máximo
 * 30 resultados y descarta respuestas viejas (si llega tarde la de "piz", no tapa la de "pizza").
 * El estado se calcula comparando la última respuesta con lo que hay escrito ahora.
 */
export function useSearch(query: string) {
  const { api } = useAuth();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [attempt, setAttempt] = useState(0);

  const text = query.trim();
  const key = `${attempt}|${text}`;

  useEffect(() => {
    if (text.length < 2) return;
    let stale = false;
    const timer = setTimeout(() => {
      api.searchBusinesses({ text, limit: 30 })
        .then((results) => { if (!stale) setAnswer({ key, results, error: false }); })
        .catch(() => { if (!stale) setAnswer({ key, results: [], error: true }); });
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [api, text, key]);

  // Analítica: una búsqueda cuenta cuando su resultado se queda en pantalla 1,5 s.
  useEffect(() => {
    if (answer?.key !== key || answer.error) return;
    const t = setTimeout(() => { api.track('search', { search: text, results: answer.results.length }); }, 1500);
    return () => clearTimeout(t);
  }, [api, answer, key, text]);

  const status: SearchStatus = !text
    ? 'vacio'
    : text.length < 2
      ? 'escribiendo'
      : answer?.key !== key
        ? 'cargando'
        : answer.error
          ? 'error'
          : 'listo';

  // Mientras llega la respuesta nueva se siguen mostrando los resultados anteriores.
  const results = text.length >= 2 && answer && !answer.error ? answer.results : [];
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { results, status, retry };
}
