import { Button, Card, Screen, TextField, colors } from '@zipa/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useRegistro } from '@/components/RegistroContext';
import { StepHeader } from '@/components/StepHeader';

// Paso 3: verificación. Solo publicamos negocios reales.
export default function Verificacion() {
  const { draft, update } = useRegistro();
  const [error, setError] = useState('');

  // TODO: abrir la cámara o la galería con expo-image-picker y subir la foto a Supabase Storage.
  const takePhoto = () => update({ photoUri: 'pendiente://foto-local.jpg' });

  const next = () => {
    if (!draft.photoUri) return setError('Sube una foto de tu local o puesto.');
    if (draft.idNumber.replace(/\D/g, '').length < 6) return setError('Escribe un número de cédula o NIT válido.');
    setError('');
    router.push('/registro/productos');
  };

  return (
    <Screen>
      <StepHeader step={3} title="Verificación" />
      <Text style={styles.body}>Para que los turistas confíen, revisamos tus datos en menos de 24 horas.</Text>
      <Card>
        <Text style={styles.strong}>Foto de tu local o puesto</Text>
        <Text style={styles.body}>{draft.photoUri ? 'Foto cargada' : 'Toma o sube una foto donde se vea el negocio.'}</Text>
        <Button title={draft.photoUri ? 'Cambiar foto' : 'Tomar foto'} variant="outline" onPress={takePhoto} />
      </Card>
      <TextField label="Cédula o NIT del responsable" value={draft.idNumber} onChangeText={(idNumber) => update({ idNumber })} keyboardType="number-pad" placeholder="Solo lo ve el equipo de revisión" />
      <Text style={styles.note}>No necesitas Cámara de Comercio para empezar. Los emprendimientos informales también pueden registrarse.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Seguir" onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  strong: { fontSize: 15, fontWeight: '700', color: colors.text },
  note: { fontSize: 13, lineHeight: 19, color: colors.primary, backgroundColor: colors.primarySoft, padding: 12, borderRadius: 12 },
  error: { color: colors.danger, fontWeight: '600' },
});
