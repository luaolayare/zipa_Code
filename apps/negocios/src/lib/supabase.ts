import { createSupabase } from '@zipa/shared';

// Copia .env.example a .env y llena estos valores con los de tu proyecto de Supabase.
// Si están vacíos: en desarrollo se usan datos de ejemplo; una compilación de producción muestra un error.
export const supabase = createSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
