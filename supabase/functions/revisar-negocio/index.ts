// Edge Function: el equipo de revisión publica o rechaza un negocio, y la foto del local se borra.
// No la usan las apps: la llama el panel administrativo con la sesión de una persona del equipo.
//
// Quién puede llamarla (migración 0008): alguien en public.admin_users (rol 'revisor' o 'admin')
// con sesión verificada con segundo factor (MFA, aal2). Lo comprueba public.is_admin() con el JWT
// de quien llama. Solo después se usa la service role, dentro de la función.
//
// Desplegar (con verificación de JWT, la opción por defecto):
//   npx supabase functions deploy revisar-negocio
//
// Usar (desde el panel, con el access token de la sesión aal2):
//   POST https://<proyecto>.supabase.co/functions/v1/revisar-negocio
//   Authorization: Bearer <access token>
//   {"business_id":"<uuid>","decision":"publicado"}      (o "rechazado")
//
// Qué hace:
// 1. Cambia el negocio de "en_revision" a "publicado" o "rechazado".
// 2. Borra la foto del local del bucket privado "verificaciones".
// 3. Deja constancia en business_verifications (reviewed_at, photo_deleted_at) y vacía photo_path.
//    La cédula/NIT se conserva como soporte de la verificación.
// 4. Registra la decisión en admin_actions (quién, qué y cuándo).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const DECISIONES = ['publicado', 'rechazado'] as const;
type Decision = (typeof DECISIONES)[number];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Quién llama, y si es del equipo con MFA. is_admin() corre con SU JWT, no con la service role.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Falta la sesión' });

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await asUser.auth.getUser(token);
  if (userError || !user) return json(401, { error: 'Sesión no válida' });

  const { data: esEquipo, error: rolError } = await asUser.rpc('is_admin', { min_role: 'revisor' });
  if (rolError) return json(500, { error: 'No se pudo comprobar el rol' });
  if (esEquipo !== true) return json(403, { error: 'Solo el equipo de revisión, con verificación en dos pasos' });

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

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

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
  let fotoError: string | null = null;
  if (verification?.photo_path) {
    const { error: removeError } = await admin.storage.from('verificaciones').remove([verification.photo_path]);
    if (removeError) fotoError = removeError.message;
  }
  if (!fotoError) {
    const { error: logError } = await admin
      .from('business_verifications')
      .update({ photo_path: null, reviewed_at: now, photo_deleted_at: verification?.photo_path ? now : null })
      .eq('business_id', businessId);
    if (logError) fotoError = logError.message;
  }

  // 4. Bitácora: se registra la decisión aunque haya fallado el borrado de la foto.
  const { error: auditError } = await admin.from('admin_actions').insert({
    admin_id: user.id,
    action: decision === 'publicado' ? 'publicar_negocio' : 'rechazar_negocio',
    target_type: 'business',
    target_id: businessId,
    details: { foto_borrada: !!verification?.photo_path && !fotoError, error_foto: fotoError },
  });
  if (auditError) console.error('revisar-negocio: no se pudo escribir la bitácora', businessId, auditError.message);

  // El estado ya cambió: si la foto no se pudo borrar, avisar para borrarla desde el panel.
  if (fotoError) return json(500, { error: `Decisión guardada, pero no se pudo borrar la foto: ${fotoError}` });

  return json(200, { ok: true, business_id: businessId, decision, foto_borrada: !!verification?.photo_path });
});
