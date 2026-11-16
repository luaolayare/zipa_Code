import { NextResponse, type NextRequest } from 'next/server';

import { supabaseServer } from '@/lib/supabase/server';

// Cerrar sesión (formulario POST para que no se pueda disparar con un enlace).
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/entrar', request.url), { status: 303 });
}
