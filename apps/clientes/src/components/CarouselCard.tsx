import { businessSpecialty, colors, fonts, formatDistance, formatRating, type Business } from '@zipa/shared';
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
  card: { width: 210, backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderBottomWidth: 2, borderColor: colors.border },
  pressed: { opacity: 0.85 },
  cover: { height: 120 },
  badgeFeatured: { position: 'absolute', left: 10, top: 10, fontSize: 11.5, fontFamily: fonts.bold, backgroundColor: colors.text, color: colors.accent, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  body: { padding: 12, gap: 4 },
  name: { fontSize: 15, lineHeight: 19, fontFamily: fonts.bold, color: colors.text },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  count: { fontSize: 13, fontFamily: fonts.medium, color: colors.textMuted },
});
