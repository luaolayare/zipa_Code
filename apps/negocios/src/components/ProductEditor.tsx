// Formulario de un producto: nombre, precio, descripción, foto y video para el 3D.
// Lo usan el Paso 4 del registro y el panel (agregar o editar).
import { TextField, colors, fonts, type Category, type LocalFile, PlateArt } from '@zipa/shared';
import { Camera, Check, ImageIcon, Video } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { type } from './kit';
import { pickPhoto, pickVideo, recordVideo, takePhoto, type MediaResult } from './media';

export interface ProductForm {
  name: string;
  price: string; // como lo escribe la persona; se limpia al guardar
  description: string;
  photo: LocalFile | null; // foto nueva
  photoUrl: string | null; // foto que ya estaba guardada
  video: LocalFile | null; // video nuevo
  hasSavedVideo: boolean; // ya había un video guardado
}

export const emptyProductForm: ProductForm = { name: '', price: '', description: '', photo: null, photoUrl: null, video: null, hasSavedVideo: false };

export const priceFrom = (price: string) => {
  const digits = price.replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

/** Valida lo mínimo para guardar. Devuelve el mensaje de error o null. */
export function productFormError(f: ProductForm, word: string): string | null {
  if (!f.name.trim()) return `Escribe el nombre del ${word}.`;
  if (f.name.trim().length > 60) return 'El nombre es muy largo (máximo 60 caracteres).';
  if (!f.photo && !f.photoUrl) return `Agrega una foto del ${word}. Es lo que ven los clientes mientras preparamos la vista 3D.`;
  return null;
}

export function ProductEditor({ value, onChange, category }: { value: ProductForm; onChange: (f: ProductForm) => void; category: Category }) {
  const [mediaError, setMediaError] = useState('');
  const word = category === 'comer' ? 'plato' : 'producto';
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

      <Text style={styles.label}>Foto</Text>
      <View style={styles.photoRow}>
        <View style={styles.photoFrame}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel={`Foto de ${value.name || 'tu producto'}`} /> : <PlateArt category={category} size={120} />}
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <MediaButton icon={<Camera size={20} color={colors.text} />} label={photoUri ? 'Tomar otra' : 'Tomar foto'} onPress={async () => apply(await takePhoto(), 'photo')} />
          <MediaButton icon={<ImageIcon size={20} color={colors.text} />} label="De mis fotos" onPress={async () => apply(await pickPhoto(), 'photo')} />
        </View>
      </View>

      <View style={[styles.videoBox, hasVideo && styles.videoDone]}>
        <View style={[styles.videoIcon, hasVideo && { backgroundColor: colors.success }]}>
          {hasVideo ? <Check size={26} color="#FFFFFF" strokeWidth={3} /> : <Video size={26} color="#FFFFFF" />}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={type.h3}>{hasVideo ? 'Video para 3D listo' : 'Video para la vista 3D'}</Text>
          <Text style={type.small}>
            {hasVideo
              ? 'Lo guardamos para crear la vista 3D. Mientras tanto, los clientes ven la foto. En tu panel verás cuándo esté lista para revisarla.'
              : `Graba unos 20 segundos dando la vuelta alrededor del ${word}. Es opcional, pero los productos en 3D se ven mucho más.`}
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
});
