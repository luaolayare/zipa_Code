import { createSupabase } from '@zipa/shared';

// Copia .env.example a .env y llena estos valores con los de tu proyecto de Supabase.
// Si están vacíos, la app funciona con datos de ejemplo.
export const supabase = createSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
