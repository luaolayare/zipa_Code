import { BRAND, colors, fonts } from '@zipa/shared';
import { Store } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

/** "Zipa lo tiene Negocios" con el cuadro mostaza. `light`: sobre fondo oscuro. */
export function Logo({ light = false }: { light?: boolean }) {
  const base = BRAND.negociosApp.replace(/\s*Negocios$/, '');
  return (
    <View style={styles.row} accessible accessibilityLabel={BRAND.negociosApp}>
      <View style={styles.mark}>
        <Store size={24} color={colors.text} strokeWidth={2.2} />
      </View>
      <Text style={[styles.text, { color: light ? '#FFFFFF' : colors.text }]}>
        {base} <Text style={{ color: colors.accent }}>Negocios</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.3 },
});
