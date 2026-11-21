// Elegir la ciudad que se explora: las disponibles primero, búsqueda por nombre y «Usar mi ubicación»
// (el permiso se pide solo al tocarlo). Elegir una ciudad que aún no abre muestra «Próximamente».
import {
  ESTADO_CIUDAD_TEXTO,
  buscarMunicipios,
  colors,
  etiquetaMunicipio,
  fonts,
  radius,
  sizes,
  spacing,
  typography,
  type Municipio,
} from '@zipa/shared';
import { router } from 'expo-router';
import { Check, LocateFixed, MapPin, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCiudad, type ResultadoUbicacion } from '@/lib/ciudad';

const MENSAJE_UBICACION: Record<Exclude<ResultadoUbicacion['tipo'], 'ok'>, string> = {
  denegado: 'No tenemos permiso para ver tu ubicación. Puedes buscar tu ciudad por nombre o darnos permiso en los ajustes del celular.',
  desactivada: 'La ubicación de tu celular está desactivada. Actívala o busca tu ciudad por nombre.',
  fuera_de_colombia: 'Parece que estás fuera de Colombia. Busca por nombre la ciudad que quieres explorar.',
  error: 'No pudimos saber dónde estás. Revisa tu conexión e inténtalo de nuevo, o busca tu ciudad por nombre.',
};

export default function ElegirCiudad() {
  const insets = useSafeAreaInsets();
  const ciudad = useCiudad();
  const [texto, setTexto] = useState('');
  const [ubicando, setUbicando] = useState(false);
  const [aviso, setAviso] = useState<Exclude<ResultadoUbicacion['tipo'], 'ok'> | null>(null);

  const activas = ciudad.activas;
  const resultados = useMemo(() => buscarMunicipios(texto, 20, activas.map((m) => m.codigo)), [texto, activas]);

  const elegir = (m: Municipio, origen: 'manual' | 'ubicacion' = 'manual') => {
    ciudad.elegir(m.codigo, origen);
    if (router.canGoBack()) router.back();
    else router.replace('/explorar');
  };

  const usarUbicacion = async () => {
    setAviso(null);
    setUbicando(true);
    const r = await ciudad.ubicar();
    setUbicando(false);
    if (r.tipo === 'ok') elegir(r.municipio, 'ubicacion');
    else setAviso(r.tipo);
  };

  const fila = (m: Municipio) => {
    const estado = ciudad.estadoDe(m.codigo);
    const activa = estado === 'activa';
    const actual = m.codigo === ciudad.codigo;
    return (
      <Pressable
        key={m.codigo}
        accessibilityRole="button"
        accessibilityLabel={`${etiquetaMunicipio(m)}${estado ? `, ${activa ? 'disponible' : ESTADO_CIUDAD_TEXTO[estado].toLowerCase()}` : ''}${actual ? ', ciudad actual' : ''}`}
        onPress={() => elegir(m)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <MapPin size={18} color={activa ? colors.primary : colors.textMuted} strokeWidth={2} />
        <View style={styles.rowText}>
          <Text style={styles.rowName}>{m.nombre}</Text>
          {m.departamento !== m.nombre && <Text style={styles.rowDept}>{m.departamento}</Text>}
        </View>
        {estado && (
          <Text style={[styles.badge, activa ? styles.badgeOn : styles.badgeOff]}>{activa ? 'Disponible' : ESTADO_CIUDAD_TEXTO[estado]}</Text>
        )}
        {actual && <Check size={18} color={colors.primary} strokeWidth={2.6} />}
      </Pressable>
    );
  };

  const buscando = texto.trim().length >= 2;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text style={styles.title} accessibilityRole="header">Elige tu ciudad</Text>
          <Text style={styles.sub}>Verás los negocios de la ciudad que elijas. Puedes cambiarla cuando quieras.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/explorar'))} style={styles.close} hitSlop={8}>
          <X size={20} color={colors.text} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.search}>
        <Search size={18} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          accessibilityLabel="Buscar municipio"
          placeholder="Busca tu municipio"
          placeholderTextColor={colors.textMuted}
          value={texto}
          onChangeText={setTexto}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={usarUbicacion} disabled={ubicando} style={({ pressed }) => [styles.locate, pressed && styles.pressed]}>
          {ubicando ? <ActivityIndicator color={colors.primary} /> : <LocateFixed size={20} color={colors.primary} strokeWidth={2.2} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.locateTitle}>{ubicando ? 'Buscando tu ciudad…' : 'Usar mi ubicación'}</Text>
            <Text style={styles.locateText}>Solo para sugerirte la ciudad. No guardamos tu ubicación.</Text>
          </View>
        </Pressable>
        {aviso && (
          <View style={styles.notice} accessibilityRole="alert">
            <Text style={styles.noticeText}>{MENSAJE_UBICACION[aviso]}</Text>
            {aviso === 'denegado' && (
              <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} hitSlop={6}>
                <Text style={styles.link}>Abrir ajustes</Text>
              </Pressable>
            )}
          </View>
        )}

        {buscando ? (
          <>
            <Text style={styles.label}>{resultados.length ? 'Resultados' : 'No encontramos ese municipio'}</Text>
            {resultados.length === 0 && <Text style={styles.help}>Revisa cómo está escrito. También puedes escribir el departamento, por ejemplo «Armenia Quindío».</Text>}
            {resultados.map(fila)}
          </>
        ) : (
          <>
            <Text style={styles.label}>Disponibles ahora</Text>
            {ciudad.estadosError ? (
              <View style={styles.notice} accessibilityRole="alert">
                <Text style={styles.noticeText}>No pudimos cargar la información. Revisa tu conexión e inténtalo de nuevo.</Text>
                <Pressable accessibilityRole="button" onPress={ciudad.recargarEstados} hitSlop={6}>
                  <Text style={styles.link}>Intentar de nuevo</Text>
                </Pressable>
              </View>
            ) : activas.length === 0 ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} accessibilityLabel="Cargando ciudades" />
            ) : (
              activas.map(fila)
            )}
            <Text style={styles.help}>¿Tu ciudad no aparece? Búscala por nombre: te contamos cuándo llegaremos.</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingHorizontal: spacing.lg },
  title: { ...typography.display, color: colors.text },
  sub: { ...typography.body, color: colors.textMuted },
  close: { width: sizes.touchMin, height: sizes.touchMin, borderRadius: radius.pill, backgroundColor: colors.chipIdle, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: sizes.input, marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { flex: 1, minWidth: 0, alignSelf: 'stretch', fontSize: typography.body.fontSize, fontFamily: fonts.regular, color: colors.text, padding: 0, outlineWidth: 0 },
  list: { padding: spacing.lg, gap: spacing.sm },
  locate: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  locateTitle: { ...typography.subtitle, color: colors.primary },
  locateText: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted },
  notice: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.warningSoft },
  noticeText: { ...typography.body, color: colors.text },
  link: { ...typography.label, fontFamily: fonts.bold, color: colors.primary },
  label: { ...typography.label, fontFamily: fonts.bold, color: colors.textBody, marginTop: spacing.sm },
  help: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: sizes.touchMin + 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { ...typography.subtitle, color: colors.text },
  rowDept: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted },
  badge: { ...typography.caption, fontFamily: fonts.bold, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  badgeOn: { backgroundColor: colors.primary, color: '#FFFFFF' },
  badgeOff: { backgroundColor: colors.chipIdle, color: colors.textBody },
  pressed: { opacity: 0.85 },
});
