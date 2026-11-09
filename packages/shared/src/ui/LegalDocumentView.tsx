import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LegalDocument } from '../legal';
import { colors } from '../theme';

const formatFecha = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${meses[m - 1]} de ${y}`;
};

/** Pantalla de un documento legal (privacidad o términos), con versión y fecha. */
export function LegalDocumentView({ doc, onBack }: { doc: LegalDocument; onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} style={styles.back} hitSlop={4}>
          <Text style={styles.backIcon} accessible={false}>‹</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">{doc.title}</Text>
        <Text style={styles.meta}>Versión {doc.VERSION} · vigente desde el {formatFecha(doc.FECHA)}</Text>
        {doc.borrador && (
          <Text style={styles.draft} accessibilityRole="alert">
            Borrador pendiente de revisión legal. Los datos entre corchetes aún no están completos.
          </Text>
        )}
        <Text style={styles.body}>{doc.intro}</Text>
        {doc.sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.h2} accessibilityRole="header">{s.heading}</Text>
            {s.paragraphs.map((p, i) => <Text key={i} style={styles.body}>{p}</Text>)}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  bar: { paddingHorizontal: 12, paddingTop: 8 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, lineHeight: 30, color: colors.text, marginTop: -2 },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  draft: { fontSize: 13, lineHeight: 19, color: colors.accentText, backgroundColor: colors.accentSoft, padding: 12, borderRadius: 12, overflow: 'hidden' },
  section: { gap: 8 },
  h2: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 6 },
  body: { fontSize: 15, lineHeight: 22, color: colors.textBody },
});
