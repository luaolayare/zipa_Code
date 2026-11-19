// Formulario de un producto: nombre, precio, descripción, fotos y video.
// Lo usan el Paso 4 del registro y el panel (agregar o editar).
import { MAX_PRICE_COP, MENU_SECTIONS, TextField, colors, fonts, formatCop, type LocalFile, PlateArt, availabilityLabels, catalogTitle, productWord, type Classified } from '@zipa/shared';
import { Camera, Check, ImageIcon, Video } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { type } from './kit';
import { pickPhoto, pickVideo, recordVideo, takePhoto, type MediaResult } from './media';
import { MorePhotos, extraUri, type ExtraPhoto } from './MorePhotos';

export interface ProductForm {
  name: string;
  price: string; // como lo escribe la persona; se limpia al guardar
  description: string;
  photo: LocalFile | null; // foto nueva
  photoUrl: string | null; // foto que ya estaba guardada
  video: LocalFile | null; // video nuevo
  hasSavedVideo: boolean; // ya había un video guardado
  available: boolean; // false: "No disponible hoy"
  section: string; // sección del menú ('' = sin sección)
  photoLabel: string; // descripción corta de la foto principal
  extras: ExtraPhoto[]; // hasta 3 fotos más
}

export const emptyProductForm: ProductForm = { name: '', price: '', description: '', photo: null, photoUrl: null, video: null, hasSavedVideo: false, available: true, section: '', photoLabel: '', extras: [] };

/** Lo que se envía a saveProduct a partir del formulario. */
export const productInputFrom = (f: ProductForm) => ({
  photoLabel: f.photoLabel,
  photoUrl: f.photo ? null : f.photoUrl,
  extras: f.extras.map((e) => ({ id: e.id, url: e.url ?? null, file: e.file ?? null, label: e.label })),
});

/** Formulario a partir de un producto guardado. */
export const extrasFrom = (photos: { id: string; url: string; label: string | null }[]): ExtraPhoto[] =>
  photos.map((p) => ({ key: p.id, id: p.id, url: p.url, label: p.label ?? '' }));

