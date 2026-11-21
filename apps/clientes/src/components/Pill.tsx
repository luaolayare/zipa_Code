import { fonts, radius, spacing, typography } from '@zipa/shared';
import { StyleSheet, Text } from 'react-native';

/** Etiqueta en píldora: "Emprendimiento local", "Clásico de la zona". */
export function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return <Text style={[styles.pill, { backgroundColor: bg, color: fg }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  pill: { ...typography.caption, fontFamily: fonts.bold, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
});
