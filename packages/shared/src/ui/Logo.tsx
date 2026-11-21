import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BRAND, LOGO_IMAGE } from '../brand';
import { colors, fonts } from '../theme';

/**
 * Logo de LocalmenteTuyo: el símbolo (LOGO_IMAGE en brand.ts) y el nombre. Si LOGO_IMAGE es null se
 * dibuja el cuadro mostaza con una tienda.
 *
 * - tone 'light': para fondos oscuros (texto blanco).
 * - suffix: segunda palabra en mostaza, ej. "Negocios".
 * - showName false: solo el símbolo.
 */
export function Logo({
  size = 36,
  tone = 'dark',
  suffix,
  showName = true,
}: {
  size?: number;
  tone?: 'dark' | 'light';
  suffix?: string;
  showName?: boolean;
}) {
  const label = suffix ? `${BRAND.name} ${suffix}` : BRAND.name;
  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel={label}>
      {LOGO_IMAGE ? (
        <Image source={LOGO_IMAGE} style={{ width: size, height: size, borderRadius: size * 0.28 }} resizeMode="contain" />
      ) : (
        <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.28 }]}>
          <StoreGlyph size={size * 0.56} />
        </View>
      )}
      {showName && (
        <Text style={[styles.text, { fontSize: Math.round(size * 0.56), color: tone === 'light' ? '#FFFFFF' : colors.text }]} numberOfLines={1}>
          {BRAND.name}
          {!!suffix && <Text style={{ color: colors.accent }}> {suffix}</Text>}
        </Text>
      )}
    </View>
  );
}

// Ícono "store" de Lucide (licencia ISC), el mismo que usaba el logo hasta ahora.
function StoreGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" />
      <Path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" />
      <Path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  mark: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.display, letterSpacing: -0.3, flexShrink: 1 },
});
