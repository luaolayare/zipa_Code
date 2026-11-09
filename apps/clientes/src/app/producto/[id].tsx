import { Button, Card, Screen, colors } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

// Visor 3D del producto.
// Fase 1 (prueba técnica): decidir el formato (.glb para Android, .usdz para iOS) y el visor
// (por ejemplo react-three-fiber o el visor nativo de realidad aumentada de cada sistema).
export default function Producto() {
  const { name } = useLocalSearchParams<{ id: string; name?: string }>();
  return (
    <Screen>
      <Button variant="link" title="‹ Volver" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Text style={styles.title}>{name ?? 'Producto'}</Text>
      <Card style={styles.viewer}>
        <Text style={styles.meta}>Aquí va el visor 3D. Se construye en la fase 1.</Text>
      </Card>
      <Button title="Ver en mi espacio (realidad aumentada)" onPress={() => {}} disabled />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  viewer: { height: 320, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9EFEE' },
  meta: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
