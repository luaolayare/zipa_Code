import { colors, fonts } from '@zipa/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    <View style={{ gap: 10 }}>
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
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.cards} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.id)} style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && { opacity: 0.85 }]}>
              <Text style={styles.cardTitle}>{o.title}</Text>
              <Text style={styles.cardBody}>{o.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 50, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  textOn: { color: '#FFFFFF' },
  cards: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, padding: 16, gap: 6, borderRadius: 22, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  cardOn: { borderColor: colors.primary, backgroundColor: colors.stage3d },
  cardTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.text },
  cardBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.textMuted },
});
