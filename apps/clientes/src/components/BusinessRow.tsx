import { businessTypeLabel, categoryLabel, colors, radius, type Business } from '@zipa/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function BusinessRow({ business, badge }: { business: Business; badge?: string }) {
  const emp = business.type === 'emprendimiento';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/negocio/[id]', params: { id: business.id } })}
      style={styles.row}>
      <View style={[styles.cover, { backgroundColor: emp ? colors.price : colors.primary }]}>
        <Text style={styles.initials}>{business.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        {!!badge && <Text style={styles.badge}>{badge}</Text>}
        <Text style={styles.name}>{business.name}</Text>
        <Text style={styles.meta}>{categoryLabel(business.category)} · {business.address}</Text>
        <View style={styles.line}>
          <Text style={styles.rating}>★ {business.rating?.toFixed(1).replace('.', ',') ?? 'Nuevo'}</Text>
          <Text style={[styles.tag, emp ? styles.tagEmp : styles.tagCons]}>{businessTypeLabel(business.type)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, padding: 10, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cover: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  badge: { fontSize: 11, fontWeight: '700', color: colors.accentText, textTransform: 'uppercase' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  line: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rating: { fontSize: 13, fontWeight: '700', color: colors.text },
  tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  tagEmp: { backgroundColor: colors.accentSoft, color: colors.accentText },
  tagCons: { backgroundColor: colors.primarySoft, color: colors.primary },
});
