import { businessSpecialty, colors, formatRating, radius, spacing, typography, type Business } from '@zipa/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { openBusiness } from './BusinessRow';
import { Rating } from './Rating';

/** Tarjeta verde de "Lo más destacado": puesto, sobretítulo, nombre y calificación. */
export function RankCard({ business: b, rank, badge }: { business: Business; rank: number; badge: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${badge}: ${b.name}`} onPress={() => openBusiness(b.id)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.rank}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.badge}>{badge}</Text>
        <Text style={styles.name}>{b.name}</Text>
        <Text style={styles.meta}>{businessSpecialty(b)} · {b.reviewCount} reseñas</Text>
      </View>
      <Rating value={formatRating(b.rating)} size={16} fontSize={16} color={colors.accent} textColor="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.md, backgroundColor: colors.primary, borderRadius: radius.lg },
  pressed: { opacity: 0.9 },
  rank: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  rankText: { ...typography.heading, color: colors.text },
  info: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  badge: { ...typography.overline, color: colors.accent },
  name: { ...typography.subtitle, color: '#FFFFFF' },
  meta: { ...typography.caption, color: colors.onPrimaryMuted },
});
