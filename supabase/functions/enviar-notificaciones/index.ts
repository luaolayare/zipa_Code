// Edge Function: envía las notificaciones push en cola (migración 0020) por el servicio de Expo.
// No la llaman las apps: la despierta la base de datos (pg_net al encolar y pg_cron cada minuto).
//
// Autorización: el encabezado `x-zipa-cron` debe ser igual al secreto CRON_SECRET de la función
// (el mismo valor guardado en Vault como zipa_cron_secreto). Por eso verify_jwt = false en
// config.toml: no hay sesión de usuario, hay un secreto del servidor.
//
// Secretos de la función:
//   CRON_SECRET        obligatorio
//   EXPO_ACCESS_TOKEN  opcional (seguridad reforzada de Expo push)
//   EXPO_PUSH_URL / EXPO_RECEIPTS_URL  opcionales, solo para pruebas locales con un servidor falso
//
// Qué hace en cada llamada:
// 1. Toma avisos listos (tomar_notificaciones, con SKIP LOCKED: dos llamadas a la vez no envían
//    el mismo aviso dos veces).
// 2. Envía en lotes de hasta 100 mensajes. Fallas de red, 429 y 5xx se reintentan después con
//    espera creciente (la base calcula cuándo); a los 5 intentos queda "fallida".
// 3. Guarda cada ticket; si Expo dice DeviceNotRegistered, desactiva ese token.
// 4. Revisa los recibos de los envíos de hace más de 15 minutos.
// Nunca escribe tokens, nombres ni textos en el log: solo cuentas.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const PUSH_URL = Deno.env.get('EXPO_PUSH_URL') ?? 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = Deno.env.get('EXPO_RECEIPTS_URL') ?? 'https://exp.host/--/api/v2/push/getReceipts';
const LOTE = 100;

type Aviso = { id: number; title: string; body: string; data: Record<string, unknown>; attempt: number; tokens: { id: string; token: string }[] };
type Ticket = { token_id: string; status: 'ok' | 'error'; ticket_id?: string; error?: string };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Comparación en tiempo constante (para no filtrar el secreto por cuánto tarda en responder). */
function igual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

function encabezados() {
  const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const token = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Envía un lote. Devuelve los tickets en el mismo orden, o un error general (reintentable). */
async function enviarLote(mensajes: unknown[]): Promise<{ tickets: { status: string; id?: string; details?: { error?: string } }[] } | { error: string }> {
  try {
    const res = await fetch(PUSH_URL, { method: 'POST', headers: encabezados(), body: JSON.stringify(mensajes), signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const body = await res.json();
    if (!Array.isArray(body?.data) || body.data.length !== mensajes.length) return { error: 'Respuesta inesperada de Expo' };
    return { tickets: body.data };
  } catch (e) {
    return { error: `Red: ${e instanceof Error ? e.name : 'error'}` };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });
  const secreto = Deno.env.get('CRON_SECRET');
  if (!secreto) return json(500, { error: 'Falta CRON_SECRET' });
  if (!igual(req.headers.get('x-zipa-cron') ?? '', secreto)) return json(401, { error: 'No autorizado' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const resumen = { avisos: 0, enviadas: 0, pendientes: 0, sin_dispositivos: 0, fallidas: 0, recibos: 0 };

  // 1-3. Avisos en cola (varias vueltas por llamada, hasta 500 avisos).
  for (let vuelta = 0; vuelta < 10; vuelta++) {
    const { data, error } = await db.rpc('tomar_notificaciones', { p_limite: 50 });
    if (error) return json(500, { error: 'No se pudo leer la cola' });
    const avisos = (data ?? []) as Aviso[];
    if (!avisos.length) break;
    resumen.avisos += avisos.length;

    // Un mensaje por dispositivo; se recuerda a qué aviso y token corresponde cada uno.
    const destinos: { aviso: number; token_id: string }[] = [];
    const mensajes: unknown[] = [];
    for (const a of avisos) {
      for (const t of a.tokens) {
        destinos.push({ aviso: a.id, token_id: t.id });
        mensajes.push({ to: t.token, title: a.title, body: a.body, data: a.data, sound: 'default', priority: 'high', channelId: 'reservas', ttl: 86_400 });
      }
    }
    const tickets = new Map<number, Ticket[]>(avisos.map((a) => [a.id, []]));
    const fallaGeneral = new Map<number, string>();
    for (let i = 0; i < mensajes.length; i += LOTE) {
      const r = await enviarLote(mensajes.slice(i, i + LOTE));
      destinos.slice(i, i + LOTE).forEach((d, j) => {
        if ('error' in r) fallaGeneral.set(d.aviso, r.error);
        else {
          const t = r.tickets[j];
          tickets.get(d.aviso)!.push(t?.status === 'ok'
            ? { token_id: d.token_id, status: 'ok', ticket_id: t.id }
            : { token_id: d.token_id, status: 'error', error: t?.details?.error ?? 'Error' });
        }
      });
    }
    for (const a of avisos) {
      const general = fallaGeneral.get(a.id) ?? null;
      const { data: estado } = await db.rpc('registrar_envio_notificacion', { p_id: a.id, p_tickets: general ? [] : tickets.get(a.id), p_error: general });
      if (estado === 'enviada') resumen.enviadas++;
      else if (estado === 'pendiente') resumen.pendientes++;
      else if (estado === 'sin_dispositivos') resumen.sin_dispositivos++;
      else if (estado === 'fallida') resumen.fallidas++;
    }
  }

  // 4. Recibos.
  const { data: pend } = await db.rpc('recibos_pendientes', { p_limite: 1000 });
  const porTicket = new Map<string, number>(((pend ?? []) as { id: number; ticket_id: string }[]).map((d) => [d.ticket_id, d.id]));
  if (porTicket.size) {
    try {
      const res = await fetch(RECEIPTS_URL, { method: 'POST', headers: encabezados(), body: JSON.stringify({ ids: [...porTicket.keys()] }), signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const body = await res.json();
        const recibos = Object.entries((body?.data ?? {}) as Record<string, { status: string; details?: { error?: string } }>)
          .filter(([ticket]) => porTicket.has(ticket))
          .map(([ticket, r]) => ({ id: porTicket.get(ticket), status: r.status === 'ok' ? 'ok' : 'error', error: r.details?.error ?? null }));
        if (recibos.length) {
          const { data: n } = await db.rpc('registrar_recibos', { p_recibos: recibos });
          resumen.recibos = Number(n ?? 0);
        }
      }
    } catch {
      // Se reintenta en la siguiente llamada (los recibos duran 24 horas).
    }
  }

  console.log(JSON.stringify({ envio: resumen }));
  return json(200, resumen);
});
