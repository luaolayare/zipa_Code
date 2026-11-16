import { colors } from '@zipa/shared';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

/** Botón circular de volver. Si no hay a dónde volver (se abrió desde un QR), va a Explorar. */
export function BackButton({ onDark = false }: { onDark?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/explorar'))}
      style={({ pressed }) => [styles.back, onDark && styles.onDark, pressed && { opacity: 0.75 }]}>
      <ChevronLeft size={24} color={colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  onDark: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'transparent' },
});
