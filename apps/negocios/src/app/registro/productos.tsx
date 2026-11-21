import { Button, Card, colors, fonts, formatCop, useAuth, PlateArt, productWord, restaurantOf, radius, spacing, typography } from '@zipa/shared';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { type } from '@/components/kit';
import { Page } from '@/components/Page';

import { ProductEditor, emptyProductForm, priceFrom, productFormError, type ProductForm } from '@/components/ProductEditor';
import { useRegistro } from '@/components/RegistroContext';
import { StepHeader } from '@/components/StepHeader';

// Paso 4: productos. Cada uno lleva foto y, si se puede, un video de ~20 s.
export default function Productos() {
  const { draft, update } = useRegistro();
  const { api } = useAuth();
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [error, setError] = useState('');
  const comer = restaurantOf(draft);
  const word = productWord(draft);
  const count = draft.products.length;

  const add = () => {
    const e = productFormError(form, word);
    if (e) return setError(e);
    update({ products: [...draft.products, { form, savedId: null }] });
    setForm(emptyProductForm);
    setError('');
  };

  const remove = (i: number) => update({ products: draft.products.filter((_, j) => j !== i) });

  const next = async () => {
    if (form.name.trim()) return setError(`Tienes un ${word} sin agregar. Toca "Agregar" o borra el nombre.`);
    // Al retomar un registro, los productos que ya se guardaron cuentan.
    const saved = count === 0 && draft.businessId ? (await api.myProducts(draft.businessId).catch(() => [])).length : 0;
    if (count === 0 && saved === 0) return setError(`Agrega al menos un ${word}.`);
    setError('');
    router.push('/registro/vista-previa');
  };

  return (
    <Page>
      <StepHeader step={4} title={comer ? 'Tu menú' : 'Tu catálogo'} />
      <Text style={type.body}>
        Sube al menos un {word} con su foto. Si grabas un video de unos 20 segundos mostrándolo, el equipo lo revisa y, al aprobarlo, los clientes lo ven en tu vitrina.
      </Text>

      {draft.products.map((p, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.thumb}>
            {p.form.photo ? <Image source={{ uri: p.form.photo.uri }} style={styles.thumbImg} /> : <PlateArt of={draft} size={64} />}
          </View>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text style={type.subtitle} numberOfLines={1}>{p.form.name}</Text>
            <Text style={styles.meta}>{formatCop(priceFrom(p.form.price))} · {p.form.video ? 'Con video' : 'Solo foto'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${p.form.name}`} onPress={() => remove(i)} hitSlop={8} style={styles.trash}>
            <Trash2 size={20} color={colors.danger} />
          </Pressable>
        </View>
      ))}

      <Card style={styles.editor}>
        <Text style={type.heading}>{count === 0 ? `Tu primer ${word}` : `Otro ${word}`}</Text>
        <ProductEditor value={form} onChange={(f) => { setForm(f); setError(''); }} business={draft} />
        <Button title={count === 0 ? `Agregar ${word}` : `Agregar otro ${word}`} variant="primary" onPress={add} />
      </Card>

      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Ver cómo quedó" variant="accent" onPress={next} />
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 68, height: 68, borderRadius: radius.lg, backgroundColor: colors.stage3d, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  meta: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  editor: { padding: spacing.lg, gap: spacing.lg },
});
