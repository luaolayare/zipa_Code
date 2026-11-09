import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth';
import { colors } from '../theme';
import { confirmAsync } from './confirm';

/**
 * "Eliminar mi cuenta" con confirmación. Exigencia de App Store y Google Play.
 * `loses`: lo que la persona pierde, dicho en sus palabras (ej. "tu perfil y tus reseñas").
 */
export function DeleteAccountButton({ loses, onDeleted }: { loses: string; onDeleted: () => void }) {
  const { deleteAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    const ok = await confirmAsync(
      '¿Eliminar tu cuenta?',
      `Se borrarán ${loses}. Esta acción no se puede deshacer.`,
      'Eliminar cuenta',
      true,
    );
    if (!ok) return;
    setError('');
    setLoading(true);
    try {
      await deleteAccount();
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos eliminar tu cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityHint="Pide confirmación antes de borrar" onPress={run} disabled={loading} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        {loading ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.text}>Eliminar mi cuenta</Text>}
      </Pressable>
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  button: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  pressed: { opacity: 0.7 },
  text: { fontSize: 15, fontWeight: '700', color: colors.danger },
  error: { color: colors.danger, fontWeight: '600' },
});
