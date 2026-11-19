// Solicitudes de reserva (Beta 2.2): tipos, textos y reglas que ayudan a llenar el formulario.
// El servidor (migración 0019) vuelve a validar todo: estas funciones solo evitan que la persona
// elija algo que de todos modos se rechazaría. Son solicitudes con confirmación manual: los
// horarios dicen cuándo se puede pedir, no que haya mesa.
//
// Zona horaria: America/Bogota, UTC-5 fijo (Colombia no tiene horario de verano).
import { BRAND } from './brand';

export type ReservationStatus = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada' | 'expirada' | 'finalizada' | 'no_asistio';
export type RejectReason = 'sin_mesas' | 'sin_horario' | 'cerrado_evento' | 'grupo_grande' | 'otro';

export const RESERVATION_STATUS: Record<ReservationStatus, { label: string; tone: 'warn' | 'success' | 'danger' | 'muted' }> = {
  pendiente: { label: 'Pendiente', tone: 'warn' },
  confirmada: { label: 'Confirmada', tone: 'success' },
  rechazada: { label: 'No confirmada', tone: 'danger' },
  cancelada: { label: 'Cancelada', tone: 'muted' },
  expirada: { label: 'Vencida', tone: 'muted' },
  finalizada: { label: 'Finalizada', tone: 'muted' },
  no_asistio: { label: 'No asistió', tone: 'muted' },
};

export const REJECT_REASONS: { id: RejectReason; label: string }[] = [
  { id: 'sin_mesas', label: 'No hay mesas disponibles' },
  { id: 'sin_horario', label: 'No hay disponibilidad en ese horario' },
  { id: 'cerrado_evento', label: 'Restaurante cerrado o evento privado' },
  { id: 'grupo_grande', label: 'No se puede atender ese número de personas' },
  { id: 'otro', label: 'Otro motivo' },
];

export const rejectReasonLabel = (r: RejectReason | null) => REJECT_REASONS.find((x) => x.id === r)?.label ?? '';

/** Texto que se muestra antes de enviar (lo pide la especificación, palabra por palabra). */
export const RESERVATION_NOTICE = 'Tu solicitud será enviada al restaurante. La reserva solo quedará confirmada cuando el establecimiento la acepte.';
export const DISHES_NOTICE = 'Los platos que elijas son solo una preferencia: no están pagados ni garantizados.';
export const DISHES_NOTICE_RESTAURANT = 'Son solo una preferencia del cliente: no están pagados ni garantizados.';

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']; // ISO 1…7

export interface ReservationWindow {
  weekday: number; // 1 lunes … 7 domingo
  starts: string; // "HH:MM"
  ends: string; // "HH:MM" (la última hora posible es antes de esta)
}

export interface ReservationSettings {
  businessId: string;
  enabled: boolean;
  maxParty: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  responseHours: number;
  slotMinutes: 15 | 30 | 60;
  instructions: string | null;
  windows: ReservationWindow[];
  blockedDates: string[]; // "YYYY-MM-DD"
}

export const DEFAULT_RESERVATION_SETTINGS: Omit<ReservationSettings, 'businessId'> = {
  enabled: false,
  maxParty: 8,
  minNoticeMinutes: 120,
  maxAdvanceDays: 30,
  responseHours: 24,
  slotMinutes: 30,
  instructions: null,
  windows: [],
  blockedDates: [],
};

export interface ReservationItem {
  productId: string | null;
  name: string;
  quantity: number;
  unitPriceCop: number | null;
}

export interface ReservationEvent {
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  actorRole: 'cliente' | 'restaurante' | 'sistema';
  reason: string | null;
  createdAt: string;
}

export interface Reservation {
  id: string;
  code: string;
  businessId: string;
  businessName?: string;
  customerId: string;
  startsAt: string;
  partySize: number;
  contactName: string;
  contactWhatsapp: string; // dígitos con indicativo
  tablePreference: string | null;
  notes: string | null;
  status: ReservationStatus;
  respondBy: string;
  rejectReason: RejectReason | null;
  rejectNote: string | null;
  cancelledBy: 'cliente' | 'restaurante' | null;
  cancelReason: string | null;
  decidedAt: string | null;
  createdAt: string;
  items: ReservationItem[];
  events?: ReservationEvent[];
}

export interface ReservationRequest {
  businessId: string;
  startsAt: string; // ISO con -05:00
  partySize: number;
  contactName: string;
  contactWhatsapp: string;
  tablePreference?: string;
  notes?: string;
  items: { productId: string; quantity: number }[];
  idempotencyKey: string;
}

