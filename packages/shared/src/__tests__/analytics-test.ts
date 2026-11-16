import { describe, expect, it } from '@jest/globals';

import { SESSION_GAP_MS, createTracker, randomId } from '../analytics';

describe('analítica anónima', () => {
  it('genera identificadores con formato UUID v4', () => {
    const id = randomId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(randomId()).not.toBe(id);
  });

  it('abre una sesión al primer evento y otra tras 30 minutos sin actividad', async () => {
    let t = 0;
    const track = createTracker(null, null, 'clientes', () => t);
    expect(await track('app_open')).toEqual(['session_start', 'app_open']);
    t += 60_000;
    expect(await track('search', { search: 'pizza', results: 2 })).toEqual(['search']);
    t += SESSION_GAP_MS + 1;
    expect(await track('business_view', { businessId: 'b1' })).toEqual(['session_start', 'business_view']);
  });

  it('envía los eventos a registrar_evento con el mismo dispositivo guardado', async () => {
    const calls: Record<string, unknown>[] = [];
    const db = { rpc: async (_fn: string, args: Record<string, unknown>) => { calls.push(args); return { error: null }; } };
    const store: Record<string, string> = {};
    const storage = { getItem: async (k: string) => store[k] ?? null, setItem: async (k: string, v: string) => { store[k] = v; } };
    const track = createTracker(db as never, storage, 'clientes');
    await track('whatsapp_click', { businessId: 'b1' });
    await track('maps_click', { businessId: 'b1' });
    expect(calls.map((c) => c.p_name)).toEqual(['session_start', 'whatsapp_click', 'maps_click']);
    expect(new Set(calls.map((c) => c.p_device)).size).toBe(1);
    expect(calls[0].p_business).toBeNull(); // la sesión no lleva datos del evento
    expect(calls[1].p_business).toBe('b1');
  });

  it('si la red falla, la app sigue sin errores', async () => {
    const db = { rpc: async () => { throw new Error('sin conexión'); } };
    const track = createTracker(db as never, null, 'clientes');
    await expect(track('app_open')).resolves.toEqual(['session_start', 'app_open']);
  });
});
