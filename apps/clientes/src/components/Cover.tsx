import { businessCover, type Business } from '@zipa/shared';
import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';

/**
 * Portada de color con un círculo al centro, mientras el negocio no tenga foto.
 * `circle` es el diámetro total del círculo, incluido su borde blanco.
 */
export function Cover({ business, circle, ring, style, children }: { business: Business; circle: number; ring: number; style: ViewStyle; children?: ReactNode }) {
  const { cover, inner } = businessCover(business);
  return (
    <View style={[styles.cover, { backgroundColor: cover }, style]}>
      {/* Con logo, el círculo muestra el logo del negocio; sin logo, el color de su categoría. */}
      <View style={{ width: circle, height: circle, borderRadius: circle / 2, borderWidth: ring, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: business.logoUrl ? '#FFFFFF' : inner, overflow: 'hidden' }}>
        {!!business.logoUrl && <Image source={{ uri: business.logoUrl }} style={{ width: '100%', height: '100%' }} accessibilityLabel={`Logo de ${business.name}`} />}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { alignItems: 'center', justifyContent: 'center' },
});
