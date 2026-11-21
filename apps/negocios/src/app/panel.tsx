// Panel del negocio: estado, cifras, productos, reseñas, QR y cuenta.
import { AboutCard, Button, DeleteAccountButton, PushPrompt, pushStateLabel, type ReservationSettings, configuredSocial, deliverySummary, type BusinessLinks, businessTypeLabel, categoryLabel, colors, fonts, formatRating, useAuth, type Business, type Product, type Review, productWord, restaurantOf, radius, spacing, typography } from '@zipa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, Pencil, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice, SectionTitle, StatusPill, type } from '@/components/kit';
import { ProductRow, ReviewItem, Stat } from '@/components/PanelPieces';
import { QrMini } from '@/components/QrPoster';
import { usePushPrompt } from '@/lib/notificaciones';
import { draftFromBusiness, useRegistro } from '@/components/RegistroContext';

export default function Panel() {
  const { api, user, signOut } = useAuth();
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();
  const { update, reset } = useRegistro();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredUntil, setFeaturedUntil] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [links, setLinks] = useState<BusinessLinks | null>(null);
  const push = usePushPrompt(api);
  const [reservas, setReservas] = useState<{ settings: ReservationSettings | null; pending: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return router.replace('/');
    try {
      const b = await api.myBusiness(user.id);
      if (!b) return router.replace('/registro/datos'); // tiene cuenta pero aún no registró el negocio
      const [p, r, t] = await Promise.all([api.myProducts(b.id), api.listReviews(b.id), api.myQrToken(b.id)]);
      setQrToken(t);
      setBusiness(b);
      setProducts(p);
      api.myFeaturedUntil(b.id).then(setFeaturedUntil).catch(() => {});
      api.getBusinessLinks(b.id).then(setLinks).catch(() => {});
      // Reservas (solo restaurantes). Si falla, la tarjeta no se muestra; el resto del panel sigue.
      if (restaurantOf(b)) {
        Promise.all([api.getReservationSettings(b.id), api.reservationCounts(b.id)])
          .then(([settings, counts]) => setReservas({ settings, pending: counts.pendientes }))
          .catch(() => setReservas(null));
      }
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
      <SafeAreaView style={[styles.loading, { padding: spacing.xl, gap: spacing.md }]}>
        <Text style={type.error}>{error || 'No encontramos tu negocio.'}</Text>
        <Button title="Intentar de nuevo" onPress={() => { setLoading(true); load(); }} />
      </SafeAreaView>
    );
  }

  const comer = restaurantOf(business);
  const word = productWord(business);
  const rating = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : null;
  const conVideo = products.filter((p) => p.videoStatus === 'aprobado').length;
  const videosRechazados = products.filter((p) => p.videoStatus === 'rechazado').length;

  const resume = () => {
    reset();
    update(draftFromBusiness(business));
    router.push('/registro/datos');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFFFFF" />}>
        <View style={styles.header}>
          <SafeAreaView edges={['top']} style={styles.headerInner}>
            <Text style={styles.kicker}>Panel de tu negocio</Text>
            <View style={styles.titleRow}>
              {business.logoUrl ? (
                <Image source={{ uri: business.logoUrl }} style={styles.headerLogo} accessibilityLabel={`Logo de ${business.name}`} />
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel="Agregar el logo de tu negocio" onPress={() => router.push('/negocio/editar')} style={styles.headerLogoEmpty}>
                  <Text style={styles.headerLogoText}>+ Logo</Text>
                </Pressable>
              )}
              <Text style={[styles.name, { flex: 1 }]}>{business.name}</Text>
            </View>
            <StatusPill status={business.status} />
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {!!error && <Notice tone="danger">{error}</Notice>}
          {aviso === 'logo' && !business.logoUrl && (
            <Notice tone="warn">No pudimos subir tu logo. Agrégalo desde «Tus datos» o tocando «+ Logo» arriba.</Notice>
          )}
          {!!featuredUntil && (
            <Notice tone="success">{`Tu negocio está en «Destacados», en el inicio de la app, hasta el ${new Date(featuredUntil).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', timeZone: 'America/Bogota' })}.`}</Notice>
          )}
          {business.status === 'en_revision' && (
            <Notice tone="warn">Estamos revisando tus datos. Cuando tu negocio quede publicado lo verás aquí. Mientras tanto puedes agregar y mejorar tus productos.</Notice>
          )}
          {business.status === 'rechazado' && (
            <Notice tone="danger">
              <View style={{ gap: spacing.sm }}>
                <Text style={[styles.noticeText, { color: colors.danger }]}>Revisamos tu negocio y no pudimos publicarlo. Revisa tus datos y la foto de tu local, y envíalo de nuevo.</Text>
                {!!business.reviewNote && (
                  <View style={styles.note}>
                    <Text style={styles.noteLabel}>Motivo del equipo</Text>
                    <Text style={styles.noteText}>{business.reviewNote}</Text>
                  </View>
                )}
                <Button title="Revisar y enviar de nuevo" variant="danger" onPress={resume} />
              </View>
            </Notice>
          )}
          {business.status === 'borrador' && (
            <Notice tone="warn">
              <View style={{ gap: spacing.sm }}>
                <Text style={[styles.noticeText, { color: colors.accentText }]}>Tu registro quedó sin terminar. Completa la verificación para que podamos revisarlo.</Text>
                <Button title="Terminar mi registro" variant="accent" onPress={resume} />
              </View>
            </Notice>
          )}

          <View style={styles.stats}>
            <Stat value={rating == null ? '—' : formatRating(rating)} label={rating == null ? 'Calificación: aún sin reseñas' : 'Calificación'} />
            <Stat value={String(reviews.length)} label={reviews.length === 1 ? 'Reseña' : 'Reseñas'} />
            <Stat value={String(products.length)} label={conVideo ? `Productos · ${conVideo} con video` : 'Productos'} />
          </View>

          <SectionTitle
            title={comer ? 'Tu menú' : 'Tu catálogo'}
            action={
              <Pressable accessibilityRole="button" accessibilityLabel={`Agregar ${word}`} onPress={() => router.push('/producto/nuevo')} style={({ pressed }) => [styles.add, pressed && { opacity: 0.8 }]}>
                <Plus size={18} color={colors.text} strokeWidth={2.6} />
                <Text style={styles.addText}>Agregar</Text>
              </Pressable>
            }
          />
          {products.length === 0 ? (
            <Text style={type.body}>Aún no tienes {word}s. Agrega el primero con su foto y, si quieres, un video corto.</Text>
          ) : (
            <View style={styles.productList}>
            {products.map((p, i) => (
              <ProductRow
                key={p.id}
                grouped
                first={i === 0}
                product={p}
                business={business}
                onPress={() => router.push({ pathname: '/producto/[id]', params: { id: p.id } })}
                onToggleAvailable={async () => {
                  // Cambio inmediato en pantalla; si falla, se revierte.
                  setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, available: !p.available } : x)));
                  try { await api.setProductAvailable(p.id, !p.available); } catch { setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, available: p.available } : x))); }
                }}
              />
            ))}
            </View>
          )}
          {videosRechazados > 0 && (
            <Notice tone="danger">{videosRechazados === 1 ? 'Hay un video que no aprobamos.' : `Hay ${videosRechazados} videos que no aprobamos.`} Toca el producto para ver el motivo y grabar uno nuevo.</Notice>
          )}
          {products.some((p) => p.videoStatus === 'pendiente') && (
            <Text style={type.help}>Los videos «en revisión» se muestran a los clientes cuando el equipo los aprueba. Mientras tanto se ve la foto.</Text>
          )}

          <SectionTitle title="Reseñas de clientes" style={{ marginTop: spacing.sm }} />
          {reviews.length === 0 ? (
            <Text style={type.body}>Todavía no tienes reseñas. Cuando un cliente califique tu negocio la verás aquí y podrás responderle.</Text>
          ) : (
            reviews.map((r) => (
              <ReviewItem key={r.id} review={r} onReplied={(reply) => setReviews((rs) => rs.map((x) => (x.id === r.id ? { ...x, reply } : x)))} />
            ))
          )}

          <Pressable accessibilityRole="button" accessibilityLabel="Ver e imprimir tu QR" onPress={() => router.push('/qr')} style={({ pressed }) => [styles.qrCard, pressed && { opacity: 0.9 }]}>
            <View style={styles.qrBox}><QrMini businessId={business.id} token={qrToken} /></View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={type.subtitle}>Tu QR para mesas y mostrador</Text>
              <Text style={type.help}>Lleva directo a tu vitrina y a dejar reseña. Toca para verlo grande y compartirlo.</Text>
            </View>
          </Pressable>

          {comer && reservas && (
            <>
              <SectionTitle title="Reservas" style={{ marginTop: spacing.sm }} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Solicitudes de reserva: ${reservas.pending} pendientes`} onPress={() => router.push('/reservas')} style={({ pressed }) => [styles.data, pressed && { opacity: 0.9 }]}>
                <DataRow label="Estado" value={reservas.settings?.enabled ? 'Recibiendo solicitudes' : 'Apagadas'} />
                <DataRow label="Pendientes" value={reservas.pending ? `${reservas.pending} por responder` : 'Ninguna'} />
                {reservas.settings?.enabled && push.state !== 'no_disponible' && <DataRow label="Notificaciones" value={pushStateLabel(push.state, push.failed)} />}
                <View style={styles.edit}>
                  <Text style={styles.editText}>Ver solicitudes</Text>
                  <ChevronRight size={18} color={colors.primary} />
                </View>
              </Pressable>
              <Button title={reservas.settings?.enabled ? 'Configurar reservas' : 'Activar reservas'} variant="outline" onPress={() => router.push('/reservas/configuracion')} />
              {reservas.settings?.enabled && <PushPrompt app="negocios" state={push.state} busy={push.busy} failed={push.failed} onEnable={push.enable} onRecheck={push.recheck} />}
            </>
          )}

          <SectionTitle title="Datos del negocio" style={{ marginTop: spacing.sm }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Editar los datos del negocio" onPress={() => router.push('/negocio/editar')} style={({ pressed }) => [styles.data, pressed && { opacity: 0.9 }]}>
            <DataRow label="Tipo" value={`${businessTypeLabel(business.type)} · ${business.subcategoryName ?? categoryLabel(business.category)}`} />
            <DataRow label="Dirección" value={business.address} />
            <DataRow label="Horario" value={business.hours || 'Sin horario'} />
            <DataRow label="WhatsApp" value={business.whatsapp || 'Sin número'} />
            <View style={styles.edit}>
              <Pencil size={16} color={colors.primary} />
              <Text style={styles.editText}>Editar datos</Text>
              <ChevronRight size={18} color={colors.primary} />
            </View>
          </Pressable>

          <SectionTitle title="Contacto y entregas" style={{ marginTop: spacing.sm }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Editar contacto y entregas" onPress={() => router.push('/negocio/contacto')} style={({ pressed }) => [styles.data, pressed && { opacity: 0.9 }]}>
            <DataRow label="Redes" value={configuredSocial(links).map((n) => n.label).join(', ') || 'Sin redes'} />
            <DataRow label="Entregas" value={deliverySummary(links?.deliveryModes ?? []) || 'Sin indicar'} />
            <View style={styles.edit}>
              <Pencil size={16} color={colors.primary} />
              <Text style={styles.editText}>Editar contacto y entregas</Text>
              <ChevronRight size={18} color={colors.primary} />
            </View>
          </Pressable>

          <View style={styles.account}>
            <Text style={type.overline}>Tu cuenta</Text>
            <Text style={type.caption}>{user?.email}</Text>
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
          <AboutCard suffix="Negocios" />
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
  header: { backgroundColor: colors.dark, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  headerInner: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  kicker: { ...typography.label, color: '#AFC2BE' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerLogo: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.surface },
  headerLogoEmpty: { width: 64, height: 64, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  headerLogoText: { ...typography.caption, fontFamily: fonts.bold, color: '#FFFFFF' },
  name: { ...typography.title, color: '#FFFFFF' },
  body: { padding: spacing.lg, gap: spacing.md },
  noticeText: { ...typography.body, fontFamily: fonts.medium },
  note: { backgroundColor: '#FFFFFF', borderRadius: radius.md, padding: spacing.sm, gap: spacing.xxs },
  noteLabel: { ...typography.overline, color: colors.danger },
  noteText: { ...typography.body, color: colors.textBody },
  stats: { flexDirection: 'row', gap: spacing.sm },
  productList: { paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  add: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.text },
  addText: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  qrCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginTop: spacing.sm, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  qrBox: { padding: spacing.xs, borderRadius: radius.md, backgroundColor: '#FFFFFF' },
  data: { borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.xxs },
  dataRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dataLabel: { ...typography.caption, width: 84, fontFamily: fonts.regular, color: colors.textMuted },
  dataValue: { ...typography.label, flex: 1, color: colors.text },
  edit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  editText: { ...typography.label, fontFamily: fonts.bold, color: colors.primary },
  account: { marginTop: spacing.md, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
