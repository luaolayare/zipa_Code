// Municipio del negocio (con el estado de cada ciudad) y punto del local en el mapa.
// El punto solo se toma cuando la persona lo pide estando en su local; no se inventa ni se usa la
// ubicación del dueño sin que la confirme.
import {
  ESTADO_CIUDAD_TEXTO,
  buscarMunicipios,
  colors,
  distanciaKm,
  estadoDe,
  etiquetaMunicipio,
  fonts,
  municipio as municipioPorCodigo,
  radius,
  sizes,
  spacing,
  typography,
  useAuth,
  type EstadoCiudad,
  type Municipio,
} from '@zipa/shared';
import * as Location from 'expo-location';
import { Check, LocateFixed, MapPin, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type } from './kit';

/** Estados comerciales de las ciudades (las no configuradas son «próximamente»). */
export function useEstadosCiudades() {
  const { api } = useAuth();
  const [estados, setEstados] = useState<Map<string, EstadoCiudad> | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vivo = true;
    api
      .listCityStatuses()
      .then((l) => { if (vivo) { setEstados(new Map(l.map((c) => [c.codigo, c.estado]))); setError(false); } })
      .catch(() => { if (vivo) setError(true); });
    return () => { vivo = false; };
  }, [api, intento]);
  const recargar = useCallback(() => { setError(false); setIntento((n) => n + 1); }, []);
  const activas = useMemo(() => (estados ? [...estados].filter(([, e]) => e === 'activa').map(([c]) => c) : []), [estados]);
  return { estados, error, recargar, activas, estadoDe: (c: string) => (estados ? estadoDe(c, estados) : null) };
}

