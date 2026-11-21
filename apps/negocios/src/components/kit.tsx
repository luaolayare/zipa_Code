// Piezas visuales de la app de negocios: tipografía, píldoras de estado y pequeños bloques.
import { colors, fonts, typography, type BusinessStatus, type BusinessType, radius, spacing } from '@zipa/shared';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Escala tipográfica de la app de negocios: la compartida (`typography` en @zipa/shared) más `error`
 * (label en rojo) y `help` (párrafo de ayuda en gris, tamaño de lectura).
 */
export const type = StyleSheet.create({
  ...typography,
  error: { ...typography.label, color: colors.danger },
  /** Párrafo de ayuda: tamaño de lectura (16) en gris. */
  help: { ...typography.body, color: colors.textMuted },
});

const STATUS: Record<BusinessStatus, { label: string; bg: string; fg: string; dot: string }> = {
  borrador: { label: 'Registro sin terminar', bg: colors.neutralSoft, fg: colors.textBody, dot: colors.textMuted },
  en_revision: { label: 'En revisión', bg: colors.warningSoft, fg: colors.accentText, dot: colors.accentText },
  publicado: { label: 'Publicado: visible para clientes', bg: colors.successSoft, fg: colors.success, dot: colors.success },
  rechazado: { label: 'No aprobado', bg: colors.dangerSoft, fg: colors.danger, dot: colors.danger },
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
  const t = { info: [colors.infoSoft, colors.primary], warn: [colors.warningSoft, colors.accentText], success: [colors.successSoft, colors.success], danger: [colors.dangerSoft, colors.danger] }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t[0] }, style]}>
      {typeof children === 'string' ? <Text style={[styles.noticeText, { color: t[1] }]}>{children}</Text> : children}
    </View>
  );
}

export function SectionTitle({ title, action, style }: { title: string; action?: ReactNode; style?: TextStyle }) {
  return (
    <View style={styles.section}>
      <Text style={[type.heading, style]} accessibilityRole="header">{title}</Text>
      {action}
    </View>
  );
}

export const BUSINESS_TYPES: { id: BusinessType; title: string; description: string }[] = [
  { id: 'emprendimiento', title: 'Emprendimiento local', description: 'Pequeño o nuevo: puesto, local o venta desde casa' },
  { id: 'establecido', title: 'Clásico de la zona', description: 'Con trayectoria: muchos años en la zona' },
];

/** Iniciales para el logo del negocio: "Arepas Mamá Inés" → "AM". */
export const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'Z';

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  pillText: { ...typography.label, fontFamily: fonts.bold },
  notice: { borderRadius: radius.lg, padding: spacing.md },
  noticeText: { ...typography.body, fontFamily: fonts.medium },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
