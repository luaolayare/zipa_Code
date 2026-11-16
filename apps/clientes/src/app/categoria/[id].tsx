// Una categoría principal (Emprendimientos o Restaurantes) con sus subcategorías.
import { MAIN_CATEGORIES, MIN_REVIEWS_FOR_RANKING, colors, fonts, subcategoriesOf, useAuth, type Business, type CategoryNode, type MainCategory, type SearchOrder } from '@zipa/shared';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { BusinessRow } from '@/components/BusinessRow';

const PAGE = 20;

export default function Categoria() {
  const { id, sub } = useLocalSearchParams<{ id: string; sub?: string }>();
  const main = (MAIN_CATEGORIES.find((m) => m.id === id) ?? MAIN_CATEGORIES[0]);
  const { api } = useAuth();
  const insets = useSafeAreaInsets();

  const [subs, setSubs] = useState<CategoryNode[]>([]);
  const [subcategory, setSubcategory] = useState<string | null>(sub ?? null);
  const [order, setOrder] = useState<SearchOrder>('relevancia');
  // Resultado de la última consulta, marcado con su filtro (key) y su intento: si no coincide con
  // el filtro actual, la pantalla está cargando. Así las respuestas viejas nunca tapan las nuevas.
  const key = `${main.id}|${subcategory ?? ''}|${order}`;
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<{ key: string; attempt: number; list: Business[]; more: boolean; error: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);

  // Analítica: categoría principal o subcategoría consultada.
  useEffect(() => { api.track('category_view', { category: subcategory ?? main.id }); }, [api, main.id, subcategory]);

  useEffect(() => {
    api.listCategories().then((all) => setSubs(subcategoriesOf(all, main.id as MainCategory))).catch(() => setSubs([]));
  }, [api, main.id]);

  // Primera página de cada filtro.
  useEffect(() => {
    let stale = false;
    api.searchBusinesses({ main: main.id, subcategory, order, limit: PAGE })
      .then((list) => { if (!stale) setPage({ key, attempt, list, more: list.length === PAGE, error: false }); })
      .catch(() => { if (!stale) setPage({ key, attempt, list: [], more: false, error: true }); });
    return () => { stale = true; };
  }, [api, main.id, subcategory, order, key, attempt]);

  const ready = page?.key === key && page.attempt === attempt;
  const list = ready ? page.list : [];
  const more = ready && page.more;
  const status: 'cargando' | 'listo' | 'error' = !ready ? 'cargando' : page.error ? 'error' : 'listo';

  // Siguiente página: se pide desde el botón "Ver más" (no desde un efecto).
  const loadMore = useCallback(() => {
    if (!page) return;
    const forKey = key;
    setLoadingMore(true);
    setMoreError(false);
    api.searchBusinesses({ main: main.id, subcategory, order, limit: PAGE, offset: page.list.length })
      .then((next) => {
        setPage((p) => (!p || p.key !== forKey) ? p : { ...p, list: [...p.list, ...next.filter((b) => !p.list.some((x) => x.id === b.id))], more: next.length === PAGE });
      })
      .catch(() => setMoreError(true))
      .finally(() => setLoadingMore(false));
  }, [api, page, key, main.id, subcategory, order]);

  // Ordenar por calificación solo tiene sentido si hay negocios con reseñas suficientes.
  const canRank = list.some((b) => b.reviewCount >= MIN_REVIEWS_FOR_RANKING) || order === 'calificacion';
  const subName = subs.find((s) => s.id === subcategory)?.name;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 32 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <BackButton />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title} accessibilityRole="header">{main.name}</Text>
            <Text style={styles.sub} numberOfLines={2}>{main.description}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsWrap} contentContainerStyle={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Subcategorías">
          {[{ id: null as string | null, name: 'Todo' }, ...subs].map((c) => {
            const on = c.id === subcategory;
            return (
              <Pressable key={c.id ?? 'todo'} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setSubcategory(c.id)} style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.85 }]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {canRank && (
          <View style={styles.orders} accessibilityRole="radiogroup" accessibilityLabel="Ordenar">
            {([['relevancia', 'Recomendados'], ['calificacion', 'Mejor calificados']] as const).map(([o, label]) => {
              const on = o === order;
              return (
                <Pressable key={o} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setOrder(o)} style={[styles.order, on && styles.orderOn]}>
                  <Text style={[styles.orderText, on && { color: colors.text }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {status === 'cargando' ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} accessibilityLabel="Cargando negocios" />
        ) : status === 'error' ? (
          <View style={styles.empty} accessibilityRole="alert">
            <Text style={styles.emptyTitle}>No pudimos cargar los negocios</Text>
            <Text style={styles.emptyText}>Revisa tu conexión a internet.</Text>
            <Pressable accessibilityRole="button" onPress={() => setAttempt((n) => n + 1)} style={styles.button}>
              <Text style={styles.buttonText}>Intentar de nuevo</Text>
            </Pressable>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{subName ? `Aún no hay negocios en ${subName}` : `Aún no hay ${main.name.toLowerCase()}`}</Text>
            <Text style={styles.emptyText}>Estamos sumando lugares de la zona. Mira otra subcategoría o vuelve pronto.</Text>
          </View>
        ) : (
          <View style={styles.list} accessibilityLiveRegion="polite">
            <Text style={styles.count}>{list.length}{more ? '+' : ''} {list.length === 1 ? 'lugar' : 'lugares'}{subName ? ` en ${subName}` : ''}</Text>
            {list.map((b) => <BusinessRow key={b.id} business={b} variant="result" />)}
            {moreError && <Text style={styles.error} accessibilityRole="alert">No pudimos cargar más. Intenta de nuevo.</Text>}
            {more && (
              <Pressable accessibilityRole="button" onPress={loadMore} disabled={loadingMore} style={[styles.button, styles.moreButton]}>
                {loadingMore ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Ver más</Text>}
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontSize: 30, lineHeight: 34, fontFamily: fonts.display, letterSpacing: -0.7, color: colors.text },
  sub: { fontSize: 14, lineHeight: 19, fontFamily: fonts.regular, color: colors.textMuted },

  chipsWrap: { marginHorizontal: -20 },
  chips: { paddingHorizontal: 20, gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14.5, fontFamily: fonts.bold, color: colors.text },
  chipTextOn: { color: '#FFFFFF' },

  orders: { flexDirection: 'row', alignSelf: 'flex-start', padding: 4, gap: 4, borderRadius: 999, backgroundColor: colors.chipIdle },
  order: { minHeight: 36, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999 },
  orderOn: { backgroundColor: colors.surface },
  orderText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.textMuted },

  list: { gap: 10 },
  count: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.textMuted },
  empty: { backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inputBorder, borderRadius: 16, padding: 20, gap: 6, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 13.5, lineHeight: 19, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  error: { fontSize: 14, fontFamily: fonts.semibold, color: colors.danger, textAlign: 'center' },
  button: { marginTop: 6, minHeight: 46, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  moreButton: { alignSelf: 'stretch' },
  buttonText: { fontSize: 15, fontFamily: fonts.bold, color: '#FFFFFF' },
});