/** Buscador de municipios: las ciudades activas primero y el estado de cada una. */
export function MunicipioPicker({ value, onPick, ciudades }: { value: string | null; onPick: (m: Municipio) => void; ciudades: ReturnType<typeof useEstadosCiudades> }) {
  const [texto, setTexto] = useState('');
  const resultados = useMemo(() => buscarMunicipios(texto, 20, ciudades.activas), [texto, ciudades.activas]);
  const sugeridas = useMemo(() => ciudades.activas.map((c) => municipioPorCodigo(c)).filter((m): m is Municipio => !!m), [ciudades.activas]);
  const lista = texto.trim().length >= 2 ? resultados : sugeridas;
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.search}>
        <Search size={18} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          accessibilityLabel="Buscar municipio"
          placeholder="Escribe tu municipio"
          placeholderTextColor={colors.textMuted}
          value={texto}
          onChangeText={setTexto}
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {texto.trim().length < 2 && sugeridas.length > 0 && <Text style={styles.label}>Ciudades donde ya estamos</Text>}
      {texto.trim().length >= 2 && resultados.length === 0 && (
        <Text style={type.help}>No encontramos ese municipio. Revisa cómo está escrito; también puedes escribir el departamento.</Text>
      )}
      {ciudades.error && (
        <Text style={type.error} accessibilityRole="alert" onPress={ciudades.recargar}>
          No pudimos cargar la información de las ciudades. Toca aquí para intentar de nuevo.
        </Text>
      )}
      {lista.map((m) => {
        const estado = ciudades.estadoDe(m.codigo);
        const activa = estado === 'activa';
        const elegido = value === m.codigo;
        return (
          <Pressable
            key={m.codigo}
            accessibilityRole="button"
            accessibilityState={{ selected: elegido }}
            accessibilityLabel={`${etiquetaMunicipio(m)}${estado ? `, ${activa ? 'disponible' : ESTADO_CIUDAD_TEXTO[estado].toLowerCase()}` : ''}`}
            onPress={() => onPick(m)}
            style={({ pressed }) => [styles.row, elegido && styles.rowOn, pressed && { opacity: 0.85 }]}>
            <MapPin size={18} color={activa ? colors.primary : colors.textMuted} strokeWidth={2} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowName}>{m.nombre}</Text>
              {m.departamento !== m.nombre && <Text style={styles.rowDept}>{m.departamento}</Text>}
            </View>
            {estado && <Text style={[styles.badge, activa ? styles.badgeOn : styles.badgeOff]}>{activa ? 'Disponible' : ESTADO_CIUDAD_TEXTO[estado]}</Text>}
            {elegido && <Check size={18} color={colors.primary} strokeWidth={2.6} />}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Distancia máxima entre el punto del local y la cabecera de su municipio para aceptarlo (km). */
export const DISTANCIA_MAXIMA_KM = 40;

/**
 * Punto del local (opcional): solo con la persona en el local y tocando el botón. Se revisa que quede
 * cerca del municipio elegido; si no, no se guarda.
 */
export function PuntoDelLocal({ municipioCodigo, latitud, longitud, onChange }: {
  municipioCodigo: string;
  latitud: number | null;
  longitud: number | null;
  onChange: (p: { latitud: number | null; longitud: number | null }) => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const muni = municipioPorCodigo(municipioCodigo);

  const tomar = async () => {
    setError('');
    setCargando(true);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) return setError('Sin permiso de ubicación no podemos tomar el punto. Puedes darlo en los ajustes del celular o dejar este paso para después.');
      if (!(await Location.hasServicesEnabledAsync())) return setError('La ubicación de tu celular está desactivada. Actívala e inténtalo de nuevo.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      if (muni && distanciaKm(latitude, longitude, muni.latitud, muni.longitud) > DISTANCIA_MAXIMA_KM) {
        return setError(`Ese punto queda lejos de ${muni.nombre}. Tómalo cuando estés en tu local, o revisa el municipio.`);
      }
      onChange({ latitud: Math.round(latitude * 1e5) / 1e5, longitud: Math.round(longitude * 1e5) / 1e5 });
    } catch {
      setError('No pudimos obtener tu ubicación. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const tiene = latitud != null && longitud != null;
  return (
    <View style={styles.box}>
      <Text style={type.label}>Punto del local en el mapa (opcional)</Text>
      <Text style={type.help}>
        {tiene
          ? 'Listo: los clientes llegarán a este punto con «Cómo llegar».'
          : 'Si estás en tu local, toca el botón y guardamos ese punto para «Cómo llegar». Si no estás ahí, déjalo para después.'}
      </Text>
      {tiene && (
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`)} hitSlop={6}>
          <Text style={styles.link}>Ver el punto en el mapa</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" onPress={tomar} disabled={cargando} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
        {cargando ? <ActivityIndicator color={colors.primary} /> : <LocateFixed size={18} color={colors.primary} strokeWidth={2.2} />}
        <Text style={styles.btnText}>{tiene ? 'Tomar el punto de nuevo' : 'Estoy en el local: usar mi ubicación'}</Text>
      </Pressable>
      {tiene && (
        <Pressable accessibilityRole="button" onPress={() => onChange({ latitud: null, longitud: null })} hitSlop={6}>
          <Text style={styles.remove}>Quitar el punto</Text>
        </Pressable>
      )}
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: sizes.input, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { flex: 1, minWidth: 0, alignSelf: 'stretch', fontSize: typography.body.fontSize, fontFamily: fonts.regular, color: colors.text, padding: 0, outlineWidth: 0 },
  label: { ...typography.label, fontFamily: fonts.bold, color: colors.textBody },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: sizes.touchMin + 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowOn: { borderColor: colors.primary, borderWidth: 1.5 },
  rowName: { ...typography.subtitle, color: colors.text },
  rowDept: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted },
  badge: { ...typography.caption, fontFamily: fonts.bold, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  badgeOn: { backgroundColor: colors.primary, color: '#FFFFFF' },
  badgeOff: { backgroundColor: colors.chipIdle, color: colors.textBody },
  box: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  link: { ...typography.label, fontFamily: fonts.bold, color: colors.primary, textDecorationLine: 'underline' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: sizes.button, marginTop: spacing.xs, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: spacing.md },
  btnText: { ...typography.subtitle, color: colors.primary, textAlign: 'center' },
  remove: { ...typography.label, color: colors.danger, textAlign: 'center' },
});
