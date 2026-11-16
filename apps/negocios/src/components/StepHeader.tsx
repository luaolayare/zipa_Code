import { colors, fonts } from '@zipa/shared';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const TOTAL_STEPS = 5;

/** Encabezado de los 5 pasos del registro: atrás, "PASO N DE 5", título y barras de avance. */
export function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <Text style={styles.step}>Paso {step} de {TOTAL_STEPS}</Text>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
        </View>
      </View>
      <View style={styles.bars} accessibilityLabel={`Paso ${step} de ${TOTAL_STEPS}`}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i < step ? colors.primary : '#DCD6CC' }]} />
        ))}
      </View>
    </View>
  );
}

export function BackButton({ light = false, onPress }: { light?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      hitSlop={8}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      style={({ pressed }) => [styles.back, light && styles.backLight, pressed && { opacity: 0.7 }]}>
      <ChevronLeft size={24} color={light ? '#FFFFFF' : colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18, paddingBottom: 18, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  back: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  backLight: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.25)' },
  step: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.textMuted },
  title: { fontFamily: fonts.display, fontSize: 25, lineHeight: 30, letterSpacing: -0.5, color: colors.text },
  bars: { flexDirection: 'row', gap: 8 },
  bar: { flex: 1, height: 7, borderRadius: 999 },
});
