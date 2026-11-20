// Configuración de las solicitudes de reserva (solo restaurantes). Son solicitudes con confirmación
// manual: no se registran mesas ni cupos. Los horarios dicen cuándo se puede pedir.
import {
  Button,
  ChoiceChips,
  DEFAULT_RESERVATION_SETTINGS,
  Stepper,
  TextField,
  WEEKDAYS,
  bogotaDate,
  colors,
  dayLabel,
  fonts,
  PUSH_AFTER_RESERVATIONS,
  PushPrompt,
  restaurantOf,
  useAuth,
  validateWindows,
  type ReservationSettings,
  type ReservationWindow,
} from '@zipa/shared';
import { router } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Notice, type } from '@/components/kit';
import { Page } from '@/components/Page';
import { BackButton } from '@/components/StepHeader';
import { usePushPrompt } from '@/lib/notificaciones';

const NOTICE = [{ id: 60, label: '1 hora' }, { id: 120, label: '2 horas' }, { id: 240, label: '4 horas' }, { id: 1440, label: '1 día' }];
const ADVANCE = [{ id: 7, label: '1 semana' }, { id: 15, label: '15 días' }, { id: 30, label: '1 mes' }, { id: 60, label: '2 meses' }];
const RESPONSE = [{ id: 2, label: '2 horas' }, { id: 6, label: '6 horas' }, { id: 12, label: '12 horas' }, { id: 24, label: '24 horas' }];
const SLOTS = [{ id: 15, label: 'Cada 15 min' }, { id: 30, label: 'Cada 30 min' }, { id: 60, label: 'Cada hora' }];