export const priceFrom = (price: string) => {
  const digits = price.replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

/** Valida lo mínimo para guardar. Devuelve el mensaje de error o null. */
export function productFormError(f: ProductForm, word: string): string | null {
  if (!f.name.trim()) return `Escribe el nombre del ${word}.`;
  if (f.name.trim().length > 60) return 'El nombre es muy largo (máximo 60 caracteres).';
  const price = priceFrom(f.price);
  if (price === null) return `Escribe el precio del ${word} en pesos. Ej: 7.000.`;
  if (price === 0) return 'El precio no puede ser $ 0.';
  if (price > MAX_PRICE_COP) return `Revisa el precio: ${formatCop(price)} parece demasiado alto.`;
  if (f.section.trim().length > 40) return 'El nombre de la sección es muy largo (máximo 40 caracteres).';
  if (!f.photo && !f.photoUrl) return `Agrega una foto del ${word}. Es lo primero que ven los clientes.`;
  if (f.extras.length > 3) return 'Puedes agregar hasta 3 fotos más.';
  return null;
}

export function ProductEditor({ value, onChange, business }: { value: ProductForm; onChange: (f: ProductForm) => void; business: Classified }) {
  const [mediaError, setMediaError] = useState('');
  const word = productWord(business); // por la categoría principal (Beta 2.1), no la vieja
  const catalogWord = catalogTitle(business).toLowerCase();
  const labels = availabilityLabels(business);
  const photoUri = value.photo?.uri ?? value.photoUrl;
  const hasVideo = !!value.video || value.hasSavedVideo;

  const apply = (r: MediaResult, key: 'photo' | 'video') => {
    if (!r) return;
    if ('error' in r) return setMediaError(r.error);
    setMediaError('');
    onChange({ ...value, [key]: r.file });
  };

  const record = async () => {
    const file = await recordVideo();
    if (file) {
      setMediaError('');
      onChange({ ...value, video: file });
    }
  };

  return (
    <View style={styles.wrap}>
      <TextField label="Nombre" value={value.name} onChangeText={(name) => onChange({ ...value, name })} placeholder={word === 'plato' ? 'Ej: Arepa de huevo' : 'Ej: Mochila tejida'} maxLength={60} />
      <TextField
        label="Precio"
        value={value.price ? '$ ' + Number(value.price.replace(/\D/g, '') || 0).toLocaleString('es-CO') : ''}
        onChangeText={(t) => onChange({ ...value, price: t.replace(/\D/g, '') })}
        keyboardType="number-pad"
        placeholder="Ej: $ 7.000"
      />
      <TextField label="Descripción (opcional)" value={value.description} onChangeText={(description) => onChange({ ...value, description })} placeholder="¿Qué lleva? ¿Cómo se sirve o cómo está hecho?" multiline maxLength={300} />

      {/* Sección del menú: sugerencias para restaurantes y campo libre para todos. */}
      <View style={{ gap: 10 }}>
        <Text style={styles.label}>{word === 'plato' ? 'Sección del menú' : 'Sección (opcional)'}</Text>
        {word === 'plato' && (
          <View style={styles.chips}>
            {MENU_SECTIONS.map((s) => {
              const on = value.section === s;
              return (
                <Pressable key={s} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange({ ...value, section: on ? '' : s })} style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.8 }]}>
                  <Text style={[styles.chipText, on && { color: '#FFFFFF' }]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <TextField
          label={word === 'plato' ? 'U otra sección' : 'Nombre de la sección'}
          value={MENU_SECTIONS.includes(value.section) && word === 'plato' ? '' : value.section}
          onChangeText={(section) => onChange({ ...value, section })}
          placeholder={word === 'plato' ? 'Ej: Desayunos' : 'Ej: Mochilas'}
          maxLength={40}
        />
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value.available }}
        accessibilityLabel={labels.on}
        onPress={() => onChange({ ...value, available: !value.available })}
        style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.85 }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.h3}>{labels.on}</Text>
          <Text style={type.small}>{value.available ? 'Los clientes lo ven normal.' : labels.offHint}</Text>
        </View>
        <View style={[styles.track, value.available && styles.trackOn]}>
          <View style={[styles.knob, value.available && styles.knobOn]} />
        </View>
      </Pressable>

      <Text style={styles.label}>Foto</Text>
      <View style={styles.photoRow}>
        <View style={styles.photoFrame}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel={`Foto de ${value.name || 'tu producto'}`} /> : <PlateArt of={business} size={120} />}
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <MediaButton icon={<Camera size={20} color={colors.text} />} label={photoUri ? 'Tomar otra' : 'Tomar foto'} onPress={async () => apply(await takePhoto(), 'photo')} />
          <MediaButton icon={<ImageIcon size={20} color={colors.text} />} label="De mis fotos" onPress={async () => apply(await pickPhoto(), 'photo')} />
        </View>
      </View>
      {Platform.OS !== 'web' && (
        <Text style={type.small}>Al elegirla puedes recortarla y acercarla. Así se verá en tu {catalogWord}; nada se publica hasta que toques «Guardar».</Text>
      )}

      <TextField label="Descripción de la foto principal (opcional)" value={value.photoLabel} onChangeText={(photoLabel) => onChange({ ...value, photoLabel })} placeholder="Ej: Diseño clásico" maxLength={40} />

      <MorePhotos
        word={word}
        photos={value.extras}
        onChange={(extras) => onChange({ ...value, extras })}
        onMakeMain={(i) => {
          // Intercambia: la foto elegida pasa a principal y la principal actual queda como adicional.
          const chosen = value.extras[i];
          const currentMain: ExtraPhoto | null = value.photo || value.photoUrl
            ? { key: `m${Date.now()}`, file: value.photo, url: value.photo ? null : value.photoUrl, label: value.photoLabel }
            : null;
          const rest = value.extras.filter((_, j) => j !== i);
          onChange({
            ...value,
            photo: chosen.file ?? null,
            photoUrl: chosen.file ? null : chosen.url ?? null,
            photoLabel: chosen.label,
            extras: currentMain ? [currentMain, ...rest] : rest,
          });
        }}
      />
      {value.extras.some((e) => !extraUri(e)) && <Text style={type.error}>Hay una foto sin imagen.</Text>}

      <View style={[styles.videoBox, hasVideo && styles.videoDone]}>
        <View style={[styles.videoIcon, hasVideo && { backgroundColor: colors.success }]}>
          {hasVideo ? <Check size={26} color="#FFFFFF" strokeWidth={3} /> : <Video size={26} color="#FFFFFF" />}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={type.h3}>{hasVideo ? 'Video listo' : 'Video del producto'}</Text>
          <Text style={type.small}>
            {hasVideo
              ? 'El equipo lo revisa antes de mostrarlo. Mientras tanto, los clientes ven la foto. En tu panel verás si quedó aprobado.'
              : `Graba unos 20 segundos mostrando el ${word}. Es opcional, pero los productos con video llaman mucho más la atención.`}
          </Text>
        </View>
      </View>
      <View style={styles.videoActions}>
        <Pressable accessibilityRole="button" onPress={record} style={({ pressed }) => [styles.recButton, pressed && { opacity: 0.85 }]}>
          <View style={styles.recDot} />
          <Text style={styles.recText}>{hasVideo ? 'Grabar de nuevo' : `Grabar video del ${word}`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={async () => apply(await pickVideo(), 'video')} hitSlop={6}>
          <Text style={styles.link}>Usar un video que ya tengo</Text>
        </Pressable>
      </View>
      {!!mediaError && <Text style={type.error} accessibilityRole="alert">{mediaError}</Text>}
    </View>
  );
}

function MediaButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.mediaButton, pressed && { opacity: 0.8 }]}>
      {icon}
      <Text style={styles.mediaText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  label: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, marginBottom: -8 },
  photoRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  photoFrame: { width: 132, height: 132, borderRadius: 22, backgroundColor: colors.stage3d, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  mediaButton: { minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  mediaText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  videoBox: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.inputBorder, backgroundColor: colors.surface },
  videoDone: { borderStyle: 'solid', borderColor: colors.success },
  videoIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.price, alignItems: 'center', justifyContent: 'center' },
  videoActions: { gap: 12, alignItems: 'center', marginTop: -6 },
  recButton: { alignSelf: 'stretch', minHeight: 56, borderRadius: 18, backgroundColor: colors.price, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  recDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF' },
  recText: { fontFamily: fonts.bold, fontSize: 16.5, color: '#FFFFFF' },
  link: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary, textDecorationLine: 'underline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  track: { width: 52, height: 32, borderRadius: 16, backgroundColor: colors.inputBorder, padding: 3, justifyContent: 'center' },
  trackOn: { backgroundColor: colors.success },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF' },
  knobOn: { alignSelf: 'flex-end' },
});
