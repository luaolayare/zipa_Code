// El QR del negocio en forma de afiche para mesas o mostrador.
import { BRAND, colors, fonts } from '@zipa/shared';
import { Store } from 'lucide-react-native';
import { forwardRef, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

/**
 * Enlace que abre el negocio en la app de clientes.
 * PROVISIONAL: usa el esquema de la app (vitrinalocal://). Cuando exista el dominio propio se cambia
 * por https://<dominio>/n/<id>, que abre la app si está instalada o lleva a la tienda si no.
 */
export const qrLink = (businessId: string) => `vitrinalocal://negocio/${businessId}`;

export const QrPoster = forwardRef<ComponentRef<typeof View>, { businessId: string; name: string; comer: boolean }>(function QrPoster({ businessId, name, comer }, ref) {
  return (
    <View ref={ref} collapsable={false} style={styles.poster}>
      <View style={styles.brand}>
        <View style={styles.mark}><Store size={18} color={colors.text} /></View>
        <Text style={styles.brandText}>{BRAND.name}</Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
      <Text style={styles.call}>{comer ? 'Escanea y mira nuestro menú' : 'Escanea y mira nuestros productos'}</Text>
      <View style={styles.qrBox}>
        <QRCode value={qrLink(businessId)} size={210} color={colors.dark} backgroundColor="#FFFFFF" ecl="M" />
      </View>
      <Text style={styles.foot}>Y al final, cuéntanos cómo te fue ★</Text>
    </View>
  );
});

/** QR pequeño para la tarjeta del panel. */
export function QrMini({ businessId }: { businessId: string }) {
  return <QRCode value={qrLink(businessId)} size={92} color={colors.dark} backgroundColor="#FFFFFF" />;
}

const styles = StyleSheet.create({
  poster: { backgroundColor: colors.dark, borderRadius: 32, padding: 26, alignItems: 'center', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontFamily: fonts.display, fontSize: 18, color: '#FFFFFF' },
  name: { fontFamily: fonts.hero, fontSize: 32, lineHeight: 35, letterSpacing: -0.8, color: '#FFFFFF', textAlign: 'center', marginTop: 6 },
  call: { fontFamily: fonts.medium, fontSize: 16, color: colors.accent, textAlign: 'center' },
  qrBox: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 24, marginVertical: 8 },
  foot: { fontFamily: fonts.regular, fontSize: 15, color: '#C9D6D3' },
});
