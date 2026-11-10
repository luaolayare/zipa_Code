import { Button, Card, DeleteAccountButton, Screen, colors, useAuth, type Business } from '@zipa/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useRegistro } from '@/components/RegistroContext';

const STATUS_TEXT: Record<Business['status'], string> = {
  borrador: 'Borrador: termina el registro',
  en_revision: 'En revisión: aquí verás cuando quede publicado',
  publicado: 'Publicado: visible para clientes',
  rechazado: 'Rechazado: revisa tus datos',
};

// Panel del negocio: estado, productos, reseñas y QR.
export default function Panel() {
  const { api, user, signOut } = useAuth();
  const { draft } = useRegistro();
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    if (user) api.myBusiness(user.id).then(setBusiness).catch(() => setBusiness(null));
  }, [api, user]);

  const name = business?.name ?? (draft.name || 'Tu negocio');
  const status = business?.status ?? 'en_revision';

  return (
    <Screen>
      <Text style={styles.small}>Panel de tu negocio</Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={[styles.status, status === 'publicado' ? styles.live : styles.review]}>{STATUS_TEXT[status]}</Text>

      <Card>
        <Text style={styles.h2}>Productos en 3D</Text>
        <Text style={styles.body}>Agrega o actualiza los productos de tu vitrina.</Text>
        <Button title="Agregar producto" variant="outline" onPress={() => router.push('/registro/productos')} />
      </Card>
      <Card>
        <Text style={styles.h2}>Reseñas</Text>
        <Text style={styles.body}>Aquí verás y responderás las reseñas de tus clientes.</Text>
      </Card>
      <Card>
        <Text style={styles.h2}>Tu QR</Text>
        <Text style={styles.body}>Imprímelo para tus mesas o mostrador. Lleva directo a tu vitrina.</Text>
      </Card>
      <Button title="Cerrar sesión" variant="link" onPress={async () => { await signOut(); router.replace('/'); }} />
      <View style={styles.legal}>
        <Text style={styles.legalTitle} accessibilityRole="header">Información legal</Text>
        <Button variant="link" title="Términos y condiciones" onPress={() => router.push('/legal/terminos')} style={styles.link} />
        <Button variant="link" title="Política de privacidad" onPress={() => router.push('/legal/privacidad')} style={styles.link} />
      </View>
      {!!user && (
        <DeleteAccountButton
          loses="tu cuenta, tu negocio, sus productos, fotos y videos, y las reseñas que ha recibido"
          onDeleted={() => router.replace('/')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  small: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  status: { alignSelf: 'flex-start', fontSize: 13, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  live: { backgroundColor: colors.primarySoft, color: colors.primary },
  review: { backgroundColor: colors.accentSoft, color: colors.accentText },
  h2: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  legal: { marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 2 },
  legalTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7 },
  link: { alignSelf: 'flex-start' },
});
