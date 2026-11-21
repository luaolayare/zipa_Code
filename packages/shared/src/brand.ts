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
 * Símbolo del logo (corazón con el pin), recortado de assets/logo.png. Lo usa <Logo /> en todas las
 * pantallas. Con null, <Logo /> vuelve a dibujar el cuadro mostaza con una tienda.
 */
export const LOGO_IMAGE: ImageSourcePropType | null = require('../assets/logo-simbolo.png');

/** Logo completo (símbolo, nombre y eslogan) para la ficha de la tienda y materiales de marca. Original: assets/logo.png. */
export const LOGO_COMPLETO: ImageSourcePropType = require('../assets/logo.png');
