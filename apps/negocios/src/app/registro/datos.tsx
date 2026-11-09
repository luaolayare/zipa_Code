import { Button, CATEGORIES, Screen, TextField, colors, type BusinessType, type Category } from '@zipa/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { OptionChips } from '@/components/OptionChips';
import { useRegistro } from '@/components/RegistroContext';
import { StepHeader } from '@/components/StepHeader';

const TYPES: { id: BusinessType; label: string }[] = [
  { id: 'emprendimiento', label: 'Emprendimiento' },
  { id: 'establecido', label: 'Negocio establecido' },
];

// Paso 2: datos del negocio.
export default function Datos() {
  const { draft, update } = useRegistro();
  const [error, setError] = useState('');

  const next = () => {
    if (!draft.name.trim()) return setError('Escribe el nombre del negocio.');
    if (!draft.address.trim()) return setError('Escribe la dirección para que los clientes te encuentren.');
    setError('');
    router.push('/registro/verificacion');
  };

  return (
    <Screen>
      <StepHeader step={2} title="Datos del negocio" />
      <TextField label="Nombre del negocio" value={draft.name} onChangeText={(name) => update({ name })} placeholder="Ej: Arepas Mamá Inés" />
      <OptionChips<BusinessType> label="¿Qué tipo de negocio es?" options={TYPES} value={draft.type} onChange={(type) => update({ type })} />
      <OptionChips<Category> label="Categoría" options={CATEGORIES} value={draft.category} onChange={(category) => update({ category })} />
      <TextField label="Dirección" value={draft.address} onChangeText={(address) => update({ address })} placeholder="Ej: Calle del Arsenal #8-12" />
      <TextField label="Horario" value={draft.hours} onChangeText={(hours) => update({ hours })} placeholder="Ej: Lunes a sábado, 8 a. m. a 9 p. m." />
      <TextField label="WhatsApp del negocio" value={draft.whatsapp} onChangeText={(whatsapp) => update({ whatsapp })} keyboardType="phone-pad" />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Seguir" onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({ error: { color: colors.danger, fontWeight: '600' } });
