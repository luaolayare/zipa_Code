// Identidad visual de Zipa lo tiene. Este archivo es la fuente de verdad (docs/diseno/ESPECIFICACION.md
// lo describe). Rediseño de tipografía y espacios aprobado el 20-nov-2026 (docs/diseno/rediseno-tipografia/).
import type { TextStyle } from 'react-native';

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
  // Fondos de estado (píldoras, avisos y plazos), cada uno con su color de texto.
  successSoft: '#DCEFE2', // Confirmada, Abierto, Publicado · texto: success
  warningSoft: '#FDEFD0', // Pendiente, En revisión · texto: accentText
  dangerSoft: '#F9DED6', // Rechazada, plazos, errores · texto: danger
  infoSoft: '#DDEBEA', // avisos, «Clásico de la zona» · texto: primary
  neutralSoft: '#ECE7DE', // Cancelada, Vencida · texto: textMuted
} as const;

/**
 * Familias tipográficas. Cada peso es un archivo distinto, así que se elige con
 * fontFamily (no con fontWeight). Las apps las cargan en su _layout.tsx raíz.
 */
export const fonts = {
  // Bricolage Grotesque: títulos con carácter (trazos cálidos, letras con personalidad).
  hero: 'BricolageGrotesque_800ExtraBold', // titulares grandes de portada
  display: 'BricolageGrotesque_700Bold', // títulos y números grandes
  displaySemi: 'BricolageGrotesque_600SemiBold', // subtítulos
  // DM Sans: textos, botones y formularios (muy legible en pantallas pequeñas).
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

/** Espacios: todos múltiplos de 4. */
export const spacing = {
  xxs: 4, // ícono y texto
  xs: 8, // líneas dentro de una tarjeta
  sm: 12, // entre tarjetas
  md: 16, // relleno de tarjetas y botones
  lg: 20, // margen lateral de pantalla
  xl: 24, // debajo de cabeceras
  xxl: 32, // entre secciones
  xxxl: 48, // final de pantalla
} as const;

/** Radios de borde. */
export const radius = {
  sm: 8, // etiquetas pequeñas
  md: 12, // botones, buscador e inputs
  lg: 20, // tarjetas
  xl: 28, // cabeceras, galerías y hojas
  pill: 999, // píldoras, chips y avatares
} as const;

/** Medidas fijas: botones e inputs de 56 de alto; nada que se toque mide menos de 44. */
export const sizes = { button: 56, touchMin: 44, input: 56 } as const;

/**
 * Escala tipográfica compartida por las dos apps: 8 estilos. Son objetos planos; cada pantalla los
 * usa directamente o dentro de StyleSheet.create. Sin alturas fijas: el texto crece con el ajuste
 * de tamaño de letra del celular. Nada importante por debajo de 13; texto de lectura en 16.
 */
export const typography = {
  display: { fontFamily: fonts.hero, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.text }, // portada, código, números grandes
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: colors.text }, // pantalla, negocio, producto, precio grande
  heading: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.text }, // títulos de sección
  subtitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, color: colors.text }, // título de tarjeta, texto de botones
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textBody }, // descripciones y textos largos
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.text }, // datos, chips, precios en listas, campos
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.textMuted }, // información secundaria
  overline: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.textMuted }, // rótulos en mayúsculas
} as const satisfies Record<string, TextStyle>;

export type TypographyStyle = keyof typeof typography;
