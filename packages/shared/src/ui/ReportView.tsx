import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { REPORT_REASONS, type ReportReason, type ReportTargetType } from '../api';
import { useAuth } from '../auth';
import { colors } from '../theme';
import { Button } from './Button';

const WHAT: Record<ReportTargetType, string> = {
  review: 'esta reseña',
  business: 'este negocio',
  user: 'este usuario',
};

/** Pantalla para reportar una reseña, un negocio o un usuario. Requiere sesión. */
export function ReportView({ targetType, targetId, targetName, onDone }: {
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  onDone: () => void;
}) {
  const { api, user } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!user) return setError('Inicia sesión para enviar un reporte.');
    if (!reason) return setError('Elige el motivo del reporte.');
    setError('');
    setLoading(true);
    try {
      await api.report(user.id, { targetType, targetId, reason, details });
      setSent(true);
    } catch {
      setError('No pudimos enviar el reporte. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onDone} style={styles.back}>
          <Text style={styles.backIcon} accessible={false}>‹</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {sent ? (
          <View style={styles.done} accessibilityLiveRegion="polite">
            <Text style={styles.title} accessibilityRole="header">Gracias por avisarnos</Text>
            <Text style={styles.body}>Nuestro equipo revisará el reporte. Si incumple las reglas, lo retiraremos.</Text>
            <Button title="Listo" onPress={onDone} />
          </View>
        ) : (
          <>
            <Text style={styles.title} accessibilityRole="header">Reportar {WHAT[targetType]}</Text>
            {!!targetName && <Text style={styles.meta}>{targetName}</Text>}
            <Text style={styles.body}>¿Qué pasa con {WHAT[targetType]}? Tu reporte es anónimo para la otra persona.</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Motivo del reporte" style={styles.options}>
              {REPORT_REASONS.map((r) => {
                const on = reason === r.id;
                return (
                  <Pressable key={r.id} role="radio" aria-checked={on} onPress={() => setReason(r.id)} style={[styles.option, on && styles.optionOn]}>
                    <View style={[styles.dot, on && styles.dotOn]}>{on && <View style={styles.dotInner} />}</View>
                    <Text style={styles.optionText}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label} nativeID="detalles-label">Cuéntanos más (opcional)</Text>
            <TextInput
              accessibilityLabelledBy="detalles-label"
              accessibilityLabel="Cuéntanos más (opcional)"
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={500}
              placeholder="Lo que nos ayude a revisarlo"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
            <Button title="Enviar reporte" onPress={submit} loading={loading} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  bar: { paddingHorizontal: 12, paddingTop: 8 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, lineHeight: 30, color: colors.text, marginTop: -2 },
  content: { padding: 20, gap: 14 },
  done: { gap: 14 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  body: { fontSize: 15, lineHeight: 22, color: colors.textBody },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optionOn: { borderColor: colors.primary, borderWidth: 2 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  dotOn: { borderColor: colors.primary },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionText: { flex: 1, fontSize: 15, color: colors.text },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  input: { minHeight: 100, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 12, fontSize: 15, color: colors.text, backgroundColor: colors.surface, textAlignVertical: 'top' },
  error: { color: colors.danger, fontWeight: '600' },
});
