// Logo del negocio: muestra el actual (o las iniciales) y deja elegir otro o quitarlo.
import { colors, fonts } from '@zipa/shared';
import { ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { initials, type } from './kit';
import { pickPhoto } from './media';
import type { LocalFile } from '@zipa/shared';

export function LogoPicker({
  name,
  uri,
  busy = false,
  onPick,
  onRemove,
}: {
  name: string;
  uri: string | null;
  busy?: boolean;
  onPick: (file: LocalFile) => void;
  onRemove?: () => void;
}) {
  const [error, setError] = useState('');
  const choose = async () => {
    const r = await pickPhoto();
    if (!r) return;
    if ('error' in r) return setError(r.error);
    setError('');
    onPick(r.file);
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.label}>Logo del negocio <Text style={styles.optional}>(opcional)</Text></Text>
      <View style={styles.row}>
        <View style={styles.logo} accessibilityLabel={uri ? `Logo de ${name || 'tu negocio'}` : 'Sin logo'}>
          {uri ? <Image source={{ uri }} style={styles.image} resizeMode="cover" /> : <Text style={styles.initials}>{initials(name)}</Text>}
          {busy && <View style={styles.busy}><ActivityIndicator color="#FFFFFF" /></View>}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={choose} disabled={busy} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
            <ImagePlus size={20} color={colors.text} />
            <Text style={styles.buttonText}>{uri ? 'Cambiar logo' : 'Elegir logo'}</Text>
          </Pressable>
          {!!uri && onRemove && (
            <Pressable accessibilityRole="button" onPress={onRemove} disabled={busy} style={({ pressed }) => [styles.remove, pressed && { opacity: 0.8 }]}>
              <Trash2 size={16} color={colors.danger} />
              <Text style={styles.removeText}>Quitar logo</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Text style={type.small}>Se ve en tu ficha y en las listas de la app. Mejor si es cuadrado y con buena luz.</Text>
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  optional: { fontFamily: fonts.regular, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 96, height: 96, borderRadius: 26, backgroundColor: colors.stage3d, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', height: '100%' },
  initials: { fontFamily: fonts.display, fontSize: 34, color: colors.text, letterSpacing: -0.5 },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,33,31,0.45)', alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 50, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  buttonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  remove: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  removeText: { fontFamily: fonts.bold, fontSize: 14, color: colors.danger },
});
