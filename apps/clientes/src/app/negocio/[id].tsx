// Detalle del negocio: portada, calificación, menú o vitrina, contacto y reseñas.
import { businessCover, businessSpecialty, businessTypeLabel, colors, confirmAsync, fonts, formatPriceLevel, formatRating, useAuth, type Business, type Product, type Review } from '@zipa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Ban, Flag, MapPin, MessageCircle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { ProductCard } from '@/components/ProductCard';
import { mapsUrl, takeReviewed, whatsappUrl } from '@/lib/contacto';

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

export default function NegocioDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [business, setBusiness] = useState<Business | null | undefined>(undefined); // undefined = cargando
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [thanks, setThanks] = useState(false);
  const mine = reviews.find((r) => r.userId === user?.id) ?? null; // una reseña por persona y negocio
  const [error, setError] = useState(false);

  const loadReviews = useCallback(() => api.listReviews(id, user?.id).then(setReviews), [api, id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      if (takeReviewed(id)) setThanks(true);
      Promise.all([api.getBusiness(id), api.listProducts(id), loadReviews()])
        .then(([b, p]) => { setBusiness(b); setProducts(p); setError(false); })
        .catch(() => setError(true));
      return () => setStatusBarStyle('dark');
    }, [api, id, loadReviews]),
  );

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
  const comer = business.category === 'comer';
  const meta = [businessSpecialty(business), formatPriceLevel(business.priceLevel)].filter(Boolean).join(' · ');
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
          <View style={styles.logo}><Text style={styles.logoText}>{initials(business.name)}</Text></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name} accessibilityRole="header">{business.name}</Text>
            <Text style={styles.headerMeta}>{meta}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {thanks && (
          <View style={styles.thanks} accessibilityLiveRegion="polite">
            <Text style={styles.thanksText}>Gracias. Tu reseña ya es visible para otros viajeros.</Text>
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
          <ContactButton icon={<MapPin size={20} color={colors.primary} />} label="Cómo llegar" sub={business.address} onPress={() => Linking.openURL(mapsUrl(business.address))} />
          {wa && <ContactButton icon={<MessageCircle size={20} color={colors.primary} />} label="WhatsApp" sub="Escribir al negocio" onPress={() => Linking.openURL(wa)} />}
        </View>

        <Text style={styles.h2} accessibilityRole="header">{comer ? 'Menú' : 'Vitrina'}</Text>
        {products.length === 0 ? (
          <Text style={styles.muted}>Este negocio aún no ha subido productos.</Text>
        ) : (
          <View style={styles.grid}>
            {products.map((p, i) => <ProductCard key={p.id} product={p} category={business.category} seed={i} />)}
          </View>
        )}

        <Text style={styles.h2} accessibilityRole="header">Lo que dicen los clientes</Text>
        {reviews.length === 0 && <Text style={styles.muted}>Aún no hay reseñas. ¡Sé el primero en contar cómo te fue!</Text>}
        {reviews.map((r) => {
          const isMine = r.userId === user?.id;
          return (
            <View key={r.id} style={styles.review}>
              <View style={styles.reviewTop}>
                <Text style={styles.author} numberOfLines={1}>{r.authorName}{isMine ? ' (tú)' : ''}</Text>
                <Text style={styles.stars} accessibilityLabel={`${r.stars} de 5 estrellas`}>
                  {'★'.repeat(r.stars)}<Text style={{ color: '#D8D2C6' }}>{'★'.repeat(5 - r.stars)}</Text>
                </Text>
              </View>
              {!!r.text && <Text style={styles.reviewText}>{r.text}</Text>}
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
  logoText: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.5, color: colors.text },
  name: { fontFamily: fonts.hero, fontSize: 32, lineHeight: 35, letterSpacing: -0.8, color: '#FFFFFF' },
  headerMeta: { fontFamily: fonts.medium, fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  body: { padding: 20, gap: 18 },
  thanks: { backgroundColor: colors.primarySoft, borderRadius: 20, padding: 16 },
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
});
