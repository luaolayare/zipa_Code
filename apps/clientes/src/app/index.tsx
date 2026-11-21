import { BRAND, Logo, colors, fonts, radius, spacing, typography, useAuth } from '@zipa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Box, ScanQrCode } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openNegociosApp } from '@/lib/negocios';

// Bienvenida. El turista llega aquí, normalmente desde el QR de su hotel o de un negocio.
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { origen, lugar } = useLocalSearchParams<{ origen?: string; lugar?: string }>();
  const { user } = useAuth();

  // Texto claro sobre el fondo verde; al salir vuelve a oscuro.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <View style={[styles.screen, { paddingTop: spacing.xxl + insets.top, paddingBottom: spacing.xxl + insets.bottom }]}>
      {/* Decoración: anillo que sale por la derecha y cuadro mostaza. */}
      <View style={styles.ring} aria-hidden />
      <View style={styles.cube} aria-hidden>
        <Box size={48} color={colors.text} strokeWidth={1.8} />
      </View>

      <View accessibilityRole="header">
        <Logo size={36} tone="light" />
      </View>

      <View style={styles.spacer} />

      <View style={styles.copy}>
        <Text style={styles.title}>{BRAND.slogan}</Text>
        <Text style={styles.subtitle}>
          Restaurantes, emprendimientos, artesanos y comercios locales en un solo lugar. Mira fotos y videos de lo que ofrecen, reserva o escríbeles, y cuéntale a otros cómo te fue.
        </Text>
      </View>

      {/* Solo si la app se abrió desde un QR impreso: vitrinalocal://?origen=qr&lugar=Hotel%20X (scheme de app.json) */}
      {origen === 'qr' && (
        <View style={styles.qrCard}>
          <ScanQrCode size={28} color={colors.accent} strokeWidth={2} />
          <Text style={styles.qrText}>
            {lugar ? `Llegaste por el QR de ${lugar}.` : 'Llegaste por un código QR.'} Estos son los negocios de la zona.
          </Text>
        </View>
      )}

      <Pressable accessibilityRole="button" onPress={() => (user ? router.replace('/explorar') : router.push('/login'))} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <Text style={styles.ctaText}>Empezar a explorar</Text>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={openNegociosApp} style={styles.bizLink} hitSlop={4}>
        <Text style={styles.bizLinkText}>¿Tienes un negocio? Regístralo aquí</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, gap: spacing.xl, overflow: 'hidden' },
  // En el prototipo: 260 de ancho + borde 36 por lado = 332 en total.
  ring: { position: 'absolute', right: -70, top: 120, width: 332, height: 332, borderRadius: radius.pill, borderWidth: 36, borderColor: colors.primaryDeep },
  cube: { position: 'absolute', right: 30, top: 210, width: 90, height: 90, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '14deg' }] },


  spacer: { flex: 1 },

  copy: { gap: spacing.sm },
  title: { ...typography.display, fontFamily: fonts.display, color: '#FFFFFF' },
  subtitle: { ...typography.body, color: colors.onPrimaryMuted },

  qrCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primaryDeep },
  qrText: { ...typography.body, flex: 1, color: colors.onPrimaryMuted },

  cta: { height: 56, borderRadius: radius.lg, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.9 },
  ctaText: { ...typography.subtitle, color: colors.text },
  bizLink: { alignSelf: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minHeight: 44, justifyContent: 'center' },
  bizLinkText: { ...typography.label, fontFamily: fonts.bold, color: colors.accent, textAlign: 'center' },
});
