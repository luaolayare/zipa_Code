import { colors, fonts, radius, spacing, typography } from '@zipa/shared';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

/** Elección única en forma de píldoras (categorías). */
export function OptionChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.id)} style={({ pressed }) => [styles.chip, on && styles.on, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Elección única en tarjetas grandes con título y descripción (tipo de negocio). */
export function OptionCards<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; title: string; description: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  // En celulares angostos van una debajo de otra, para que los títulos no se partan.
  const stacked = useWindowDimensions().width < 400;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.cards, stacked && styles.cardsStacked]} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.id)} style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.cardTitle, stacked && styles.cardTitleStacked]}>{o.title}</Text>
              <Text style={styles.cardBody}>{o.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 50, paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  textOn: { color: '#FFFFFF' },
  cards: { flexDirection: 'row', gap: spacing.sm },
  cardsStacked: { flexDirection: 'column', gap: spacing.sm },
  cardTitleStacked: { ...typography.subtitle },
  card: { flex: 1, padding: spacing.md, gap: spacing.xs, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  cardOn: { borderColor: colors.primary, backgroundColor: colors.stage3d },
  // 16: "Emprendimiento" cabe completo en media pantalla sin partirse.
  cardTitle: { ...typography.body, fontFamily: fonts.display, color: colors.text },
  cardBody: { ...typography.body, color: colors.textMuted },
});
