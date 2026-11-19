// Fotos y videos: elegir de la galería, tomar con la cámara y grabar el video del producto.
//
// Fotos: el editor del celular deja recortar el encuadre (en Android también ampliar, mover y
// girar; en iOS el recorte es cuadrado). Después se reduce y comprime aquí (PHOTO_PRESETS) para
// que suban rápido y pesen poco. Lo que se ve en el formulario antes de guardar es la vista previa.
import { PHOTO_PRESETS, resizeFor, type LocalFile, type PhotoKind } from '@zipa/shared';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

export const VIDEO_SECONDS = 20;

export type MediaResult = { file: LocalFile } | { error: string } | null; // null = canceló

function photoOptions(kind: PhotoKind): ImagePicker.ImagePickerOptions {
  const p = PHOTO_PRESETS[kind];
  // Calidad 1 en el selector: la compresión se hace una sola vez, después de reducir.
  return { mediaTypes: ['images'], quality: 1, allowsEditing: p.edit, ...(p.edit && p.aspect ? { aspect: p.aspect } : {}) };
}

/** Reduce y comprime la foto elegida. Si algo falla, usa la foto tal como vino (no bloquea). */
async function optimize(asset: ImagePicker.ImagePickerAsset, kind: PhotoKind): Promise<LocalFile> {
  const p = PHOTO_PRESETS[kind];
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    const size = resizeFor(asset.width, asset.height, p.maxSide);
    if (size) ctx.resize(size); // un solo lado: el otro se calcula sin deformar
    const image = await ctx.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: p.compress });
    return { uri: saved.uri, mimeType: 'image/jpeg' };
  } catch {
    return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
  }
}

async function fromPhotoPicker(r: ImagePicker.ImagePickerResult, kind: PhotoKind): Promise<MediaResult> {
  if (r.canceled || !r.assets?.[0]) return null;
  return { file: await optimize(r.assets[0], kind) };
}

function fromPicker(r: ImagePicker.ImagePickerResult, fallbackMime: string): MediaResult {
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { file: { uri: a.uri, mimeType: a.mimeType ?? fallbackMime } };
}

export async function takePhoto(kind: PhotoKind = 'producto'): Promise<MediaResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { error: 'Para tomar la foto, permite el uso de la cámara en los ajustes del celular, o elige una foto que ya tengas.' };
  return fromPhotoPicker(await ImagePicker.launchCameraAsync(photoOptions(kind)), kind);
}

export async function pickPhoto(kind: PhotoKind = 'producto'): Promise<MediaResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { error: 'Para elegir la foto, permite el acceso a tus fotos en los ajustes del celular, o tómala con la cámara.' };
  return fromPhotoPicker(await ImagePicker.launchImageLibraryAsync(photoOptions(kind)), kind);
}

/** Un video que el negocio ya tiene guardado (máximo 30 s). */
export async function pickVideo(): Promise<MediaResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { error: 'Para elegir el video, permite el acceso a tus fotos y videos en los ajustes del celular.' };
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: 30, quality: 0.7 });
  const res = fromPicker(r, 'video/mp4');
  if (res && 'file' in res && r.assets?.[0]?.duration && r.assets[0].duration > 31_000) {
    return { error: 'Ese video dura más de 30 segundos. Graba uno nuevo de unos 20 segundos.' };
  }
  return res;
}

// La pantalla /grabar devuelve el video a quien la abrió.
let pending: ((file: LocalFile | null) => void) | null = null;

/** Abre la cámara para el video del producto y espera el video grabado (null si la persona sale sin grabar). */
export function recordVideo(): Promise<LocalFile | null> {
  pending?.(null);
  return new Promise((resolve) => {
    pending = resolve;
    router.push('/grabar');
  });
}

/** Lo llama /grabar al terminar. */
export function finishRecording(file: LocalFile | null) {
  const p = pending;
  pending = null;
  p?.(file);
}