export default function ConfiguracionReservas() {
  const { api, user } = useAuth();
  const [s, setS] = useState<ReservationSettings | null>(null);
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ultimoPaso, setUltimoPaso] = useState(false); // después de activar: invitar a activar los avisos
  const push = usePushPrompt(api);
  const [notRestaurant, setNotRestaurant] = useState(false);

  useEffect(() => {
    if (!user) return void router.replace('/');
    (async () => {
      const b = await api.myBusiness(user.id);
      if (!b) return router.replace('/panel');
      if (!restaurantOf(b)) return setNotRestaurant(true);
      const current = await api.getReservationSettings(b.id);
      setS(current ?? { ...DEFAULT_RESERVATION_SETTINGS, businessId: b.id });
    })().catch(() => setError('No pudimos cargar la configuración. Revisa tu conexión.'));
  }, [api, user]);

  if (notRestaurant) {
    return (
      <Page>
        <BackButton />
        <Notice tone="info"><Text style={type.strong}>Las reservas son solo para restaurantes.</Text></Notice>
      </Page>
    );
  }
  if (!s) {
    return <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>{error ? <Text style={type.error}>{error}</Text> : <ActivityIndicator size="large" />}</View>;
  }

  const set = (patch: Partial<ReservationSettings>) => { setS({ ...s, ...patch }); setError(''); };
  const windowsOf = (day: number) => s.windows.filter((w) => w.weekday === day);
  const setWindow = (target: ReservationWindow, patch: Partial<ReservationWindow>) =>
    set({ windows: s.windows.map((w) => (w === target ? { ...w, ...patch } : w)) });
  const today = bogotaDate(new Date());

  const addDate = () => {
    const d = newDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(new Date(`${d}T12:00:00Z`).getTime())) return setError('Escribe la fecha como 2026-12-24.');
    if (d < today) return setError('Esa fecha ya pasó.');
    if (!s.blockedDates.includes(d)) set({ blockedDates: [...s.blockedDates, d].sort() });
    setNewDate('');
  };

  const save = async () => {
    const problem = validateWindows(s.windows);
    if (problem) return setError(problem);
    if (s.enabled && !s.windows.length) return setError('Agrega al menos un horario para recibir solicitudes.');
    setSaving(true);
    setError('');
    try {
      await api.saveReservationSettings({ ...s, instructions: s.instructions?.trim() || null });
      // Con reservas activas y avisos sin activar en este celular: un último paso explícito (P13).
      if (s.enabled && push.state !== 'activadas' && push.state !== 'no_disponible') setUltimoPaso(true);
      else router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  if (ultimoPaso) {
    const listo = push.state === 'activadas';
    return (
      <Page>
        <Text style={type.overline}>Reservas activadas</Text>
        <Text style={type.h1}>Último paso: las notificaciones</Text>
        <Text style={type.small}>{PUSH_AFTER_RESERVATIONS}</Text>
        {listo ? (
          <Notice tone="success"><Text style={type.strong}>Notificaciones activadas en este celular.</Text></Notice>
        ) : (
          <PushPrompt app="negocios" state={push.state} busy={push.busy} failed={push.failed} onEnable={push.enable} onRecheck={push.recheck} />
        )}
        <Button title={listo ? 'Listo' : 'Ahora no'} variant={listo ? 'primary' : 'outline'} onPress={() => router.back()} />
        {!listo && <Text style={type.small}>Puedes activarlas después desde el Panel o desde la bandeja de Reservas.</Text>}
      </Page>
    );
  }

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <BackButton />
        <Text style={type.h1}>Reservas</Text>
      </View>
      <Text style={type.small}>
        Los clientes te envían una solicitud y tú decides si la confirmas. No tienes que registrar mesas: los horarios solo dicen cuándo se puede pedir.
      </Text>

      <Pressable accessibilityRole="switch" accessibilityState={{ checked: s.enabled }} accessibilityLabel="Recibir solicitudes de reserva" onPress={() => set({ enabled: !s.enabled })} style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>Recibir solicitudes de reserva</Text>
          <Text style={type.small}>{s.enabled ? 'Los clientes ven «Solicitar reserva» en tu ficha.' : 'Apagado: nadie puede solicitar reservas.'}</Text>
        </View>
        <View style={[styles.track, s.enabled && styles.trackOn]}><View style={[styles.knob, s.enabled && styles.knobOn]} /></View>
      </Pressable>

      <Text style={styles.section}>Horarios para recibir solicitudes</Text>
      <Text style={type.small}>Hora en que puede empezar la reserva. Ej: de 12:00 a 15:00 (la última sería 14:30).</Text>
      {WEEKDAYS.map((name, i) => {
        const day = i + 1;
        const list = windowsOf(day);
        return (
          <View key={name} style={styles.day}>
            <View style={styles.dayHead}>
              <Text style={type.h3}>{name}</Text>
              {list.length < 2 && (
                <Pressable accessibilityRole="button" accessibilityLabel={`Agregar horario el ${name.toLowerCase()}`} onPress={() => set({ windows: [...s.windows, { weekday: day, starts: list.length ? '18:00' : '12:00', ends: list.length ? '21:00' : '15:00' }] })} style={styles.add} hitSlop={6}>
                  <Plus size={16} color={colors.primary} />
                  <Text style={styles.addText}>Horario</Text>
                </Pressable>
              )}
            </View>
            {!list.length && <Text style={type.small}>Sin reservas este día</Text>}
            {list.map((w, j) => (
              <View key={j} style={styles.windowRow}>
                <TextInput accessibilityLabel={`${name}: desde`} value={w.starts} onChangeText={(v) => setWindow(w, { starts: v })} style={styles.time} maxLength={5} keyboardType="numbers-and-punctuation" placeholder="12:00" />
                <Text style={type.small}>a</Text>
                <TextInput accessibilityLabel={`${name}: hasta`} value={w.ends} onChangeText={(v) => setWindow(w, { ends: v })} style={styles.time} maxLength={5} keyboardType="numbers-and-punctuation" placeholder="15:00" />
                <Pressable accessibilityRole="button" accessibilityLabel={`Quitar horario del ${name.toLowerCase()}`} onPress={() => set({ windows: s.windows.filter((x) => x !== w) })} hitSlop={8} style={styles.trash}>
                  <Trash2 size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        );
      })}

      <Text style={styles.section}>Reglas</Text>
      <View style={{ gap: 8 }}>
        <Text style={type.strong}>Máximo de personas por solicitud</Text>
        <Stepper label="Máximo de personas" value={s.maxParty} min={1} max={50} onChange={(maxParty) => set({ maxParty })} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={type.strong}>Anticipación mínima</Text>
        <ChoiceChips label="Anticipación mínima" options={NOTICE} value={s.minNoticeMinutes} onChange={(minNoticeMinutes) => set({ minNoticeMinutes })} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={type.strong}>Hasta cuándo se puede pedir</Text>
        <ChoiceChips label="Anticipación máxima" options={ADVANCE} value={s.maxAdvanceDays} onChange={(maxAdvanceDays) => set({ maxAdvanceDays })} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={type.strong}>Horas que se ofrecen</Text>
        <ChoiceChips label="Intervalo" options={SLOTS} value={s.slotMinutes} onChange={(slotMinutes) => set({ slotMinutes: slotMinutes as 15 | 30 | 60 })} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={type.strong}>Tiempo para responder</Text>
        <Text style={type.small}>Si no respondes en ese tiempo (o antes de 30 minutos de la hora pedida), la solicitud vence y se le avisa al cliente.</Text>
        <ChoiceChips label="Tiempo para responder" options={RESPONSE} value={s.responseHours} onChange={(responseHours) => set({ responseHours })} />
      </View>

      <Text style={styles.section}>Fechas sin reservas</Text>
      <Text style={type.small}>Festivos, eventos privados o días en que cierras.</Text>
      {s.blockedDates.map((d) => (
        <View key={d} style={styles.windowRow}>
          <Text style={[type.strong, { flex: 1 }]}>{dayLabel(d, today)} · {d}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${d}`} onPress={() => set({ blockedDates: s.blockedDates.filter((x) => x !== d) })} hitSlop={8} style={styles.trash}>
            <Trash2 size={18} color={colors.danger} />
          </Pressable>
        </View>
      ))}
      <View style={styles.windowRow}>
        <TextInput accessibilityLabel="Fecha a bloquear" value={newDate} onChangeText={setNewDate} placeholder="2026-12-24" style={[styles.time, { flex: 1 }]} maxLength={10} keyboardType="numbers-and-punctuation" />
        <Button title="Agregar" variant="outline" onPress={addDate} />
      </View>

      <TextField
        label="Instrucciones para los clientes (opcional)"
        value={s.instructions ?? ''}
        onChangeText={(instructions) => set({ instructions })}
        placeholder="Ej: Te escribiremos por WhatsApp para confirmar. Las mesas se guardan 15 minutos."
        multiline
        maxLength={300}
      />

      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Guardar" onPress={save} loading={saving} />
    </Page>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  track: { width: 52, height: 32, borderRadius: 16, backgroundColor: colors.chipIdle, padding: 3 },
  trackOn: { backgroundColor: colors.success },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF' },
  knobOn: { transform: [{ translateX: 20 }] },
  day: { gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  addText: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.primary },
  windowRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { minWidth: 86, minHeight: 48, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.surface, fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
