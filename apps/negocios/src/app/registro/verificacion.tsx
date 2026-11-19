import { Button, TextField, colors, fonts, isValidIdNumber } from '@zipa/shared';
import { router } from 'expo-router';
import { Camera, Check, ImageIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Notice, type } from '@/components/kit';
import { pickPhoto, takePhoto, type MediaResult } from '@/components/media';
import { Page } from '@/components/Page';
import { useRegistro } from '@/components/RegistroContext';
import { StepHeader } from '@/components/StepHeader';

// Paso 3: verificación. La foto y la cédula/NIT solo las ve el equipo de revisión;
// la foto se guarda en un espacio privado y se borra al terminar la revisión.
export default function Verificacion() {
  const { draft, update } = useRegistro();
  const [error, setError] = useState('');

  const apply = (r: MediaResult) => {
    if (!r) return;
    if ('error' in r) return setError(r.error);
    update({ photoUri: r.file.uri, photoMimeType: r.file.mimeType ?? 'image/jpeg', verificationSaved: false });
    setError('');
  };

  const next = () => {
    if (!draft.photoUri) return setError('Sube una foto de tu local o puesto.');
    if (!isValidIdNumber(draft.idNumber)) return setError('Escribe un número de cédula o NIT válido (solo números; el NIT puede llevar guion).');
    setError('');
    router.push('/registro/productos');
  };

  const done = !!draft.photoUri;

  return (
    <Page>
      <StepHeader step={3} title="Verificación" />
      <Text style={type.body}>Para que los turistas confíen, solo publicamos negocios reales. Revisamos cada negocio antes de publicarlo.</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={done ? 'Foto del local cargada. Tocar para tomar otra' : 'Tomar foto de tu local o puesto'}
        onPress={async () => apply(await takePhoto('verificacion'))}
        style={({ pressed }) => [styles.drop, done && styles.dropDone, pressed && { opacity: 0.85 }]}>
        <View style={[styles.dropIcon, done && { backgroundColor: colors.success }]}>
          {done ? <Check size={30} color="#FFFFFF" strokeWidth={3} /> : <Camera size={28} color={colors.text} />}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={type.h3}>Foto de tu local o puesto</Text>
          <Text style={type.small}>{done ? 'Foto cargada. Toca para tomar otra.' : 'Toca para tomarla con la cámara.'}</Text>
        </View>
      </Pressable>
      {done && <Image source={{ uri: draft.photoUri! }} style={styles.preview} accessibilityLabel="Foto de tu local que enviarás a revisión" />}
      <Pressable accessibilityRole="button" onPress={async () => apply(await pickPhoto('verificacion'))} style={styles.alt} hitSlop={6}>
        <ImageIcon size={20} color={colors.primary} />
        <Text style={styles.altText}>Elegir una foto que ya tengo</Text>
      </Pressable>
      <Text style={type.small}>Solo la ve el equipo de revisión y se borra cuando terminamos de revisar.</Text>

      <TextField
        label="Cédula o NIT del responsable"
        value={draft.idNumber}
        onChangeText={(idNumber) => update({ idNumber, verificationSaved: false })}
        keyboardType="numbers-and-punctuation"
        placeholder="Ej: 1.234.567.890"
        hint="Solo la ve el equipo de revisión. Nunca se muestra a los clientes."
      />
      <Notice>No necesitas Cámara de Comercio para empezar. Los emprendimientos informales también pueden registrarse.</Notice>
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Seguir" onPress={next} />
    </Page>
  );
}

const styles = StyleSheet.create({
  drop: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.inputBorder, backgroundColor: colors.surface },
  dropDone: { borderColor: colors.success },
  dropIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 22, backgroundColor: colors.stage3d },
  alt: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 40 },
  altText: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.primary, textDecorationLine: 'underline' },
});
