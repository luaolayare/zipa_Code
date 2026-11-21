import { Logo, MAIN_CATEGORIES, MIN_REVIEWS_FOR_RANKING, colors, fonts, radius, sizes, spacing, typography, useAuth, vistaCiudad, type Business, type MainCategory } from '@zipa/shared';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { ChevronDown, ChevronRight, MapPin, Search, ShoppingBag, UtensilsCrossed, X, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessRow } from '@/components/BusinessRow';
import { CarouselCard } from '@/components/CarouselCard';
import { RankCard } from '@/components/RankCard';
import { useCiudad } from '@/lib/ciudad';
import { useSearch } from '@/lib/useSearch';

const MAIN_ICONS: Record<MainCategory, LucideIcon> = { emprendimientos: ShoppingBag, restaurantes: UtensilsCrossed };

type Load = 'cargando' | 'listo' | 'error';

export default function Inicio() {
  const { api, user } = useAuth();
  const insets = useSafeAreaInsets();
  // En celulares angostos las dos tarjetas van una debajo de otra, para no partir las palabras.
  const narrow = useWindowDimensions().width < 385;
  const ciudad = useCiudad();
  const municipio = ciudad.codigo;
  const nombreCiudad = ciudad.municipio.nombre;
  const activa = ciudad.estado === 'activa';
  const [query, setQuery] = useState('');
  const search = useSearch(query, municipio);

  // Portada de la ciudad que se explora (solo si está activa): destacados, favoritos (con reseñas
  // suficientes), recién llegados y cuántos hay por categoría. Cada respuesta queda marcada con su ciudad
  // e intento (key): si no coincide con la actual, la pantalla está cargando. Así, al cambiar de ciudad,
  // nunca se ven negocios de la anterior.
  const [attempt, setAttempt] = useState(0);
  const key = `${municipio}|${attempt}`;
  const [home, setHome] = useState<{ key: string; error: boolean; top: Business[]; featured: Business[]; recent: Business[]; counts: Record<MainCategory, number> | null } | null>(null);

  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    Promise.all([
      api.searchBusinesses({ order: 'calificacion', limit: 3, municipio }),
      api.searchBusinesses({ order: 'recientes', limit: 8, municipio }),
      api.countByMainCategory(municipio),
      api.featuredBusinesses(10, municipio).catch(() => [] as Business[]),
    ])
      .then(([best, newest, n, feat]) => {
        if (vigente) setHome({ key, error: false, featured: feat, top: best.filter((b) => b.rating != null && b.reviewCount >= MIN_REVIEWS_FOR_RANKING), recent: newest, counts: n });
      })
      .catch(() => { if (vigente) setHome({ key, error: true, featured: [], top: [], recent: [], counts: null }); });
    return () => { vigente = false; };
  }, [api, municipio, activa, key]);

  const ready = home?.key === key;
  const status: Load = !ready ? 'cargando' : home.error ? 'error' : 'listo';
  const top = ready ? home.top : [];
  const featured = ready ? home.featured : [];
  const recent = ready ? home.recent : [];
  const counts = ready ? home.counts : null;

  const retry = () => {
    if (ciudad.estadosError) ciudad.recargarEstados();
    setAttempt((n) => n + 1);
  };
  // Qué se ve: ciudad no habilitada, error, ciudad activa sin negocios o catálogo (nunca se confunden).
  const vista = ciudad.estado == null ? (ciudad.estadosError ? 'error' : 'cargando') : vistaCiudad(ciudad.estado, status, recent.length);
  const primerNombre = user?.name?.trim().split(/\s+/)[0];

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ciudad: ${nombreCiudad}. Cambiar ciudad`}
              onPress={() => router.push('/ciudad')}
              hitSlop={6}
              style={({ pressed }) => [styles.location, pressed && styles.pressed]}>
              <MapPin size={14} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.locationText} numberOfLines={1}>{nombreCiudad}</Text>
              <ChevronDown size={14} color={colors.onPrimaryMuted} strokeWidth={2.4} />
            </Pressable>
          </View>
          <View style={styles.greeting}>
            <Text style={styles.hello}>{primerNombre ? `Hola, ${primerNombre}` : '¡Hola!'}</Text>
            <Text style={styles.title} accessibilityRole="header">¿Qué se te antoja descubrir hoy?</Text>
          </View>
          {activa && (
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
          )}
        </View>

        <View style={styles.body}>
          {ciudad.origen === 'sugerida' && ciudad.listo && (
            <Pressable accessibilityRole="button" onPress={() => router.push('/ciudad')} style={({ pressed }) => [styles.hint2, pressed && styles.pressed]}>
              <Text style={styles.hint2Text}>Te mostramos {nombreCiudad}. ¿Quieres explorar otra ciudad? <Text style={styles.hint2Link}>Cambiar ciudad</Text></Text>
            </Pressable>
          )}
          {vista === 'no_habilitada' ? (
            <ProximaApertura />
          ) : activa && typing ? (
            <SearchResults query={query} search={search} />
          ) : (
            <>
              {(vista === 'catalogo' || vista === 'sin_negocios') && (
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
              )}

              {vista === 'cargando' ? (
                <ActivityIndicator color={colors.primary} style={styles.loading} accessibilityLabel="Cargando negocios" />
              ) : vista === 'error' ? (
                <View style={styles.empty} accessibilityRole="alert">
                  <Text style={styles.emptyTitle}>No pudimos cargar la información</Text>
                  <Text style={styles.emptyText}>Revisa tu conexión e inténtalo de nuevo.</Text>
                  <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
                    <Text style={styles.retryText}>Intentar de nuevo</Text>
                  </Pressable>
                </View>
              ) : vista === 'sin_negocios' ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>Todavía no hay negocios disponibles en {nombreCiudad}</Text>
                  <Text style={styles.emptyText}>Estamos sumando restaurantes y emprendimientos. Vuelve pronto.</Text>
                </View>
              ) : (
                <>
                  {/* Destacados: negocios con suscripción, elegidos por el equipo (no por calificación). */}
                  {featured.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHead}>
                        <Text style={styles.h2} accessibilityRole="header">Destacados en {nombreCiudad}</Text>
                        <Text style={styles.sub}>Lugares que merecen una visita</Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel} contentContainerStyle={styles.carouselContent}>
                        {featured.map((b) => <CarouselCard key={b.id} business={b} badge="Destacado" />)}
                      </ScrollView>
                    </View>
                  )}
                  {top.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHead}>
                        <Text style={styles.h2} accessibilityRole="header">Los favoritos de la comunidad</Text>
                        <Text style={styles.sub}>Los mejor calificados en las reseñas</Text>
                      </View>
                      {top.map((b, i) => <RankCard key={b.id} business={b} rank={i + 1} badge={b.subcategoryName ?? 'Destacado'} />)}
                    </View>
                  )}
                  <View style={styles.section}>
                    <View style={styles.sectionHead}>
                      <Text style={styles.h2} accessibilityRole="header">Recién llegados</Text>
                      <Text style={styles.sub}>Negocios nuevos en {nombreCiudad}</Text>
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

/** Ciudad que todavía no abre: sin categorías ni listas vacías. Nunca cambia la ciudad sin que la persona lo pida. */
function ProximaApertura() {
  const ciudad = useCiudad();
  const nombre = ciudad.municipio.nombre;
  const activas = ciudad.activas;
  const una = activas.length === 1 ? activas[0] : null;
  const intro = ciudad.estado === 'en_preparacion'
    ? `Estamos sumando negocios en ${nombre} para abrir pronto.`
    : 'Estamos preparando nuevos lugares para descubrir en tu ciudad.';
  const resto = una
    ? ` Por ahora, puedes explorar los negocios que ya están en ${una.nombre}.`
    : activas.length > 1 ? ` Por ahora, puedes explorar: ${activas.map((m) => m.nombre).join(', ')}.` : '';
  return (
    <View style={styles.soon} accessibilityLiveRegion="polite">
      <View style={styles.soonIcon}>
        <MapPin size={28} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.soonTitle} accessibilityRole="header">¡Pronto llegaremos a {nombre}!</Text>
      <Text style={styles.soonText}>{intro}{resto}</Text>
      {una ? (
        <Pressable accessibilityRole="button" onPress={() => ciudad.elegir(una.codigo)} style={({ pressed }) => [styles.soonPrimary, pressed && styles.pressed]}>
          <Text style={styles.soonPrimaryText}>Explorar {una.nombre}</Text>
        </Pressable>
      ) : activas.length > 1 ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/ciudad')} style={({ pressed }) => [styles.soonPrimary, pressed && styles.pressed]}>
          <Text style={styles.soonPrimaryText}>Ver ciudades disponibles</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => router.push('/ciudad')} style={({ pressed }) => [styles.soonSecondary, pressed && styles.pressed]}>
        <Text style={styles.soonSecondaryText}>Cambiar de ciudad</Text>
      </Pressable>
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
        <Text style={styles.emptyText}>Revisa tu conexión e inténtalo de nuevo.</Text>
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
  hint2: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.border },
  hint2Text: { ...typography.body, color: colors.textBody },
  hint2Link: { fontFamily: fonts.bold, color: colors.primary },
  soon: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  soonIcon: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  soonTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  soonText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  soonPrimary: { alignSelf: 'stretch', minHeight: sizes.button, marginTop: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  soonPrimaryText: { ...typography.subtitle, color: '#FFFFFF', textAlign: 'center' },
  soonSecondary: { alignSelf: 'stretch', minHeight: sizes.button, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  soonSecondaryText: { ...typography.subtitle, color: colors.primary, textAlign: 'center' },
  loading: { marginVertical: spacing.xxl },
  retry: { marginTop: spacing.xs, minHeight: sizes.touchMin, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  retryText: { ...typography.label, fontFamily: fonts.bold, color: '#FFFFFF' },
});
