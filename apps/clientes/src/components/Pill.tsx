import { fonts } from '@zipa/shared';
import { StyleSheet, Text } from 'react-native';

/** Etiqueta en píldora: "Emprendimiento local", "2 en 3D". */
export function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return <Text style={[styles.pill, { backgroundColor: bg, color: fg }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  pill: { fontSize: 11, fontFamily: fonts.bold, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
});
