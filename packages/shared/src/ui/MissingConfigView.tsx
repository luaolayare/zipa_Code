import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BRAND } from '../brand';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Se muestra si una compilación de producción no tiene las variables de Supabase.
 * Reemplaza a la app entera: así nunca se ven datos de ejemplo como si fueran reales.
 */
export function MissingConfigView() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.box} accessibilityRole="alert">
        <Text style={styles.title} accessibilityRole="header">No pudimos conectarnos</Text>
        <Text style={styles.body}>
          {BRAND.name} no está disponible en este momento. Actualiza la app desde la tienda o escríbenos a [CORREO DE SOPORTE].
        </Text>
        <Text style={styles.code}>Código: CONFIG-SUPABASE</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  box: { margin: spacing.xl, padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  title: { ...typography.heading, fontWeight: '700', color: colors.text },
  body: { ...typography.body, color: colors.textBody },
  code: { ...typography.caption, color: colors.textMuted },
});
