import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Analítica de uso, anónima (migración 0015). Cada instalación genera un identificador aleatorio
 * que no se relaciona con la cuenta, el correo ni la ubicación. Si algo falla, no pasa nada: la
 * analítica nunca debe romper la app.
 */
export type AnalyticsEvent = 'app_open' | 'search' | 'category_view' | 'business_view' | 'product_view' | 'whatsapp_click' | 'maps_click';

export interface EventProps {
  businessId?: string;
  productId?: string;
  category?: string;
  search?: string;
  results?: number;
}

/** Lo mínimo de AsyncStorage que se usa (así se puede probar sin el módulo nativo). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const DEVICE_KEY = 'zipa:dispositivo';
/** Sin actividad por 30 minutos, la siguiente acción empieza una sesión nueva. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

/** UUID v4 aleatorio (no necesita criptografía: no protege nada, solo distingue instalaciones). */
export const randomId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export function createTracker(db: SupabaseClient | null, storage: KeyValueStore | null, app: 'clientes' | 'negocios', now: () => number = Date.now) {
  let device: Promise<string> | null = null;
  let session: string | null = null;
  let last = 0;

  const deviceId = () =>
    (device ??= (async () => {
      const saved = await storage?.getItem(DEVICE_KEY).catch(() => null);
      if (saved) return saved;
      const id = randomId();
      await storage?.setItem(DEVICE_KEY, id).catch(() => {});
      return id;
    })());

  /** Devuelve los eventos que se enviaron (útil para las pruebas). */
  return async function track(name: AnalyticsEvent, props: EventProps = {}): Promise<string[]> {
    const t = now();
    const names: string[] = [];
    if (!session || t - last > SESSION_GAP_MS) {
      session = randomId();
      names.push('session_start');
    }
    last = t;
    names.push(name);
    if (!db) return names;
    try {
      const p_device = await deviceId();
      for (const n of names) {
        await db.rpc('registrar_evento', {
          p_device,
          p_session: session,
          p_app: app,
          p_name: n,
          p_business: n === name ? props.businessId ?? null : null,
          p_product: n === name ? props.productId ?? null : null,
          p_category: n === name ? props.category ?? null : null,
          p_search: n === name ? props.search ?? null : null,
          p_results: n === name ? props.results ?? null : null,
        });
      }
    } catch {
      // Sin conexión o error: se ignora.
    }
    return names;
  };
}
