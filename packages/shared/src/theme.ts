// Identidad visual de Vitrina Local. Fuente de verdad: docs/diseno/ESPECIFICACION.md
export const colors = {
  background: '#F6F4EF', // fondo de todas las pantallas
  surface: '#FFFFFF', // tarjetas, inputs, barra inferior
  text: '#14211F', // texto principal, botones oscuros
  textMuted: '#55605D', // texto secundario
  textBody: '#2E3A38', // cuerpo de reseñas y descripciones
  border: '#E2DDD3', // bordes de tarjetas
  inputBorder: '#D6D0C5', // bordes de inputs
  primary: '#0F3D3E', // verde petróleo
  primaryDeep: '#145052', // círculo decorativo y tarjeta en bienvenida
  primarySoft: '#DDEBEA', // etiqueta "Clásico de la zona", avisos de éxito
  onPrimaryMuted: '#CFE1DF', // texto secundario sobre verde
  accent: '#F2B134', // mostaza
  accentSoft: '#FDEFD0', // etiqueta "Emprendimiento local", avisos
  accentText: '#7A4B00', // texto sobre accentSoft
  price: '#C2381B', // precios, enlaces
  danger: '#A12E15', // errores, cerrar sesión
  success: '#166534', // "Abierto", pasos completados
  star: '#E09A00', // estrellas
  starText: '#8A5A00', // texto de estrellas en reseñas
  chipIdle: '#ECE7DE', // fondo de botones circulares neutros
  stage3d: '#E9EFEE', // fondo del visor 3D
  dark: '#14211F',
} as const;

/**
 * Familias tipográficas. Cada peso es un archivo distinto, así que se elige con
 * fontFamily (no con fontWeight). Las apps las cargan en su _layout.tsx raíz.
 */
export const fonts = {
  display: 'SpaceGrotesk_700Bold', // títulos y números grandes
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;
