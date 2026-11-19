// Bandeja de solicitudes de reserva del restaurante, por estado. Las pendientes van primero por
// defecto (ordenadas por las que vencen antes). Desde aquí se activan las notificaciones.
import { ChoiceChips, PushPrompt, ReservationPill, colors, fonts, reservationWhen, useAuth, type Reservation, type ReservationStatus } from '@zipa/shared';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Settings } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice, type } from '@/components/kit';
import { BackButton } from '@/components/StepHeader';
import { usePushPrompt } from '@/lib/notificaciones';

type Tab = 'pendientes' | 'confirmadas' | 'rechazadas' | 'canceladas' | 'finalizadas' | 'expiradas';
const TABS: { id: Tab; label: string; statuses: ReservationStatus[]; empty: string }[] = [
  { id: 'pendientes', label: 'Pendientes', statuses: ['pendiente'], empty: 'No hay solicitudes por responder.' },
  { id: 'confirmadas', label: 'Confirmadas', statuses: ['confirmada'], empty: 'No hay reservas confirmadas.' },
  { id: 'rechazadas', label: 'Rechazadas', statuses: ['rechazada'], empty: 'No has rechazado solicitudes.' },
  { id: 'canceladas', label: 'Canceladas', statuses: ['cancelada'], empty: 'No hay cancelaciones.' },
  { id: 'finalizadas', label: 'Finalizadas', statuses: ['finalizada', 'no_asistio'], empty: 'Aún no hay reservas finalizadas.' },
  { id: 'expiradas', label: 'Vencidas', statuses: ['expirada'], empty: 'Ninguna solicitud ha vencido.' },
];

/** Orden de cada pestaña: pendientes por plazo, confirmadas por fecha de visita, el resto de la más reciente a la más vieja. */
function sortFor(tab: Tab, list: Reservation[]) {
  if (tab === 'pendientes') return [...list].sort((a, b) => a.respondBy.localeCompare(b.respondBy));
  if (tab === 'confirmadas') return [...list].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return [...list].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

export default function Reservas() {
  const { api, user } = useAuth();
  const [list, setList] = useState<Reservation[] | null>(null);
  const [tab, setTab] = useState<Tab>('pendientes');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const push = usePushPrompt(api);

  const load = useCallback(async () => {
    if (!user) return router.replace('/');
    try {
      const b = await api.myBusiness(user.id);
      if (!b) return router.replace('/panel');
      setList(await api.businessReservations(b.id));
      setError('');
    } catch {
      setError('No pudimos cargar las solicitudes. Desliza hacia abajo para intentar de nuevo.');
    } finally {
      setRefreshing(false);
    }
  }, [api, user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const count = (t: (typeof TABS)[number]) => (list ?? []).filter((r) => t.statuses.includes(r.status)).length;
  const current = TABS.find((t) => t.id === tab)!;
  const items = sortFor(tab, (list ?? []).filter((r) => current.statuses.includes(r.status)));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={styles.head}>
          <BackButton />
          <Text style={[type.h1, { flex: 1 }]}>Reservas</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Configurar reservas" onPress={() => router.push('/reservas/configuracion')} style={styles.gear} hitSlop={6}>
            <Settings size={22} color={colors.text} />
          </Pressable>
        </View>

        <PushPrompt app="negocios" state={push.state} busy={push.busy} failed={push.failed} onEnable={push.enable} />

        {!!error && <Text style={type.error}>{error}</Text>}
        {!list && !error && <ActivityIndicator size="large" />}
        {list && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <ChoiceChips label="Estado" wrap={false} options={TABS.map((t) => ({ id: t.id, label: `${t.label} (${count(t)})` }))} value={tab} onChange={setTab} />
            </ScrollView>
            {!list.length && <Notice tone="info"><Text style={type.strong}>Aún no tienes solicitudes. Cuando un cliente pida una reserva, aparecerá aquí.</Text></Notice>}
            {!!list.length && !items.length && <Text style={type.small}>{current.empty}</Text>}
            {items.map((r) => (
              <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Solicitud ${r.code}, ${reservationWhen(r.startsAt)}, ${r.partySize} personas, ${r.contactName}`} onPress={() => router.push({ pathname: '/reservas/[id]', params: { id: r.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.code}>{r.code}</Text>
                    <ReservationPill status={r.status} />
                  </View>
                  <Text style={type.strong}>{reservationWhen(r.startsAt, new Date())} · {r.partySize} {r.partySize === 1 ? 'persona' : 'personas'}</Text>
                  <Text style={type.small} numberOfLines={1}>{r.contactName}{r.tablePreference ? ` · ${r.tablePreference}` : ''}{r.items.length ? ` · ${r.items.length} ${r.items.length === 1 ? 'plato' : 'platos'}` : ''}</Text>
                  {!!r.notes && <Text style={type.small} numberOfLines={1}>«{r.notes}»</Text>}
                  {r.status === 'pendiente' && <Text style={styles.deadline}>Responde antes de: {reservationWhen(r.respondBy, new Date())}</Text>}
                  <Text style={styles.created}>Recibida: {reservationWhen(r.createdAt, new Date())}</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  gear: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chipIdle },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: { fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: 0.5 },
  deadline: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.accentText },
  created: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
});
