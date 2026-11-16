// La tarjeta del negocio tal como sale en la app de clientes.
import { businessTypeLabel, categoryLabel, colors, fonts, type BusinessType, type Category } from '@zipa/shared';
import { StyleSheet, Text, View } from 'react-native';

import { initials } from './kit';

export const COVER: Record<Category, string> = { comer: '#C2381B', artesanias: '#0F6E6E', cafe_dulces: '#5A3A22' };

export function BusinessPreview({
  name,
  category,
  type: businessType,
  address,
  productCount,
}: {
  name: string;
  category: Category;
  type: BusinessType;
  address: string;
  productCount: number;
}) {
  return (
    <View style={styles.frame}>
      <View style={styles.card}>
        <View style={[styles.cover, { backgroundColor: COVER[category] }]}>
          <View style={styles.logo}><Text style={styles.logoText}>{initials(name)}</Text></View>
          {productCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{productCount} {productCount === 1 ? 'producto' : 'productos'}</Text></View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>{name || 'Tu negocio'}</Text>
          <Text style={styles.meta} numberOfLines={1}>{categoryLabel(category)} · {address || 'Sin dirección'}</Text>
          <View style={styles.tags}>
            <Text style={styles.tag}>{businessTypeLabel(businessType)}</Text>
            <Text style={styles.meta}>Nuevo · aún sin reseñas</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.stage3d, borderRadius: 30, padding: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cover: { height: 150, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 84, height: 84, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: fonts.display, fontSize: 32, color: colors.text, letterSpacing: -0.5 },
  badge: { position: 'absolute', left: 14, bottom: 14, backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  body: { padding: 18, gap: 6 },
  name: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.text, letterSpacing: -0.3 },
  meta: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.textMuted },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  tag: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.accentText, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
});
