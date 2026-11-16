import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { CREDITS } from '../brand';
import { colors, fonts } from '../theme';
import { Logo } from './Logo';

/** Sección «Acerca de». Los datos salen de CREDITS (brand.ts). */
export function AboutCard({ suffix }: { suffix?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.overline} accessibilityRole="header">Acerca de</Text>
      <Logo size={32} suffix={suffix} />
      <View style={{ gap: 2 }}>
        <Text style={styles.line}>Desarrollado por <Text style={styles.strong}>{CREDITS.developedBy}</Text></Text>
        <Text style={styles.line}>Desarrollo: {CREDITS.developer}</Text>
      </View>
      <Pressable accessibilityRole="link" accessibilityHint="Abre el sitio en el navegador" onPress={() => Linking.openURL(CREDITS.site)} hitSlop={6} style={styles.linkWrap}>
        <Text style={styles.link}>{CREDITS.site.replace(/^https?:\/\//, '').replace(/\/$/, '')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  overline: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  line: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textBody },
  strong: { fontFamily: fonts.bold, color: colors.text },
  linkWrap: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  link: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary, textDecorationLine: 'underline' },
});
