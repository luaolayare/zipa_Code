import { colors, fonts, spacing, typography } from '@zipa/shared';
import { Star } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Estrella rellena + calificación ("4,8"). */
export function Rating({ value, size = 14, fontSize = typography.caption.fontSize, color = colors.star, textColor = colors.text, gap = spacing.xxs, children }: {
  value: string;
  size?: number;
  fontSize?: number;
  color?: string;
  textColor?: string;
  gap?: number;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.row, { gap }]}>
      <Star size={size} color={color} fill={color} strokeWidth={0} />
      <Text style={[styles.value, { fontSize, color: textColor }]}>{value}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  value: { fontFamily: fonts.bold },
});
