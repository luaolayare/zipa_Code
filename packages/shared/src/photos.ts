// Fotos que suben los negocios: recorte y tamaño final de cada tipo de foto.
// La app recorta con el editor del celular y después reduce y comprime con expo-image-manipulator.

export type PhotoKind = 'producto' | 'logo' | 'verificacion';

export interface PhotoPreset {
  /** Lado más largo, en píxeles, después de reducir. */
  maxSide: number;
  /** Calidad JPEG (0 a 1). */
  compress: number;
  /** Abrir el editor del celular para recortar (en Android también ampliar y girar). */
  edit: boolean;
  /** Proporción del recorte en Android (en iOS el recorte siempre es cuadrado). */
  aspect?: [number, number];
}

export const PHOTO_PRESETS: Record<PhotoKind, PhotoPreset> = {
  // Cuadrada: así se ve igual en Android y en iOS, y llena las tarjetas sin cortes raros.
  producto: { maxSide: 1600, compress: 0.75, edit: true, aspect: [1, 1] },
  logo: { maxSide: 512, compress: 0.8, edit: true, aspect: [1, 1] },
  // La foto del documento no se recorta: el equipo la revisa completa y debe leerse bien.
  verificacion: { maxSide: 2000, compress: 0.8, edit: false },
};

/**
 * Cuánto reducir una foto para que su lado más largo no pase de `maxSide`, sin deformarla.
 * Devuelve null si ya es más pequeña (no se agranda) o si no se conocen sus medidas.
 */
export function resizeFor(width: number, height: number, maxSide: number): { width: number } | { height: number } | null {
  if (!(width > 0) || !(height > 0) || !(maxSide > 0)) return null;
  if (Math.max(width, height) <= maxSide) return null;
  return width >= height ? { width: maxSide } : { height: maxSide };
}
