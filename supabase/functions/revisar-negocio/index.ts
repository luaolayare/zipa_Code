// Edge Function: el equipo de revisión publica o rechaza un negocio, y la foto del local se borra.
// No la usan las apps: la llama el equipo con un token propio (no con la sesión de un usuario).
//
// Configurar y desplegar:
//   npx supabase secrets set REVISION_TOKEN=<un valor largo y aleatorio que solo tenga el equipo>
//   npx supabase functions deploy revisar-negocio --no-verify-jwt
//
// Usar:
//   curl -X POST https://<proyecto>.supabase.co/functions/v1/revisar-negocio \
//     -H "Authorization: Bearer <REVISION_TOKEN>" -H "Content-Type: application/json" \
//     -d '{"business_id":"<uuid>","decision":"publicado"}'      (o "rechazado")
//
// Qué hace:
// 1. Cambia el negocio de "en_revision" a "publicado" o "rechazado".
// 2. Borra la foto del local del bucket privado "verificaciones".
// 3. Deja constancia en business_verifications (reviewed_at, photo_deleted_at) y vacía photo_path.
//    La cédula/NIT se conserva como soporte de la verificación.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const DECISIONES = ['publicado', 'rechazado'] as const;
type Decision = (typeof DECISIONES)[number];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Compara sin filtrar por tiempo cuántos caracteres coinciden. */
function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  const expected = Deno.env.get('REVISION_TOKEN') ?? '';
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!expected) return json(500, { error: 'Falta configurar REVISION_TOKEN' });
  if (!sameSecret(token, expected)) return json(401, { error: 'No autorizado' });

  let body: { business_id?: string; decision?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'El cuerpo debe ser JSON' });
  }
  const businessId = body.business_id ?? '';
  const decision = body.decision as Decision;
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) return json(400, { error: 'business_id no válido' });
  if (!DECISIONES.includes(decision)) return json(400, { error: 'decision debe ser "publicado" o "rechazado"' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // 1. Solo se decide sobre negocios que están en revisión.
  const { data: updated, error: statusError } = await admin
    .from('businesses')
    .update({ status: decision })
    .eq('id', businessId)
    .eq('status', 'en_revision')
    .select('id');
  if (statusError) return json(500, { error: statusError.message });
  if (!updated?.length) return json(409, { error: 'El negocio no existe o no está en revisión' });

  // 2 y 3. Borrar la foto y dejar constancia.
  const { data: verification, error: readError } = await admin
    .from('business_verifications')
    .select('photo_path')
    .eq('business_id', businessId)
    .maybeSingle();
  if (readError) return json(500, { error: readError.message });

  const now = new Date().toISOString();
  if (verification?.photo_path) {
    const { error: removeError } = await admin.storage.from('verificaciones').remove([verification.photo_path]);
    // El estado ya cambió: avisar para reintentar el borrado (la función se puede volver a llamar
    // poniendo el negocio en revisión, o borrar la foto desde el panel de Supabase).
    if (removeError) return json(500, { error: `Decisión guardada, pero no se pudo borrar la foto: ${removeError.message}` });
  }
  const { error: logError } = await admin
    .from('business_verifications')
    .update({ photo_path: null, reviewed_at: now, photo_deleted_at: verification?.photo_path ? now : null })
    .eq('business_id', businessId);
  if (logError) return json(500, { error: logError.message });

  return json(200, { ok: true, business_id: businessId, decision, foto_borrada: !!verification?.photo_path });
});
