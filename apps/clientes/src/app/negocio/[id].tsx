import { Button, Card, Screen, businessTypeLabel, categoryLabel, colors, confirmAsync, formatCop, useAuth, type Business, type Product, type Review } from '@zipa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ban, Flag } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function NegocioDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadReviews = useCallback(() => api.listReviews(id, user?.id).then(setReviews), [api, id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      api.getBusiness(id).then(setBusiness);
      api.listProducts(id).then(setProducts);
      loadReviews();
    }, [api, id, loadReviews]),
  );

  if (!business) return <Screen><Text>Cargando…</Text></Screen>;

  const rate = () => {
    if (!user) return router.push('/login'); // calificar exige iniciar sesión
    router.push({ pathname: '/calificar/[id]', params: { id } });
  };

  // Reportar y bloquear exigen sesión, para poder revisar el reporte y recordar el bloqueo.
  const report = (tipo: 'review' | 'business', targetId: string, nombre: string) => {
    if (!user) return router.push('/login');
    router.push({ pathname: '/reportar', params: { tipo, id: targetId, nombre } });
  };

  const block = async (r: Review) => {
    if (!user) return router.push('/login');
    const ok = await confirmAsync(
      `¿Bloquear a ${r.authorName}?`,
      'Dejarás de ver sus reseñas en todos los negocios. Puedes desbloquearlo después.',
      'Bloquear',
      true,
    );
    if (!ok) return;
    await api.blockUser(user.id, r.userId);
    await loadReviews();
  };

  return (
    <Screen>
      <Button variant="link" title="‹ Volver" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Text style={styles.tag}>{businessTypeLabel(business.type)}</Text>
      <Text style={styles.title}>{business.name}</Text>
      <Text style={styles.meta}>{categoryLabel(business.category)} · {business.address}</Text>
      {!!business.hours && <Text style={styles.open}>{business.hours}</Text>}

      <Card style={styles.ratingCard}>
        <Text style={styles.big}>{business.rating?.toFixed(1).replace('.', ',') ?? '–'}</Text>
        <Text style={[styles.meta, { flex: 1 }]}>{business.reviewCount} reseñas</Text>
        <Button title="Calificar" onPress={rate} style={{ minHeight: 44 }} />
      </Card>

      <Text style={styles.h2}>{business.category === 'comer' ? 'Menú en 3D' : 'Vitrina en 3D'}</Text>
      {products.map((p) => (
        <Card key={p.id}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.price}>{formatCop(p.priceCop)}</Text>
          <Button title="Ver en 3D" variant="outline" onPress={() => router.push({ pathname: '/producto/[id]', params: { id: p.id, name: p.name } })} />
        </Card>
      ))}

      <Text style={styles.h2}>Lo que dicen los clientes</Text>
      {reviews.map((r) => (
        <Card key={r.id}>
          <View style={styles.row}>
            <Text style={styles.name}>{r.authorName}</Text>
            <Text style={styles.stars}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</Text>
          </View>
          <Text style={styles.body}>{r.text}</Text>
          {!!r.reply && <Text style={styles.reply}>Respuesta del negocio: {r.reply}</Text>}
          {r.userId !== user?.id && (
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Reportar la reseña de ${r.authorName}`} onPress={() => report('review', r.id, `Reseña de ${r.authorName}`)} style={styles.action}>
                <Flag size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.actionText}>Reportar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Bloquear a ${r.authorName}`} onPress={() => block(r)} style={styles.action}>
                <Ban size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.actionText}>Bloquear usuario</Text>
              </Pressable>
            </View>
          )}
        </Card>
      ))}
      {reviews.length === 0 && <Text style={styles.meta}>Aún no hay reseñas. ¡Sé el primero!</Text>}

      <Pressable accessibilityRole="button" onPress={() => report('business', business.id, business.name)} style={[styles.action, styles.reportBusiness]}>
        <Flag size={14} color={colors.textMuted} strokeWidth={2} />
        <Text style={styles.actionText}>Reportar este negocio</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', color: colors.accentText, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted },
  open: { fontSize: 14, color: colors.success, fontWeight: '600' },
  ratingCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { fontSize: 32, fontWeight: '700', color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  price: { fontSize: 15, fontWeight: '700', color: colors.price },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  stars: { color: '#8A5A00', fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20, color: '#2E3A38' },
  reply: { fontSize: 13, color: colors.textMuted, backgroundColor: colors.background, padding: 10, borderRadius: 10 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  reportBusiness: { alignSelf: 'center', marginTop: 8 },
});
