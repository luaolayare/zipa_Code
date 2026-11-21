// La tarjeta del negocio tal como sale en la app de clientes.
import { businessCover, businessTypeLabel, colors, fonts, mainCategoryName, mainOf, type BusinessType, type Classified, radius, spacing, typography } from '@zipa/shared';
import { Image, StyleSheet, Text, View } from 'react-native';

import { initials } from './kit';

export function BusinessPreview({
  logoUri = null,
  name,
  of,
  type: businessType,
  address,
  productCount,
}: {
  logoUri?: string | null;
  name: string;
  of: Classified;
  type: BusinessType;
  address: string;
  productCount: number;
}) {
  return (
    <View style={styles.frame}>
      <View style={styles.card}>
        <View style={[styles.cover, { backgroundColor: businessCover(of).cover }]}>
          <View style={styles.logo}>
            {logoUri ? <Image source={{ uri: logoUri }} style={styles.logoImage} accessibilityLabel={`Logo de ${name || 'tu negocio'}`} /> : <Text style={styles.logoText}>{initials(name)}</Text>}
          </View>
          {productCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{productCount} {productCount === 1 ? 'producto' : 'productos'}</Text></View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>{name || 'Tu negocio'}</Text>
          <Text style={styles.meta} numberOfLines={1}>{mainCategoryName(mainOf(of))} · {address || 'Sin dirección'}</Text>
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
  frame: { backgroundColor: colors.stage3d, borderRadius: radius.xl, padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cover: { height: 150, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 84, height: 84, borderRadius: radius.xl, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  logoText: { ...typography.title, color: colors.text },
  badge: { position: 'absolute', left: 14, bottom: 14, backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
  badgeText: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  body: { padding: spacing.lg, gap: spacing.xs },
  name: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted },
  tags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xxs },
  tag: { ...typography.caption, fontFamily: fonts.bold, color: colors.accentText, backgroundColor: colors.accentSoft, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.pill, overflow: 'hidden' },
});
