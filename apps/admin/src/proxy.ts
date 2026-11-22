// Se ejecuta antes de cada página: renueva la sesión (cookies) y manda a /entrar a quien no
// tiene sesión. Es solo un primer filtro: cada página vuelve a comprobar rol y MFA (lib/auth.ts),
// y la base de datos lo exige de nuevo con RLS e is_admin().
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/entrar'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && !PUBLIC.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Nada del panel se guarda en cachés intermedias.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  // Fuera del control de sesión: archivos de Next, el ícono y las imágenes públicas (logo).
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
