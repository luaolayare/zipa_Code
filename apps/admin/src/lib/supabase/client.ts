import { createBrowserClient } from '@supabase/ssr';

/** Cliente de Supabase en el navegador (con la sesión de la persona del equipo). */
export const supabaseBrowser = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
