import { PlateArt, colors, fonts, formatCop, type Category, type Product } from '@zipa/shared';
import { router } from 'expo-router';
import { Play } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

/** Tarjeta de producto en la grilla del negocio: foto (o ilustración), nombre, precio y botón. */
export function ProductCard({ product: p, category, seed }: { product: Product; category: Category; seed: number }) {
  const hasVideo = p.videoStatus === 'aprobado' && !!p.videoPath;
  const open = () => router.push({ pathname: '/producto/[id]', params: { id: p.id } });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${p.name}, ${formatCop(p.priceCop)}${p.available ? '' : ', no disponible hoy'}${hasVideo ? ', con video' : ''}`} onPress={open} style={({ pressed }) => [styles.card, !p.available && styles.off, pressed && { opacity: 0.88 }]}>
      <View style={[styles.thumb, { backgroundColor: seed % 2 ? colors.stage3d : '#F1ECE3' }]}>
        {p.photoUrl ? <Image source={{ uri: p.photoUrl }} style={styles.photo} /> : <PlateArt category={category} size={120} seed={seed} />}
        {!p.available && <Text style={styles.badgeOff}>No disponible hoy</Text>}
        {hasVideo && (
          <View style={styles.badgeVideo}>
            <Play size={16} color={colors.text} fill={colors.text} strokeWidth={2} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{p.name}</Text>
        <Text style={styles.price}>{formatCop(p.priceCop)}</Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>{hasVideo ? 'Ver video' : 'Ver'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', flexGrow: 1, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  off: { opacity: 0.6 },
  badgeOff: { position: 'absolute', left: 10, bottom: 10, fontSize: 11.5, fontFamily: fonts.bold, backgroundColor: colors.text, color: '#FFFFFF', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  thumb: { height: 130, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  badgeVideo: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 14, gap: 6 },
  name: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
  price: { fontFamily: fonts.bold, fontSize: 17, color: colors.price },
  button: { marginTop: 4, minHeight: 44, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
});
