// Solicitar una reserva en un restaurante (requiere sesión). Es una SOLICITUD: el restaurante la
// confirma o no. Con `otra`, se llena con los datos de una solicitud anterior («Solicitar otro horario»).
import {
  Button,
  ChoiceChips,
  DISHES_NOTICE,
  RESERVATION_NOTICE,
  Stepper,
  TextField,
  availableDays,
  bogotaDate,
  bogotaInstant,
  colors,
  dayLabel,
  fonts,
  formatCop,
  newIdempotencyKey,
  normalizeWhatsapp,
  slotsFor,
  timeLabel,
  useAuth,
  type Business,
  type Product,
  type ReservationSettings,
} from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';

export default function SolicitarReserva() {
  const { id, otra } = useLocalSearchParams<{ id: string; otra?: string }>();
  const { api, user, loading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [settings, setSettings] = useState<ReservationSettings | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [party, setParty] = useState(2);
  const [name, setName] = useState(user?.name ?? '');
  const [whatsapp, setWhatsapp] = useState('');
  const [table, setTable] = useState('');
  const [notes, setNotes] = useState('');
  const [dishes, setDishes] = useState<Record<string, number>>({});
  const [showDishes, setShowDishes] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  // Una clave por solicitud: si la red falla y la persona vuelve a tocar «Enviar», el servidor
  // devuelve la misma solicitud en vez de crear otra. Cambia solo si cambia lo que se pide.
  const key = useRef(newIdempotencyKey());

  useEffect(() => {
    if (loading) return; // la sesión aún se está restaurando
    if (!user) {
      router.replace({ pathname: '/login', params: { desde: 'reservar', negocio: id } });
      return;
    }
    Promise.all([api.getBusiness(id), api.getReservationSettings(id), api.listProducts(id).catch(() => [] as Product[]), otra ? api.getReservation(otra).catch(() => null) : null])
      .then(([b, s, p, previa]) => {
        setBusiness(b);
        setSettings(s);
        setProducts(p.filter((x) => x.available));
        // El nombre de la cuenta, si la persona aún no escribió otro (la sesión puede llegar después del primer render).
        setName((actual) => actual || user.name);
        if (previa) {
          setParty(previa.partySize);
          setName(previa.contactName);
          setWhatsapp(`+${previa.contactWhatsapp}`);
          setTable(previa.tablePreference ?? '');
          setNotes(previa.notes ?? '');
        }
      })
      .catch(() => setSettings(null));
  }, [api, id, otra, user, loading]);

  const [now] = useState(() => new Date()); // las horas se calculan desde que se abre el formulario
  const days = useMemo(() => (settings ? availableDays(settings, now) : []), [settings, now]);
  const times = useMemo(() => (settings && date ? slotsFor(settings, date, now) : []), [settings, date, now]);
  // Cambiar lo que se pide crea una solicitud distinta (otra clave).
  useEffect(() => { key.current = newIdempotencyKey(); }, [date, time, party]);

  if (loading || !user) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (settings === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!settings?.enabled || !business) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.h1}>Este restaurante no está recibiendo solicitudes</Text>
        <Text style={styles.muted}>Puedes escribirle por WhatsApp desde su ficha.</Text>
        <BackButton />
      </SafeAreaView>
    );
  }

  const today = bogotaDate(now);
  const chosen = products.filter((p) => dishes[p.id]);
  const send = async () => {
    if (!date || !time) return setError('Elige el día y la hora.');
    if (name.trim().length < 2) return setError('Escribe el nombre de quien reserva.');
    if (!normalizeWhatsapp(whatsapp)) return setError('Escribe un número de WhatsApp válido, con indicativo si no es de Colombia.');
    setSending(true);
    setError('');
    try {
      const r = await api.requestReservation({
        businessId: id,
        startsAt: bogotaInstant(date, time),
        partySize: party,
        contactName: name,
        contactWhatsapp: whatsapp,
        tablePreference: table,
        notes,
        items: chosen.map((p) => ({ productId: p.id, quantity: dishes[p.id] })),
        idempotencyKey: key.current,
      });
      router.replace({ pathname: '/reserva/[id]', params: { id: r.id, nueva: '1' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos enviar la solicitud.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <BackButton />
            <View style={{ flex: 1 }}>
              <Text style={styles.overline}>Solicitar reserva</Text>
              <Text style={styles.h1} numberOfLines={2}>{business.name}</Text>
            </View>
          </View>
          {!!settings.instructions && <View style={styles.note}><Text style={styles.noteText}>{settings.instructions}</Text></View>}

          <Text style={styles.label}>Día</Text>
          {days.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <ChoiceChips label="Día" wrap={false} options={days.map((d) => ({ id: d, label: dayLabel(d, today) }))} value={date} onChange={(d) => { setDate(d); setTime(null); setError(''); }} />
            </ScrollView>
          ) : (
            <Text style={styles.muted}>Por ahora no hay días disponibles para solicitar.</Text>
          )}

          {!!date && (
            <>
              <Text style={styles.label}>Hora</Text>
              <ChoiceChips label="Hora" options={times.map((t) => ({ id: t, label: timeLabel(t) }))} value={time} onChange={(t) => { setTime(t); setError(''); }} />
            </>
          )}

          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Personas</Text>
            <Stepper label="Personas" value={party} min={1} max={settings.maxParty} onChange={setParty} />
            <Text style={styles.muted}>Hasta {settings.maxParty} por solicitud.</Text>
          </View>

          <TextField label="Nombre de quien reserva" value={name} onChangeText={setName} maxLength={80} autoComplete="name" />
          <TextField label="Tu WhatsApp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder="Ej: 300 123 4567 o +1 415 555 0100" hint="El restaurante te escribirá aquí para coordinar." />
          <TextField label="Preferencia de mesa (opcional)" value={table} onChangeText={setTable} maxLength={80} placeholder="Ej: Terraza, cerca de la ventana" />
          <TextField label="Observaciones (opcional)" value={notes} onChangeText={setNotes} maxLength={300} multiline placeholder="Ej: Celebramos un cumpleaños. Vamos con un bebé." />

          {products.length > 0 && (
            <View style={styles.dishes}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDishes }} onPress={() => setShowDishes(!showDishes)} style={styles.dishesHead}>
                <Text style={[styles.label, { flex: 1 }]}>Platos que te gustaría pedir (opcional){chosen.length ? ` · ${chosen.length}` : ''}</Text>
                {showDishes ? <ChevronUp size={20} color={colors.primary} /> : <ChevronDown size={20} color={colors.primary} />}
              </Pressable>
              {showDishes && (
                <>
                  <Text style={styles.muted}>{DISHES_NOTICE}</Text>
                  {products.map((p) => (
                    <View key={p.id} style={styles.dish}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dishName}>{p.name}</Text>
                        {p.priceCop != null && <Text style={styles.muted}>{formatCop(p.priceCop)}</Text>}
                      </View>
                      <Stepper label={p.name} value={dishes[p.id] ?? 0} min={0} max={20} onChange={(n) => setDishes({ ...dishes, [p.id]: n })} />
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          <View style={styles.notice} accessibilityRole="summary">
            <Text style={styles.noticeText}>{RESERVATION_NOTICE}</Text>
          </View>
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          <Button title="Enviar solicitud" onPress={send} loading={sending} disabled={!date || !time} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48, gap: 18 },
  overline: { fontFamily: fonts.bold, fontSize: 12.5, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textMuted },
  h1: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.text },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.textMuted },
  note: { padding: 14, borderRadius: 16, backgroundColor: colors.primarySoft },
  noteText: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 21, color: colors.primary },
  dishes: { gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dishesHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  dish: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dishName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  notice: { padding: 16, borderRadius: 18, backgroundColor: colors.accentSoft },
  noticeText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.accentText },
  error: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 20, color: colors.danger },
});
