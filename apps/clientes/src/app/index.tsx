import { BRAND, colors, fonts } from '@zipa/shared';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Box, ScanQrCode, Store } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openNegociosApp } from '@/lib/negocios';

// Bienvenida. El turista llega aquí, normalmente desde el QR de su hotel o de un negocio.
export default function Welcome() {
  const insets = useSafeAreaInsets();

  // Texto claro sobre el fondo verde; al salir vuelve a oscuro.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <View style={[styles.screen, { paddingTop: 28 + insets.top, paddingBottom: 32 + insets.bottom }]}>
      {/* Decoración: anillo que sale por la derecha y cuadro mostaza con el sello 3D. */}
      <View style={styles.ring} accessible={false} importantForAccessibility="no-hide-descendants" />
      <View style={styles.cube} accessible={false} importantForAccessibility="no-hide-descendants">
        <Box size={48} color={colors.text} strokeWidth={1.8} />
      </View>

      <View style={styles.logoRow} accessibilityRole="header">
        <View style={styles.logo}>
          <Store size={20} color={colors.text} strokeWidth={2.2} />
        </View>
        <Text style={styles.brand}>{BRAND.name}</Text>
      </View>

      <View style={styles.spacer} />

      <View style={styles.copy}>
        <Text style={styles.title}>Lo mejor de {BRAND.city}, hecho aquí.</Text>
        <Text style={styles.subtitle}>
          Restaurantes y emprendimientos de la zona en un solo lugar. Mira en 3D lo que vas a pedir o comprar, y cuéntale a otros viajeros cómo te fue.
        </Text>
      </View>

      <View style={styles.qrCard}>
        <ScanQrCode size={28} color={colors.accent} strokeWidth={2} />
        <Text style={styles.qrText}>Llegaste por el QR de tu hotel. Te mostramos lo que hay cerca de ti.</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <Text style={styles.ctaText}>Empezar a explorar</Text>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={openNegociosApp} style={styles.bizLink} hitSlop={4}>
        <Text style={styles.bizLinkText}>¿Tienes un negocio? Regístralo aquí</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary, paddingHorizontal: 24, gap: 22, overflow: 'hidden' },
  // En el prototipo: 260 de ancho + borde 36 por lado = 332 en total.
  ring: { position: 'absolute', right: -70, top: 120, width: 332, height: 332, borderRadius: 166, borderWidth: 36, borderColor: colors.primaryDeep },
  cube: { position: 'absolute', right: 30, top: 210, width: 90, height: 90, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '14deg' }] },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 20, fontFamily: fonts.display, color: '#FFFFFF' },

  spacer: { flex: 1 },

  copy: { gap: 12 },
  title: { fontSize: 40, lineHeight: 42, letterSpacing: -0.8, fontFamily: fonts.display, color: '#FFFFFF' },
  subtitle: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular, color: colors.onPrimaryMuted },

  qrCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.primaryDeep },
  qrText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: '#E6F0EF' },

  cta: { height: 56, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.9 },
  ctaText: { fontSize: 17, fontFamily: fonts.bold, color: colors.text },
  bizLink: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  bizLinkText: { fontSize: 14, fontFamily: fonts.bold, color: colors.accent, textAlign: 'center' },
});
