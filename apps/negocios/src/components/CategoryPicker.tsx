// Clasificación del negocio: categoría principal, subcategoría y etiquetas secundarias.
// Las subcategorías vienen de Supabase (el equipo las administra), no están fijas en la app.
import { CLASSIFICATION_EXAMPLES, MAIN_CATEGORIES, colors, fonts, legacyCategoryFor, subcategoriesOf, useAuth, type Category, type CategoryNode, type MainCategory, radius, spacing, typography } from '@zipa/shared';
import { Check, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { OptionCards } from './OptionChips';

export interface Classification {
  mainCategory: MainCategory;
  subcategoryId: string; // '' mientras no elija
  tags: string[];
}

export const MAX_TAGS = 3;

const MAIN_OPTIONS = MAIN_CATEGORIES.map((m) => ({
  id: m.id,
  title: m.id === 'restaurantes' ? 'Restaurante' : 'Emprendimiento',
  description: m.description,
}));

/** Lo que cambia en el borrador al elegir: incluye la categoría vieja (colores y textos). */
export type ClassificationPatch = Partial<Classification> & { category?: Category };

export function CategoryPicker({ value, onChange }: { value: Classification; onChange: (patch: ClassificationPatch) => void }) {
  const { api } = useAuth();
  const [all, setAll] = useState<CategoryNode[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.listCategories().then(setAll).catch(() => setError(true));
  }, [api]);

  const subs = all ? subcategoriesOf(all, value.mainCategory) : [];
  // Etiquetas: cualquier subcategoría activa (de las dos categorías) menos la principal.
  const tagOptions = all ? [...subcategoriesOf(all, 'restaurantes'), ...subcategoriesOf(all, 'emprendimientos')].filter((c) => c.id !== value.subcategoryId) : [];

  const pickMain = (main: MainCategory) => {
    if (main !== value.mainCategory) onChange({ mainCategory: main, subcategoryId: '' });
  };
  const pickSub = (id: string) =>
    onChange({ subcategoryId: id, category: legacyCategoryFor(id, value.mainCategory), tags: value.tags.filter((t) => t !== id) });
  const toggleTag = (id: string) => {
    const on = value.tags.includes(id);
    if (!on && value.tags.length >= MAX_TAGS) return;
    onChange({ tags: on ? value.tags.filter((t) => t !== id) : [...value.tags, id] });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <OptionCards<MainCategory> label="¿Qué es tu negocio?" options={MAIN_OPTIONS} value={value.mainCategory} onChange={pickMain} />
      <ClassificationHelp />

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">No pudimos cargar las categorías. Revisa tu conexión y vuelve a abrir esta pantalla.</Text>
      ) : !all ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando categorías" />
      ) : (
        <>
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>¿Qué vendes principalmente?</Text>
            <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Subcategoría">
              {subs.map((c) => {
                const on = c.id === value.subcategoryId;
                return (
                  <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => pickSub(c.id)} style={({ pressed }) => [styles.chip, on && styles.on, pressed && { opacity: 0.8 }]}>
                    <Text style={[styles.text, on && styles.textOn]}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!!value.subcategoryId && (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>También ofrece <Text style={styles.optional}>(opcional, hasta {MAX_TAGS})</Text></Text>
              <Text style={styles.help}>Así te encuentran también en esas búsquedas. Ej: una cafetería que vende repostería.</Text>
              <View style={styles.row}>
                {tagOptions.map((c) => {
                  const on = value.tags.includes(c.id);
                  const full = !on && value.tags.length >= MAX_TAGS;
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on, disabled: full }}
                      disabled={full}
                      onPress={() => toggleTag(c.id)}
                      style={({ pressed }) => [styles.tag, on && styles.tagOn, full && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}>
                      {on && <Check size={15} color={colors.primary} strokeWidth={2.6} />}
                      <Text style={[styles.tagText, on && { color: colors.primary }]}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

/**
 * Ayuda para elegir bien: se clasifica por lo que se vende principalmente. Plegada para no alargar
 * el formulario. No cambia la clasificación de negocios que ya existen.
 */
function ClassificationHelp() {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.helpBox}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.helpHead} hitSlop={6}>
        <HelpCircle size={18} color={colors.primary} />
        <Text style={styles.helpTitle}>¿No sabes cuál elegir? Mira ejemplos</Text>
        {open ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.primary} />}
      </Pressable>
      {open && (
        <View style={{ gap: spacing.xs }}>
          <Text style={styles.help}>Elige según lo que vendes principalmente:</Text>
          {CLASSIFICATION_EXAMPLES.map((e) => (
            <Text key={e.sells} style={styles.help}>
              <Text style={styles.helpStrong}>{e.sells}</Text> → {e.main === 'restaurantes' ? 'Restaurante' : 'Emprendimiento'} / {e.subcategory}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  helpBox: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  helpHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 28 },
  helpTitle: { ...typography.label, flex: 1, fontFamily: fonts.bold, color: colors.primary },
  helpStrong: { fontFamily: fonts.bold, color: colors.text },
  label: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  optional: { fontFamily: fonts.regular, color: colors.textMuted },
  help: { ...typography.body, color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 48, paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  textOn: { color: '#FFFFFF' },
  tag: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inputBorder, backgroundColor: colors.surface },
  tagOn: { borderStyle: 'solid', borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tagText: { ...typography.label, color: colors.text },
  error: { ...typography.label, color: colors.danger },
});
