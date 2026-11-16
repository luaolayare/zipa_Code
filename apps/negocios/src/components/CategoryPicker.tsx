// Clasificación del negocio: categoría principal, subcategoría y etiquetas secundarias.
// Las subcategorías vienen de Supabase (el equipo las administra), no están fijas en la app.
import { MAIN_CATEGORIES, colors, fonts, legacyCategoryFor, subcategoriesOf, useAuth, type Category, type CategoryNode, type MainCategory } from '@zipa/shared';
import { Check } from 'lucide-react-native';
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
    <View style={{ gap: 18 }}>
      <OptionCards<MainCategory> label="¿Qué es tu negocio?" options={MAIN_OPTIONS} value={value.mainCategory} onChange={pickMain} />

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">No pudimos cargar las categorías. Revisa tu conexión y vuelve a abrir esta pantalla.</Text>
      ) : !all ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando categorías" />
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <Text style={styles.label}>¿Qué ofreces principalmente?</Text>
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
            <View style={{ gap: 10 }}>
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

const styles = StyleSheet.create({
  label: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  optional: { fontFamily: fonts.regular, color: colors.textMuted },
  help: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  textOn: { color: '#FFFFFF' },
  tag: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inputBorder, backgroundColor: colors.surface },
  tagOn: { borderStyle: 'solid', borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tagText: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  error: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 20, color: colors.danger },
});
