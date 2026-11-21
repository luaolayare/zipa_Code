// Una categoría principal (Emprendimientos o Restaurantes) con sus subcategorías.
import { MAIN_CATEGORIES, MIN_REVIEWS_FOR_RANKING, colors, fonts, subcategoriesOf, useAuth, type Business, type CategoryNode, type MainCategory, type SearchOrder, radius, spacing, typography } from '@zipa/shared';
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
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <BackButton />
          <View style={{ flex: 1, gap: spacing.xxs }}>
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
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xxxl }} accessibilityLabel="Cargando negocios" />
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
  scroll: { padding: spacing.lg, gap: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  sub: { ...typography.body, color: colors.textMuted },

  chipsWrap: { marginHorizontal: -20 },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  chip: { minHeight: 44, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  chipTextOn: { color: '#FFFFFF' },

  orders: { flexDirection: 'row', alignSelf: 'flex-start', padding: spacing.xxs, gap: spacing.xxs, borderRadius: radius.pill, backgroundColor: colors.chipIdle },
  order: { minHeight: 36, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.pill },
  orderOn: { backgroundColor: colors.surface },
  orderText: { ...typography.caption, fontFamily: fonts.bold, color: colors.textMuted },

  list: { gap: spacing.sm },
  count: { ...typography.caption, fontFamily: fonts.semibold, color: colors.textMuted },
  empty: { backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inputBorder, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs, alignItems: 'center' },
  emptyTitle: { ...typography.label, fontFamily: fonts.bold, color: colors.text, textAlign: 'center' },
  emptyText: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  error: { ...typography.label, color: colors.danger, textAlign: 'center' },
  button: { marginTop: spacing.xs, minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  moreButton: { alignSelf: 'stretch' },
  buttonText: { ...typography.label, fontFamily: fonts.bold, color: '#FFFFFF' },
});
