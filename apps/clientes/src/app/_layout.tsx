import { APP_FONTS, AuthProvider, colors, deviceStore, useAuth } from '@zipa/shared';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { CiudadProvider } from '@/lib/ciudad';
import { usePushSetup } from '@/lib/notificaciones';
import { supabase } from '@/lib/supabase';

// El splash se queda hasta que carguen las fuentes, para no ver el texto cambiar.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(APP_FONTS);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AuthProvider client={supabase} storage={deviceStore} app="clientes">
      <CiudadProvider>
        <AppOpen />
        <PushSetup />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="ciudad" options={{ presentation: 'modal' }} />
        </Stack>
      </CiudadProvider>
    </AuthProvider>
  );
}

/** Cuenta una apertura de la app (analítica anónima, migración 0015). */
function AppOpen() {
  const { api } = useAuth();
  useEffect(() => { api.track('app_open'); }, [api]);
  return null;
}

/** Notificaciones: token del dispositivo con sesión y abrir el detalle al tocar un aviso. */
function PushSetup() {
  const { api, user } = useAuth();
  usePushSetup(api, user?.id ?? null);
  return null;
}
