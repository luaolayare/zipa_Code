import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_RESERVATION_SETTINGS,
  REJECT_REASONS,
  RESERVATION_NOTICE,
  RESERVATION_STATUS,
  availableDays,
  bogotaDate,
  bogotaInstant,
  dayLabel,
  isoWeekday,
  newIdempotencyKey,
  normalizeWhatsapp,
  reservationWhen,
  restaurantWhatsappMessage,
  slotsFor,
  timeLabel,
  validateWindows,
  type ReservationSettings,
} from '../reservations';

// Jueves 19 de noviembre de 2026, 10:05 a. m. en Bogotá (15:05 UTC).
const AHORA = new Date('2026-11-19T15:05:00Z');

const config = (patch: Partial<ReservationSettings> = {}): ReservationSettings => ({
  ...DEFAULT_RESERVATION_SETTINGS,
  businessId: 'r1',
  enabled: true,
  minNoticeMinutes: 120,
  maxAdvanceDays: 7,
  slotMinutes: 30,
  // Jueves (4) 12:00–15:00 y 18:00–21:00; sábado (6) 12:00–16:00. Los demás días no.
  windows: [
    { weekday: 4, starts: '12:00', ends: '15:00' },
    { weekday: 4, starts: '18:00', ends: '21:00' },
    { weekday: 6, starts: '12:00', ends: '16:00' },
  ],
  ...patch,
});

describe('fechas en hora de Bogotá', () => {
  it('la fecha y el día de la semana salen en hora de Bogotá, no en UTC', () => {
    expect(bogotaDate(AHORA)).toBe('2026-11-19');
    expect(bogotaDate(new Date('2026-11-20T03:00:00Z'))).toBe('2026-11-19'); // 10 p. m. del 19 en Bogotá
    expect(isoWeekday('2026-11-19')).toBe(4); // jueves
    expect(isoWeekday('2026-11-22')).toBe(7); // domingo
    expect(bogotaInstant('2026-11-21', '19:30')).toBe('2026-11-21T19:30:00-05:00');
  });

  it('textos de fecha y hora en formato de Colombia', () => {
    expect(timeLabel('19:30')).toBe('7:30 p. m.');
    expect(timeLabel('00:15')).toBe('12:15 a. m.');
    expect(timeLabel('12:00')).toBe('12:00 p. m.');
    expect(dayLabel('2026-11-19', '2026-11-19')).toBe('Hoy');
    expect(dayLabel('2026-11-20', '2026-11-19')).toBe('Mañana');
    expect(dayLabel('2026-11-21', '2026-11-19')).toBe('Sáb 21 nov.');
    expect(reservationWhen('2026-11-22T00:30:00Z')).toBe('Sáb 21 nov. · 7:30 p. m.');
  });
});

describe('horas y días que se pueden pedir', () => {
  it('hoy: sin las horas dentro de la anticipación mínima (2 h desde las 10:05)', () => {
    // 12:00 queda a 1 h 55 min: no. 12:30 sí.
    expect(slotsFor(config(), '2026-11-19', AHORA)).toEqual(['12:30', '13:00', '13:30', '14:00', '14:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']);
  });

  it('la hora final de la ventana no se ofrece (la reserva debe empezar antes)', () => {
    expect(slotsFor(config(), '2026-11-21', AHORA)).not.toContain('16:00');
    expect(slotsFor(config(), '2026-11-21', AHORA).at(-1)).toBe('15:30');
  });

  it('respeta el intervalo de 15, 30 o 60 minutos', () => {
    expect(slotsFor(config({ slotMinutes: 60 }), '2026-11-21', AHORA)).toEqual(['12:00', '13:00', '14:00', '15:00']);
    expect(slotsFor(config({ slotMinutes: 15, windows: [{ weekday: 6, starts: '12:10', ends: '13:00' }] }), '2026-11-21', AHORA)).toEqual(['12:15', '12:30', '12:45']);
  });

  it('días: solo los que tienen horario, sin los bloqueados y hasta el máximo de anticipación', () => {
    expect(availableDays(config(), AHORA)).toEqual(['2026-11-19', '2026-11-21', '2026-11-26']);
    expect(availableDays(config({ blockedDates: ['2026-11-21'] }), AHORA)).toEqual(['2026-11-19', '2026-11-26']);
    expect(availableDays(config({ maxAdvanceDays: 3 }), AHORA)).toEqual(['2026-11-19', '2026-11-21']);
  });

  it('si ya no quedan horas hoy, hoy no aparece', () => {
    const noche = new Date('2026-11-20T01:30:00Z'); // 8:30 p. m. del jueves
    expect(availableDays(config(), noche)[0]).toBe('2026-11-21');
  });

  it('con las reservas apagadas no hay días', () => {
    expect(availableDays(config({ enabled: false }), AHORA)).toEqual([]);
  });
});

