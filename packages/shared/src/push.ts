// Notificaciones push: reglas compartidas por las dos apps. El código que habla con el módulo nativo
// (expo-notifications) vive en cada app (src/lib/notificaciones.ts); aquí está lo que se puede probar.
// Las apps nunca envían notificaciones: solo registran el token de su dispositivo (ver migración 0020).

export type PushApp = 'clientes' | 'negocios';

/** Estado de los avisos en este dispositivo. */
export type PushState = 'activadas' | 'sin_preguntar' | 'bloqueadas' | 'no_disponible';

/**
 * ¿Puede este entorno recibir avisos push remotos? Solo en un celular real (Android o iOS) y fuera
 * de Expo Go: Expo Go en Android ya no trae notificaciones remotas (SDK 53+) y, en desarrollo, no
 * queremos registrar tokens de Expo Go en la base. En los APK (y en un development build) sí.
 * `expoGo` debe venir de `isRunningInExpoGo()` del paquete `expo` (no de executionEnvironment, que
 * también marca "storeClient" a los development builds).
 */
export function remotePushAvailable(env: { os: string; isDevice: boolean; expoGo: boolean }): boolean {
  return (env.os === 'android' || env.os === 'ios') && env.isDevice && !env.expoGo;
}

/** Mismo formato que exige la base (registrar_token_push). */
export const isExpoPushToken = (t: unknown): t is string =>
  typeof t === 'string' && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/.test(t);

// Rutas a las que puede llevar una notificación, por app. Cualquier otra se ignora: así un dato
// manipulado no puede mandar a la persona a otra pantalla ni fuera de la app.
const ROUTES: Record<PushApp, RegExp> = {
  negocios: /^\/reservas\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  clientes: /^\/reserva\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
};

/** La ruta que trae una notificación, solo si es una pantalla válida de esta app. */
export function notificationRoute(data: unknown, app: PushApp): string | null {
  const url = (data as { url?: unknown } | null)?.url;
  return typeof url === 'string' && ROUTES[app].test(url) ? url : null;
}

/** Textos de la invitación a activar avisos (se muestra en el momento oportuno, no al abrir). */
export const PUSH_PROMPT: Record<PushApp, { title: string; body: string }> = {
  negocios: {
    title: 'Entérate de cada solicitud',
    body: 'Activa las notificaciones y te avisamos apenas un cliente pida una reserva, sin tener que revisar la app.',
  },
  clientes: {
    title: '¿Te avisamos cuando respondan?',
    body: 'Activa las notificaciones y te contamos cuando el restaurante confirme o no tu solicitud.',
  },
};
export const PUSH_BLOCKED = 'Las notificaciones están bloqueadas para esta app. Actívalas en los ajustes del celular y vuelve aquí.';
export const PUSH_UNAVAILABLE = 'No pudimos activar las notificaciones en este celular. Revisa tu conexión e intenta de nuevo.';
/** Después de activar las reservas (negocios): por qué conviene activar los avisos. Sin prometer que llegan siempre. */
export const PUSH_AFTER_RESERVATIONS = 'Para enterarte de cada solicitud sin tener la app abierta, activa las notificaciones en este celular. Si no las activas, las solicitudes igual llegan a tu bandeja de Reservas, pero no te avisaremos.';

/** Qué muestra la tarjeta de avisos en cada situación (lo usa PushPrompt; se prueba con Jest). */
export type PushPromptMode = 'oculta' | 'invitar' | 'bloqueadas' | 'reintentar';
export function pushPromptMode(state: PushState | null, failed: boolean): PushPromptMode {
  if (failed) return 'reintentar'; // pidió activar y el celular no entregó el token: se puede volver a intentar
  if (state === 'sin_preguntar') return 'invitar';
  if (state === 'bloqueadas') return 'bloqueadas';
  return 'oculta'; // activadas, no disponible (web) o aún no se sabe
}

/** Texto corto del estado de los avisos en este celular. No afirma que lleguen: solo si están activados aquí. */
export function pushStateLabel(state: PushState | null, failed = false): string {
  if (failed) return 'No se pudieron activar';
  switch (state) {
    case 'activadas': return 'Activadas en este celular';
    case 'sin_preguntar': return 'Desactivadas';
    case 'bloqueadas': return 'Bloqueadas en los ajustes';
    case 'no_disponible': return 'No disponibles aquí';
    default: return '…';
  }
}

/** Enlace oficial de WhatsApp con un mensaje ya escrito (la persona lo puede cambiar antes de enviar). */
export function whatsappLink(digits: string, text?: string): string | null {
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  const t = (text ?? '').trim();
  return `https://wa.me/${digits}${t ? `?text=${encodeURIComponent(t)}` : ''}`;
}

// ---------- Antes de cerrar sesión ----------
// La app registra aquí lo que debe hacerse con la sesión todavía abierta (por ejemplo, desactivar
// el token de este dispositivo). AuthProvider lo ejecuta antes de cerrar la sesión.
const beforeSignOut = new Set<() => Promise<void>>();
export function onBeforeSignOut(fn: () => Promise<void>): () => void {
  beforeSignOut.add(fn);
  return () => { beforeSignOut.delete(fn); };
}
/** Corre las tareas pendientes, sin bloquear el cierre de sesión más de `ms` milisegundos. */
export async function runBeforeSignOut(ms = 3000): Promise<void> {
  const tasks = [...beforeSignOut].map((fn) => fn().catch(() => {}));
  await Promise.race([Promise.all(tasks), new Promise((r) => setTimeout(r, ms))]);
}
