import { Button, DeleteAccountButton, Screen, colors, fonts, useAuth, type MyReview } from '@zipa/shared';
import { router, useFocusEffect } from 'expo-router';
import { User } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const { user, api, signOut } = useAuth();
  const [reviews, setReviews] = useState<MyReview[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) api.myReviews(user.id).then(setReviews).catch(() => setReviews([]));
    }, [api, user]),
  );

  if (!user) {
    return (
      <Screen>
        <View style={[styles.avatar, styles.avatarGuest]}><User size={30} color={colors.textMuted} /></View>
        <Text style={styles.title}>Estás como invitado</Text>
        <Text style={styles.meta}>Puedes explorar sin cuenta. Inicia sesión para calificar los negocios que visitas.</Text>
        <Button title="Iniciar sesión" onPress={() => router.push('/login')} />
        <Legal />
      </Screen>
    );
  }

  const replies = reviews?.filter((r) => r.reply).length ?? 0;

  return (
    <Screen>
      <View style={styles.identity}>
        <View style={styles.avatar}><Text style={styles.initial}>{user.name.trim()[0]?.toUpperCase() ?? 'T'}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{reviews?.length ?? '–'}</Text>
          <Text style={styles.statLabel}>Reseñas escritas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{reviews ? replies : '–'}</Text>
          <Text style={styles.statLabel}>Respuestas de negocios</Text>
        </View>
      </View>

      <Text style={styles.h2} accessibilityRole="header">Mis reseñas</Text>
      {reviews?.length === 0 && <Text style={styles.meta}>Aún no has calificado ningún lugar. Entra a un negocio y toca «Calificar».</Text>}
      {reviews?.map((r) => (
        <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/negocio/[id]', params: { id: r.businessId } })} style={({ pressed }) => [styles.review, pressed && { opacity: 0.88 }]}>
          <View style={styles.reviewTop}>
            <Text style={styles.reviewBusiness} numberOfLines={1}>{r.businessName}</Text>
            <Text style={styles.stars} accessibilityLabel={`${r.stars} de 5 estrellas`}>{'★'.repeat(r.stars)}<Text style={{ color: '#D8D2C6' }}>{'★'.repeat(5 - r.stars)}</Text></Text>
          </View>
          {!!r.text && <Text style={styles.reviewText} numberOfLines={3}>{r.text}</Text>}
          {!!r.reply && <Text style={styles.replied}>El negocio te respondió</Text>}
        </Pressable>
      ))}

      <Button title="Cerrar sesión" variant="danger" onPress={signOut} />
      <Legal />
      <DeleteAccountButton loses="tu perfil, tus reseñas y tus reportes" onDeleted={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarGuest: { backgroundColor: colors.chipIdle },
  initial: { fontFamily: fonts.display, fontSize: 34, color: colors.accent },
  name: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.6, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 22, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 18, gap: 4, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  statNumber: { fontFamily: fonts.display, fontSize: 36, letterSpacing: -1, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.textMuted },
  h2: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.4, color: colors.text, marginTop: 4 },
  review: { gap: 8, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewBusiness: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  stars: { fontSize: 16, letterSpacing: 1, color: colors.starText },
  reviewText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textBody },
  replied: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.primary },
  legal: { marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 2 },
  legalTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  link: { alignSelf: 'flex-start' },
});
