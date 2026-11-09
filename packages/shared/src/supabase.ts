import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Crea el cliente de Supabase. Si faltan las variables de entorno devuelve null
 * y las apps funcionan con datos de ejemplo (ver demo.ts).
 */
export function createSupabase(url?: string, anonKey?: string): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
