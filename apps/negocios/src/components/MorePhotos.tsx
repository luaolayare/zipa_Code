// Fotos adicionales de un producto (hasta 3, además de la principal), cada una con descripción corta.
// Sirven para mostrar otros diseños, colores o presentaciones del mismo producto.
import { colors, fonts, type LocalFile, radius, spacing, typography } from '@zipa/shared';
import { ImagePlus, Star, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type } from './kit';
import { pickPhoto } from './media';

export const MAX_EXTRA_PHOTOS = 3;

export interface ExtraPhoto {
  key: string; // para la lista
  id?: string; // ya guardada en product_photos
  url?: string | null; // dirección pública si ya estaba guardada
  file?: LocalFile | null; // foto nueva elegida en el celular
  label: string;
}

export const extraUri = (p: ExtraPhoto) => p.file?.uri ?? p.url ?? null;

export function MorePhotos({
  photos,
  onChange,
  onMakeMain,
  word,
}: {
  photos: ExtraPhoto[];
  onChange: (photos: ExtraPhoto[]) => void;
  onMakeMain: (index: number) => void;
  word: string;
}) {
  const [error, setError] = useState('');
  const add = async () => {
    const r = await pickPhoto();
    if (!r) return;
    if ('error' in r) return setError(r.error);
    setError('');
    onChange([...photos, { key: `n${Date.now()}`, file: r.file, label: '' }]);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>Más fotos <Text style={styles.optional}>(opcional, hasta {MAX_EXTRA_PHOTOS})</Text></Text>
      <Text style={type.help}>Muestra otros diseños, colores o presentaciones del mismo {word}. El cliente las ve deslizando.</Text>
      {photos.map((p, i) => (
        <View key={p.key} style={styles.item}>
          {extraUri(p) && <Image resizeMethod="resize" source={{ uri: extraUri(p)! }} style={styles.thumb} accessibilityLabel={p.label || `Foto ${i + 2}`} />}
          <View style={{ flex: 1, gap: spacing.xs }}>
            <TextInput
              accessibilityLabel={`Descripción de la foto ${i + 2}`}
              value={p.label}
              onChangeText={(label) => onChange(photos.map((x, j) => (j === i ? { ...x, label } : x)))}
              placeholder="Ej: Diseño azul"
              placeholderTextColor={colors.textMuted}
              maxLength={40}
              style={styles.input}
            />
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Usar la foto ${i + 2} como principal`} onPress={() => onMakeMain(i)} hitSlop={6} style={styles.action}>
                <Star size={15} color={colors.primary} />
                <Text style={styles.actionText}>Hacer principal</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Quitar la foto ${i + 2}`} onPress={() => onChange(photos.filter((_, j) => j !== i))} hitSlop={6} style={styles.action}>
                <Trash2 size={15} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>Quitar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
      {photos.length < MAX_EXTRA_PHOTOS && (
        <Pressable accessibilityRole="button" onPress={add} style={({ pressed }) => [styles.add, pressed && { opacity: 0.85 }]}>
          <ImagePlus size={20} color={colors.primary} />
          <Text style={styles.addText}>Agregar otra foto</Text>
        </Pressable>
      )}
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  optional: { fontFamily: fonts.regular, color: colors.textMuted },
  item: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.stage3d },
  input: { ...typography.caption, minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.inputBorder, paddingHorizontal: spacing.sm, fontFamily: fonts.regular, color: colors.text, backgroundColor: colors.surface },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: 32 },
  actionText: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
  add: { minHeight: 52, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inputBorder, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  addText: { ...typography.label, fontFamily: fonts.bold, color: colors.primary },
});
