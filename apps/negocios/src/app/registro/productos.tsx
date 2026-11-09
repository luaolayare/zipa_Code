import { Button, Card, Screen, TextField, colors, formatCop } from '@zipa/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useRegistro } from '@/components/RegistroContext';
import { StepHeader } from '@/components/StepHeader';

// Paso 4: productos en 3D. El negocio graba un video de ~20 s girando alrededor del producto.
export default function Productos() {
  const { draft, update } = useRegistro();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const word = draft.category === 'comer' ? 'plato' : 'producto';

  // TODO fase 1: grabar con expo-camera, subir el video y generar el modelo 3D en el servidor.
  const add = () => {
    if (!name.trim()) return setError(`Escribe el nombre del ${word}.`);
    const digits = price.replace(/\D/g, '');
    update({ products: [...draft.products, { name: name.trim(), priceCop: digits ? Number(digits) : null, videoUri: null }] });
    setName('');
    setPrice('');
    setError('');
  };

  const next = () => {
    if (draft.products.length === 0) return setError(`Agrega al menos un ${word}.`);
    router.push('/registro/vista-previa');
  };

  return (
    <Screen>
      <StepHeader step={4} title="Tus productos en 3D" />
      <Text style={styles.body}>Graba un video de 20 segundos dando la vuelta alrededor del {word} y la app lo convierte en 3D.</Text>
      {draft.products.map((p, i) => (
        <Card key={i}>
          <Text style={styles.strong}>{p.name}</Text>
          <Text style={styles.body}>{formatCop(p.priceCop)} · modelo 3D pendiente</Text>
        </Card>
      ))}
      <Card>
        <TextField label="Nombre" value={name} onChangeText={setName} />
        <TextField label="Precio" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="Ej: 7000" />
        <Button title={`Grabar video del ${word} y agregar`} variant="outline" onPress={add} />
      </Card>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Ver cómo quedó" variant="accent" onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  strong: { fontSize: 15, fontWeight: '700', color: colors.text },
  error: { color: colors.danger, fontWeight: '600' },
});
