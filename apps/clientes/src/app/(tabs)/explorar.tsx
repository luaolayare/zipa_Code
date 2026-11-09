import { BRAND, CATEGORIES, categoryLabel, colors, fonts, normalize, useAuth, type Business, type Category } from '@zipa/shared';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Coffee, LayoutGrid, MapPin, Search, ShoppingBag, Utensils, X, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessRow } from '@/components/BusinessRow';
import { CarouselCard } from '@/components/CarouselCard';
import { RankCard } from '@/components/RankCard';

const byRating = (a: Business, b: Business) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount;

// Tiles de categoría (la de café usa una etiqueta corta para caber en la grilla).
const TILES: { id: Category | 'todo'; label: string; Icon: LucideIcon }[] = [
  { id: 'todo', label: 'Todo', Icon: LayoutGrid },
  { id: 'comer', label: 'Comer', Icon: Utensils },
  { id: 'artesanias', label: 'Artesanías', Icon: ShoppingBag },
  { id: 'cafe_dulces', label: 'Café', Icon: Coffee },
];

export default function Explorar() {
  const { api, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Business[]>([]);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Category | 'todo'>('todo');

  useEffect(() => {
    api.listBusinesses().then(setAll).catch(() => setAll([]));
  }, [api]);

  // Texto claro sobre la cabecera verde; al salir de la pantalla vuelve a oscuro.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  // Búsqueda por nombre del restaurante o emprendimiento.
  const q = normalize(query);
  const results = useMemo(() => (q ? all.filter((b) => normalize(b.name).includes(q)) : []), [all, q]);

  const filtered = cat === 'todo' ? all : all.filter((b) => b.category === cat);
  const emprendimientos = filtered.filter((b) => b.type === 'emprendimiento');
  const clasicos = filtered.filter((b) => b.type === 'establecido');

  // Lo más destacado: el mejor de cada categoría, o el top 3 de la categoría elegida.
  const top = useMemo(() => {
    if (cat !== 'todo') {
      return all.filter((b) => b.category === cat).sort(byRating).slice(0, 3)
        .map((b, i) => ({ b, rank: i + 1, badge: `Puesto ${i + 1} en ${categoryLabel(cat)}` }));
    }
    return CATEGORIES.map((c) => all.filter((b) => b.category === c.id).sort(byRating)[0])
      .filter((b): b is Business => !!b)
      .map((b) => ({ b, rank: 1, badge: `Mejor en ${categoryLabel(b.category)}` }));
  }, [all, cat]);

  return (
    <View style={styles.screen}>
      {/* Franja verde bajo la barra de estado, para que la cabecera llegue arriba. */}
      <View style={[styles.statusFill, { height: insets.top }]} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.location}>
            <MapPin size={16} color={colors.accent} strokeWidth={2} />
            <Text style={styles.locationText}>{BRAND.city} · {BRAND.zone}</Text>
          </View>
          <View style={styles.greeting}>
            <Text style={styles.hello}>Hola, {user?.name ?? 'viajero'}</Text>
            <Text style={styles.title} accessibilityRole="header">¿Qué quieres descubrir hoy?</Text>
          </View>
          <View style={styles.search}>
            <Search size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              accessibilityLabel="Buscar restaurante o emprendimiento"
              placeholder="Busca un restaurante o emprendimiento"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
              style={styles.searchInput}
            />
            {!!q && (
              <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => setQuery('')} style={styles.clear} hitSlop={6}>
                <X size={16} color={colors.text} strokeWidth={2.4} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {q ? (
            <View style={styles.section}>
              <Text style={styles.resultsLabel}>
                {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para «{query.trim()}»
              </Text>
              {results.map((b) => <BusinessRow key={b.id} business={b} variant="result" />)}
              {results.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No encontramos ese nombre</Text>
                  <Text style={styles.emptyText}>Revisa cómo está escrito o explora por categorías.</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.tiles} accessibilityRole="radiogroup" accessibilityLabel="Categorías">
                {TILES.map(({ id, label, Icon }) => {
                  const on = id === cat;
                  const fg = on ? '#FFFFFF' : colors.text;
                  return (
                    <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setCat(id)} style={[styles.tile, on && styles.tileOn]}>
                      <Icon size={24} color={fg} strokeWidth={2} />
                      <Text style={[styles.tileText, { color: fg }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {top.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.h2} accessibilityRole="header">Lo más destacado</Text>
                    <Text style={styles.sub}>
                      {cat === 'todo' ? 'El mejor calificado de cada categoría' : `Los mejor calificados en ${categoryLabel(cat)}`}
                    </Text>
                  </View>
                  {top.map(({ b, rank, badge }) => <RankCard key={b.id} business={b} rank={rank} badge={badge} />)}
                </View>
              )}

              {emprendimientos.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.h2} accessibilityRole="header">Emprendimientos del barrio</Text>
                    <Text style={styles.count}>{emprendimientos.length} {emprendimientos.length === 1 ? 'negocio' : 'negocios'}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel} contentContainerStyle={styles.carouselContent}>
                    {emprendimientos.map((b) => <CarouselCard key={b.id} business={b} />)}
                  </ScrollView>
                </View>
              )}

              {clasicos.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.h2} accessibilityRole="header">Clásicos de la zona</Text>
                  {clasicos.map((b) => <BusinessRow key={b.id} business={b} variant="classic" />)}
                </View>
              )}
            </>
          )}
          {api.isDemo && <Text style={styles.demo}>Negocios, productos y reseñas son datos de ejemplo.</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  statusFill: { backgroundColor: colors.primary },
  scroll: { flexGrow: 1 },

  // Cabecera verde
  header: { backgroundColor: colors.primary, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 14 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 13, fontFamily: fonts.semibold, color: colors.onPrimaryMuted },
  greeting: { gap: 2 },
  hello: { fontSize: 15, fontFamily: fonts.bold, color: colors.accent },
  title: { fontSize: 28, lineHeight: 31, fontFamily: fonts.display, letterSpacing: -0.56, color: '#FFFFFF' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, backgroundColor: colors.surface, borderRadius: 14, paddingLeft: 14, paddingRight: 6 },
  searchInput: { flex: 1, minWidth: 0, height: '100%', fontSize: 15, fontFamily: fonts.regular, color: colors.text, padding: 0, outlineWidth: 0 },
  clear: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },

  // Contenido
  body: { padding: 20, gap: 22 },
  section: { gap: 12 },
  sectionHead: { gap: 2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  h2: { fontSize: 20, fontFamily: fonts.display, color: colors.text, flexShrink: 1 },
  sub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },
  count: { fontSize: 13, fontFamily: fonts.semibold, color: colors.textMuted },

  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, height: 84, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tileOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tileText: { fontSize: 13, fontFamily: fonts.bold },

  // El carrusel llega al borde de la pantalla.
  carousel: { marginHorizontal: -20 },
  carouselContent: { paddingHorizontal: 20, paddingBottom: 4, gap: 12 },

  resultsLabel: { fontSize: 14, fontFamily: fonts.semibold, color: '#3F4B49' },
  empty: { backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inputBorder, borderRadius: 16, padding: 20, gap: 6, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },

  demo: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
