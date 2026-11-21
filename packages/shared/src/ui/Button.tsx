import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius, sizes, spacing, typography } from '../theme';

type Variant = 'primary' | 'accent' | 'outline' | 'link' | 'danger' | 'dark';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode; // ícono a la izquierda del texto
  style?: ViewStyle;
}) {
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.base, v.box, pressed && styles.pressed, disabled && styles.dim, style]}>
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, v.text]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const variants = {
  primary: { box: { backgroundColor: colors.primary }, text: { color: '#FFFFFF' } },
  accent: { box: { backgroundColor: colors.accent }, text: { color: colors.text } },
  dark: { box: { backgroundColor: colors.dark }, text: { color: '#FFFFFF' } },
  outline: { box: { borderWidth: 1.5, borderColor: colors.text, backgroundColor: 'transparent' }, text: { color: colors.text } },
  danger: { box: { borderWidth: 1.5, borderColor: colors.danger, backgroundColor: 'transparent' }, text: { color: colors.danger } },
  link: { box: { backgroundColor: 'transparent', minHeight: sizes.touchMin }, text: { color: colors.primary, textDecorationLine: 'underline' as const } },
};

const styles = StyleSheet.create({
  base: { minHeight: sizes.button, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { ...typography.subtitle, textAlign: 'center' }, // el color lo pone cada variante
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  dim: { opacity: 0.5 },
});
