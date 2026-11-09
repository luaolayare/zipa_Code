import { colors, fonts } from '@zipa/shared';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Compass, Store, User, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { openNegociosApp } from '@/lib/negocios';

const TABS: Record<string, { label: string; Icon: LucideIcon }> = {
  explorar: { label: 'Explorar', Icon: Compass },
  perfil: { label: 'Perfil', Icon: User },
};

/** Barra inferior: Explorar, ¿Tienes negocio? (abre la app de negocios) y Perfil. */
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

  const [explorar, perfil] = ['explorar', 'perfil'].map((name) => {
    const index = state.routes.findIndex((r) => r.name === name);
    const route = state.routes[index];
    const { label, Icon } = TABS[name];
    return route ? tab(route.key, label, Icon, state.index === index, () => navigateToTab(route.key)) : null;
  });

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { height: 72 + insets.bottom, paddingBottom: insets.bottom }]}>
      {explorar}
      {tab('negocio', '¿Tienes negocio?', Store, false, openNegociosApp)}
      {perfil}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 12, fontFamily: fonts.bold },
});
