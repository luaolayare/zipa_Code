import { Button, TextField, colors, type BusinessType, spacing } from '@zipa/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { BUSINESS_TYPES, Notice, type } from '@/components/kit';
import { CategoryPicker } from '@/components/CategoryPicker';
import { LogoPicker } from '@/components/LogoPicker';
import { OptionCards } from '@/components/OptionChips';
import { Page } from '@/components/Page';
import { useRegistro } from '@/components/RegistroContext';
import { StepHeader } from '@/components/StepHeader';

// Paso 2: datos del negocio.
export default function Datos() {
  const { draft, update, reset, restored } = useRegistro();
  const [error, setError] = useState('');

  const next = () => {
    if (draft.name.trim().length < 2) return setError('Escribe el nombre del negocio.');
    if (!draft.subcategoryId) return setError('Elige qué ofreces principalmente, para que los clientes te encuentren por categoría.');
    if (!draft.address.trim()) return setError('Escribe la dirección para que los clientes te encuentren.');
    setError('');
    router.push('/registro/verificacion');
  };

  return (
    <Page>
      <StepHeader step={2} title="Datos del negocio" />
      {restored && (
        <Notice tone="info">
          <Text style={type.label}>Retomamos tu registro donde lo dejaste.</Text>
          <Text style={type.help}>Por seguridad, la cédula o NIT se vuelve a pedir en el paso 3.</Text>
          <Text style={[type.label, { color: colors.primary, marginTop: spacing.xs, textDecorationLine: 'underline' }]} accessibilityRole="button" onPress={reset}>Empezar de cero</Text>
        </Notice>
      )}
      <TextField label="Nombre del negocio" value={draft.name} onChangeText={(name) => update({ name })} placeholder="Ej: Arepas Mamá Inés" maxLength={80} />
      <LogoPicker name={draft.name} uri={draft.logo?.uri ?? draft.logoUrl} onPick={(logo) => update({ logo })} onRemove={() => update({ logo: null, logoUrl: null })} />
      <CategoryPicker value={draft} onChange={(patch) => { update(patch); setError(''); }} />
      <OptionCards<BusinessType> label="¿Cómo se describe?" options={BUSINESS_TYPES} value={draft.type} onChange={(t) => update({ type: t })} />
      <TextField label="Dirección" value={draft.address} onChangeText={(address) => update({ address })} placeholder="Ej: Calle 4 # 8-12, Centro" />
      <TextField label="Horario" value={draft.hours} onChangeText={(hours) => update({ hours })} placeholder="Ej: Lun a sáb, 7:00 a. m. a 9:00 p. m." />
      <TextField label="WhatsApp del negocio" value={draft.whatsapp} onChangeText={(whatsapp) => update({ whatsapp })} keyboardType="phone-pad" placeholder="Ej: 300 123 4567" />
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Seguir" onPress={next} />
    </Page>
  );
}
