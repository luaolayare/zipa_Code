// Invitación a activar las notificaciones, en el momento en que tienen sentido (al recibir o enviar
// solicitudes), nunca al abrir la app. Solo interfaz: cada app le pasa el estado y las acciones.
import { BellRing } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PUSH_BLOCKED, PUSH_PROMPT, PUSH_UNAVAILABLE, type PushApp, type PushState } from '../push';
import { colors, fonts } from '../theme';

export function PushPrompt({
  app,
  state,
  busy,
  failed,
  onEnable,
}: {
  app: PushApp;
  state: PushState | null; // null = aún no se sabe
  busy?: boolean;
  failed?: boolean; // se intentó activar y el dispositivo no entregó token
  onEnable: () => void;
}) {
  if (!state || state === 'activadas' || (state === 'no_disponible' && !failed)) return null;
  const t = PUSH_PROMPT[app];
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.icon}><BellRing size={20} color={colors.primary} /></View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.title}>{t.title}</Text>
        {failed ? (
          <Text style={styles.body}>{PUSH_UNAVAILABLE}</Text>
        ) : state === 'bloqueadas' ? (
          <>
            <Text style={styles.body}>{PUSH_BLOCKED}</Text>
            <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} hitSlop={6}>
              <Text style={styles.action}>Abrir ajustes</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.body}>{t.body}</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ busy: !!busy }} disabled={busy} onPress={onEnable} hitSlop={6}>
              <Text style={styles.action}>{busy ? 'Activando…' : 'Activar notificaciones'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.primarySoft },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.primary },
  body: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.text },
  action: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary, textDecorationLine: 'underline' },
});
