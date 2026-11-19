// Piezas del panel: estadísticas, fila de producto y reseña con respuesta.
import { Button, OffensiveTextError, TextField, colors, fonts, formatCop, productVideoState, useAuth, type Product, type Review, PlateArt, availabilityLabels, type Classified } from '@zipa/shared';
import { BadgeCheck, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { type } from './kit';

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={type.number}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const STATE = {
  aprobado: { label: 'Video aprobado', color: colors.success },
  pendiente: { label: 'Video en revisión', color: colors.accentText },
  rechazado: { label: 'Video no aprobado', color: colors.danger },
  sin_video: { label: 'Solo foto', color: colors.textMuted },
};

export function ProductRow({ product, business, onPress, onToggleAvailable }: { product: Product; business: Classified; onPress: () => void; onToggleAvailable?: () => void }) {
  const labels = availabilityLabels(business);
  const s = STATE[productVideoState(product)];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${product.name}, ${formatCop(product.priceCop)}, ${s.label}. Editar`} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View style={styles.thumb}>
        {product.photoUrl ? <Image source={{ uri: product.photoUrl }} style={styles.thumbImg} /> : <PlateArt of={business} size={64} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={type.h3} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.price}>{formatCop(product.priceCop)}{product.section ? ` · ${product.section}` : ''}</Text>
        {onToggleAvailable && (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: product.available }}
            accessibilityLabel={`${product.name}: ${labels.on.toLowerCase()}`}
            onPress={onToggleAvailable}
            hitSlop={6}
            style={[styles.avail, product.available ? styles.availOn : styles.availOff]}>
            <Text style={[styles.availText, { color: product.available ? colors.success : colors.danger }]}>
              {product.available ? labels.on : labels.off}
            </Text>
          </Pressable>
        )}
        <View style={styles.stateRow}>
          <View style={[styles.stateDot, { backgroundColor: s.color }]} />
          <Text style={[styles.state, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const Stars = ({ n }: { n: number }) => (
  <Text style={styles.stars} accessibilityLabel={`${n} de 5 estrellas`}>{'★'.repeat(n)}<Text style={{ color: '#D8D2C6' }}>{'★'.repeat(5 - n)}</Text></Text>
);

export function ReviewItem({ review, onReplied }: { review: Review; onReplied: (reply: string | null) => void }) {
  const { api } = useAuth();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.reply ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!text.trim()) return setError('Escribe tu respuesta.');
    setSaving(true);
    setError('');
    try {
      await api.replyToReview(review.id, text);
      onReplied(text.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof OffensiveTextError ? 'Tu respuesta tiene palabras que no permitimos. Escríbela de otra forma.' : e instanceof Error ? e.message : 'No pudimos publicar tu respuesta.');
    } finally {
      setSaving(false);
    }
  };

  const date = new Date(review.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

  return (
    <View style={styles.review}>
      <View style={styles.reviewTop}>
        <Text style={[type.h3, { flex: 1 }]} numberOfLines={1}>{review.authorName}</Text>
        <Stars n={review.stars} />
      </View>
      {review.visited && (
        <View style={styles.visited}><BadgeCheck size={15} color={colors.success} /><Text style={styles.visitedText}>Visitó el negocio</Text></View>
      )}
      <Text style={styles.reviewText}>{review.text}</Text>
      {!!review.photoUrl && <Image source={{ uri: review.photoUrl }} style={styles.reviewPhoto} accessibilityLabel={`Foto de ${review.authorName}`} />}
      <Text style={type.small}>{date}</Text>

      {review.reply && !editing ? (
        <View style={styles.reply}>
          <Text style={styles.replyLabel}>Tu respuesta</Text>
          <Text style={styles.replyText}>{review.reply}</Text>
          <Pressable accessibilityRole="button" onPress={() => { setText(review.reply ?? ''); setEditing(true); }} hitSlop={6}>
            <Text style={styles.link}>Editar respuesta</Text>
          </Pressable>
        </View>
      ) : editing ? (
        <View style={{ gap: 12 }}>
          <TextField label="Tu respuesta" value={text} onChangeText={setText} multiline maxLength={500} placeholder="Gracias por tu visita…" autoFocus />
          {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
          <Button title="Publicar respuesta" onPress={save} loading={saving} />
          <Button title="Cancelar" variant="link" onPress={() => { setEditing(false); setError(''); }} />
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={({ pressed }) => [styles.replyButton, pressed && { opacity: 0.8 }]}>
          <Text style={styles.replyButtonText}>Responder</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, padding: 16, gap: 4, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  statLabel: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 70, height: 70, borderRadius: 16, backgroundColor: colors.stage3d, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  price: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stateDot: { width: 7, height: 7, borderRadius: 4 },
  state: { fontFamily: fonts.bold, fontSize: 13.5 },
  review: { padding: 18, gap: 10, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stars: { fontSize: 18, color: colors.starText, letterSpacing: 1 },
  visited: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  visitedText: { fontFamily: fonts.bold, fontSize: 13, color: colors.success },
  reviewPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: colors.stage3d },
  reviewText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textBody },
  reply: { gap: 6, padding: 14, borderRadius: 16, backgroundColor: colors.background, borderLeftWidth: 4, borderLeftColor: colors.primary },
  replyLabel: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.primary },
  replyText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textBody },
  link: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.primary, textDecorationLine: 'underline' },
  replyButton: { alignSelf: 'flex-start', minHeight: 46, paddingHorizontal: 22, justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: colors.border },
  replyButtonText: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  avail: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5 },
  availOn: { borderColor: colors.success, backgroundColor: '#DCEFE2' },
  availOff: { borderColor: colors.danger, backgroundColor: '#F9DED6' },
  availText: { fontFamily: fonts.bold, fontSize: 13 },
});
