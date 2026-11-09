import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme';

type Variant = 'primary' | 'accent' | 'outline' | 'link';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.base, v.box, (pressed || disabled) && styles.dim, style]}>
      {loading ? <ActivityIndicator color={v.text.color} /> : <Text style={[styles.label, v.text]}>{title}</Text>}
    </Pressable>
  );
}

const variants = {
  primary: { box: { backgroundColor: colors.primary }, text: { color: '#FFFFFF' } },
  accent: { box: { backgroundColor: colors.accent }, text: { color: colors.text } },
  outline: { box: { borderWidth: 1, borderColor: colors.text, backgroundColor: 'transparent' }, text: { color: colors.text } },
  link: { box: { backgroundColor: 'transparent', minHeight: 44 }, text: { color: colors.primary, textDecorationLine: 'underline' as const } },
};

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { fontSize: 16, fontWeight: '700' },
  dim: { opacity: 0.6 },
});
