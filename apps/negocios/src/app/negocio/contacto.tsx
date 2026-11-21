// «Contacto y entregas»: redes sociales y modalidades de entrega del negocio (todo opcional).
// Es información para los clientes: la app no toma pedidos, no cobra ni calcula envíos.
// Guardar aquí no devuelve el negocio a revisión.
import {
  Button,
  DELIVERY_MODES,
  DELIVERY_NOTE_MAX,
  SOCIAL_NETWORKS,
  TextField,
  colors,
  socialLabel,
  useAuth,
  validateLinks,
  type DeliveryMode,
  type SocialNetwork,
  radius,
  spacing,
  typography,
} from '@zipa/shared';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Notice, type } from '@/components/kit';
import { Page } from '@/components/Page';
import { BackButton } from '@/components/StepHeader';

type Form = Record<SocialNetwork, string> & { deliveryModes: DeliveryMode[]; deliveryNote: string };
const EMPTY: Form = { instagram: '', facebook: '', tiktok: '', website: '', deliveryModes: [], deliveryNote: '' };

export default function ContactoYEntregas() {
  const { api, user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return void router.replace('/');
    (async () => {
      const b = await api.myBusiness(user.id);
      if (!b) return router.replace('/panel');
      setBusinessId(b.id);
      const links = await api.getBusinessLinks(b.id);
      setF(links
        ? {
            instagram: links.instagram ? socialLabel('instagram', links.instagram) : '',
            facebook: links.facebook ? socialLabel('facebook', links.facebook) : '',
            tiktok: links.tiktok ? socialLabel('tiktok', links.tiktok) : '',
            website: links.website ? socialLabel('website', links.website) : '',
            deliveryModes: links.deliveryModes,
            deliveryNote: links.deliveryNote ?? '',
          }
        : EMPTY);
    })().catch(() => setError('No pudimos cargar tus datos. Revisa tu conexión.'));
  }, [api, user]);

  if (!f || !businessId) {
    return <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>{error ? <Text style={type.error}>{error}</Text> : <ActivityIndicator size="large" />}</View>;
  }

  const set = (patch: Partial<Form>) => { setF({ ...f, ...patch }); setError(''); setErrorField(null); };
  const toggle = (id: DeliveryMode) =>
    set({ deliveryModes: f.deliveryModes.includes(id) ? f.deliveryModes.filter((m) => m !== id) : [...f.deliveryModes, id] });

  const save = async () => {
    const r = validateLinks(f);
    if (!r.ok) {
      setErrorField(r.field);
      return setError(r.error);
    }
    setSaving(true);
    setError('');
    try {
      await api.saveBusinessLinks(businessId, r.links);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar los datos de contacto. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <BackButton />
        <Text style={type.title}>Contacto y entregas</Text>
      </View>
      <Text style={type.help}>Todo es opcional. Los clientes solo verán lo que llenes. WhatsApp sigue siendo el contacto principal.</Text>

      <Text style={styles.section}>Redes sociales</Text>
      {SOCIAL_NETWORKS.map((n) => (
        <View key={n.id} style={{ gap: spacing.xs }}>
          <TextField
            label={n.label}
            value={f[n.id]}
            onChangeText={(v) => set({ [n.id]: v } as Partial<Form>)}
            placeholder={n.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={n.id === 'website' ? 'url' : 'default'}
            maxLength={200}
          />
          {errorField === n.id && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
        </View>
      ))}

      <Text style={styles.section}>¿Cómo entregas?</Text>
      <Text style={type.help}>Marca las que ofreces. Los clientes acuerdan el pedido y el pago contigo por WhatsApp.</Text>
      <View style={styles.row}>
        {DELIVERY_MODES.map((m) => {
          const on = f.deliveryModes.includes(m.id);
          return (
            <Pressable
              key={m.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(m.id)}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.8 }]}>
              {on && <Check size={15} color={colors.primary} strokeWidth={2.6} />}
              <Text style={[styles.chipText, on && { color: colors.primary }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextField
        label="Condiciones (opcional)"
        value={f.deliveryNote}
        onChangeText={(deliveryNote) => set({ deliveryNote })}
        placeholder="Ej: Domicilio gratis en el centro. Envíos por transportadora, los paga el cliente."
        multiline
        maxLength={DELIVERY_NOTE_MAX}
        hint={`${f.deliveryNote.length}/${DELIVERY_NOTE_MAX}`}
      />

      {!!error && errorField !== null && !SOCIAL_NETWORKS.some((n) => n.id === errorField) && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      {!!error && errorField === null && <Notice tone="danger"><Text style={type.error} accessibilityRole="alert">{error}</Text></Notice>}
      <Button title="Guardar" onPress={save} loading={saving} />
    </Page>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.heading, color: colors.text, marginTop: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { ...typography.label, color: colors.text },
});
