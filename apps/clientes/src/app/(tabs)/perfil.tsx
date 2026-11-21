import { AboutCard, Button, DeleteAccountButton, ReservationPill, Screen, colors, fonts, reservationWhen, useAuth, type MyReview, type Reservation, radius, spacing, typography } from '@zipa/shared';
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
  const [reservations, setReservations] = useState<Reservation[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) api.myReviews(user.id).then(setReviews).catch(() => setReviews([]));
      if (user) api.myReservations(user.id).then(setReservations).catch(() => setReservations([]));
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
        <AboutCard />
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

      {!!reservations?.length && (
        <>
          <Text style={styles.h2} accessibilityRole="header">Mis reservas</Text>
          {reservations.slice(0, 3).map((r) => (
            <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Reserva ${r.code} en ${r.businessName}, ${reservationWhen(r.startsAt)}`} onPress={() => router.push({ pathname: '/reserva/[id]', params: { id: r.id } })} style={({ pressed }) => [styles.review, pressed && { opacity: 0.88 }]}>
              <View style={styles.reviewTop}>
                <Text style={styles.reviewBusiness} numberOfLines={1}>{r.businessName}</Text>
                <ReservationPill status={r.status} />
              </View>
              <Text style={styles.meta}>{reservationWhen(r.startsAt, new Date())} · {r.partySize} {r.partySize === 1 ? 'persona' : 'personas'} · {r.code}</Text>
            </Pressable>
          ))}
          <Button title={`Ver todas mis reservas (${reservations.length})`} variant="outline" onPress={() => router.push('/mis-reservas')} />
        </>
      )}

      <Text style={styles.h2} accessibilityRole="header">Mis reseñas</Text>
      {reviews?.length === 0 && <Text style={styles.meta}>Aún no has calificado ningún lugar. Entra a un negocio y toca «Calificar».</Text>}
      {reviews?.map((r) => (
        <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/negocio/[id]', params: { id: r.businessId } })} style={({ pressed }) => [styles.review, pressed && { opacity: 0.88 }]}>
          <View style={styles.reviewTop}>
            <Text style={styles.reviewBusiness} numberOfLines={1}>{r.businessName}</Text>
            <Text style={styles.stars} accessibilityLabel={`${r.stars} de 5 estrellas`}>{'★'.repeat(r.stars)}<Text style={{ color: colors.inputBorder }}>{'★'.repeat(5 - r.stars)}</Text></Text>
          </View>
          {!!r.text && <Text style={styles.reviewText} numberOfLines={3}>{r.text}</Text>}
          {r.status === 'en_espera' && <Text style={styles.waiting}>En revisión por el equipo</Text>}
          {!!r.reply && <Text style={styles.replied}>El negocio te respondió</Text>}
        </Pressable>
      ))}

      <Button title="Cerrar sesión" variant="danger" onPress={signOut} />
      <Legal />
      <AboutCard />
      <DeleteAccountButton loses="tu perfil, tus reseñas, tus solicitudes de reserva y tus reportes" onDeleted={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 76, height: 76, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarGuest: { backgroundColor: colors.chipIdle },
  initial: { ...typography.display, fontFamily: fonts.display, color: colors.accent },
  name: { ...typography.title, color: colors.text },
  title: { ...typography.title, color: colors.text },
  meta: { ...typography.body, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, padding: spacing.lg, gap: spacing.xxs, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  statNumber: { ...typography.display, fontFamily: fonts.display },
  statLabel: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted },
  h2: { ...typography.title, color: colors.text, marginTop: spacing.xxs },
  review: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewBusiness: { ...typography.body, flex: 1, fontFamily: fonts.bold, color: colors.text },
  stars: { ...typography.body, color: colors.starText },
  reviewText: { ...typography.body, color: colors.textBody },
  waiting: { ...typography.caption, fontFamily: fonts.bold, color: colors.accentText },
  replied: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
  legal: { marginTop: spacing.xxs, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.xxs },
  legalTitle: { ...typography.overline, color: colors.textMuted },
  link: { alignSelf: 'flex-start' },
});
