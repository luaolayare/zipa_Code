// «Mis reservas»: las solicitudes de la persona por estado. Desde cada una se ve el detalle, se
// cancela, se pide otro horario o se escribe al restaurante (pantalla /reserva/[id]).
import { ChoiceChips, ReservationPill, colors, fonts, reservationWhen, useAuth, type Reservation, type ReservationStatus } from '@zipa/shared';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';

type Tab = 'pendientes' | 'confirmadas' | 'rechazadas' | 'canceladas' | 'vencidas' | 'historial';
const TABS: { id: Tab; label: string; statuses: ReservationStatus[]; empty: string }[] = [
  { id: 'pendientes', label: 'Pendientes', statuses: ['pendiente'], empty: 'No tienes solicitudes esperando respuesta.' },
  { id: 'confirmadas', label: 'Confirmadas', statuses: ['confirmada'], empty: 'No tienes reservas confirmadas.' },
  { id: 'rechazadas', label: 'No confirmadas', statuses: ['rechazada'], empty: 'Ninguna solicitud fue rechazada.' },
  { id: 'canceladas', label: 'Canceladas', statuses: ['cancelada'], empty: 'No hay cancelaciones.' },
  { id: 'vencidas', label: 'Vencidas', statuses: ['expirada'], empty: 'Ninguna solicitud venció.' },
  { id: 'historial', label: 'Historial', statuses: ['finalizada', 'no_asistio'], empty: 'Aquí verás las reservas que ya pasaron.' },
];

export default function MisReservas() {
  const { api, user, loading } = useAuth();
  const [list, setList] = useState<Reservation[] | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (loading) return;
    if (!user) return router.replace('/login');
    try {
      const l = await api.myReservations(user.id);
      setList(l);
      setError(false);
      // Abre en la primera pestaña que tenga algo (pendientes primero).
      setTab((t) => t ?? (TABS.find((x) => l.some((r) => x.statuses.includes(r.status)))?.id ?? 'pendientes'));
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [api, user, loading]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const count = (t: (typeof TABS)[number]) => (list ?? []).filter((r) => t.statuses.includes(r.status)).length;
  // Las que vienen, por fecha de visita; las pasadas, de la más reciente a la más vieja.
  const items = (list ?? []).filter((r) => current.statuses.includes(r.status))
    .sort((a, b) => (current.id === 'pendientes' || current.id === 'confirmadas' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt)));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <BackButton />
          <Text style={styles.h1}>Mis reservas</Text>
        </View>
        {error && <Text style={styles.error}>No pudimos cargar tus reservas. Desliza hacia abajo para intentar de nuevo.</Text>}
        {!list && !error && <ActivityIndicator size="large" color={colors.primary} />}
        {list && list.length === 0 && (
          <Text style={styles.muted}>Aún no has solicitado reservas. En la ficha de un restaurante que las reciba, toca «Solicitar reserva».</Text>
        )}
        {list && list.length > 0 && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <ChoiceChips label="Estado" wrap={false} options={TABS.map((t) => ({ id: t.id, label: `${t.label} (${count(t)})` }))} value={current.id} onChange={setTab} />
            </ScrollView>
            {!items.length && <Text style={styles.muted}>{current.empty}</Text>}
            {items.map((r) => (
              <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Reserva ${r.code} en ${r.businessName}, ${reservationWhen(r.startsAt)}`} onPress={() => router.push({ pathname: '/reserva/[id]', params: { id: r.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.business} numberOfLines={1}>{r.businessName}</Text>
                    <ReservationPill status={r.status} />
                  </View>
                  <Text style={styles.when}>{reservationWhen(r.startsAt, new Date())} · {r.partySize} {r.partySize === 1 ? 'persona' : 'personas'}</Text>
                  <Text style={styles.muted}>Código {r.code}</Text>
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
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  h1: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.6, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  business: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  when: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.textMuted },
  error: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.danger },
});
