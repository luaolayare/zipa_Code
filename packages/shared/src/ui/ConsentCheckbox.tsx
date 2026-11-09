import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

/**
 * Casilla obligatoria de aceptación. Empieza sin marcar; quien la usa no deja seguir hasta que se marque.
 * Los enlaces abren los documentos sin cambiar el estado de la casilla.
 */
export function ConsentCheckbox({ checked, onChange, onOpenTerms, onOpenPrivacy, invalid = false }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  invalid?: boolean;
}) {
  const toggle = () => onChange(!checked);
  return (
    <View style={styles.row}>
      <Pressable
        role="checkbox"
        aria-checked={checked}
        accessibilityLabel="Acepto los Términos y condiciones y autorizo el tratamiento de mis datos según la Política de privacidad"
        onPress={toggle}
        hitSlop={8}
        style={styles.hit}>
        <View style={[styles.box, checked && styles.boxOn, invalid && !checked && styles.boxInvalid]}>
          {checked && <Text style={styles.check} accessible={false}>✓</Text>}
        </View>
      </Pressable>
      <Text style={styles.label} onPress={toggle} accessible={false}>
        Acepto los{' '}
        <Text style={styles.link} onPress={onOpenTerms} accessibilityRole="link">Términos y condiciones</Text>
        {' '}y autorizo el tratamiento de mis datos según la{' '}
        <Text style={styles.link} onPress={onOpenPrivacy} accessibilityRole="link">Política de privacidad</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginTop: -10 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.inputBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  boxInvalid: { borderColor: colors.danger },
  check: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', lineHeight: 18 },
  label: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textBody },
  link: { color: colors.price, fontWeight: '700', textDecorationLine: 'underline' },
});
