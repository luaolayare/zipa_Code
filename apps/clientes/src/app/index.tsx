import { Button, colors } from '@zipa/shared';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Bienvenida. El turista llega aquí, normalmente desde el QR de su hotel o de un negocio.
export default function Welcome() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.brand}>Vitrina Local</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.title}>Lo mejor de la zona, hecho aquí.</Text>
        <Text style={styles.subtitle}>
          Restaurantes y emprendimientos en un solo lugar. Mira en 3D lo que vas a pedir o comprar, y cuéntale a otros viajeros cómo te fue.
        </Text>
        <Button title="Empezar a explorar" variant="accent" onPress={() => router.push('/login')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  content: { flex: 1, padding: 24, gap: 16 },
  brand: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 38, fontWeight: '700', lineHeight: 42 },
  subtitle: { color: '#CFE1DF', fontSize: 16, lineHeight: 24, marginBottom: 8 },
});
