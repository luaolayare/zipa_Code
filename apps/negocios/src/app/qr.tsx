// QR del negocio para imprimir o compartir.
import { Button, useAuth, type Business, restaurantOf, spacing } from '@zipa/shared';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Notice, type } from '@/components/kit';
import { Page } from '@/components/Page';
import { QrPoster } from '@/components/QrPoster';
import { BackButton } from '@/components/StepHeader';

export default function Qr() {
  const { api, user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const poster = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    if (!user) return router.replace('/');
    api.myBusiness(user.id)
      .then(async (b) => { setBusiness(b); if (b) setToken(await api.myQrToken(b.id)); })
      .catch(() => setError('No pudimos cargar tu negocio.'));
  }, [api, user]);

  const share = async () => {
    if (!poster.current) return;
    setSharing(true);
    setError('');
    try {
      const uri = await captureRef(poster, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible en este celular.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Tu QR de Zipa lo tiene', UTI: 'public.png' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos preparar la imagen del QR.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <BackButton />
        <Text style={type.title}>Tu QR</Text>
      </View>
      <Text style={type.body}>Imprímelo para tus mesas o mostrador. El cliente lo escanea con la cámara de su celular y llega directo a tu vitrina. Si después te califica, su reseña sale con el sello «Visitó el negocio».</Text>
      {business ? (
        <QrPoster ref={poster} businessId={business.id} token={token} name={business.name} restaurant={restaurantOf(business)} />
      ) : (
        !error && <ActivityIndicator style={{ marginVertical: spacing.xxxl }} />
      )}
      <Notice tone="warn">
        Versión de prueba: por ahora este QR solo abre la app en celulares que ya la tienen instalada. Antes del lanzamiento lo cambiaremos por el definitivo, así que todavía no lo mandes a imprimir en cantidad.
      </Notice>
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Compartir o guardar la imagen" icon={<Share2 size={20} color="#FFFFFF" />} onPress={share} loading={sharing} disabled={!business} />
    </Page>
  );
}
