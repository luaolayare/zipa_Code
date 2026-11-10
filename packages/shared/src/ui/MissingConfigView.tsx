import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BRAND } from '../brand';
import { colors } from '../theme';

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
  box: { margin: 24, padding: 20, gap: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.textBody },
  code: { fontSize: 12, color: colors.textMuted },
});
