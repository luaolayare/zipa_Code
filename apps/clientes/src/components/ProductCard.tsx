import { PlateArt, colors, fonts, formatCop, radius, sizes, spacing, typography, type Product, availabilityLabels, type Classified } from '@zipa/shared';
import { router } from 'expo-router';
import { Play } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

/** Tarjeta de producto en la grilla del negocio: foto (o ilustración), nombre, precio y botón. */
export function ProductCard({ product: p, business, seed }: { product: Product; business: Classified; seed: number }) {
  const labels = availabilityLabels(business);
  const hasVideo = p.videoStatus === 'aprobado' && !!p.videoPath;
  const open = () => router.push({ pathname: '/producto/[id]', params: { id: p.id } });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${p.name}, ${formatCop(p.priceCop)}${p.available ? '' : `, ${labels.off.toLowerCase()}`}${hasVideo ? ', con video' : ''}`} onPress={open} style={({ pressed }) => [styles.card, !p.available && styles.off, pressed && { opacity: 0.88 }]}>
      <View style={[styles.thumb, { backgroundColor: seed % 2 ? colors.stage3d : colors.neutralSoft }]}>
        {p.photoUrl ? <Image source={{ uri: p.photoUrl }} style={styles.photo} /> : <PlateArt of={business} size={120} seed={seed} />}
        {!p.available && <Text style={styles.badgeOff}>{labels.off}</Text>}
        {p.available && p.photos.length > 0 && <Text style={styles.badgeOff}>{p.photos.length + 1} fotos</Text>}
        {hasVideo && (
          <View style={styles.badgeVideo}>
            <Play size={16} color={colors.text} fill={colors.text} strokeWidth={2} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={3}>{p.name}</Text>
        <Text style={styles.price}>{formatCop(p.priceCop)}</Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>{hasVideo ? 'Ver video' : 'Ver'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', flexGrow: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  off: { opacity: 0.6 },
  badgeOff: { position: 'absolute', left: spacing.sm, bottom: spacing.sm, ...typography.caption, fontFamily: fonts.bold, backgroundColor: colors.text, color: '#FFFFFF', paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radius.pill, overflow: 'hidden' },
  thumb: { height: 130, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  badgeVideo: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.sm, gap: spacing.xs }, // 12: la tarjeta mide media pantalla
  name: { ...typography.body, fontFamily: fonts.bold, color: colors.text }, // 16 en la cuadrícula de dos columnas: el nombre cabe en 2 líneas
  price: { ...typography.label, fontFamily: fonts.bold, fontSize: typography.subtitle.fontSize, color: colors.price },
  button: { marginTop: spacing.xxs, minHeight: sizes.touchMin, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...typography.label, fontFamily: fonts.bold, color: colors.primary },
});
