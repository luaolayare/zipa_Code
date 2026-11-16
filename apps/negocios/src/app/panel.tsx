// Panel del negocio: estado, cifras, productos, reseñas, QR y cuenta.
import { Button, DeleteAccountButton, businessTypeLabel, categoryLabel, colors, fonts, formatRating, useAuth, type Business, type Product, type Review } from '@zipa/shared';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, Pencil, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice, SectionTitle, StatusPill, type } from '@/components/kit';
import { ProductRow, ReviewItem, Stat } from '@/components/PanelPieces';
import { QrMini } from '@/components/QrPoster';
import { draftFromBusiness, useRegistro } from '@/components/RegistroContext';

export default function Panel() {
  const { api, user, signOut } = useAuth();
  const { update, reset } = useRegistro();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return router.replace('/');
    try {
      const b = await api.myBusiness(user.id);
      if (!b) return router.replace('/registro/datos'); // tiene cuenta pero aún no registró el negocio
      const [p, r] = await Promise.all([api.myProducts(b.id), api.listReviews(b.id)]);
      setBusiness(b);
      setProducts(p);
      setReviews(r);
      setError('');
    } catch {
      setError('No pudimos cargar tu panel. Revisa tu conexión y desliza hacia abajo para intentar de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, user]);

  // Se recarga cada vez que la pantalla vuelve a verse (después de editar un producto, por ejemplo).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!business) {
    return (
      <SafeAreaView style={[styles.loading, { padding: 24, gap: 16 }]}>
        <Text style={type.error}>{error || 'No encontramos tu negocio.'}</Text>
        <Button title="Intentar de nuevo" onPress={() => { setLoading(true); load(); }} />
      </SafeAreaView>
    );
  }

  const comer = business.category === 'comer';
  const word = comer ? 'plato' : 'producto';
  const rating = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : null;
  const in3d = products.filter((p) => p.modelUrl).length;

  const resume = () => {
    reset();
    update(draftFromBusiness(business));
    router.push('/registro/datos');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFFFFF" />}>
        <View style={styles.header}>
          <SafeAreaView edges={['top']} style={styles.headerInner}>
            <Text style={styles.kicker}>Panel de tu negocio</Text>
            <Text style={styles.name}>{business.name}</Text>
            <StatusPill status={business.status} />
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {!!error && <Notice tone="danger">{error}</Notice>}
          {business.status === 'en_revision' && (
            <Notice tone="warn">Estamos revisando tus datos. Cuando tu negocio quede publicado lo verás aquí. Mientras tanto puedes agregar y mejorar tus productos.</Notice>
          )}
          {business.status === 'rechazado' && (
            <Notice tone="danger">
              <View style={{ gap: 12 }}>
                <Text style={[styles.noticeText, { color: colors.danger }]}>Revisamos tu negocio y no pudimos publicarlo. Revisa tus datos y la foto de tu local, y envíalo de nuevo.</Text>
                <Button title="Revisar y enviar de nuevo" variant="danger" onPress={resume} />
              </View>
            </Notice>
          )}
          {business.status === 'borrador' && (
            <Notice tone="warn">
              <View style={{ gap: 12 }}>
                <Text style={[styles.noticeText, { color: colors.accentText }]}>Tu registro quedó sin terminar. Completa la verificación para que podamos revisarlo.</Text>
                <Button title="Terminar mi registro" variant="accent" onPress={resume} />
              </View>
            </Notice>
          )}

          <View style={styles.stats}>
            <Stat value={rating == null ? '—' : formatRating(rating)} label={rating == null ? 'Calificación: aún sin reseñas' : 'Calificación'} />
            <Stat value={String(reviews.length)} label={reviews.length === 1 ? 'Reseña' : 'Reseñas'} />
            <Stat value={String(products.length)} label={in3d ? `Productos · ${in3d} en 3D` : 'Productos'} />
          </View>

          <SectionTitle
            title={comer ? 'Tu menú' : 'Tu vitrina'}
            action={
              <Pressable accessibilityRole="button" accessibilityLabel={`Agregar ${word}`} onPress={() => router.push('/producto/nuevo')} style={({ pressed }) => [styles.add, pressed && { opacity: 0.8 }]}>
                <Plus size={18} color={colors.text} strokeWidth={2.6} />
                <Text style={styles.addText}>Agregar</Text>
              </Pressable>
            }
          />
          {products.length === 0 ? (
            <Text style={type.body}>Aún no tienes {word}s. Agrega el primero con su foto y un video para la vista 3D.</Text>
          ) : (
            products.map((p) => <ProductRow key={p.id} product={p} category={business.category} onPress={() => router.push({ pathname: '/producto/[id]', params: { id: p.id } })} />)
          )}
          {products.some((p) => p.videoPath && !p.modelUrl) && (
            <Text style={type.small}>Los productos con «3D en preparación» se ven con su foto mientras tanto.</Text>
          )}

          <SectionTitle title="Reseñas de clientes" style={{ marginTop: 10 }} />
          {reviews.length === 0 ? (
            <Text style={type.body}>Todavía no tienes reseñas. Cuando un cliente califique tu negocio la verás aquí y podrás responderle.</Text>
          ) : (
            reviews.map((r) => (
              <ReviewItem key={r.id} review={r} onReplied={(reply) => setReviews((rs) => rs.map((x) => (x.id === r.id ? { ...x, reply } : x)))} />
            ))
          )}

          <Pressable accessibilityRole="button" accessibilityLabel="Ver e imprimir tu QR" onPress={() => router.push('/qr')} style={({ pressed }) => [styles.qrCard, pressed && { opacity: 0.9 }]}>
            <View style={styles.qrBox}><QrMini businessId={business.id} /></View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={type.h3}>Tu QR para mesas y mostrador</Text>
              <Text style={type.small}>Lleva directo a tu vitrina y a dejar reseña. Toca para verlo grande y compartirlo.</Text>
            </View>
          </Pressable>

          <SectionTitle title="Datos del negocio" style={{ marginTop: 10 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Editar los datos del negocio" onPress={() => router.push('/negocio/editar')} style={({ pressed }) => [styles.data, pressed && { opacity: 0.9 }]}>
            <DataRow label="Tipo" value={`${businessTypeLabel(business.type)} · ${categoryLabel(business.category)}`} />
            <DataRow label="Dirección" value={business.address} />
            <DataRow label="Horario" value={business.hours || 'Sin horario'} />
            <DataRow label="WhatsApp" value={business.whatsapp || 'Sin número'} />
            <View style={styles.edit}>
              <Pencil size={16} color={colors.primary} />
              <Text style={styles.editText}>Editar datos</Text>
              <ChevronRight size={18} color={colors.primary} />
            </View>
          </Pressable>

          <View style={styles.account}>
            <Text style={type.overline}>Tu cuenta</Text>
            <Text style={type.small}>{user?.email}</Text>
            <Button title="Cerrar sesión" variant="outline" onPress={async () => { await signOut(); reset(); router.replace('/'); }} />
            <View style={styles.legalLinks}>
              <Button variant="link" title="Términos y condiciones" onPress={() => router.push('/legal/terminos')} />
              <Button variant="link" title="Política de privacidad" onPress={() => router.push('/legal/privacidad')} />
            </View>
            <DeleteAccountButton
              loses="tu cuenta, tu negocio, sus productos, fotos y videos, y las reseñas que ha recibido"
              onDeleted={() => { reset(); router.replace('/'); }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { backgroundColor: colors.dark, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerInner: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 28, gap: 12 },
  kicker: { fontFamily: fonts.semibold, fontSize: 15, color: '#AFC2BE' },
  name: { fontFamily: fonts.hero, fontSize: 36, lineHeight: 39, letterSpacing: -1, color: '#FFFFFF' },
  body: { padding: 20, gap: 16 },
  noticeText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  stats: { flexDirection: 'row', gap: 10 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5, borderColor: colors.text },
  addText: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  qrCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, marginTop: 10, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  qrBox: { padding: 6, borderRadius: 12, backgroundColor: '#FFFFFF' },
  data: { borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, paddingTop: 4 },
  dataRow: { flexDirection: 'row', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dataLabel: { width: 84, fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  dataValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  edit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  editText: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.primary },
  account: { marginTop: 16, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
