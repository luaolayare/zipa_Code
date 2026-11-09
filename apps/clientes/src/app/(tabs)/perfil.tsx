import { Button, DeleteAccountButton, Screen, colors, useAuth } from '@zipa/shared';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

// Enlaces a los documentos legales, con sesión y como invitado.
function Legal() {
  return (
    <View style={styles.legal}>
      <Text style={styles.legalTitle} accessibilityRole="header">Información legal</Text>
      <Button variant="link" title="Términos y condiciones" onPress={() => router.push('/legal/terminos')} style={styles.link} />
      <Button variant="link" title="Política de privacidad" onPress={() => router.push('/legal/privacidad')} style={styles.link} />
    </View>
  );
}

export default function Perfil() {
  const { user, signOut } = useAuth();
  if (!user) {
    return (
      <Screen>
        <Text style={styles.title}>Estás como invitado</Text>
        <Text style={styles.meta}>Inicia sesión para calificar negocios y guardar tu historial.</Text>
        <Button title="Iniciar sesión" onPress={() => router.push('/login')} />
        <Legal />
      </Screen>
    );
  }
  return (
    <Screen>
      <Text style={styles.title}>{user.name}</Text>
      <Text style={styles.meta}>{user.email}</Text>
      {/* TODO: mis reseñas y lugares vistos */}
      <Button title="Cerrar sesión" variant="outline" onPress={signOut} />
      <Legal />
      <View style={styles.danger}>
        <DeleteAccountButton loses="tu perfil, tus reseñas y tus reportes" onDeleted={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  meta: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  legal: { marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 2 },
  legalTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7 },
  link: { alignSelf: 'flex-start' },
  danger: { marginTop: 12 },
});
