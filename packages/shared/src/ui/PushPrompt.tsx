// Aviso visible cuando las notificaciones NO están activas en este celular, con una acción explícita
// para activarlas (o reintentar). Se muestra donde tiene sentido (bandeja, panel con reservas,
// solicitud del cliente), nunca al abrir la app. Solo interfaz: cada app le pasa el estado y las acciones.
import { BellOff, BellRing } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PUSH_BLOCKED, PUSH_PROMPT, PUSH_UNAVAILABLE, pushPromptMode, type PushApp, type PushState } from '../push';
import { colors, fonts } from '../theme';

export function PushPrompt({
  app,
  state,
  busy,
  failed,
  onEnable,
  onRecheck,
}: {
  app: PushApp;
  state: PushState | null; // null = aún no se sabe
  busy?: boolean;
  failed?: boolean; // se intentó activar y el celular no entregó el token
  onEnable: () => void; // pide el permiso (acción explícita de la persona)
  onRecheck?: () => void; // vuelve a revisar el permiso (después de cambiarlo en los ajustes)
}) {
  const mode = pushPromptMode(state, !!failed);
  if (mode === 'oculta') return null;
  const t = PUSH_PROMPT[app];
  const off = mode !== 'invitar';
  return (
    <View style={[styles.card, off && styles.cardOff]} accessibilityRole="alert">
      <View style={styles.icon}>{off ? <BellOff size={20} color={colors.danger} /> : <BellRing size={20} color={colors.primary} />}</View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.title, off && { color: colors.danger }]}>{off ? 'Notificaciones desactivadas' : t.title}</Text>
        {mode === 'invitar' && (
          <>
            <Text style={styles.body}>{t.body}</Text>
            <Action label={busy ? 'Activando…' : 'Activar notificaciones'} busy={busy} onPress={onEnable} />
          </>
        )}
        {mode === 'reintentar' && (
          <>
            <Text style={styles.body}>{PUSH_UNAVAILABLE}</Text>
            <Action label={busy ? 'Intentando…' : 'Intentar de nuevo'} busy={busy} onPress={onEnable} />
          </>
        )}
        {mode === 'bloqueadas' && (
          <>
            <Text style={styles.body}>{PUSH_BLOCKED}</Text>
            <Action label="Abrir ajustes" onPress={() => Linking.openSettings()} />
            {!!onRecheck && <Action label="Ya las activé, revisar de nuevo" onPress={onRecheck} />}
          </>
        )}
      </View>
    </View>
  );
}

function Action({ label, busy, onPress }: { label: string; busy?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ busy: !!busy }} disabled={busy} onPress={onPress} hitSlop={6}>
      <Text style={styles.action}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.primarySoft },
  cardOff: { backgroundColor: '#F9DED6' },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.primary },
  body: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.text },
  action: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary, textDecorationLine: 'underline' },
});
