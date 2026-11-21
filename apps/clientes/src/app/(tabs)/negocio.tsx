// "¿Tienes negocio?": explica qué gana un negocio y lleva a la app de negocios.
import { BRAND, PlateArt, colors, radius, spacing, typography } from '@zipa/shared';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { QrCode } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openNegociosApp } from '@/lib/negocios';

const PASOS: [string, string][] = [
  ['Graba un video de 20 segundos', 'Da una vuelta alrededor de tu plato o producto con el celular. Sin equipos especiales.'],
  ['Lo revisamos', 'El equipo aprueba el video. Mientras tanto, tu producto se muestra con su foto.'],
  ['Aparece en tu vitrina', 'Los turistas ven tu producto en video antes de llegar.'],
];

export default function TienesNegocio() {
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <View style={[styles.header, { paddingTop: insets.top + 22 }]}>
        <View style={styles.plate} pointerEvents="none"><PlateArt art="artesania" main="emprendimientos" size={150} /></View>
        <Text style={styles.kicker}>Para restaurantes y emprendedores</Text>
        <Text style={styles.title} accessibilityRole="header">Muestra tu vitrina en video con tu celular</Text>
      </View>

      <View style={styles.body}>
        {PASOS.map(([title, text], i) => (
          <View key={title} style={styles.step}>
            <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          </View>
        ))}

        <View style={styles.qr}>
          <View style={styles.qrIcon}><QrCode size={40} color={colors.text} /></View>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text style={styles.stepTitle}>Tu QR de mesa o mostrador</Text>
            <Text style={styles.stepText}>El cliente escanea, ve tus productos y al final te deja su reseña.</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={openNegociosApp} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
          <Text style={styles.ctaText}>Registrar mi negocio</Text>
        </Pressable>
        <Text style={styles.note}>Se hace desde la app {BRAND.negociosApp}. Es gratis y te pedimos tu cédula o NIT para verificar el negocio.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden' },
  plate: { position: 'absolute', right: -24, top: 18, opacity: 0.9, transform: [{ rotate: '10deg' }] },
  kicker: { ...typography.label, color: colors.onPrimaryMuted },
  title: { ...typography.display, color: '#FFFFFF', maxWidth: 320, marginTop: 70 }, // 70: deja ver la ilustración encima (posición, no ritmo)
  body: { padding: spacing.lg, gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  num: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },
  numText: { ...typography.heading, color: colors.text },
  stepTitle: { ...typography.subtitle, color: colors.text },
  stepText: { ...typography.body, color: colors.textMuted },
  qr: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  qrIcon: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },
  cta: { minHeight: 58, borderRadius: radius.lg, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  ctaText: { ...typography.subtitle, color: colors.text },
  note: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
