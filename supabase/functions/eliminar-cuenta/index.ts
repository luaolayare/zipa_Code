// Edge Function: elimina la cuenta de quien la llama y todo lo asociado.
// Exigencia de App Store (5.1.1(v)) y Google Play: borrar la cuenta desde la app.
//
// Desplegar:  npx supabase functions deploy eliminar-cuenta
// Supabase entrega SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY automáticamente.
//
// Qué borra:
// 1. Los archivos del usuario en Storage (convención: todo lo suyo va en la carpeta "<user_id>/").
// 2. El usuario de Auth. Por los "on delete cascade" de las migraciones, eso borra su perfil,
//    sus reseñas, su negocio (con productos, verificación y las reseñas que recibió),
//    sus aceptaciones (consents), sus reportes y sus bloqueos.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// Buckets donde las apps guardan archivos de usuarios (ver migración 0005 de Storage cuando exista).
const BUCKETS = ['verificaciones', 'productos', 'negocios'];

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
    // Bucket que todavía no existe: no hay nada que borrar ahí.
    if (/not found/i.test(error.message)) return files;
    throw error;
  }
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;
    if (item.id === null) files.push(...(await listFiles(admin, bucket, path))); // carpeta
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

  // Quién llama: solo se puede borrar la propia cuenta.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Falta la sesión' });

  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await asUser.auth.getUser(token);
  if (userError || !user) return json(401, { error: 'Sesión no válida' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    for (const bucket of BUCKETS) {
      const files = await listFiles(admin, bucket, user.id);
      // Storage acepta borrar hasta 1000 rutas por llamada.
      for (let i = 0; i < files.length; i += 1000) {
        const { error } = await admin.storage.from(bucket).remove(files.slice(i, i + 1000));
        if (error) throw error;
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return json(200, { ok: true });
  } catch (e) {
    console.error('eliminar-cuenta', user.id, e);
    return json(500, { error: 'No pudimos eliminar la cuenta' });
  }
});
