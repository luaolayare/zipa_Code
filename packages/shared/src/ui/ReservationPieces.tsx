// Piezas de interfaz de reservas que usan las dos apps.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RESERVATION_STATUS, type ReservationStatus } from '../reservations';
import { colors, fonts } from '../theme';

const TONES = {
  warn: { bg: colors.accentSoft, fg: colors.accentText },
  success: { bg: '#DCEFE2', fg: colors.success },
  danger: { bg: '#F9DED6', fg: colors.danger },
  muted: { bg: colors.chipIdle, fg: colors.textMuted },
};

/** Estado de la solicitud en una píldora de color. */
export function ReservationPill({ status }: { status: ReservationStatus }) {
  const s = RESERVATION_STATUS[status];
  const t = TONES[s.tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]} accessibilityLabel={`Estado: ${s.label}`}>
      <Text style={[styles.pillText, { color: t.fg }]}>{s.label}</Text>
    </View>
  );
}

/** Elección única en píldoras (fechas, horas, motivos). Con `label` se anuncia como grupo. */
export function ChoiceChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
  wrap = true,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  wrap?: boolean;
}) {
  return (
    <View style={[styles.row, !wrap && { flexWrap: 'nowrap' }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={String(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.id)}
            style={({ pressed }) => [styles.chip, on && styles.on, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Número con botones − y + (personas, cantidades). */
export function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper} accessibilityLabel={`${label}: ${value}`}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Menos (${label})`} disabled={value <= min} onPress={() => onChange(value - 1)} style={[styles.round, value <= min && { opacity: 0.35 }]} hitSlop={6}>
        <Text style={styles.roundText}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Más (${label})`} disabled={value >= max} onPress={() => onChange(value + 1)} style={[styles.round, value >= max && { opacity: 0.35 }]} hitSlop={6}>
        <Text style={styles.roundText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontFamily: fonts.bold, fontSize: 13.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  textOn: { color: '#FFFFFF' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, lineHeight: 26 },
  value: { minWidth: 28, textAlign: 'center', fontFamily: fonts.display, fontSize: 24, color: colors.text },
});
