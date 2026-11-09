import { BRAND, Button, Screen, colors, useAuth } from '@zipa/shared';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

// Inicio de la app del negocio.
export default function Inicio() {
  const { user } = useAuth();
  return (
    <Screen>
      <Text style={styles.brand}>{BRAND.negociosApp}</Text>
      <Text style={styles.title}>Que los turistas encuentren tu negocio.</Text>
      <Text style={styles.body}>
        Registra tu restaurante o emprendimiento, muestra tus productos en 3D y recibe reseñas de tus clientes. Son 5 pasos, unos 10 minutos.
      </Text>
      <Button title="Registrar mi negocio" variant="accent" onPress={() => router.push('/registro/cuenta')} />
      <Button title={user ? 'Ir a mi panel' : 'Ya tengo cuenta'} variant="outline" onPress={() => router.push(user ? '/panel' : '/registro/cuenta')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 16, fontWeight: '700', color: colors.primary },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, lineHeight: 36 },
  body: { fontSize: 16, lineHeight: 24, color: colors.textMuted },
});
