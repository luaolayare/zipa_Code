import { businessSpecialty, colors, fonts, formatDistance, radius, spacing, typography, formatRating, type Business } from '@zipa/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { openBusiness } from './BusinessRow';
import { Cover } from './Cover';
import { Rating } from './Rating';

/** Tarjeta del carrusel "Recién llegados". */
export function CarouselCard({ business: b, badge }: { business: Business; badge?: string }) {
  const meta = [businessSpecialty(b), formatDistance(b.distanceM)].filter(Boolean).join(' · ');
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={b.name} onPress={() => openBusiness(b.id)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Cover business={b} circle={76} ring={6} style={styles.cover}>
        {!!badge && <Text style={styles.badgeFeatured}>{badge}</Text>}
      </Cover>
      <View style={styles.body}>
        <Text style={styles.name}>{b.name}</Text>
        <Text style={styles.meta}>{meta}</Text>
        <Rating value={formatRating(b.rating)}>
          <Text style={styles.count}>({b.reviewCount})</Text>
        </Rating>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Borde de 1 y una línea extra abajo, como el box-shadow del prototipo.
  card: { width: 210, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderBottomWidth: 2, borderColor: colors.border },
  pressed: { opacity: 0.85 },
  cover: { height: 120 },
  badgeFeatured: { position: 'absolute', left: spacing.sm, top: spacing.sm, ...typography.caption, fontFamily: fonts.bold, backgroundColor: colors.text, color: colors.accent, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radius.pill, overflow: 'hidden' },
  body: { padding: spacing.sm, gap: spacing.xxs },
  name: typography.subtitle,
  meta: typography.caption,
  count: typography.caption,
});
