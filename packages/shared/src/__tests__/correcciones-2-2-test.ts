import { describe, expect, it } from '@jest/globals';

import { pushPromptMode, pushStateLabel } from '../push';
import { CONFIRMED_GRACE_MS, INBOX_TABS, inboxQuery } from '../reservations';

const AHORA = new Date('2026-11-20T15:00:00Z');

describe('bandeja del restaurante por páginas (P4)', () => {
  it('pendientes primero por el plazo que vence antes; confirmadas por la visita más cercana', () => {
    expect(inboxQuery('pendientes', AHORA)).toMatchObject({ statuses: ['pendiente'], orderBy: 'respond_by', ascending: true });
    expect(inboxQuery('confirmadas', AHORA)).toMatchObject({ statuses: ['confirmada'], orderBy: 'starts_at', ascending: true });
  });
  it('el historial va de lo más reciente a lo más viejo', () => {
    for (const t of ['rechazadas', 'canceladas', 'finalizadas', 'expiradas'] as const) expect(inboxQuery(t, AHORA).ascending).toBe(false);
  });
  it('una confirmada pasa de «Confirmadas» a «Finalizadas» 6 horas después de su hora (para marcar la asistencia)', () => {
    const corte = new Date(AHORA.getTime() - CONFIRMED_GRACE_MS).toISOString();
    expect(inboxQuery('confirmadas', AHORA).startsFrom).toBe(corte);
    expect(inboxQuery('finalizadas', AHORA).orFilter).toBe(`status.in.(finalizada,no_asistio),and(status.eq.confirmada,starts_at.lt."${corte}")`);
  });
  it('las seis pestañas de la especificación, en orden', () => {
    expect(INBOX_TABS.map((t) => t.id)).toEqual(['pendientes', 'confirmadas', 'rechazadas', 'canceladas', 'finalizadas', 'expiradas']);
  });
});

describe('aviso de notificaciones desactivadas (P13)', () => {
  it('invita a activar con una acción explícita si nunca se pidió el permiso', () => {
    expect(pushPromptMode('sin_preguntar', false)).toBe('invitar');
  });
  it('si el permiso está bloqueado, lo dice y lleva a los ajustes', () => {
    expect(pushPromptMode('bloqueadas', false)).toBe('bloqueadas');
  });
  it('si falló al activar, permite reintentar (aunque el permiso ya esté dado)', () => {
    expect(pushPromptMode('activadas', true)).toBe('reintentar');
    expect(pushPromptMode('sin_preguntar', true)).toBe('reintentar');
  });
  it('no molesta si ya están activadas o si el dispositivo no las soporta (web)', () => {
    expect(pushPromptMode('activadas', false)).toBe('oculta');
    expect(pushPromptMode('no_disponible', false)).toBe('oculta');
    expect(pushPromptMode(null, false)).toBe('oculta');
  });
  it('el estado no promete que los avisos lleguen: solo dice si están activados en este celular', () => {
    expect(pushStateLabel('activadas')).toBe('Activadas en este celular');
    expect(pushStateLabel('sin_preguntar')).toBe('Desactivadas');
    expect(pushStateLabel('bloqueadas')).toBe('Bloqueadas en los ajustes');
    expect(pushStateLabel('activadas', true)).toBe('No se pudieron activar');
    expect(pushStateLabel('activadas')).not.toMatch(/funcionan|llegan|garantiz/);
  });
});
