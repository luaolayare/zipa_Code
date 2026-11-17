// Detalle del negocio: portada, calificación, menú o vitrina, contacto y reseñas.
import { WhatsAppIcon, groupMenu, isRestaurant, businessCover, businessTypeLabel, categoryLabel, colors, confirmAsync, fonts, formatPriceLevel, formatRating, useAuth, type Business, type Product, type Review } from '@zipa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Ban, BadgeCheck, Camera, Flag, MapPin } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { ProductCard } from '@/components/ProductCard';
import { mapsUrl, setPendingVisit, takePendingVisit, takeReviewed, whatsappUrl } from '@/lib/contacto';

const REVIEWS_PAGE = 20;

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

export default function NegocioDetalle() {
  // v: código de visita que trae el QR del mostrador del negocio.
  const { id, v } = useLocalSearchParams<{ id: string; v?: string }>();
  const { api, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [business, setBusiness] = useState<Business | null | undefined>(undefined); // undefined = cargando
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [moreReviews, setMoreReviews] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [thanks, setThanks] = useState<string | null>(null); // 'publicada' o 'en_espera'
  const [visit, setVisit] = useState(false);
  const mine = myReview ?? reviews.find((r) => r.userId === user?.id) ?? null; // una reseña por persona y negocio
  const [error, setError] = useState(false);

  // Primera página de reseñas (20) y la propia, aunque no esté en esa página.
  const loadReviews = useCallback(async () => {
    const [page, own] = await Promise.all([
      api.listReviews(id, user?.id, { limit: REVIEWS_PAGE, offset: 0 }),
      user ? api.getMyReview(id, user.id) : Promise.resolve(null),
    ]);
    setReviews(page);
    setMyReview(own);
    setMoreReviews(page.length === REVIEWS_PAGE);
  }, [api, id, user]);

  const loadMoreReviews = async () => {
    setLoadingMore(true);
    try {
      const next = await api.listReviews(id, user?.id, { limit: REVIEWS_PAGE, offset: reviews.length });
      setReviews((list) => [...list, ...next.filter((r) => !list.some((x) => x.id === r.id))]);
      setMoreReviews(next.length === REVIEWS_PAGE);
    } catch {
      // Se puede volver a intentar con el mismo botón.
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      const reviewed = takeReviewed(id);
      if (reviewed) setThanks(reviewed);
      // Visita verificada: con sesión se registra ya; sin sesión, al iniciarla.
      const pending = takePendingVisit();
      const token = v ?? (pending?.businessId === id ? pending.token : undefined);
      if (token) {
        if (user) api.registerVisit(id, token).then((ok) => setVisit(ok)).catch(() => {});
        else setPendingVisit(id, token);
      }
      Promise.all([api.getBusiness(id), api.listProducts(id), loadReviews()])
        .then(([b, p]) => { setBusiness(b); setProducts(p); setError(false); })
        .catch(() => setError(true));
      return () => setStatusBarStyle('dark');
    }, [api, id, v, user, loadReviews]),
  );

  // Analítica: una vista por negocio abierto (no cada vez que se vuelve a la pantalla).
  useEffect(() => { api.track('business_view', { businessId: id }); }, [api, id]);

  if (error && business === undefined) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>No pudimos cargar este negocio</Text>
        <Text style={styles.muted}>Revisa tu conexión a internet.</Text>
        <BackButton />
      </SafeAreaView>
    );
  }
  if (business === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (business === null) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Este negocio no está disponible</Text>
        <Text style={styles.muted}>Puede que esté en revisión o que ya no esté en la app.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/explorar')} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Explorar otros negocios</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { cover } = businessCover(business);
  // "Pizzerías · Pizza al horno de leña · $$" (subcategoría, lo que vende en sus palabras y precio).
  const meta = [business.subcategoryName ?? categoryLabel(business.category), business.specialty, formatPriceLevel(business.priceLevel)].filter(Boolean).join(' · ');
  const wa = whatsappUrl(business.whatsapp);

  const rate = () => {
    if (!user) return router.push({ pathname: '/login', params: { desde: 'calificar', negocio: id } });
    router.push({ pathname: '/calificar/[id]', params: { id } });
  };

  // Reportar y bloquear exigen sesión, para poder revisar el reporte y recordar el bloqueo.
  const report = (tipo: 'review' | 'business', targetId: string, nombre: string) => {
    if (!user) return router.push('/login');
    router.push({ pathname: '/reportar', params: { tipo, id: targetId, nombre } });
  };

  const block = async (r: Review) => {
    if (!user) return router.push('/login');
    const ok = await confirmAsync(`¿Bloquear a ${r.authorName}?`, 'Dejarás de ver sus reseñas en todos los negocios. Puedes desbloquearlo después.', 'Bloquear', true);
    if (!ok) return;
    await api.blockUser(user.id, r.userId);
    await loadReviews();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
      <View style={[styles.header, { backgroundColor: cover, paddingTop: insets.top + 12 }]}>
        <BackButton onDark />
        <View style={styles.identity}>
          <View style={styles.logo}>
            {business.logoUrl
              ? <Image source={{ uri: business.logoUrl }} style={styles.logoImage} accessibilityLabel={`Logo de ${business.name}`} />
              : <Text style={styles.logoText}>{initials(business.name)}</Text>}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name} accessibilityRole="header">{business.name}</Text>
            <Text style={styles.headerMeta}>{meta}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {thanks && (
          <View style={[styles.thanks, thanks === 'en_espera' && styles.waiting]} accessibilityLiveRegion="polite">
            <Text style={[styles.thanksText, thanks === 'en_espera' && { color: colors.accentText }]}>
              {thanks === 'en_espera'
                ? 'Gracias. Tu reseña quedó en revisión: este negocio recibió varias calificaciones bajas seguidas y el equipo las revisa antes de publicarlas.'
                : 'Gracias. Tu reseña ya es visible para otros viajeros.'}
            </Text>
          </View>
        )}
        {visit && !thanks && (
          <View style={styles.thanks} accessibilityLiveRegion="polite">
            <Text style={styles.thanksText}>Registramos tu visita. Si calificas este negocio, tu reseña saldrá con el sello «Visitó el negocio».</Text>
          </View>
        )}

        <View style={styles.tagsRow}>
          <Text style={[styles.tag, business.type === 'emprendimiento' ? styles.tagEmp : styles.tagClassic]}>{businessTypeLabel(business.type)}</Text>
          {!!business.hours && <Text style={styles.hours}>{business.hours}</Text>}
        </View>

        <View style={styles.ratingCard}>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingBig}>{business.rating == null ? '—' : formatRating(business.rating)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ratingLabel}>Calificación de clientes</Text>
              <Text style={styles.muted}>{business.reviewCount === 0 ? 'Aún sin reseñas' : `${business.reviewCount} ${business.reviewCount === 1 ? 'reseña' : 'reseñas'}`}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={rate} style={({ pressed }) => [styles.rateButton, pressed && { opacity: 0.85 }]}>
            <Text style={styles.primaryText}>{mine ? 'Editar mi reseña' : 'Calificar'}</Text>
          </Pressable>
        </View>

        <View style={styles.contact}>
          <ContactButton icon={<MapPin size={20} color={colors.primary} />} label="Cómo llegar" sub={business.address} onPress={() => { api.track('maps_click', { businessId: business.id }); Linking.openURL(mapsUrl(business.address)); }} />
          {wa && <ContactButton icon={<WhatsAppIcon size={22} />} label="WhatsApp" sub="Escribir al negocio" onPress={() => { api.track('whatsapp_click', { businessId: business.id }); Linking.openURL(wa); }} />}
        </View>

        <Text style={styles.h2} accessibilityRole="header">{isRestaurant(business) ? 'Menú' : 'Productos'}</Text>
        {products.length === 0 ? (
          <Text style={styles.muted}>Este negocio aún no ha subido productos.</Text>
        ) : (
          // Por secciones; si ningún producto tiene sección, una sola grilla sin título.
          groupMenu(products).map(({ section, items }, g, all) => (
            <View key={section ?? 'sin-seccion'} style={{ gap: 12 }}>
              {(section || all.length > 1) && <Text style={styles.menuSection} accessibilityRole="header">{section ?? 'Más del menú'}</Text>}
              <View style={styles.grid}>
                {items.map((p, i) => <ProductCard key={p.id} product={p} category={business.category} seed={g * 10 + i} />)}
              </View>
            </View>
          ))
        )}
        {products.length > 0 && <Text style={styles.muted}>Para pedir o preguntar por un {isRestaurant(business) ? 'plato' : 'producto'}, escríbele al negocio por WhatsApp.</Text>}

        <Text style={styles.h2} accessibilityRole="header">Lo que dicen los clientes</Text>
        {reviews.length === 0 && <Text style={styles.muted}>Aún no hay reseñas. ¡Sé el primero en contar cómo te fue!</Text>}
        {(myReview && !reviews.some((r) => r.id === myReview.id) ? [myReview, ...reviews] : reviews).map((r) => {
          const isMine = r.userId === user?.id;
          return (
            <View key={r.id} style={styles.review}>
              <View style={styles.reviewTop}>
                <Text style={styles.author} numberOfLines={1}>{r.authorName}{isMine ? ' (tú)' : ''}</Text>
                <Text style={styles.stars} accessibilityLabel={`${r.stars} de 5 estrellas`}>
                  {'★'.repeat(r.stars)}<Text style={{ color: '#D8D2C6' }}>{'★'.repeat(5 - r.stars)}</Text>
                </Text>
              </View>
              {(r.visited || r.photoUrl || r.status === 'en_espera') && (
                <View style={styles.badges}>
                  {r.status === 'en_espera' && <Text style={[styles.badge, styles.badgeWait]}>En revisión (solo la ves tú)</Text>}
                  {r.visited && (
                    <View style={styles.badgeRow}><BadgeCheck size={15} color={colors.success} /><Text style={[styles.badge, styles.badgeOk]}>Visitó el negocio</Text></View>
                  )}
                  {!!r.photoUrl && (
                    <View style={styles.badgeRow}><Camera size={15} color={colors.primary} /><Text style={styles.badge}>Con foto</Text></View>
                  )}
                </View>
              )}
              {!!r.text && <Text style={styles.reviewText}>{r.text}</Text>}
              {!!r.photoUrl && <Image source={{ uri: r.photoUrl }} style={styles.reviewPhoto} accessibilityLabel={`Foto de ${r.authorName}`} />}
              {!!r.reply && (
                <View style={styles.reply}>
                  <Text style={styles.replyLabel}>Respuesta de {business.name}</Text>
                  <Text style={styles.replyText}>{r.reply}</Text>
                </View>
              )}
              {!isMine && (
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Reportar la reseña de ${r.authorName}`} onPress={() => report('review', r.id, `Reseña de ${r.authorName}`)} style={styles.action}>
                    <Flag size={14} color={colors.textMuted} />
                    <Text style={styles.actionText}>Reportar</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Bloquear a ${r.authorName}`} onPress={() => block(r)} style={styles.action}>
                    <Ban size={14} color={colors.textMuted} />
                    <Text style={styles.actionText}>Bloquear usuario</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
        {moreReviews && (
          <Pressable accessibilityRole="button" onPress={loadMoreReviews} disabled={loadingMore} style={({ pressed }) => [styles.moreReviews, pressed && { opacity: 0.85 }]}>
            {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.moreReviewsText}>Ver más reseñas</Text>}
          </Pressable>
        )}

        <Pressable accessibilityRole="button" onPress={() => report('business', business.id, business.name)} style={[styles.action, { alignSelf: 'center', marginTop: 8 }]}>
          <Flag size={14} color={colors.textMuted} />
          <Text style={styles.actionText}>Reportar este negocio</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ContactButton({ icon, label, sub, onPress }: { icon: React.ReactNode; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${label}: ${sub}`} onPress={onPress} style={({ pressed }) => [styles.contactButton, pressed && { opacity: 0.85 }]}>
      <View style={styles.contactIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactSub} numberOfLines={1}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 28, gap: 22 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logo: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: '100%', height: '100%' },
  logoText: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.5, color: colors.text },
  name: { fontFamily: fonts.hero, fontSize: 32, lineHeight: 35, letterSpacing: -0.8, color: '#FFFFFF' },
  headerMeta: { fontFamily: fonts.medium, fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  body: { padding: 20, gap: 18 },
  thanks: { backgroundColor: colors.primarySoft, borderRadius: 20, padding: 16 },
  waiting: { backgroundColor: colors.accentSoft },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badge: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  badgeOk: { color: colors.success },
  badgeWait: { color: colors.accentText, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  reviewPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: colors.stage3d },
  thanksText: { fontFamily: fonts.medium, fontSize: 15.5, lineHeight: 22, color: colors.primary },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  tag: { fontFamily: fonts.bold, fontSize: 14, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, overflow: 'hidden' },
  tagEmp: { backgroundColor: colors.accentSoft, color: colors.accentText },
  tagClassic: { backgroundColor: colors.primarySoft, color: colors.primary },
  hours: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.success },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ratingCard: { gap: 14, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  ratingBig: { fontFamily: fonts.display, fontSize: 44, letterSpacing: -1.5, color: colors.text },
  ratingLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  rateButton: { minHeight: 52, paddingHorizontal: 20, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minHeight: 52, paddingHorizontal: 22, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },
  contact: { gap: 10 },
  contactButton: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  contactIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  contactSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  h2: { fontFamily: fonts.display, fontSize: 25, letterSpacing: -0.5, color: colors.text, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  muted: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, textAlign: 'center' },
  review: { gap: 10, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  author: { flex: 1, fontFamily: fonts.bold, fontSize: 16.5, color: colors.text },
  stars: { fontSize: 18, letterSpacing: 1, color: colors.starText },
  reviewText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textBody },
  reply: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: colors.background, borderLeftWidth: 4, borderLeftColor: colors.primary },
  replyLabel: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.4, color: colors.primary },
  replyText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textBody },
  actions: { flexDirection: 'row', gap: 18 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  actionText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.textMuted },
  menuSection: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted, marginTop: 4 },
  moreReviews: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  moreReviewsText: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
});
