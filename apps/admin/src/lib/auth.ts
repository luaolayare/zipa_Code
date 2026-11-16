import { redirect } from 'next/navigation';

import { supabaseServer } from './supabase/server';

export type AdminRole = 'admin' | 'revisor';

/**
 * Exige: sesión, segundo factor verificado (aal2) y estar en admin_users.
 * Si falta algo, redirige a donde corresponde. Devuelve el cliente con la sesión y el rol.
 */
export async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') redirect('/verificar');

  const { data: esEquipo } = await supabase.rpc('is_admin', { min_role: 'revisor' });
  if (esEquipo !== true) redirect('/sin-acceso');
  const { data: esAdmin } = await supabase.rpc('is_admin', { min_role: 'admin' });

  return { supabase, user, role: (esAdmin === true ? 'admin' : 'revisor') as AdminRole };
}
