// "¿Tienes negocio?": explica qué gana un negocio y lleva a la app de negocios.
import { BRAND, PlateArt, colors, fonts } from '@zipa/shared';
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[styles.header, { paddingTop: insets.top + 22 }]}>
        <View style={styles.plate} pointerEvents="none"><PlateArt category="artesanias" size={150} /></View>
        <Text style={styles.kicker}>Para restaurantes y emprendedores</Text>
        <Text style={styles.title} accessibilityRole="header">Muestra tu vitrina en video con tu celular</Text>
      </View>

      <View style={styles.body}>
        {PASOS.map(([title, text], i) => (
          <View key={title} style={styles.step}>
            <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          </View>
        ))}

        <View style={styles.qr}>
          <View style={styles.qrIcon}><QrCode size={40} color={colors.text} /></View>
          <View style={{ flex: 1, gap: 4 }}>
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
  header: { backgroundColor: colors.primary, paddingHorizontal: 22, paddingBottom: 30, gap: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },
  plate: { position: 'absolute', right: -24, top: 18, opacity: 0.9, transform: [{ rotate: '10deg' }] },
  kicker: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onPrimaryMuted },
  title: { fontFamily: fonts.hero, fontSize: 38, lineHeight: 41, letterSpacing: -1.2, color: '#FFFFFF', maxWidth: 320, marginTop: 70 },
  body: { padding: 20, gap: 14 },
  step: { flexDirection: 'row', gap: 16, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  num: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.display, fontSize: 19, color: colors.text },
  stepTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.text },
  stepText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  qr: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  qrIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },
  cta: { minHeight: 58, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  ctaText: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
});
