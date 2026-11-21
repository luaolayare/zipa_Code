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
  WhatsAppIcon,
  colors,
  confirmAsync,
  fonts,
  formatCop,
  rejectReasonLabel,
  reservationWhen,
  restaurantWhatsappMessage,
  useAuth,
  whatsappLink,
  type RejectReason,
  type Reservation,
  radius,
  spacing,
  typography,
} from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { Notice, type } from '@/components/kit';
import { Page } from '@/components/Page';
import { BackButton } from '@/components/StepHeader';

const ACTOR = { cliente: 'el cliente', restaurante: 'tu restaurante', sistema: 'la app' } as const;

export default function SolicitudDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const [r, setR] = useState<Reservation | null | undefined>(undefined);
  const [mode, setMode] = useState<'ver' | 'rechazar' | 'cancelar'>('ver');
  const [reason, setReason] = useState<RejectReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());
  const [businessName, setBusinessName] = useState('');
  const [contacting, setContacting] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => api.getReservation(id).then(setR).catch(() => setR(null)), [api, id]);
  useEffect(() => { load(); }, [load]);
  // Nombre del restaurante para el mensaje de WhatsApp (aunque esté en revisión y no sea público).
  useEffect(() => { if (user) api.myBusiness(user.id).then((b) => setBusinessName(b?.name ?? '')).catch(() => {}); }, [api, user]);

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
  // Número validado (el servidor ya lo guardó en dígitos con indicativo); si no sirve, no hay botón.
  const wa = whatsappLink(r.contactWhatsapp) ? r.contactWhatsapp : null;
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <BackButton />
        <View style={{ flex: 1, gap: spacing.xxs }}>
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
          <Text style={type.subtitle}>Platos que le gustaría pedir</Text>
          {r.items.map((i, k) => (
            <View key={k} style={styles.item}>
              <Text style={[type.label, { flex: 1 }]}>{i.quantity} × {i.name}</Text>
              {i.unitPriceCop != null && <Text style={type.caption}>{formatCop(i.unitPriceCop * i.quantity)}</Text>}
            </View>
          ))}
          {total > 0 && <Text style={type.caption}>Total informativo: {formatCop(total)}</Text>}
          <Text style={type.help}>{DISHES_NOTICE_RESTAURANT}</Text>
        </View>
      )}

      {r.status === 'rechazada' && (
        <Notice tone="danger"><Text style={type.label}>Rechazada: {rejectReasonLabel(r.rejectReason)}{r.rejectNote ? `. ${r.rejectNote}` : ''}</Text></Notice>
      )}
      {r.status === 'cancelada' && (
        <Notice tone="warn"><Text style={type.label}>Cancelada por {r.cancelledBy === 'cliente' ? 'el cliente' : 'tu restaurante'}{r.cancelReason ? `: ${r.cancelReason}` : ''}</Text></Notice>
      )}
      {r.status === 'expirada' && <Notice tone="warn"><Text style={type.label}>Venció sin respuesta. El cliente puede enviar otra solicitud.</Text></Notice>}

      {/* Contactar al cliente por WhatsApp: mensaje editable; no envía nada solo ni cambia el estado. */}
      {!!wa && !contacting && (
        <Button title="Contactar al cliente" variant="outline" icon={<WhatsAppIcon size={20} />} onPress={() => { setMessage(restaurantWhatsappMessage(r, businessName || 'el restaurante')); setContacting(true); }} />
      )}
      {!!wa && contacting && (
        <View style={styles.card}>
          <TextField label="Mensaje para el cliente (puedes cambiarlo)" value={message} onChangeText={setMessage} multiline maxLength={600} style={{ minHeight: 170, textAlignVertical: 'top' }} />
          <Text style={type.help}>Se abre WhatsApp con este mensaje; tú decides si lo envías. Abrirlo no confirma la reserva.</Text>
          <Button title="Abrir WhatsApp" icon={<WhatsAppIcon size={20} />} onPress={() => { const url = whatsappLink(wa, message); if (url) Linking.openURL(url); setContacting(false); }} />
          <Button title="Cancelar" variant="link" onPress={() => setContacting(false)} />
        </View>
      )}

      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}

      {/* Pendiente: confirmar o rechazar con motivo. */}
      {r.status === 'pendiente' && mode === 'ver' && (
        <View style={{ gap: spacing.sm }}>
          <Text style={type.help}>Coordina los detalles con el cliente por WhatsApp y después confirma o rechaza.</Text>
          <Button title="Confirmar reserva" onPress={confirm} loading={busy} />
          <Button title="No puedo confirmarla" variant="danger" onPress={() => setMode('rechazar')} disabled={busy} />
        </View>
      )}
      {r.status === 'pendiente' && mode === 'rechazar' && (
        <View style={{ gap: spacing.sm }}>
          <Text style={type.subtitle}>¿Por qué no puedes confirmarla?</Text>
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
        <View style={{ gap: spacing.sm }}>
          <TextField label="¿Por qué cancelas? (lo verá el cliente)" value={note} onChangeText={setNote} maxLength={200} multiline />
          <Button title="Cancelar la reserva" variant="danger" onPress={() => {
            if (note.trim().length < 3) return setError('Cuéntale al cliente por qué cancelas la reserva.');
            run(() => api.cancelReservation(r.id, note));
          }} loading={busy} />
          <Button title="Volver" variant="link" onPress={() => { setMode('ver'); setError(''); }} />
        </View>
      )}
      {r.status === 'confirmada' && started && (
        <View style={{ gap: spacing.sm }}>
          <Text style={type.subtitle}>¿Llegó el cliente?</Text>
          <Button title="Sí, llegó" onPress={() => run(() => api.markAttendance(r.id, true))} loading={busy} />
          <Button title="No llegó" variant="outline" onPress={() => run(() => api.markAttendance(r.id, false))} disabled={busy} />
        </View>
      )}

      {!!r.events?.length && (
        <View style={{ gap: spacing.xs }}>
          <Text style={type.overline}>Historial</Text>
          {r.events.map((e, k) => (
            <Text key={k} style={type.help}>
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
  code: { ...typography.title, color: colors.text },
  card: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  row: { gap: spacing.xxs },
  label: { ...typography.caption, fontFamily: fonts.semibold, color: colors.textMuted },
  value: { ...typography.body, fontFamily: fonts.semibold, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
