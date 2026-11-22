// Edge Function: el equipo (rol admin, con segundo factor) elimina un negocio, por ejemplo uno de prueba.
// No la usan las apps: la llama el panel con la sesión aal2 de quien la ejecuta.
//
// Desplegar (con verificación de JWT, la opción por defecto):
//   npx supabase functions deploy eliminar-negocio
//
// Usar:
//   POST https://<proyecto>.supabase.co/functions/v1/eliminar-negocio
//   Authorization: Bearer <access token>
//   {"business_id":"<uuid>","nombre":"<nombre exacto del negocio>","motivo":"Negocio de prueba"}
//
// Qué hace:
// 1. Comprueba que quien llama es admin con MFA (public.is_admin('admin'), con SU JWT) y que el nombre
//    escrito coincide con el del negocio (confirmación).
// 2. Registra en admin_actions qué se borró (nombre, dueño, estado, municipio y conteos).
// 3. Borra el negocio. Por los "on delete cascade" se borran sus productos, fotos, reseñas, reservas,
//    QR, contacto, etiquetas, verificación y destacados. La analítica queda sin el negocio (set null).
//    La cuenta del dueño NO se borra.
// 4. Borra sus archivos: logo, foto del local, fotos y videos de productos ("<dueño>/<negocio>/") y las
//    fotos de las reseñas que recibió ("<cliente>/<negocio>/").
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const BUCKETS_DEL_NEGOCIO = ['negocios', 'verificaciones', 'productos', 'videos'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Lista todos los archivos bajo una carpeta, entrando a las subcarpetas. */
async function listFiles(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    if (/not found/i.test(error.message)) return files;
    throw error;
  }
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;
    if (item.id === null) files.push(...(await listFiles(admin, bucket, path)));
    else files.push(path);
  }
  return files;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Falta la sesión' });
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error: userError } = await asUser.auth.getUser(token);
  if (userError || !user) return json(401, { error: 'Sesión no válida' });
  const { data: esAdmin, error: rolError } = await asUser.rpc('is_admin', { min_role: 'admin' });
  if (rolError) return json(500, { error: 'No se pudo comprobar el rol' });
  if (esAdmin !== true) return json(403, { error: 'Solo un administrador, con verificación en dos pasos, puede eliminar negocios' });

  let body: { business_id?: string; nombre?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'El cuerpo debe ser JSON' });
  }
  const businessId = body.business_id ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) return json(400, { error: 'business_id no válido' });
  const motivo = (body.motivo ?? '').trim();
  if (motivo.length < 5 || motivo.length > 300) return json(400, { error: 'Escribe el motivo (entre 5 y 300 caracteres).' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: b, error: readError } = await admin
    .from('businesses')
    .select('id, name, owner_id, status, municipio_codigo, created_at')
    .eq('id', businessId)
    .maybeSingle();
  if (readError) return json(500, { error: readError.message });
  if (!b) return json(404, { error: 'El negocio no existe (quizá ya se eliminó)' });
  if ((body.nombre ?? '').trim() !== b.name) return json(400, { error: 'El nombre escrito no coincide con el del negocio' });

  const contar = async (tabla: string) => (await admin.from(tabla).select('id', { count: 'exact', head: true }).eq('business_id', businessId)).count ?? 0;
  const [productos, resenas, reservas] = await Promise.all([contar('products'), contar('reviews'), contar('reservations')]);
  const { data: autores } = await admin.from('reviews').select('user_id').eq('business_id', businessId);

  // Archivos a borrar (se listan antes de borrar la fila).
  const archivos: { bucket: string; paths: string[] }[] = [];
  try {
    for (const bucket of BUCKETS_DEL_NEGOCIO) archivos.push({ bucket, paths: await listFiles(admin, bucket, `${b.owner_id}/${businessId}`) });
    const resenaPaths: string[] = [];
    for (const uid of new Set((autores ?? []).map((a) => a.user_id as string))) resenaPaths.push(...(await listFiles(admin, 'resenas', `${uid}/${businessId}`)));
    archivos.push({ bucket: 'resenas', paths: resenaPaths });
  } catch (e) {
    return json(500, { error: `No se pudieron listar los archivos del negocio: ${(e as Error).message}` });
  }
  const totalArchivos = archivos.reduce((n, a) => n + a.paths.length, 0);

  // Bitácora primero: queda constancia aunque algo falle después.
  const { error: auditError } = await admin.from('admin_actions').insert({
    admin_id: user.id,
    action: 'eliminar_negocio',
    target_type: 'business',
    target_id: businessId,
    details: { nombre: b.name, dueno: b.owner_id, estado: b.status, municipio: b.municipio_codigo, creado: b.created_at, productos, resenas, reservas, archivos: totalArchivos, motivo },
  });
  if (auditError) return json(500, { error: `No se pudo registrar en la bitácora: ${auditError.message}` });

  const { error: deleteError } = await admin.from('businesses').delete().eq('id', businessId);
  if (deleteError) return json(500, { error: `No se pudo eliminar el negocio: ${deleteError.message}` });

  let errorArchivos: string | null = null;
  for (const { bucket, paths } of archivos) {
    for (let i = 0; i < paths.length; i += 1000) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 1000));
      if (error) errorArchivos = `${bucket}: ${error.message}`;
    }
  }
  if (errorArchivos) return json(200, { ok: true, aviso: `El negocio se eliminó, pero algunos archivos no se borraron (${errorArchivos}).` });
  return json(200, { ok: true, nombre: b.name, productos, resenas, reservas, archivos: totalArchivos });
});
