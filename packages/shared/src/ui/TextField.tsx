import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius } from '../theme';

export function TextField({ label, hint, style, onFocus, onBlur, ...props }: { label: string; hint?: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {/* El estilo de la pantalla se suma al del campo (antes lo reemplazaba y el campo quedaba sin borde ni fondo). */}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor="#8A928F"
        {...props}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[styles.input, props.multiline && styles.multiline, focused && styles.focused, style]}
      />
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    fontSize: 16.5,
    fontFamily: fonts.regular,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  multiline: { minHeight: 110, paddingTop: 14, textAlignVertical: 'top' },
  focused: { borderColor: colors.primary },
  hint: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.textMuted },
});
