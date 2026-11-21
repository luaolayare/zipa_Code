import { BRAND, Logo, MAIN_CATEGORIES, MIN_REVIEWS_FOR_RANKING, colors, fonts, radius, sizes, spacing, typography, useAuth, type Business, type MainCategory } from '@zipa/shared';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { ChevronRight, MapPin, Search, ShoppingBag, UtensilsCrossed, X, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessRow } from '@/components/BusinessRow';
import { CarouselCard } from '@/components/CarouselCard';
import { RankCard } from '@/components/RankCard';
import { useSearch } from '@/lib/useSearch';

const MAIN_ICONS: Record<MainCategory, LucideIcon> = { emprendimientos: ShoppingBag, restaurantes: UtensilsCrossed };

type Load = 'cargando' | 'listo' | 'error';

export default function Inicio() {
  const { api, user } = useAuth();
  const insets = useSafeAreaInsets();
  // En celulares angostos las dos tarjetas van una debajo de otra, para no partir las palabras.
  const narrow = useWindowDimensions().width < 385;
  const [query, setQuery] = useState('');
  const search = useSearch(query);

  // Portada: destacados (solo con reseñas suficientes), recién llegados y cuántos hay por categoría.
  const [top, setTop] = useState<Business[]>([]);
  const [featured, setFeatured] = useState<Business[]>([]);
  const [recent, setRecent] = useState<Business[]>([]);
  const [counts, setCounts] = useState<Record<MainCategory, number> | null>(null);
  const [status, setStatus] = useState<Load>('cargando');

  const fetchHome = useCallback(() => {
    Promise.all([
      api.searchBusinesses({ order: 'calificacion', limit: 3 }),
      api.searchBusinesses({ order: 'recientes', limit: 8 }),
      api.countByMainCategory(),
      api.featuredBusinesses(10).catch(() => [] as Business[]),
    ])
      .then(([best, newest, n, feat]) => {
        setFeatured(feat);
        setTop(best.filter((b) => b.rating != null && b.reviewCount >= MIN_REVIEWS_FOR_RANKING));
        setRecent(newest);
        setCounts(n);
        setStatus('listo');
      })
      .catch(() => setStatus('error'));
  }, [api]);

  useEffect(() => { fetchHome(); }, [fetchHome]);

  const retry = () => {
    setStatus('cargando');
    fetchHome();
  };

  // Texto claro sobre la cabecera verde; al salir de la pantalla vuelve a oscuro.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const typing = query.trim().length > 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.statusFill, { height: insets.top }]} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.topRow}>
            <Logo size={30} tone="light" />
            <View style={styles.location}>
              <MapPin size={14} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.locationText}>{BRAND.city}</Text>
            </View>
          </View>
          <View style={styles.greeting}>
            <Text style={styles.hello}>Hola, {user?.name ?? 'viajero'}</Text>
            <Text style={styles.title} accessibilityRole="header">¿Qué buscas hoy?</Text>
          </View>
          <View style={styles.search}>
            <Search size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              accessibilityLabel="Buscar negocio, plato o producto"
              placeholder="Negocio, plato o producto"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
              style={styles.searchInput}
            />
            {typing && (
              <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => setQuery('')} style={styles.clear} hitSlop={6}>
                <X size={16} color={colors.text} strokeWidth={2.4} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {typing ? (
            <SearchResults query={query} search={search} />
          ) : (
            <>
              <View style={[styles.cards, narrow && styles.cardsColumn]}>
                {MAIN_CATEGORIES.map((m) => {
                  const Icon = MAIN_ICONS[m.id];
                  const n = counts?.[m.id];
                  const restaurant = m.id === 'restaurantes';
                  return (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.name}${n != null ? `, ${n} ${n === 1 ? 'negocio' : 'negocios'}` : ''}`}
                      onPress={() => router.push({ pathname: '/categoria/[id]', params: { id: m.id } })}
                      style={({ pressed }) => [styles.card, narrow && styles.cardWide, restaurant ? styles.cardRest : styles.cardEmp, pressed && styles.pressed]}>
                      <View style={[styles.cardIcon, restaurant ? { backgroundColor: colors.accent } : { backgroundColor: colors.primary }]}>
                        <Icon size={26} color={restaurant ? colors.text : colors.accent} strokeWidth={2} />
                      </View>
                      <Text style={[styles.cardTitle, narrow && styles.cardTitleWide, restaurant && { color: '#FFFFFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{m.name}</Text>
                      <Text style={[styles.cardText, restaurant && { color: colors.onPrimaryMuted }]} numberOfLines={3}>{m.description}</Text>
                      <View style={styles.cardFoot}>
                        <Text style={[styles.cardCount, restaurant && { color: colors.accent }]}>
                          {n == null ? ' ' : n === 0 ? 'Muy pronto' : `${n} ${n === 1 ? 'lugar' : 'lugares'}`}
                        </Text>
                        <ChevronRight size={18} color={restaurant ? colors.accent : colors.primary} strokeWidth={2.4} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {status === 'cargando' ? (
                <ActivityIndicator color={colors.primary} style={styles.loading} accessibilityLabel="Cargando negocios" />
              ) : status === 'error' ? (
                <View style={styles.empty} accessibilityRole="alert">
                  <Text style={styles.emptyTitle}>No pudimos cargar los negocios</Text>
                  <Text style={styles.emptyText}>Revisa tu conexión a internet.</Text>
                  <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
                    <Text style={styles.retryText}>Intentar de nuevo</Text>
                  </Pressable>
                </View>
              ) : recent.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>Pronto verás negocios aquí</Text>
                  <Text style={styles.emptyText}>Estamos sumando restaurantes y emprendimientos de {BRAND.city}. Vuelve en unos días.</Text>
                </View>
              ) : (
                <>
                  {/* Destacados: negocios con suscripción, elegidos por el equipo (no por calificación). */}
                  {featured.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHead}>
                        <Text style={styles.h2} accessibilityRole="header">Destacados</Text>
                        <Text style={styles.sub}>Negocios que te recomendamos visitar</Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel} contentContainerStyle={styles.carouselContent}>
                        {featured.map((b) => <CarouselCard key={b.id} business={b} badge="Destacado" />)}
                      </ScrollView>
                    </View>
                  )}
                  {top.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHead}>
                        <Text style={styles.h2} accessibilityRole="header">Los mejor calificados</Text>
                        <Text style={styles.sub}>Según las reseñas de otros viajeros</Text>
                      </View>
                      {top.map((b, i) => <RankCard key={b.id} business={b} rank={i + 1} badge={b.subcategoryName ?? 'Destacado'} />)}
                    </View>
                  )}
                  <View style={styles.section}>
                    <View style={styles.sectionHead}>
                      <Text style={styles.h2} accessibilityRole="header">Recién llegados</Text>
                      <Text style={styles.sub}>Negocios nuevos en {BRAND.name}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel} contentContainerStyle={styles.carouselContent}>
                      {recent.map((b) => <CarouselCard key={b.id} business={b} />)}
                    </ScrollView>
                  </View>
                </>
              )}
            </>
          )}
          {api.isDemo && <Text style={styles.demo}>Negocios, productos y reseñas son datos de ejemplo.</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

function SearchResults({ query, search }: { query: string; search: ReturnType<typeof useSearch> }) {
  const { results, status, retry, hasMore, loadMore, loadingMore, moreError } = search;
  if (status === 'escribiendo') return <Text style={styles.hint}>Escribe al menos 2 letras.</Text>;
  if (status === 'cargando' && results.length === 0) return <ActivityIndicator color={colors.primary} style={styles.loading} accessibilityLabel="Buscando" />;
  if (status === 'error') {
    return (
      <View style={styles.empty} accessibilityRole="alert">
        <Text style={styles.emptyTitle}>No pudimos buscar</Text>
        <Text style={styles.emptyText}>Revisa tu conexión a internet.</Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
          <Text style={styles.retryText}>Intentar de nuevo</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.section} accessibilityLiveRegion="polite">
      <Text style={styles.resultsLabel}>
        {results.length}{hasMore ? '+' : ''} {results.length === 1 ? 'resultado' : 'resultados'} para «{query.trim()}»
      </Text>
      {results.map((b) => <BusinessRow key={b.id} business={b} variant="result" />)}
      {moreError && <Text style={styles.moreError} accessibilityRole="alert">No pudimos cargar más resultados. Revisa tu conexión e intenta de nuevo.</Text>}
      {(hasMore || moreError) && (
        <Pressable accessibilityRole="button" onPress={loadMore} disabled={loadingMore} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
          {loadingMore ? <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando más resultados" /> : <Text style={styles.moreText}>{moreError ? 'Intentar de nuevo' : 'Ver más'}</Text>}
        </Pressable>
      )}
      {results.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No encontramos nada con ese nombre</Text>
          <Text style={styles.emptyText}>Buscamos en nombres de negocios, platos, productos y categorías. Revisa cómo está escrito o explora por categorías.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  statusFill: { backgroundColor: colors.primary },
  scroll: { flexGrow: 1 },

  // Cabecera verde
  header: { backgroundColor: colors.primary, paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.pill, backgroundColor: colors.primaryDeep },
  locationText: { ...typography.caption, fontFamily: fonts.semibold, color: colors.onPrimaryMuted },
  greeting: { gap: spacing.xxs },
  hello: { ...typography.label, fontFamily: fonts.bold, color: colors.accent },
  title: { ...typography.display, color: '#FFFFFF' },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: sizes.input, backgroundColor: colors.surface, borderRadius: radius.md, paddingLeft: spacing.md, paddingRight: spacing.xs },
  searchInput: { flex: 1, minWidth: 0, alignSelf: 'stretch', fontSize: typography.body.fontSize, fontFamily: fonts.regular, color: colors.text, padding: 0, outlineWidth: 0 },
  clear: { width: sizes.touchMin, height: sizes.touchMin, borderRadius: radius.pill, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },

  // Contenido
  body: { padding: spacing.lg, gap: spacing.xxl },
  section: { gap: spacing.sm },
  sectionHead: { gap: spacing.xxs },
  h2: typography.heading,
  sub: typography.caption,

  // Tarjetas de las dos categorías principales
  cards: { flexDirection: 'row', gap: spacing.sm },
  cardsColumn: { flexDirection: 'column' },
  cardWide: { minHeight: 0 },
  card: { flex: 1, minHeight: 196, padding: spacing.md, gap: spacing.xs, borderRadius: radius.lg },
  cardEmp: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.border },
  cardRest: { backgroundColor: colors.primary },
  cardIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxs },
  // Excepción a la escala: 16 en dos columnas para que "Emprendimientos" quepa completo desde 385 px de ancho.
  cardTitle: { fontSize: 16, lineHeight: 21, fontFamily: fonts.display, letterSpacing: -0.4, color: colors.text },
  cardTitleWide: { fontSize: typography.heading.fontSize, lineHeight: typography.heading.lineHeight },
  cardText: { ...typography.caption, fontFamily: fonts.regular, color: colors.textBody, flexGrow: 1 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCount: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
  pressed: { opacity: 0.88 },

  carousel: { marginHorizontal: -spacing.lg },
  carouselContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxs, gap: spacing.sm },

  hint: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  more: { minHeight: sizes.button, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  moreText: { ...typography.subtitle, color: colors.primary },
  moreError: { ...typography.label, color: colors.danger, textAlign: 'center' },
  resultsLabel: { ...typography.label, color: colors.textBody },
  empty: { backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inputBorder, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs, alignItems: 'center' },
  emptyTitle: { ...typography.subtitle, textAlign: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  demo: { ...typography.caption, textAlign: 'center' },
  loading: { marginVertical: spacing.xxl },
  retry: { marginTop: spacing.xs, minHeight: sizes.touchMin, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  retryText: { ...typography.label, fontFamily: fonts.bold, color: '#FFFFFF' },
});
