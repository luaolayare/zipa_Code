import { Button, colors } from '@zipa/shared';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export const TOTAL_STEPS = 5;

export function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <View style={styles.wrap}>
      <Button variant="link" title="‹ Atrás" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Text style={styles.step}>Paso {step} de {TOTAL_STEPS}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.bars} accessibilityElementsHidden>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i < step ? colors.primary : '#DCD6CC' }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  step: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  bars: { flexDirection: 'row', gap: 6, marginTop: 4 },
  bar: { flex: 1, height: 6, borderRadius: 999 },
});
