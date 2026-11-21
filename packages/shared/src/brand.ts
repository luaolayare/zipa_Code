import type { ImageSourcePropType } from 'react-native';

// Nombre de la marca y eslogan. Cambiar aquí cambia todas las pantallas y los textos legales.
// Se escribe siempre «LocalmenteTuyo»: una palabra, con L y T mayúsculas.
// Los identificadores técnicos (paquetes Android, slug y esquema de Expo, proyectos de EAS, Firebase y
// Supabase) siguen diciendo «vitrina»/«zipa» a propósito: cambiarlos rompe los APK, los QR y las
// credenciales. Se revisan antes de publicar en las tiendas.
// (El nombre que muestra el celular bajo el ícono está en app.json de cada app.)
export const BRAND = {
  name: 'LocalmenteTuyo', // marca y app de clientes
  clientesApp: 'LocalmenteTuyo',
  negociosApp: 'LocalmenteTuyo Negocios',
  slogan: 'Lo mejor de aquí, cerquita de ti.',
} as const;

/**
 * Créditos de la sección «Acerca de» (clientes y negocios). Editar aquí cambia las dos apps.
 */
export const CREDITS = {
  developedBy: 'SCALIX Cloud',
  developer: 'Luis Alfredo Olaya',
  site: 'https://scalix-cloud.com/',
} as const;

/**
 * Logo definitivo. Mientras sea null, <Logo /> dibuja el actual (cuadro mostaza con una tienda).
 * Para cambiarlo: guardar la imagen en packages/shared/assets/ y poner aquí
 *   export const LOGO_IMAGE: ImageSourcePropType | null = require('../assets/logo.png');
 */
export const LOGO_IMAGE: ImageSourcePropType | null = null;
