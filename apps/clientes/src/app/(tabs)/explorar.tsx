import { CATEGORIES, Screen, TextField, categoryLabel, colors, normalize, radius, useAuth, type Business, type Category } from '@zipa/shared';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BusinessRow } from '@/components/BusinessRow';

const byRating = (a: Business, b: Business) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount;

export default function Explorar() {
  const { api, user } = useAuth();
  const [all, setAll] = useState<Business[]>([]);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Category | 'todo'>('todo');

  useEffect(() => {
    api.listBusinesses().then(setAll).catch(() => setAll([]));
  }, [api]);

  // Búsqueda por nombre del restaurante o emprendimiento.
  const results = useMemo(() => {
    const q = normalize(query);
    return q ? all.filter((b) => normalize(b.name).includes(q)) : [];
  }, [all, query]);

  const filtered = cat === 'todo' ? all : all.filter((b) => b.category === cat);

  // Lo más destacado: el mejor de cada categoría, o el top 3 de la categoría elegida.
  const top = useMemo(() => {
    if (cat !== 'todo') return filtered.slice().sort(byRating).slice(0, 3).map((b, i) => ({ b, badge: `Puesto ${i + 1} en ${categoryLabel(cat)}` }));
    return CATEGORIES.map((c) => all.filter((b) => b.category === c.id).sort(byRating)[0])
      .filter((b): b is Business => !!b)
      .map((b) => ({ b, badge: `Mejor en ${categoryLabel(b.category)}` }));
  }, [all, filtered, cat]);

  return (
    <Screen>
      <Text style={styles.hello}>Hola, {user?.name ?? 'viajero'}</Text>
      <Text style={styles.title}>¿Qué quieres descubrir hoy?</Text>
      <TextField label="Buscar" placeholder="Nombre del restaurante o emprendimiento" value={query} onChangeText={setQuery} returnKeyType="search" />

      {query.trim() ? (
        <View style={styles.section}>
          <Text style={styles.meta}>{results.length} resultado(s)</Text>
          {results.map((b) => <BusinessRow key={b.id} business={b} />)}
          {results.length === 0 && <Text style={styles.meta}>No encontramos ese nombre. Revisa cómo está escrito.</Text>}
        </View>
      ) : (
        <>
          <View style={styles.chips}>
            {[{ id: 'todo' as const, label: 'Todo' }, ...CATEGORIES].map((c) => {
              const on = c.id === cat;
              return (
                <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCat(c.id)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.h2}>Lo más destacado</Text>
            {top.map(({ b, badge }) => <BusinessRow key={b.id} business={b} badge={badge} />)}
          </View>

          <View style={styles.section}>
            <Text style={styles.h2}>Emprendimientos del barrio</Text>
            {filtered.filter((b) => b.type === 'emprendimiento').map((b) => <BusinessRow key={b.id} business={b} />)}
          </View>

          <View style={styles.section}>
            <Text style={styles.h2}>Clásicos de la zona</Text>
            {filtered.filter((b) => b.type === 'establecido').map((b) => <BusinessRow key={b.id} business={b} />)}
          </View>
        </>
      )}
      {api.isDemo && <Text style={styles.demo}>Modo demo: datos de ejemplo (Supabase sin configurar).</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 15, fontWeight: '700', color: colors.price },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  section: { gap: 10 },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '700', color: colors.text },
  chipTextOn: { color: '#FFFFFF' },
  demo: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
