import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Crea el cliente de Supabase. Si faltan las variables de entorno devuelve null:
 * en desarrollo las apps usan datos de ejemplo (demo.ts); en producción muestran un error.
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