describe('configuración de horarios', () => {
  it('acepta horarios bien escritos que no se cruzan', () => {
    expect(validateWindows(config().windows)).toBeNull();
  });
  it('rechaza horas mal escritas, finales antes del inicio y horarios que se cruzan', () => {
    expect(validateWindows([{ weekday: 1, starts: '7pm', ends: '21:00' }])).toMatch(/12:00 o 19:30/);
    expect(validateWindows([{ weekday: 2, starts: '15:00', ends: '12:00' }])).toMatch(/^Martes/);
    expect(validateWindows([{ weekday: 1, starts: '12:00', ends: '15:00' }, { weekday: 1, starts: '14:00', ends: '18:00' }])).toMatch(/se cruzan/);
    expect(validateWindows([{ weekday: 1, starts: '12:00', ends: '15:00' }, { weekday: 1, starts: '15:00', ends: '18:00' }])).toBeNull(); // seguidos, no cruzados
  });
});

describe('WhatsApp de contacto (misma regla que la base)', () => {
  it('celular colombiano sin indicativo recibe el 57; con indicativo queda igual', () => {
    expect(normalizeWhatsapp('300 123 4567')).toBe('573001234567');
    expect(normalizeWhatsapp('+57 300-123-4567')).toBe('573001234567');
    expect(normalizeWhatsapp('+1 (415) 555-0100')).toBe('14155550100'); // turista extranjero
  });
  it('rechaza números incompletos o que empiezan en 0', () => {
    expect(normalizeWhatsapp('12345')).toBeNull();
    expect(normalizeWhatsapp('0300 123 4567')).toBeNull();
    expect(normalizeWhatsapp('')).toBeNull();
  });
});

describe('textos y reglas', () => {
  it('el aviso antes de enviar dice que la reserva no está confirmada hasta que el restaurante la acepte', () => {
    expect(RESERVATION_NOTICE).toBe('Tu solicitud será enviada al restaurante. La reserva solo quedará confirmada cuando el establecimiento la acepte.');
  });
  it('los motivos de rechazo son los cinco de la especificación y hay etiqueta para cada estado', () => {
    expect(REJECT_REASONS.map((r) => r.label)).toEqual([
      'No hay mesas disponibles', 'No hay disponibilidad en ese horario', 'Restaurante cerrado o evento privado', 'No se puede atender ese número de personas', 'Otro motivo',
    ]);
    expect(Object.keys(RESERVATION_STATUS).sort()).toEqual(['cancelada', 'confirmada', 'expirada', 'finalizada', 'no_asistio', 'pendiente', 'rechazada']);
  });
  it('la clave de idempotencia es un UUID v4 y cambia en cada envío', () => {
    const a = newIdempotencyKey();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newIdempotencyKey()).not.toBe(a);
  });
  it('el mensaje de WhatsApp del restaurante lleva el código, la fecha y la hora', () => {
    const m = restaurantWhatsappMessage({ code: 'R-7K3Q9P', startsAt: '2026-11-22T00:30:00Z', partySize: 4 }, 'Asadero El Páramo');
    expect(m).toContain('R-7K3Q9P');
    expect(m).toContain('Sáb 21 nov. · 7:30 p. m.');
    expect(m).toContain('4 personas');
    expect(m).toContain('Asadero El Páramo');
  });
});
