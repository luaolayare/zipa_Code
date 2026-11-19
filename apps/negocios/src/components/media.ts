// Fotos y videos: elegir de la galería, tomar con la cámara y grabar el video del producto.
import type { LocalFile } from '@zipa/shared';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

export const VIDEO_SECONDS = 20;

const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: false };

export type MediaResult = { file: LocalFile } | { error: string } | null; // null = canceló

function fromPicker(r: ImagePicker.ImagePickerResult, fallbackMime: string): MediaResult {
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { file: { uri: a.uri, mimeType: a.mimeType ?? fallbackMime } };
}

export async function takePhoto(): Promise<MediaResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { error: 'Para tomar la foto, permite el uso de la cámara en los ajustes del celular, o elige una foto que ya tengas.' };
  return fromPicker(await ImagePicker.launchCameraAsync(PHOTO_OPTIONS), 'image/jpeg');
}

export async function pickPhoto(): Promise<MediaResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { error: 'Para elegir la foto, permite el acceso a tus fotos en los ajustes del celular, o tómala con la cámara.' };
  return fromPicker(await ImagePicker.launchImageLibraryAsync(PHOTO_OPTIONS), 'image/jpeg');
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
