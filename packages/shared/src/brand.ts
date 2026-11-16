import type { ImageSourcePropType } from 'react-native';

// Nombre de la marca y ciudad. Cambiar aquí cambia todas las pantallas y los textos legales.
// (El nombre que muestra el celular bajo el ícono está en app.json de cada app.)
export const BRAND = {
  name: 'Zipa lo tiene', // marca y app de clientes
  clientesApp: 'Zipa lo tiene',
  negociosApp: 'Zipa lo tiene Negocios',
  city: 'Zipaquirá',
  zone: 'Centro histórico',
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
