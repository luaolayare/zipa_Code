// Bandeja de solicitudes de reserva del restaurante, por estado. Cada pestaña se pide al servidor por
// páginas (30 y «Ver más»), en el orden que importa: pendientes por el plazo que vence antes y
// confirmadas por la visita más cercana. Un historial largo ya no tapa lo nuevo (auditoría Beta 2.2, P4).
import {
  ChoiceChips,
  INBOX_PAGE,
  INBOX_TABS,
  PushPrompt,
  ReservationPill,
  colors,
  createPager,
  fonts,
  reservationWhen,
  useAuth,
  type InboxTab,
  type Reservation,
  radius,
  sizes,
  spacing,
  typography,
} from '@zipa/shared';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Settings } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice, type } from '@/components/kit';
import { BackButton } from '@/components/StepHeader';
import { usePushPrompt } from '@/lib/notificaciones';

export default function Reservas() {
  const { api, user } = useAuth();
  const [tab, setTab] = useState<InboxTab>('pendientes');
  const [counts, setCounts] = useState<Record<InboxTab, number> | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const push = usePushPrompt(api);

  useEffect(() => {
    if (!user) return void router.replace('/');
    api.myBusiness(user.id)
      .then((b) => (b ? setBusinessId(b.id) : router.replace('/panel')))
      .catch(() => setError('No pudimos cargar las solicitudes. Desliza hacia abajo para intentar de nuevo.'));
  }, [api, user]);

  // La "búsqueda" del paginador es la pestaña: cambiarla reinicia la lista y descarta respuestas viejas.
  const pager = useMemo(
    () => createPager<Reservation>((t, offset, limit) => api.businessReservationsPage(businessId ?? '', t as InboxTab, offset, limit), INBOX_PAGE),
    [api, businessId],
  );
  const page = useSyncExternalStore(pager.subscribe, pager.getState, pager.getState);

  const load = useCallback(async (t: InboxTab) => {
    if (!businessId) return;
    try {
      const [c] = await Promise.all([api.reservationCounts(businessId), pager.search(t)]);
      setCounts(c);
      setError('');
    } catch {
      setError('No pudimos cargar las solicitudes. Desliza hacia abajo para intentar de nuevo.');
    } finally {
      setRefreshing(false);
    }
  }, [api, businessId, pager]);

  // Al volver a la pantalla (por ejemplo, después de confirmar una) se recarga la pestaña actual.
  useFocusEffect(useCallback(() => { load(tab); }, [load, tab]));

  const current = INBOX_TABS.find((t) => t.id === tab)!;
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(tab); }} />}>
        <View style={styles.head}>
          <BackButton />
          <Text style={[type.title, { flex: 1 }]}>Reservas</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Configurar reservas" onPress={() => router.push('/reservas/configuracion')} style={styles.gear} hitSlop={6}>
            <Settings size={22} color={colors.text} />
          </Pressable>
        </View>

        <PushPrompt app="negocios" state={push.state} busy={push.busy} failed={push.failed} onEnable={push.enable} onRecheck={push.recheck} />

        {!!error && <Text style={type.error}>{error}</Text>}
        {!counts && !error && <ActivityIndicator size="large" />}
        {counts && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
              <ChoiceChips label="Estado" wrap={false} options={INBOX_TABS.map((t) => ({ id: t.id, label: t.label, count: counts[t.id] }))} value={tab} onChange={setTab} />
            </ScrollView>
            {total === 0 && <Notice tone="info"><Text style={type.label}>Aún no tienes solicitudes. Cuando un cliente pida una reserva, aparecerá aquí.</Text></Notice>}
            {page.loading && <ActivityIndicator />}
            {page.error && <Text style={type.error}>No pudimos cargar esta lista. Desliza hacia abajo para intentar de nuevo.</Text>}
            {!!total && page.loaded && !page.loading && !page.items.length && !page.error && <Text style={type.caption}>{current.empty}</Text>}
            {page.items.map((r) => (
              <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Solicitud ${r.code}, ${reservationWhen(r.startsAt)}, ${r.partySize} personas, ${r.contactName}`} onPress={() => router.push({ pathname: '/reservas/[id]', params: { id: r.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}>
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.code}>{r.code}</Text>
                    <ReservationPill status={r.status} />
                  </View>
                  <Text style={type.subtitle}>{reservationWhen(r.startsAt, new Date())} · {r.partySize} {r.partySize === 1 ? 'persona' : 'personas'}</Text>
                  <Text style={type.caption} numberOfLines={1}>{r.contactName}{r.tablePreference ? ` · ${r.tablePreference}` : ''}{r.items.length ? ` · ${r.items.length} ${r.items.length === 1 ? 'plato' : 'platos'}` : ''}</Text>
                  {!!r.notes && <Text style={type.caption} numberOfLines={1}>«{r.notes}»</Text>}
                  {r.status === 'pendiente' && <Text style={styles.deadline}>Responde antes de: {reservationWhen(r.respondBy, new Date())}</Text>}
                  {r.status === 'confirmada' && tab === 'finalizadas' && <Text style={styles.deadline}>Ya pasó la hora: marca si el cliente llegó</Text>}
                  <Text style={styles.created}>Recibida: {reservationWhen(r.createdAt, new Date())}</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </Pressable>
            ))}
            {page.hasMore && (
              <Pressable accessibilityRole="button" accessibilityState={{ busy: page.loadingMore }} disabled={page.loadingMore} onPress={() => pager.more()} style={({ pressed }) => [styles.more, pressed && { opacity: 0.85 }]}>
                {page.loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.moreText}>Ver más</Text>}
              </Pressable>
            )}
            {page.moreError && <Text style={type.error}>No pudimos cargar más. Toca «Ver más» para intentar de nuevo.</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gear: { width: sizes.touchMin, height: sizes.touchMin, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chipIdle },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  code: typography.heading,
  deadline: { ...typography.caption, fontFamily: fonts.bold, color: colors.danger, alignSelf: 'flex-start', backgroundColor: colors.dangerSoft, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radius.sm, overflow: 'hidden', marginTop: spacing.xxs },
  created: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted },
  more: { minHeight: sizes.button, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  moreText: { ...typography.subtitle, color: colors.primary },
});
