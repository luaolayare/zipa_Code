// Estado de una solicitud de reserva para quien la hizo: código, estado explicado, datos, platos,
// motivo si no se confirmó, cancelar y «Solicitar otro horario».
import {
  BRAND,
  Button,
  DISHES_NOTICE,
  PushPrompt,
  ReservationPill,
  WhatsAppIcon,
  colors,
  confirmAsync,
  fonts,
  formatCop,
  radius,
  spacing,
  typography,
  normalizeWhatsapp,
  rejectReasonLabel,
  reservationWhen,
  useAuth,
  whatsappLink,
  type Reservation,
} from '@zipa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { usePushPrompt } from '@/lib/notificaciones';

const EXPLAIN: Record<Reservation['status'], string> = {
  pendiente: 'Tu solicitud fue enviada. La reserva solo quedará confirmada cuando el restaurante la acepte. Puede escribirte por WhatsApp para coordinar.',
  confirmada: 'El restaurante confirmó tu reserva. Si no puedes ir, cancélala para liberar el espacio.',
  rechazada: 'El restaurante no pudo confirmar esta solicitud.',
  cancelada: 'Esta solicitud fue cancelada.',
  expirada: 'El restaurante no respondió a tiempo, así que la solicitud venció. Puedes enviar otra o escribirle por WhatsApp.',
  finalizada: 'Reserva finalizada. ¡Gracias por visitarlos!',
  no_asistio: 'El restaurante marcó que no asististe.',
};

export default function MiReserva() {
  const { id, nueva } = useLocalSearchParams<{ id: string; nueva?: string }>();
  const { api, user } = useAuth();
  const [r, setR] = useState<Reservation | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());
  const push = usePushPrompt(api);

  const load = useCallback(() => api.getReservation(id).then(setR).catch(() => setR(null)), [api, id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (r === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!r || !user || r.customerId !== user.id) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.h1}>No encontramos esta solicitud</Text>
        <BackButton />
      </SafeAreaView>
    );
  }

  const future = new Date(r.startsAt).getTime() > now;
  // WhatsApp del restaurante con un mensaje que menciona el código (la persona lo puede cambiar).
  const restaurantWa = r.businessWhatsapp ? whatsappLink(normalizeWhatsapp(r.businessWhatsapp) ?? '', `Hola, les escribo por mi solicitud de reserva ${r.code} en ${BRAND.name} (${reservationWhen(r.startsAt)}).`) : null;
  const canCancel = future && (r.status === 'pendiente' || r.status === 'confirmada');
  const cancel = async () => {
    const pending = r.status === 'pendiente';
    const ok = await confirmAsync(
      pending ? 'Retirar solicitud' : 'Cancelar reserva',
      pending ? 'El restaurante ya no la verá como pendiente.' : 'El restaurante verá que cancelaste.',
      pending ? 'Retirar' : 'Cancelar reserva',
      true,
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      await api.cancelReservation(r.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cancelar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <BackButton />
          <Text style={[styles.overline, { flex: 1 }]}>Solicitud de reserva</Text>
        </View>

        {nueva === '1' && r.status === 'pendiente' && (
          <View style={styles.sent} accessibilityRole="alert">
            <Text style={styles.sentTitle}>¡Solicitud enviada!</Text>
            <Text style={styles.sentText}>Guarda tu código. Puedes ver el estado aquí y en Perfil → Mis reservas.</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.muted}>Código</Text>
          <Text style={styles.code} accessibilityLabel={`Código ${r.code.split('').join(' ')}`}>{r.code}</Text>
          <ReservationPill status={r.status} />
          <Text style={styles.body}>{EXPLAIN[r.status]}</Text>
          {r.status === 'rechazada' && (
            <Text style={styles.reason}>Motivo: {rejectReasonLabel(r.rejectReason)}{r.rejectNote ? `. «${r.rejectNote}»` : ''}</Text>
          )}
          {r.status === 'cancelada' && (
            <Text style={styles.reason}>Cancelada por {r.cancelledBy === 'cliente' ? 'ti' : 'el restaurante'}{r.cancelReason ? `: «${r.cancelReason}»` : ''}</Text>
          )}
        </View>

        <View style={[styles.card, styles.rows]}>
          <Row label="Restaurante" value={r.businessName ?? 'Restaurante'} first />
          <Row label="Fecha y hora" value={reservationWhen(r.startsAt, new Date())} />
          <Row label="Personas" value={String(r.partySize)} />
          <Row label="A nombre de" value={r.contactName} />
          {!!r.tablePreference && <Row label="Preferencia de mesa" value={r.tablePreference} />}
          {!!r.notes && <Row label="Observaciones" value={r.notes} />}
          {r.status === 'pendiente' && <Row label="El restaurante responde a más tardar" value={reservationWhen(r.respondBy, new Date())} />}
        </View>

        {r.items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Platos que te gustaría pedir</Text>
            {r.items.map((i, k) => (
              <Text key={k} style={styles.body}>{i.quantity} × {i.name}{i.unitPriceCop != null ? ` · ${formatCop(i.unitPriceCop * i.quantity)}` : ''}</Text>
            ))}
            <Text style={styles.muted}>{DISHES_NOTICE}</Text>
          </View>
        )}

        {(r.status === 'pendiente' || r.status === 'confirmada') && future && (
          <PushPrompt app="clientes" state={push.state} busy={push.busy} failed={push.failed} onEnable={push.enable} onRecheck={push.recheck} />
        )}

        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        {!!restaurantWa && <Button title="Contactar al restaurante" variant="outline" icon={<WhatsAppIcon size={20} />} onPress={() => Linking.openURL(restaurantWa)} />}
        {(r.status === 'rechazada' || r.status === 'expirada' || r.status === 'cancelada') && (
          <Button title="Solicitar otro horario" onPress={() => router.push({ pathname: '/reservar/[id]', params: { id: r.businessId, otra: r.id } })} />
        )}
        <Button title="Ver el restaurante" variant="outline" onPress={() => router.push({ pathname: '/negocio/[id]', params: { id: r.businessId } })} />
        {canCancel && <Button title={r.status === 'pendiente' ? 'Retirar solicitud' : 'Cancelar reserva'} variant="danger" onPress={cancel} loading={busy} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.row, !first && styles.rowLine]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm },
  overline: typography.overline,
  h1: { ...typography.heading, textAlign: 'center' },
  sent: { gap: spacing.xxs, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.successSoft },
  sentTitle: { ...typography.subtitle, color: colors.success },
  sentText: { ...typography.body, color: colors.success },
  card: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rows: { gap: 0, paddingVertical: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { ...typography.body, color: colors.textMuted, flex: 1 },
  rowValue: { ...typography.label, lineHeight: 24, maxWidth: '58%', textAlign: 'right' },
  code: { ...typography.display, fontFamily: fonts.display, letterSpacing: 1 }, // el código se dicta: un poco de aire entre letras
  label: typography.subtitle,
  value: typography.label,
  body: typography.body,
  reason: { ...typography.label, lineHeight: 22, color: colors.danger },
  muted: { ...typography.caption, fontFamily: fonts.regular },
  error: { ...typography.label, color: colors.danger },
});
