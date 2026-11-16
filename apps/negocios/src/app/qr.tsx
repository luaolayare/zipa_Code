// QR del negocio para imprimir o compartir.
import { Button, useAuth, type Business } from '@zipa/shared';
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
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const poster = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    if (!user) return router.replace('/');
    api.myBusiness(user.id).then(setBusiness).catch(() => setError('No pudimos cargar tu negocio.'));
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <BackButton />
        <Text style={type.h1}>Tu QR</Text>
      </View>
      <Text style={type.body}>Imprímelo para tus mesas o mostrador. El cliente lo escanea con la cámara de su celular y llega directo a tu vitrina, donde también puede dejarte una reseña.</Text>
      {business ? (
        <QrPoster ref={poster} businessId={business.id} name={business.name} comer={business.category === 'comer'} />
      ) : (
        !error && <ActivityIndicator style={{ marginVertical: 40 }} />
      )}
      <Notice tone="warn">
        Versión de prueba: por ahora este QR solo abre la app en celulares que ya la tienen instalada. Antes del lanzamiento lo cambiaremos por el definitivo, así que todavía no lo mandes a imprimir en cantidad.
      </Notice>
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Compartir o guardar la imagen" icon={<Share2 size={20} color="#FFFFFF" />} onPress={share} loading={sharing} disabled={!business} />
    </Page>
  );
}
