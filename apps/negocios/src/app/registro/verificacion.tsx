import { Button, Card, Screen, TextField, colors, isValidIdNumber } from '@zipa/shared';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useRegistro } from '@/components/RegistroContext';
import { StepHeader } from '@/components/StepHeader';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: false };

// Paso 3: verificación. La foto y la cédula/NIT solo las ve el equipo de revisión;
// la foto se guarda en un espacio privado y se borra al terminar la revisión.
export default function Verificacion() {
  const { draft, update } = useRegistro();
  const [error, setError] = useState('');

  const usePhoto = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    update({ photoUri: a.uri, photoMimeType: a.mimeType ?? 'image/jpeg' });
    setError('');
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return setError('Para tomar la foto, permite el uso de la cámara en los ajustes del celular, o elige una foto que ya tengas.');
    }
    usePhoto(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return setError('Para elegir la foto, permite el acceso a tus fotos en los ajustes del celular, o tómala con la cámara.');
    }
    usePhoto(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  };

  const next = () => {
    if (!draft.photoUri) return setError('Sube una foto de tu local o puesto.');
    if (!isValidIdNumber(draft.idNumber)) return setError('Escribe un número de cédula o NIT válido (solo números; el NIT puede llevar guion).');
    setError('');
    router.push('/registro/productos');
  };

  return (
    <Screen>
      <StepHeader step={3} title="Verificación" />
      <Text style={styles.body}>Para que los turistas confíen, revisamos tus datos en menos de 24 horas.</Text>
      <Card>
        <Text style={styles.strong}>Foto de tu local o puesto</Text>
        {draft.photoUri ? (
          <Image source={{ uri: draft.photoUri }} style={styles.preview} accessibilityLabel="Foto de tu local que enviarás a revisión" />
        ) : (
          <Text style={styles.body}>Toma o sube una foto donde se vea el negocio.</Text>
        )}
        <View style={styles.buttons}>
          <Button title={draft.photoUri ? 'Tomar otra foto' : 'Tomar foto'} variant="outline" onPress={takePhoto} />
          <Button title="Elegir de mis fotos" variant="link" onPress={pickPhoto} />
        </View>
        <Text style={styles.private}>Solo la ve el equipo de revisión y se borra cuando terminamos de revisar.</Text>
      </Card>
      <TextField
        label="Cédula o NIT del responsable"
        value={draft.idNumber}
        onChangeText={(idNumber) => update({ idNumber })}
        keyboardType="numbers-and-punctuation"
        placeholder="Solo lo ve el equipo de revisión"
      />
      <Text style={styles.note}>No necesitas Cámara de Comercio para empezar. Los emprendimientos informales también pueden registrarse.</Text>
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Seguir" onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  strong: { fontSize: 15, fontWeight: '700', color: colors.text },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: colors.stage3d },
  buttons: { gap: 4 },
  private: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
  note: { fontSize: 13, lineHeight: 19, color: colors.primary, backgroundColor: colors.primarySoft, padding: 12, borderRadius: 12 },
  error: { color: colors.danger, fontWeight: '600' },
});
