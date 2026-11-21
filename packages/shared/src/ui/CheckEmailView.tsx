import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Button } from './Button';

/** Después de crear la cuenta: Supabase envió un correo con el enlace para activarla. */
export function CheckEmailView({ email, onContinue }: { email: string; onContinue: () => void }) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Text style={styles.title} accessibilityRole="header">Revisa tu correo</Text>
      <Text style={styles.body}>
        Te enviamos un enlace a <Text style={styles.strong}>{email}</Text>. Ábrelo para activar tu cuenta y después entra con tu contraseña.
      </Text>
      <Text style={styles.hint}>Si no lo ves en unos minutos, busca en la carpeta de correo no deseado.</Text>
      <Button title="Ya lo confirmé, entrar" onPress={onContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.md },
  title: { ...typography.title, fontWeight: '700', color: colors.text },
  body: { ...typography.body, color: colors.textBody },
  strong: { fontWeight: '700', color: colors.text },
  hint: { ...typography.caption, color: colors.textMuted },
});
