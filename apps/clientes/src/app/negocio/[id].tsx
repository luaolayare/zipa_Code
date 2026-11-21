// Detalle del negocio: portada, calificación, menú o vitrina, contacto y reseñas.
import { Button, WhatsAppIcon, groupMenu, businessCover, businessTypeLabel, categoryLabel, colors, confirmAsync, fonts, radius, sizes, spacing, typography, formatPriceLevel, formatRating, useAuth, type Business, type Product, type Review, catalogTitle, productWord, configuredSocial, deliverySummary, socialLabel, type BusinessLinks, restaurantOf } from '@zipa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { AtSign, Ban, BadgeCheck, CalendarDays, Camera, Flag, Globe, MapPin, Package } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [links, setLinks] = useState<BusinessLinks | null>(null);
  const [reservable, setReservable] = useState(false);
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

  // Ficha, productos y reseñas (solo lecturas). El reintento automático ante fallos pasajeros ya lo
  // hace supabase-js (≥2.119) en cada lectura: hasta 3 veces (1, 2 y 4 s), solo GET y solo con red
  // caída o 503/520, nunca por sesión, permisos o validación. La app NO agrega otro (duplicaría
  // peticiones). Si aun así falla, la pantalla ofrece «Intentar de nuevo». `loadSeq` descarta
  // respuestas de una carga anterior (otra pulsación o la persona salió) para que no se pisen.
  const loadSeq = useRef(0);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const [b, p] = await Promise.all([api.getBusiness(id), api.listProducts(id), loadReviews()]);
      if (seq !== loadSeq.current) return;
      setBusiness(b);
      setProducts(p);
      setError(false);
    } catch {
      if (seq === loadSeq.current) setError(true);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [api, id, loadReviews]);

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
      load();
      // Aparte y sin bloquear la ficha: si falla, simplemente no se muestran redes ni entregas.
      api.getBusinessLinks(id).then(setLinks).catch(() => setLinks(null));
      // Reservas: solo si el restaurante las activó. Si falla, no se muestra el botón.
      api.getReservationSettings(id).then((s) => setReservable(!!s?.enabled)).catch(() => setReservable(false));
      return () => {
        loadSeq.current++; // al salir, se ignora lo que llegue tarde y no se reintenta
        setStatusBarStyle('dark');
      };
    }, [api, id, v, user, load]),
  );

  // Analítica: una vista por negocio abierto (no cada vez que se vuelve a la pantalla).
  useEffect(() => { api.track('business_view', { businessId: id }); }, [api, id]);

  if (error && business === undefined) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>No pudimos cargar este negocio</Text>
        <Text style={styles.muted}>Revisa tu conexión a internet.</Text>
        <Button title="Intentar de nuevo" onPress={load} loading={loading} style={styles.retry} />
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
  const social = configuredSocial(links);
  const delivery = deliverySummary(links?.deliveryModes ?? []);

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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom }}>
      <View style={[styles.header, { backgroundColor: cover, paddingTop: insets.top + spacing.sm }]}>
        <BackButton onDark />
        <View style={styles.identity}>
          <View style={styles.logo}>
            {business.logoUrl
              ? <Image resizeMethod="resize" source={{ uri: business.logoUrl }} style={styles.logoImage} accessibilityLabel={`Logo de ${business.name}`} />
              : <Text style={styles.logoText}>{initials(business.name)}</Text>}
          </View>
          <View style={{ flex: 1, gap: spacing.xxs }}>
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
          {reservable && restaurantOf(business) && (
            <ContactButton
              icon={<CalendarDays size={20} color={colors.primary} />}
              label="Solicitar reserva"
              sub="El restaurante la confirma"
              onPress={() => (user ? router.push({ pathname: '/reservar/[id]', params: { id: business.id } }) : router.push({ pathname: '/login', params: { desde: 'reservar', negocio: business.id } }))}
            />
          )}
          <ContactButton icon={<MapPin size={20} color={colors.primary} />} label="Cómo llegar" sub={business.address} onPress={() => { api.track('maps_click', { businessId: business.id }); Linking.openURL(mapsUrl(business.address)); }} />
          {wa && <ContactButton icon={<WhatsAppIcon size={22} />} label="WhatsApp" sub="Escribir al negocio" onPress={() => { api.track('whatsapp_click', { businessId: business.id }); Linking.openURL(wa); }} />}
          {social.length > 0 && (
            <View style={styles.socialRow} accessibilityLabel="Redes sociales del negocio">
              {social.map((n) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="link"
                  accessibilityLabel={`${n.label}: ${socialLabel(n.id, n.url)}`}
                  onPress={() => Linking.openURL(n.url)}
                  style={({ pressed }) => [styles.socialChip, pressed && { opacity: 0.8 }]}>
                  {n.id === 'website' ? <Globe size={16} color={colors.primary} /> : <AtSign size={16} color={colors.primary} />}
                  <Text style={styles.socialText} numberOfLines={1}>{n.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {!!delivery && (
            <View style={styles.delivery}>
              <Package size={18} color={colors.primary} />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text style={styles.deliveryText}>{delivery}</Text>
                {!!links?.deliveryNote && <Text style={styles.contactSub}>{links.deliveryNote}</Text>}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.h2} accessibilityRole="header">{catalogTitle(business)}</Text>
        {products.length === 0 ? (
          <Text style={styles.muted}>Este negocio aún no ha subido productos.</Text>
        ) : (
          // Por secciones; si ningún producto tiene sección, una sola grilla sin título.
          groupMenu(products).map(({ section, items }, g, all) => (
            <View key={section ?? 'sin-seccion'} style={{ gap: spacing.sm }}>
              {(section || all.length > 1) && <Text style={styles.menuSection} accessibilityRole="header">{section ?? 'Más del menú'}</Text>}
              <View style={styles.grid}>
                {items.map((p, i) => <ProductCard key={p.id} product={p} business={business} seed={g * 10 + i} />)}
              </View>
            </View>
          ))
        )}
        {products.length > 0 && <Text style={styles.muted}>Para pedir o preguntar por un {productWord(business)}, escríbele al negocio por WhatsApp.</Text>}

        <Text style={styles.h2} accessibilityRole="header">Lo que dicen los clientes</Text>
        {reviews.length === 0 && <Text style={styles.muted}>Aún no hay reseñas. ¡Sé el primero en contar cómo te fue!</Text>}
        {(myReview && !reviews.some((r) => r.id === myReview.id) ? [myReview, ...reviews] : reviews).map((r) => {
          const isMine = r.userId === user?.id;
          return (
            <View key={r.id} style={styles.review}>
              <View style={styles.reviewTop}>
                <Text style={styles.author} numberOfLines={1}>{r.authorName}{isMine ? ' (tú)' : ''}</Text>
                <Text style={styles.stars} accessibilityLabel={`${r.stars} de 5 estrellas`}>
                  {'★'.repeat(r.stars)}<Text style={styles.starsOff}>{'★'.repeat(5 - r.stars)}</Text>
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
              {!!r.photoUrl && <Image resizeMethod="resize" source={{ uri: r.photoUrl }} style={styles.reviewPhoto} accessibilityLabel={`Foto de ${r.authorName}`} />}
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

        <Pressable accessibilityRole="button" onPress={() => report('business', business.id, business.name)} style={[styles.action, { alignSelf: 'center', marginTop: spacing.xs }]}>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.background },
  retry: { alignSelf: 'stretch', marginTop: spacing.xs },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 80, height: 80, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: '100%', height: '100%' },
  logoText: { ...typography.title, fontSize: 30, lineHeight: 36 }, // iniciales del logo, no texto de lectura
  name: { ...typography.title, color: '#FFFFFF' },
  headerMeta: { ...typography.body, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.85)' },
  body: { padding: spacing.lg, gap: spacing.md },
  thanks: { backgroundColor: colors.infoSoft, borderRadius: radius.lg, padding: spacing.md },
  waiting: { backgroundColor: colors.warningSoft },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  badge: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
  badgeOk: { color: colors.success },
  badgeWait: { color: colors.accentText, backgroundColor: colors.warningSoft, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  reviewPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.stage3d },
  thanksText: { ...typography.body, fontFamily: fonts.medium, color: colors.primary },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  tag: { ...typography.label, fontFamily: fonts.bold, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs + 2, borderRadius: radius.pill, overflow: 'hidden' },
  tagEmp: { backgroundColor: colors.warningSoft, color: colors.accentText },
  tagClassic: { backgroundColor: colors.infoSoft, color: colors.primary },
  hours: { flexShrink: 1, ...typography.label, color: colors.success },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ratingCard: { gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  ratingBig: { ...typography.display, fontFamily: fonts.display, fontSize: 40, lineHeight: 46 }, // número grande de la calificación
  ratingLabel: typography.subtitle,
  rateButton: { minHeight: sizes.button, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minHeight: sizes.button, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { ...typography.subtitle, color: '#FFFFFF' },
  contact: { gap: spacing.sm },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  socialChip: { minHeight: sizes.touchMin, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  socialText: typography.label,
  delivery: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.xxs },
  deliveryText: typography.label,
  contactButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  contactIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.infoSoft, alignItems: 'center', justifyContent: 'center' },
  contactLabel: typography.subtitle,
  contactSub: typography.caption,
  h2: { ...typography.heading, marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muted: { ...typography.body, color: colors.textMuted },
  emptyTitle: { ...typography.heading, textAlign: 'center' },
  review: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { flex: 1, ...typography.subtitle },
  stars: { fontSize: 18, letterSpacing: 1, color: colors.starText }, // estrellas: tamaño del ícono, no texto
  starsOff: { color: colors.inputBorder },
  reviewText: typography.body,
  reply: { gap: spacing.xxs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background, borderLeftWidth: 4, borderLeftColor: colors.primary },
  replyLabel: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
  replyText: typography.body,
  actions: { flexDirection: 'row', gap: spacing.lg },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: sizes.touchMin },
  actionText: { ...typography.caption, fontFamily: fonts.semibold },
  menuSection: { ...typography.overline, marginTop: spacing.xxs },
  moreReviews: { minHeight: sizes.button, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  moreReviewsText: { ...typography.subtitle, color: colors.primary },
});
