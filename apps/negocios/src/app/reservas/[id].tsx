// Detalle de una solicitud para el restaurante: datos, platos de preferencia y decisión manual.
// Confirmar no significa que el sistema haya comprobado una mesa: lo decide el restaurante después
// de coordinar con el cliente. Nada se cobra desde la app.
import {
  Button,
  ChoiceChips,
  DISHES_NOTICE_RESTAURANT,
  REJECT_REASONS,
  RESERVATION_STATUS,
  ReservationPill,
  TextField,
  colors,
  confirmAsync,
  fonts,
  formatCop,
  rejectReasonLabel,
  reservationWhen,
  useAuth,
  type RejectReason,
  type Reservation,
} from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Notice, type } from '@/components/kit';
import { Page } from '@/components/Page';
import { BackButton } from '@/components/StepHeader';

const ACTOR = { cliente: 'el cliente', restaurante: 'tu restaurante', sistema: 'la app' } as const;

export default function SolicitudDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const [r, setR] = useState<Reservation | null | undefined>(undefined);
  const [mode, setMode] = useState<'ver' | 'rechazar' | 'cancelar'>('ver');
  const [reason, setReason] = useState<RejectReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());

  const load = useCallback(() => api.getReservation(id).then(setR).catch(() => setR(null)), [api, id]);
  useEffect(() => { load(); }, [load]);

  if (r === undefined) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
  if (!r) {
    return (
      <Page>
        <BackButton />
        <Text style={type.error}>No encontramos esta solicitud.</Text>
      </Page>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      setMode('ver');
      setReason(null);
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar. Intenta de nuevo.');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const started = new Date(r.startsAt).getTime() <= now;
  const confirm = async () => {
    const ok = await confirmAsync(
      'Confirmar reserva',
      'Confirma solo si ya acordaste los detalles con el cliente. Al confirmar, la reserva queda en firme para él.',
      'Confirmar',
    );
    if (ok) run(() => api.confirmReservation(r.id));
  };
  const total = r.items.reduce((sum, i) => sum + (i.unitPriceCop ?? 0) * i.quantity, 0);

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <BackButton />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={type.overline}>Solicitud</Text>
          <Text style={styles.code}>{r.code}</Text>
        </View>
        <ReservationPill status={r.status} />
      </View>

      <View style={styles.card}>
        <Row label="Fecha y hora" value={reservationWhen(r.startsAt, new Date())} />
        <Row label="Personas" value={String(r.partySize)} />
        <Row label="Nombre" value={r.contactName} />
        <Row label="WhatsApp" value={`+${r.contactWhatsapp}`} />
        {!!r.tablePreference && <Row label="Preferencia de mesa" value={r.tablePreference} />}
        {!!r.notes && <Row label="Observaciones" value={r.notes} />}
        <Row label="Recibida" value={reservationWhen(r.createdAt, new Date())} />
        {r.status === 'pendiente' && <Row label="Responde antes de" value={reservationWhen(r.respondBy, new Date())} />}
      </View>

      {r.items.length > 0 && (
        <View style={styles.card}>
          <Text style={type.h3}>Platos que le gustaría pedir</Text>
          {r.items.map((i, k) => (
            <View key={k} style={styles.item}>
              <Text style={[type.strong, { flex: 1 }]}>{i.quantity} × {i.name}</Text>
              {i.unitPriceCop != null && <Text style={type.small}>{formatCop(i.unitPriceCop * i.quantity)}</Text>}
            </View>
          ))}
          {total > 0 && <Text style={type.small}>Total informativo: {formatCop(total)}</Text>}
          <Text style={type.small}>{DISHES_NOTICE_RESTAURANT}</Text>
        </View>
      )}

      {r.status === 'rechazada' && (
        <Notice tone="danger"><Text style={type.strong}>Rechazada: {rejectReasonLabel(r.rejectReason)}{r.rejectNote ? `. ${r.rejectNote}` : ''}</Text></Notice>
      )}
      {r.status === 'cancelada' && (
        <Notice tone="warn"><Text style={type.strong}>Cancelada por {r.cancelledBy === 'cliente' ? 'el cliente' : 'tu restaurante'}{r.cancelReason ? `: ${r.cancelReason}` : ''}</Text></Notice>
      )}
      {r.status === 'expirada' && <Notice tone="warn"><Text style={type.strong}>Venció sin respuesta. El cliente puede enviar otra solicitud.</Text></Notice>}

      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}

      {/* Pendiente: confirmar o rechazar con motivo. */}
      {r.status === 'pendiente' && mode === 'ver' && (
        <View style={{ gap: 12 }}>
          <Text style={type.small}>Coordina los detalles con el cliente por WhatsApp y después confirma o rechaza.</Text>
          <Button title="Confirmar reserva" onPress={confirm} loading={busy} />
          <Button title="No puedo confirmarla" variant="danger" onPress={() => setMode('rechazar')} disabled={busy} />
        </View>
      )}
      {r.status === 'pendiente' && mode === 'rechazar' && (
        <View style={{ gap: 12 }}>
          <Text style={type.h3}>¿Por qué no puedes confirmarla?</Text>
          <ChoiceChips label="Motivo del rechazo" options={REJECT_REASONS} value={reason} onChange={setReason} />
          <TextField label={reason === 'otro' ? 'Cuéntale el motivo' : 'Mensaje para el cliente (opcional)'} value={note} onChangeText={setNote} maxLength={200} multiline placeholder="Ej: Ese día tenemos un evento privado. ¿Te sirve el domingo?" />
          <Button title="Enviar rechazo" variant="danger" onPress={() => {
            if (!reason) return setError('Elige el motivo del rechazo.');
            if (reason === 'otro' && note.trim().length < 3) return setError('Cuéntale al cliente el motivo.');
            run(() => api.rejectReservation(r.id, reason, note));
          }} loading={busy} />
          <Button title="Volver" variant="link" onPress={() => { setMode('ver'); setError(''); }} />
        </View>
      )}

      {/* Confirmada y antes de la hora: cancelar con motivo. Después de la hora: asistencia. */}
      {r.status === 'confirmada' && !started && mode === 'ver' && (
        <Button title="Cancelar reserva" variant="danger" onPress={() => setMode('cancelar')} />
      )}
      {r.status === 'confirmada' && !started && mode === 'cancelar' && (
        <View style={{ gap: 12 }}>
          <TextField label="¿Por qué cancelas? (lo verá el cliente)" value={note} onChangeText={setNote} maxLength={200} multiline />
          <Button title="Cancelar la reserva" variant="danger" onPress={() => {
            if (note.trim().length < 3) return setError('Cuéntale al cliente por qué cancelas la reserva.');
            run(() => api.cancelReservation(r.id, note));
          }} loading={busy} />
          <Button title="Volver" variant="link" onPress={() => { setMode('ver'); setError(''); }} />
        </View>
      )}
      {r.status === 'confirmada' && started && (
        <View style={{ gap: 12 }}>
          <Text style={type.h3}>¿Llegó el cliente?</Text>
          <Button title="Sí, llegó" onPress={() => run(() => api.markAttendance(r.id, true))} loading={busy} />
          <Button title="No llegó" variant="outline" onPress={() => run(() => api.markAttendance(r.id, false))} disabled={busy} />
        </View>
      )}

      {!!r.events?.length && (
        <View style={{ gap: 6 }}>
          <Text style={type.overline}>Historial</Text>
          {r.events.map((e, k) => (
            <Text key={k} style={type.small}>
              {reservationWhen(e.createdAt, new Date())}: {e.fromStatus ? `pasó a «${RESERVATION_STATUS[e.toStatus].label}»` : 'solicitud recibida'} ({ACTOR[e.actorRole]})
            </Text>
          ))}
        </View>
      )}
      <Button title="Volver a las solicitudes" variant="link" onPress={() => router.back()} />
    </Page>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  code: { fontFamily: fonts.display, fontSize: 28, letterSpacing: 0.5, color: colors.text },
  card: { gap: 12, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  row: { gap: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  value: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
