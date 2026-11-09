import { Button, Screen, TextField, colors, useAuth, type Review } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function Calificar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const [stars, setStars] = useState<Review['stars'] | 0>(0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) return router.replace('/login');
    if (!stars) return setError('Elige de 1 a 5 estrellas.');
    setLoading(true);
    try {
      await api.createReview(id, user.id, user.name, stars, text.trim());
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tu reseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Button variant="link" title="‹ Volver" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Text style={styles.title}>¿Cómo te fue?</Text>
      <View style={styles.stars} accessibilityRole="radiogroup">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`${n} estrellas`} accessibilityState={{ checked: stars === n }} onPress={() => setStars(n)} style={styles.star}>
            <Text style={[styles.starText, n <= stars && styles.starOn]}>★</Text>
          </Pressable>
        ))}
      </View>
      <TextField label="Cuéntanos más" value={text} onChangeText={setText} multiline numberOfLines={5} style={{ minHeight: 120, textAlignVertical: 'top', paddingTop: 12 }} />
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Publicar reseña" onPress={submit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  stars: { flexDirection: 'row', gap: 8 },
  star: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  starText: { fontSize: 28, color: '#D6D0C5' },
  starOn: { color: '#E09A00' },
  error: { color: colors.danger, fontWeight: '600' },
});
