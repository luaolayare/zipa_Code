import { describe, expect, it } from '@jest/globals';

import { PUSH_PROMPT, isExpoPushToken, notificationRoute, onBeforeSignOut, runBeforeSignOut, whatsappLink } from '../push';

const ID = '3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b';

describe('tokens de notificaciones', () => {
  it('acepta los dos formatos de Expo y rechaza lo demás (misma regla que la base)', () => {
    expect(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[abc-DEF_123456]')).toBe(true);
    expect(isExpoPushToken('ExponentPushToken[]')).toBe(false);
    expect(isExpoPushToken('fcm:abcdef')).toBe(false);
    expect(isExpoPushToken('ExponentPushToken[abc def 1234]')).toBe(false);
    expect(isExpoPushToken(undefined)).toBe(false);
  });
});

describe('abrir el detalle al tocar un aviso', () => {
  it('negocios abre la solicitud en su bandeja; clientes, su solicitud', () => {
    expect(notificationRoute({ url: `/reservas/${ID}` }, 'negocios')).toBe(`/reservas/${ID}`);
    expect(notificationRoute({ url: `/reserva/${ID}` }, 'clientes')).toBe(`/reserva/${ID}`);
  });
  it('ignora rutas de la otra app, de otras pantallas, externas o mal formadas', () => {
    expect(notificationRoute({ url: `/reserva/${ID}` }, 'negocios')).toBeNull();
    expect(notificationRoute({ url: `/reservas/${ID}` }, 'clientes')).toBeNull();
    expect(notificationRoute({ url: '/panel' }, 'negocios')).toBeNull();
    expect(notificationRoute({ url: 'https://evil.com/reserva/x' }, 'clientes')).toBeNull();
    expect(notificationRoute({ url: `/reserva/${ID}/../../login` }, 'clientes')).toBeNull();
    expect(notificationRoute({ url: 42 }, 'clientes')).toBeNull();
    expect(notificationRoute(null, 'clientes')).toBeNull();
  });
});

describe('WhatsApp', () => {
  it('arma el enlace oficial con el mensaje codificado', () => {
    expect(whatsappLink('573001234567', 'Hola, ¿mesa para 4?')).toBe('https://wa.me/573001234567?text=Hola%2C%20%C2%BFmesa%20para%204%3F');
    expect(whatsappLink('573001234567')).toBe('https://wa.me/573001234567');
  });
  it('no arma enlace con números inválidos', () => {
    expect(whatsappLink('12345', 'Hola')).toBeNull();
    expect(whatsappLink('+573001234567', 'Hola')).toBeNull(); // se espera solo dígitos (ya normalizado)
  });
});

describe('antes de cerrar sesión', () => {
  it('corre las tareas registradas (por ejemplo, desactivar el token) y deja de correrlas al quitarlas', async () => {
    const hechas: string[] = [];
    const quitar = onBeforeSignOut(async () => { hechas.push('token'); });
    await runBeforeSignOut();
    expect(hechas).toEqual(['token']);
    quitar();
    await runBeforeSignOut();
    expect(hechas).toEqual(['token']);
  });
  it('un error o una tarea lenta no impiden cerrar sesión', async () => {
    const q1 = onBeforeSignOut(async () => { throw new Error('sin red'); });
    const q2 = onBeforeSignOut(() => new Promise(() => {})); // nunca termina
    const inicio = Date.now();
    await runBeforeSignOut(200);
    expect(Date.now() - inicio).toBeLessThan(1500);
    q1();
    q2();
  });
});

describe('invitación a activar', () => {
  it('cada app explica para qué sirven los avisos', () => {
    expect(PUSH_PROMPT.negocios.body).toMatch(/solicitud|reserva/);
    expect(PUSH_PROMPT.clientes.body).toMatch(/restaurante/);
  });
});
