import { businessCover, type Business } from '@zipa/shared';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

/**
 * Portada de color con un círculo al centro, mientras el negocio no tenga foto.
 * `circle` es el diámetro total del círculo, incluido su borde blanco.
 */
export function Cover({ business, circle, ring, style, children }: { business: Business; circle: number; ring: number; style: ViewStyle; children?: ReactNode }) {
  const { cover, inner } = businessCover(business);
  return (
    <View style={[styles.cover, { backgroundColor: cover }, style]}>
      <View style={{ width: circle, height: circle, borderRadius: circle / 2, borderWidth: ring, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: inner }} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { alignItems: 'center', justifyContent: 'center' },
});
