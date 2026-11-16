import { Button, OffensiveTextError, Screen, TextField, colors, fonts, useAuth, type Review } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { markReviewed } from '@/lib/contacto';

const LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', '¡Excelente!'];

export default function Calificar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [stars, setStars] = useState<Review['stars'] | 0>(0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getBusiness(id).then((b) => setBusinessName(b?.name ?? '')).catch(() => {}); }, [api, id]);

  const submit = async () => {
    if (!user) return router.replace({ pathname: '/login', params: { desde: 'calificar', negocio: id } });
    if (!stars) return setError('Elige de 1 a 5 estrellas.');
    setLoading(true);
    setError('');
    try {
      await api.createReview(id, user.id, user.name, stars, text.trim());
      markReviewed(id);
      // Vuelve al negocio (aunque se haya llegado desde un producto) para ver el aviso de gracias.
      router.dismissTo({ pathname: '/negocio/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof OffensiveTextError ? 'Tu reseña tiene palabras que no permitimos. Cuéntalo de otra forma.' : 'No pudimos publicar tu reseña. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <BackButton />
      <View style={{ gap: 6 }}>
        {!!businessName && <Text style={styles.business}>{businessName}</Text>}
        <Text style={styles.title} accessibilityRole="header">¿Cómo te fue?</Text>
        <Text style={styles.body}>Tu opinión ayuda a otros viajeros y al negocio a mejorar.</Text>
      </View>
      <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Calificación">
        {([1, 2, 3, 4, 5] as const).map((n) => {
          const on = n <= stars;
          return (
            <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`} accessibilityState={{ checked: stars === n }} onPress={() => { setStars(n); setError(''); }} style={({ pressed }) => [styles.star, on && styles.starOn, pressed && { transform: [{ scale: 0.94 }] }]}>
              <Star size={30} color={on ? colors.star : '#CFC8BB'} fill={on ? colors.star : 'transparent'} strokeWidth={1.8} />
            </Pressable>
          );
        })}
      </View>
      {!!stars && <Text style={styles.label}>{LABELS[stars]}</Text>}
      <TextField label="Cuéntanos más" value={text} onChangeText={setText} multiline maxLength={600} placeholder="¿Qué compraste o pediste? ¿Era como en la foto?" />
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Publicar reseña" onPress={submit} loading={loading} />
      <Text style={styles.note}>Al publicar, el negocio puede responder tu comentario.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  business: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted },
  title: { fontFamily: fonts.hero, fontSize: 38, lineHeight: 41, letterSpacing: -1.2, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 16.5, lineHeight: 24, color: colors.textMuted },
  stars: { flexDirection: 'row', gap: 10 },
  star: { flex: 1, aspectRatio: 1, maxWidth: 64, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  starOn: { borderColor: colors.star, backgroundColor: '#FFF6DF' },
  label: { fontFamily: fonts.display, fontSize: 20, color: colors.starText, marginTop: -6 },
  error: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.danger },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
