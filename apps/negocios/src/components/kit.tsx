// Piezas visuales de la app de negocios: tipografía, píldoras de estado y pequeños bloques.
import { colors, fonts, type BusinessStatus, type BusinessType } from '@zipa/shared';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

/** Escala tipográfica: Bricolage Grotesque para títulos, DM Sans para texto. */
export const type = StyleSheet.create({
  hero: { fontFamily: fonts.hero, fontSize: 40, lineHeight: 42, letterSpacing: -1.2, color: colors.text },
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.8, color: colors.text },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.4, color: colors.text },
  h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  strong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.text },
  overline: { fontFamily: fonts.bold, fontSize: 12.5, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textMuted },
  number: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: colors.text },
  error: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 20, color: colors.danger },
});

const STATUS: Record<BusinessStatus, { label: string; bg: string; fg: string; dot: string }> = {
  borrador: { label: 'Registro sin terminar', bg: '#ECE7DE', fg: colors.textBody, dot: colors.textMuted },
  en_revision: { label: 'En revisión', bg: colors.accentSoft, fg: colors.accentText, dot: colors.accentText },
  publicado: { label: 'Publicado: visible para clientes', bg: colors.primarySoft, fg: colors.primary, dot: colors.primary },
  rechazado: { label: 'No aprobado', bg: '#F9DED6', fg: colors.danger, dot: colors.danger },
};

export function StatusPill({ status }: { status: BusinessStatus }) {
  const s = STATUS[status];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]} accessibilityLabel={`Estado: ${s.label}`}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

/** Aviso de color suave (información, éxito o advertencia). */
export function Notice({ tone = 'info', children, style }: { tone?: 'info' | 'warn' | 'success' | 'danger'; children: ReactNode; style?: ViewStyle }) {
  const t = { info: [colors.primarySoft, colors.primary], warn: [colors.accentSoft, colors.accentText], success: ['#DCEFE2', colors.success], danger: ['#F9DED6', colors.danger] }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t[0] }, style]}>
      {typeof children === 'string' ? <Text style={[styles.noticeText, { color: t[1] }]}>{children}</Text> : children}
    </View>
  );
}

export function SectionTitle({ title, action, style }: { title: string; action?: ReactNode; style?: TextStyle }) {
  return (
    <View style={styles.section}>
      <Text style={[type.h2, style]} accessibilityRole="header">{title}</Text>
      {action}
    </View>
  );
}

export const BUSINESS_TYPES: { id: BusinessType; title: string; description: string }[] = [
  { id: 'emprendimiento', title: 'Emprendimiento local', description: 'Pequeño o nuevo: puesto, local o venta desde casa' },
  { id: 'establecido', title: 'Clásico de la zona', description: 'Con trayectoria: muchos años en Zipaquirá' },
];

/** Iniciales para el logo del negocio: "Arepas Mamá Inés" → "AM". */
export const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'Z';

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontFamily: fonts.bold, fontSize: 14 },
  notice: { borderRadius: 20, padding: 16 },
  noticeText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
