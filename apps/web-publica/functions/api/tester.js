// Cloudflare Pages Function: POST /api/tester (formulario «Únete como tester» de la portada).
// Recibe el correo y las apps, y llama a registrar_tester (migración 0026) con la clave pública (anon) de Supabase.
// La web no habla con Supabase directamente. Variables de entorno en Cloudflare Pages (Settings → Variables):
//   SUPABASE_URL       https://<proyecto>.supabase.co
//   SUPABASE_ANON_KEY  la clave pública (anon) del proyecto
const responder = (ok, mensaje, status = 200) =>
  new Response(JSON.stringify({ ok, mensaje }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return responder(false, 'El formulario no está disponible en este momento. Escríbenos por correo.', 503);
  const tipo = request.headers.get('content-type') || '';
  if (!tipo.includes('application/json')) return responder(false, 'Solicitud no válida.', 415);
  const largo = Number(request.headers.get('content-length') || 0);
  if (largo > 2000) return responder(false, 'Solicitud no válida.', 413);
  let datos;
  try { datos = await request.json(); } catch { return responder(false, 'Solicitud no válida.', 400); }
  // Campo trampa: las personas no lo ven; si viene lleno, es un robot. Se responde como si todo hubiera salido bien.
  if (datos.sitio) return responder(true, 'listo');
  const correo = String(datos.correo || '').trim().toLowerCase().slice(0, 254);
  const apps = Array.isArray(datos.apps) ? datos.apps.filter((a) => a === 'clientes' || a === 'negocios') : [];
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,24}$/.test(correo)) return responder(false, 'Escribe un correo válido.', 422);
  if (!apps.length) return responder(false, 'Elige al menos una app.', 422);
  if (datos.acepta !== true) return responder(false, 'Necesitamos tu autorización para usar tu correo.', 422);
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/registrar_tester`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_correo: correo, p_apps: apps, p_acepta: true }),
    });
    if (r.ok) return responder(true, 'listo');
    const err = await r.json().catch(() => ({}));
    // Los mensajes de validación de la base (código 22023) están escritos para la persona; los demás, no.
    return responder(false, err.code === '22023' && err.message ? err.message : 'No pudimos guardar tu correo. Intenta de nuevo en un rato.', r.status === 400 ? 422 : 502);
  } catch {
    return responder(false, 'No pudimos guardar tu correo. Intenta de nuevo en un rato.', 502);
  }
}

export const onRequest = () => responder(false, 'Usa el formulario de la página principal.', 405);