/** Misma regla que normalizar_whatsapp() en la base: dígitos con indicativo, o null si no es válido. */
export function normalizeWhatsapp(raw: string): string | null {
  const n = (raw ?? '').replace(/\D/g, '');
  if (/^3\d{9}$/.test(n)) return '57' + n;
  if (/^[1-9]\d{7,14}$/.test(n)) return n;
  return null;
}

/** Clave única por envío (para que un reintento de red no cree otra solicitud). */
export function newIdempotencyKey(random: () => number = Math.random): string {
  const h = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
  h[12] = '4';
  h[16] = '89ab'[Math.floor(random() * 4)];
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

// ---------- Fechas en hora de Bogotá ----------
const OFFSET_MS = 5 * 3600 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** "YYYY-MM-DD" de hoy (o de `d`) en Bogotá. */
export const bogotaDate = (d: Date) => new Date(d.getTime() - OFFSET_MS).toISOString().slice(0, 10);

/** Instante (ISO con -05:00) de una fecha y hora locales de Bogotá. */
export const bogotaInstant = (date: string, hhmm: string) => `${date}T${hhmm}:00-05:00`;

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Día ISO de la semana (1 lunes … 7 domingo) de una fecha. */
export const isoWeekday = (date: string) => ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;

/** Horas que se pueden pedir un día, ya sin las que están demasiado cerca. */
export function slotsFor(s: Pick<ReservationSettings, 'windows' | 'slotMinutes' | 'minNoticeMinutes'>, date: string, now: Date): string[] {
  const earliest = now.getTime() + s.minNoticeMinutes * 60_000;
  const out = new Set<string>();
  for (const w of s.windows.filter((x) => x.weekday === isoWeekday(date))) {
    for (let m = Math.ceil(toMinutes(w.starts) / s.slotMinutes) * s.slotMinutes; m < toMinutes(w.ends); m += s.slotMinutes) {
      const hhmm = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      if (new Date(bogotaInstant(date, hhmm)).getTime() >= earliest) out.add(hhmm);
    }
  }
  return [...out].sort();
}

/** Días (desde hoy hasta el máximo de anticipación) que tienen al menos una hora disponible. */
export function availableDays(s: ReservationSettings, now: Date): string[] {
  if (!s.enabled) return [];
  const today = bogotaDate(now);
  const days: string[] = [];
  for (let i = 0; i <= s.maxAdvanceDays; i++) {
    const d = addDays(today, i);
    if (!s.blockedDates.includes(d) && slotsFor(s, d, now).length) days.push(d);
  }
  return days;
}

/** "Sáb 21 nov." */
export function dayLabel(date: string, today?: string): string {
  if (today && date === today) return 'Hoy';
  if (today && date === addDays(today, 1)) return 'Mañana';
  const meses = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
  const [, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS[isoWeekday(date) - 1].slice(0, 3)} ${d} ${meses[m - 1]}`;
}

/** "7:30 p. m." (formato de Colombia). */
export function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** Fecha y hora de una reserva, en Bogotá: "Sáb 21 nov. · 7:30 p. m.". */
export function reservationWhen(startsAt: string, now?: Date): string {
  const local = new Date(new Date(startsAt).getTime() - OFFSET_MS).toISOString();
  return `${dayLabel(local.slice(0, 10), now ? bogotaDate(now) : undefined)} · ${timeLabel(local.slice(11, 16))}`;
}

/** Valida una ventana de horario del formulario de configuración. */
export function validateWindows(windows: ReservationWindow[]): string | null {
  for (const w of windows) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(w.starts) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(w.ends)) return 'Escribe las horas como 12:00 o 19:30.';
    if (toMinutes(w.ends) <= toMinutes(w.starts)) return `${WEEKDAYS[w.weekday - 1]}: la hora final debe ser después de la inicial.`;
  }
  for (const a of windows) {
    for (const b of windows) {
      if (a !== b && a.weekday === b.weekday && toMinutes(a.starts) < toMinutes(b.ends) && toMinutes(b.starts) < toMinutes(a.ends)) {
        return `${WEEKDAYS[a.weekday - 1]}: hay horarios que se cruzan.`;
      }
    }
  }
  return null;
}

/** Mensaje de WhatsApp que prepara el restaurante (editable antes de enviar; nunca se envía solo). */
export function restaurantWhatsappMessage(r: Pick<Reservation, 'code' | 'startsAt' | 'partySize'>, businessName: string): string {
  return `Hola, te contactamos de ${businessName} por tu solicitud de reserva ${r.code} en ${BRAND.name} (${reservationWhen(r.startsAt)}, ${r.partySize} ${r.partySize === 1 ? 'persona' : 'personas'}). Queremos confirmar algunos detalles.`;
}
