// Solicitudes de reserva que recibió el restaurante: pendientes primero (las que vencen antes),
// luego las confirmadas que vienen, y el historial.
import { ReservationPill, colors, fonts, reservationWhen, useAuth, type Reservation } from '@zipa/shared';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Settings } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice, type } from '@/components/kit';
import { BackButton } from '@/components/StepHeader';

export default function Reservas() {
  const { api, user } = useAuth();
  const [list, setList] = useState<Reservation[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!user) return router.replace('/');
    try {
      const b = await api.myBusiness(user.id);
      if (!b) return router.replace('/panel');
      setList(await api.businessReservations(b.id));
      setNow(Date.now());
      setError('');
    } catch {
      setError('No pudimos cargar las solicitudes. Desliza hacia abajo para intentar de nuevo.');
    } finally {
      setRefreshing(false);
    }
  }, [api, user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pending = (list ?? []).filter((r) => r.status === 'pendiente').sort((a, b) => a.respondBy.localeCompare(b.respondBy));
  const upcoming = (list ?? []).filter((r) => r.status === 'confirmada' && new Date(r.startsAt).getTime() >= now - 3 * 3600e3);
  const history = (list ?? []).filter((r) => !pending.includes(r) && !upcoming.includes(r)).sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={styles.head}>
          <BackButton />
          <Text style={[type.h1, { flex: 1 }]}>Solicitudes</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Configurar reservas" onPress={() => router.push('/reservas/configuracion')} style={styles.gear} hitSlop={6}>
            <Settings size={22} color={colors.text} />
          </Pressable>
        </View>
        {!!error && <Text style={type.error}>{error}</Text>}
        {!list && !error && <ActivityIndicator size="large" />}
        {list && !list.length && (
          <Notice tone="info"><Text style={type.strong}>Aún no tienes solicitudes. Cuando un cliente pida una reserva, aparecerá aquí.</Text></Notice>
        )}
        <Group title={`Pendientes (${pending.length})`} items={pending} empty="No hay solicitudes por responder." />
        <Group title="Confirmadas próximas" items={upcoming} />
        <Group title="Historial" items={history} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ title, items, empty }: { title: string; items: Reservation[]; empty?: string }) {
  if (!items.length && !empty) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={type.h2} accessibilityRole="header">{title}</Text>
      {!items.length && <Text style={type.small}>{empty}</Text>}
      {items.map((r) => (
        <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Solicitud ${r.code}, ${reservationWhen(r.startsAt)}, ${r.partySize} personas, ${r.contactName}`} onPress={() => router.push({ pathname: '/reservas/[id]', params: { id: r.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.rowTop}>
              <Text style={styles.code}>{r.code}</Text>
              <ReservationPill status={r.status} />
            </View>
            <Text style={type.strong}>{reservationWhen(r.startsAt, new Date())} · {r.partySize} {r.partySize === 1 ? 'persona' : 'personas'}</Text>
            <Text style={type.small} numberOfLines={1}>{r.contactName}{r.items.length ? ` · ${r.items.length} ${r.items.length === 1 ? 'plato' : 'platos'} elegidos` : ''}</Text>
            {r.status === 'pendiente' && <Text style={styles.deadline}>Responde antes de: {reservationWhen(r.respondBy, new Date())}</Text>}
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48, gap: 22 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  gear: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chipIdle },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: { fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: 0.5 },
  deadline: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.accentText },
});
