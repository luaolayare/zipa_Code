import { businessSpecialty, businessTypeLabel, categoryLabel, colors, fonts, formatDistance, formatPriceLevel, formatRating, type Business } from '@zipa/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Cover } from './Cover';
import { Pill } from './Pill';
import { Rating } from './Rating';

export const openBusiness = (id: string) => router.push({ pathname: '/negocio/[id]', params: { id } });

/**
 * Fila de lista.
 * - `classic` (Clásicos de la zona): miniatura 76, "especialidad · distancia · $$" y sello "N en 3D".
 * - `result` (resultados de búsqueda): miniatura 64, "categoría · distancia" y etiqueta de tipo.
 */
export function BusinessRow({ business: b, variant }: { business: Business; variant: 'classic' | 'result' }) {
  const classic = variant === 'classic';
  const emp = b.type === 'emprendimiento';
  const meta = (classic
    ? [businessSpecialty(b), formatDistance(b.distanceM), formatPriceLevel(b.priceLevel)]
    : [categoryLabel(b.category), formatDistance(b.distanceM)]
  ).filter(Boolean).join(' · ');

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={b.name} onPress={() => openBusiness(b.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Cover business={b} circle={classic ? 46 : 40} ring={4} style={classic ? styles.thumbClassic : styles.thumbResult} />
      <View style={styles.info}>
        <Text style={styles.name}>{b.name}</Text>
        <Text style={styles.meta}>{meta}</Text>
        <Rating value={formatRating(b.rating)} gap={8}>
          {classic ? (
            <Pill label={`${b.productCount} en 3D`} bg={colors.primarySoft} fg={colors.primary} />
          ) : (
            <Pill label={businessTypeLabel(b.type)} bg={emp ? colors.accentSoft : colors.primarySoft} fg={emp ? colors.accentText : colors.primary} />
          )}
        </Rating>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20 },
  pressed: { opacity: 0.85 },
  thumbClassic: { width: 76, height: 76, borderRadius: 14 },
  thumbResult: { width: 64, height: 64, borderRadius: 14 },
  info: { flex: 1, gap: 4, minWidth: 0 },
  name: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
});
