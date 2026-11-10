import { Button, Card, Screen, businessTypeLabel, categoryLabel, colors, useAuth } from '@zipa/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useRegistro } from '@/components/RegistroContext';
import { StepHeader } from '@/components/StepHeader';

// Paso 5: el negocio ve su tarjeta tal como la verán los clientes y la envía a revisión.
export default function VistaPrevia() {
  const { draft, update } = useRegistro();
  const { api, user } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    if (!user) return router.replace('/registro/cuenta');
    if (!draft.photoUri) return router.replace('/registro/verificacion');
    setLoading(true);
    try {
      // Si un intento anterior ya creó el negocio, se reutiliza en vez de crear otro.
      const id = draft.businessId ?? await api.registerBusiness(user.id, {
        name: draft.name.trim(),
        type: draft.type,
        category: draft.category,
        address: draft.address.trim(),
        hours: draft.hours.trim() || undefined,
        whatsapp: draft.whatsapp.trim() || undefined,
      });
      if (!draft.businessId) update({ businessId: id });
      // Foto al espacio privado y cédula/NIT a la tabla privada, antes de pedir la revisión.
      await api.saveVerification(user.id, id, { uri: draft.photoUri, mimeType: draft.photoMimeType }, draft.idNumber);
      // TODO: guardar productos (videos y modelos 3D).
      await api.submitForReview(id);
      router.replace('/panel');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos enviar tu negocio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <StepHeader step={5} title="Vista previa" />
      <Text style={styles.body}>Así verán tu negocio los clientes en la app.</Text>
      <Card>
        <Text style={styles.name}>{draft.name || 'Tu negocio'}</Text>
        <Text style={styles.body}>{categoryLabel(draft.category)} · {draft.address || 'Sin dirección'}</Text>
        <Text style={styles.tag}>{businessTypeLabel(draft.type)} · Nuevo</Text>
        <Text style={styles.body}>{draft.products.length} en 3D: {draft.products.map((p) => p.name).join(', ')}</Text>
      </Card>
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Enviar a revisión y publicar" onPress={publish} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  tag: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', color: colors.accentText, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  error: { color: colors.danger, fontWeight: '600' },
});
