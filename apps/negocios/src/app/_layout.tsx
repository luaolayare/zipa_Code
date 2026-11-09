import { AuthProvider, colors } from '@zipa/shared';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { RegistroProvider } from '@/components/RegistroContext';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  return (
    <AuthProvider client={supabase}>
      <RegistroProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </RegistroProvider>
    </AuthProvider>
  );
}
