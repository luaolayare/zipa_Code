import { Button, Screen, colors, useAuth } from '@zipa/shared';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

export default function Perfil() {
  const { user, signOut } = useAuth();
  if (!user) {
    return (
      <Screen>
        <Text style={styles.title}>Estás como invitado</Text>
        <Text style={styles.meta}>Inicia sesión para calificar negocios y guardar tu historial.</Text>
        <Button title="Iniciar sesión" onPress={() => router.push('/login')} />
      </Screen>
    );
  }
  return (
    <Screen>
      <Text style={styles.title}>{user.name}</Text>
      <Text style={styles.meta}>{user.email}</Text>
      {/* TODO: mis reseñas y lugares vistos */}
      <Button title="Cerrar sesión" variant="outline" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  meta: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
});
