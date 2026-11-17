/**
 * Posición de una galería deslizable a partir del desplazamiento horizontal.
 * Sin ancho medido (0) siempre es la primera; nunca se sale del rango [0, total - 1].
 */
export const slideIndex = (offsetX: number, width: number, total: number): number => {
  if (!(width > 0) || total <= 0) return 0;
  return Math.min(Math.max(Math.round(offsetX / width), 0), total - 1);
};
