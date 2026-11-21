import { colors, fonts, spacing, typography } from '@zipa/shared';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { House, Store, User, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const TABS: Record<string, { label: string; Icon: LucideIcon }> = {
  explorar: { label: 'Inicio', Icon: House },
  negocio: { label: '¿Tienes negocio?', Icon: Store },
  perfil: { label: 'Perfil', Icon: User },
};

/** Barra inferior: Inicio, ¿Tienes negocio? y Perfil. */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const tab = (key: string, label: string, Icon: LucideIcon, active: boolean, onPress: () => void) => {
    const color = active ? colors.primary : colors.textMuted;
    return (
      <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.tab}>
        <Icon size={22} color={color} strokeWidth={2} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Pressable>
    );
  };

  const tabs = ['explorar', 'negocio', 'perfil'].map((name) => {
    const index = state.routes.findIndex((r) => r.name === name);
    const route = state.routes[index];
    const { label, Icon } = TABS[name];
    return route ? tab(route.key, label, Icon, state.index === index, () => navigateToTab(route.key)) : null;
  });

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { minHeight: 72 + insets.bottom, paddingBottom: insets.bottom }]}>
      {tabs}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  // Arriba (no centrado): con letra grande «¿Tienes negocio?» ocupa dos líneas y los íconos siguen alineados.
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: spacing.xxs, paddingTop: spacing.sm, paddingBottom: spacing.xs, paddingHorizontal: spacing.xxs },
  label: { ...typography.caption, fontFamily: fonts.bold, textAlign: 'center' },
});
