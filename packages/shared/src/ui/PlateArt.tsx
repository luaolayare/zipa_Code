// Ilustración de un plato o producto en perspectiva, con volumen y sombra.
// Se usa mientras un producto no tiene foto ni modelo 3D, para que nada se vea vacío.
import type { Category } from '../types';
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const PALETTES: Record<Category, [string, string, string]> = {
  comer: ['#D9772B', '#F2B134', '#C2381B'],
  artesanias: ['#0F6E6E', '#F2B134', '#C2381B'],
  cafe_dulces: ['#6B4226', '#E8C9A0', '#C2381B'],
};

export function PlateArt({ category, size = 160, seed = 0 }: { category: Category; size?: number; seed?: number }) {
  const [main, light, pop] = PALETTES[category];
  const h = size * 0.72;
  const tilt = (seed % 3) * 6 - 6; // pequeña variación entre productos
  const u = useId().replace(/[^a-zA-Z0-9]/g, ''); // ids únicos: varias ilustraciones en la misma pantalla

  return (
    <View aria-hidden style={{ width: size, height: h }}>
    <Svg width={size} height={h} viewBox="0 0 200 144">
      <Defs>
        <RadialGradient id={`shadow${u}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#0F3D3E" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#0F3D3E" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`plate${u}`} cx="45%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E9E4DA" />
        </RadialGradient>
        <RadialGradient id={`food${u}`} cx="40%" cy="30%" r="75%">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={main} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="100" cy="122" rx="86" ry="16" fill={`url(#shadow${u})`} />
      {category === 'artesanias' ? (
        // Pieza tejida: cilindro con franjas, como una mochila.
        <>
          <Ellipse cx="100" cy="106" rx="70" ry="20" fill="#DED6C8" />
          <Rect x="62" y="38" width="76" height="64" fill={main} />
          <Rect x="62" y="52" width="76" height="9" fill={light} />
          <Rect x="62" y="70" width="76" height="9" fill="#14211F" />
          <Rect x="62" y="86" width="76" height="9" fill={pop} />
          <Ellipse cx="100" cy="102" rx="38" ry="11" fill={main} />
          <Ellipse cx="100" cy="38" rx="38" ry="11" fill={light} />
          <Ellipse cx="100" cy="38" rx="30" ry="7.5" fill="#3B2412" />
          <Path d="M70 36 L74 14 L80 14 L78 36 Z" fill={pop} />
          <Path d="M122 36 L124 14 L130 14 L130 36 Z" fill={pop} />
        </>
      ) : (
        <>
          <Ellipse cx="100" cy="100" rx="84" ry="27" fill="#DCD5C8" />
          <Ellipse cx="100" cy="96" rx="84" ry="27" fill={`url(#plate${u})`} />
          <Ellipse cx="100" cy="96" rx="64" ry="19" fill="#FFFFFF" opacity="0.7" />
          {category === 'cafe_dulces' ? (
            // Taza vista de lado.
            <>
              <Path d="M68 62 L132 62 L126 100 Q100 110 74 100 Z" fill={`url(#food${u})`} />
              <Ellipse cx="100" cy="62" rx="32" ry="9" fill={light} />
              <Ellipse cx="100" cy="62" rx="26" ry="6.5" fill="#3B2412" />
              <Path d="M131 70 Q150 72 146 86 Q142 96 127 92" stroke={main} strokeWidth="6" fill="none" />
            </>
          ) : (
            // Plato servido: porción principal, acompañamiento y salsa.
            <>
              <Ellipse cx={96 + tilt} cy="90" rx="40" ry="14" fill="#9C4F1A" opacity="0.55" />
              <Ellipse cx={96 + tilt} cy="84" rx="40" ry="14" fill={`url(#food${u})`} />
              <Ellipse cx={90 + tilt} cy="80" rx="18" ry="6" fill={light} opacity="0.9" />
              <Ellipse cx="146" cy="96" rx="13" ry="5" fill="#8E2A12" />
              <Ellipse cx="146" cy="93" rx="13" ry="5" fill={pop} />
              <Ellipse cx="58" cy="98" rx="11" ry="4.5" fill="#6E9A3A" />
            </>
          )}
        </>
      )}
    </Svg>
    </View>
  );
}
