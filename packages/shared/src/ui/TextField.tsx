import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius } from '../theme';

export function TextField({ label, style, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {/* El estilo de la pantalla se suma al del campo (antes lo reemplazaba y el campo quedaba sin borde ni fondo). */}
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.textMuted} {...props} style={[styles.input, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D6D0C5',
    borderRadius: radius.sm + 2,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});
