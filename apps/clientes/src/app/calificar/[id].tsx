import { Button, OffensiveTextError, Screen, TextField, colors, fonts, reservationWhen, reviewAllowedFrom, useAuth, type LocalFile, type Review, radius, spacing, typography } from '@zipa/shared';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { ImagePlus, Star, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { markReviewed, takePendingVisit } from '@/lib/contacto';

const LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', '¡Excelente!'];

export default function Calificar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [stars, setStars] = useState<Review['stars'] | 0>(0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false); // ya había calificado: edita su reseña
  const [photo, setPhoto] = useState<LocalFile | null>(null); // foto nueva
  const [savedPhoto, setSavedPhoto] = useState<string | null>(null); // foto que ya tenía
  // Cuenta de menos de 24 h: se avisa antes de escribir (antes solo se sabía al publicar).
  const [now] = useState(() => new Date());
  const allowedFrom = editing ? null : reviewAllowedFrom(user?.createdAt, now);

  useEffect(() => { api.getBusiness(id).then((b) => setBusinessName(b?.name ?? '')).catch(() => {}); }, [api, id]);

  // Una reseña por persona y negocio: si ya calificó, se carga para editarla.
  useEffect(() => {
    if (!user) return;
    api.getMyReview(id, user.id).then((r) => {
      if (!r) return;
      setEditing(true);
      setStars(r.stars);
      setText(r.text);
      setSavedPhoto(r.photoUrl ?? null);
    }).catch(() => {});
  }, [api, id, user]);

  const submit = async () => {
    if (!user) return router.replace({ pathname: '/login', params: { desde: 'calificar', negocio: id } });
    if (!stars) return setError('Elige de 1 a 5 estrellas.');
    setLoading(true);
    setError('');
    try {
      // Si llegó por el QR sin sesión, la visita se registra antes de guardar (para el sello).
      const pending = takePendingVisit();
      if (pending?.businessId === id) await api.registerVisit(id, pending.token);
      const status = await api.saveMyReview(id, user.id, user.name, stars, text.trim(), photo);
      markReviewed(id, status);
      // Vuelve al negocio (aunque se haya llegado desde un producto) para ver el aviso de gracias.
      router.dismissTo({ pathname: '/negocio/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof OffensiveTextError ? 'Tu reseña tiene palabras que no permitimos. Cuéntalo de otra forma.' : e instanceof Error ? e.message : 'No pudimos publicar tu reseña.');
    } finally {
      setLoading(false);
    }
  };

  // Selector de fotos del sistema: no pide permiso de cámara ni de galería.
  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (r.canceled || !r.assets?.[0]) return;
    setPhoto({ uri: r.assets[0].uri, mimeType: r.assets[0].mimeType ?? 'image/jpeg' });
  };

  return (
    <Screen>
      <BackButton />
      <View style={{ gap: spacing.xs }}>
        {!!businessName && <Text style={styles.business}>{businessName}</Text>}
        <Text style={styles.title} accessibilityRole="header">{editing ? 'Edita tu reseña' : '¿Cómo te fue?'}</Text>
        <Text style={styles.body}>{editing ? 'Ya calificaste este negocio. Puedes cambiar tus estrellas o tu comentario.' : 'Califica al negocio en general: la comida o los productos, la atención y el lugar.'}</Text>
      </View>
      {!!allowedFrom && (
        <View style={styles.wait} accessibilityRole="alert">
          <Text style={styles.waitTitle}>Tu cuenta es nueva</Text>
          <Text style={styles.waitBody}>Para evitar reseñas falsas, las cuentas nuevas pueden calificar 24 horas después de crearse. Podrás publicar tu reseña desde: {reservationWhen(allowedFrom, now)}</Text>
        </View>
      )}
      <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Calificación">
        {([1, 2, 3, 4, 5] as const).map((n) => {
          const on = n <= stars;
          return (
            <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`} accessibilityState={{ checked: stars === n }} onPress={() => { setStars(n); setError(''); }} style={({ pressed }) => [styles.star, on && styles.starOn, pressed && { transform: [{ scale: 0.94 }] }]}>
              <Star size={30} color={on ? colors.star : colors.inputBorder} fill={on ? colors.star : 'transparent'} strokeWidth={1.8} />
            </Pressable>
          );
        })}
      </View>
      {!!stars && <Text style={styles.label}>{LABELS[stars]}</Text>}
      <TextField label="Cuéntanos más" value={text} onChangeText={setText} multiline maxLength={600} placeholder="¿Qué pediste o compraste? ¿Cómo te atendieron?" />
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.photoLabel}>Foto (opcional)</Text>
        {photo || savedPhoto ? (
          <View>
            <Image resizeMethod="resize" source={{ uri: photo?.uri ?? savedPhoto! }} style={styles.photo} accessibilityLabel="Foto de tu reseña" />
            {!!photo && (
              <Pressable accessibilityRole="button" accessibilityLabel="Quitar la foto" onPress={() => setPhoto(null)} style={styles.photoRemove}>
                <X size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        ) : null}
        <Pressable accessibilityRole="button" onPress={pickPhoto} style={({ pressed }) => [styles.photoButton, pressed && { opacity: 0.85 }]}>
          <ImagePlus size={22} color={colors.primary} />
          <Text style={styles.photoButtonText}>{photo || savedPhoto ? 'Cambiar la foto' : 'Agregar una foto de lo que compraste'}</Text>
        </Pressable>
        <Text style={styles.note}>Las reseñas con foto inspiran más confianza a otros viajeros.</Text>
      </View>
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Button title={editing ? 'Guardar cambios' : 'Publicar reseña'} onPress={submit} loading={loading} />
      <Text style={styles.note}>Puedes tener una reseña por negocio y editarla cuando quieras. El negocio puede responderte.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  business: { ...typography.body, fontFamily: fonts.semibold, color: colors.textMuted },
  title: { ...typography.display, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  stars: { flexDirection: 'row', gap: spacing.sm },
  star: { flex: 1, aspectRatio: 1, maxWidth: 64, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  starOn: { borderColor: colors.star, backgroundColor: colors.warningSoft },
  label: { ...typography.heading, color: colors.starText, marginTop: -6 },
  error: { ...typography.label, color: colors.danger },
  photoLabel: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.stage3d },
  photoRemove: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: radius.pill, backgroundColor: 'rgba(20,33,31,0.75)', alignItems: 'center', justifyContent: 'center' },
  photoButton: { minHeight: 56, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inputBorder, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  photoButtonText: { ...typography.label, fontFamily: fonts.bold, color: colors.primary },
  wait: { gap: spacing.xxs, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.star, backgroundColor: colors.warningSoft },
  waitTitle: { ...typography.label, fontFamily: fonts.bold, color: colors.text },
  waitBody: { ...typography.body, color: colors.text },
  note: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
