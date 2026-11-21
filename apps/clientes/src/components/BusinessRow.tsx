import { businessSpecialty, businessTypeLabel, categoryLabel, colors, formatDistance, radius, spacing, typography, formatPriceLevel, formatRating, type Business } from '@zipa/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Cover } from './Cover';
import { Pill } from './Pill';
import { Rating } from './Rating';

export const openBusiness = (id: string) => router.push({ pathname: '/negocio/[id]', params: { id } });

/**
 * Fila de lista.
 * - `classic` (Clásicos de la zona): miniatura 76, "especialidad · distancia · $$".
 * - `result` (búsqueda y categorías): miniatura 64, "subcategoría · distancia" y etiqueta de tipo.
 */
export function BusinessRow({ business: b, variant }: { business: Business; variant: 'classic' | 'result' }) {
  const classic = variant === 'classic';
  const emp = b.type === 'emprendimiento';
  const meta = (classic
    ? [businessSpecialty(b), formatDistance(b.distanceM), formatPriceLevel(b.priceLevel)]
    : [b.subcategoryName ?? categoryLabel(b.category), formatDistance(b.distanceM)]
  ).filter(Boolean).join(' · ');

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={b.name} onPress={() => openBusiness(b.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Cover business={b} circle={classic ? 46 : 40} ring={4} style={classic ? styles.thumbClassic : styles.thumbResult} />
      <View style={styles.info}>
        <Text style={styles.name}>{b.name}</Text>
        <Text style={styles.meta}>{meta}</Text>
        <Rating value={formatRating(b.rating)} gap={8}>
          {classic ? null : (
            <Pill label={businessTypeLabel(b.type)} bg={emp ? colors.accentSoft : colors.primarySoft} fg={emp ? colors.accentText : colors.primary} />
          )}
        </Rating>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.lg },
  pressed: { opacity: 0.85 },
  thumbClassic: { width: 76, height: 76, borderRadius: radius.md },
  thumbResult: { width: 64, height: 64, borderRadius: radius.md },
  info: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  name: typography.subtitle,
  meta: typography.caption,
});
