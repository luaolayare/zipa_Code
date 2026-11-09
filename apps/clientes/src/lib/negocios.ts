import { BRAND } from '@zipa/shared';
import { Alert, Linking } from 'react-native';

// Enlace a la app de negocios (scheme de apps/negocios/app.json).
const NEGOCIOS_URL = 'vitrinanegocios://';

/** Abre la app de negocios; si no está instalada, explica dónde registrarse. */
export async function openNegociosApp() {
  try {
    await Linking.openURL(NEGOCIOS_URL);
  } catch {
    // Pendiente: abrir la página de la app de negocios en la tienda cuando esté publicada.
    Alert.alert(BRAND.negociosApp, `Registra tu restaurante o emprendimiento desde la app ${BRAND.negociosApp}.`);
  }
}
