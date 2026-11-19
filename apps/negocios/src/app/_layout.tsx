import { APP_FONTS, AuthProvider, colors, useAuth } from '@zipa/shared';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { RegistroProvider } from '@/components/RegistroContext';
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
    <AuthProvider client={supabase}>
      <RegistroProvider>
        <StatusBar style="dark" />
        <Navegacion />
      </RegistroProvider>
    </AuthProvider>
  );
}

// Las pantallas esperan a que se recupere la sesión guardada: así el panel no cree que no hay
// sesión mientras se está cargando (y no manda a la persona a la bienvenida).
function Navegacion() {
  const { loading, api, user } = useAuth();
  usePushSetup(api, user?.id ?? null); // notificaciones: token del dispositivo y abrir el detalle al tocar un aviso
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="grabar" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
