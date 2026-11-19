// Ilustración de un plato o producto, con volumen y sombra. Se usa mientras un producto no tiene
// foto, para que nada se vea vacío. El dibujo sale de la subcategoría y los colores de la
// categoría principal (ver visualOf en presentation.ts).
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { MAIN_PALETTES, visualOf, type ArtKind, type Classified } from '../presentation';
import type { MainCategory } from '../types';

export function PlateArt({
  of,
  art: artProp,
  main: mainProp,
  size = 160,
  seed = 0,
}: {
  /** Negocio o borrador: de aquí salen el dibujo y los colores. */
  of?: Classified | null;
  /** O, sin negocio, el dibujo y la categoría directamente (pantallas de bienvenida). */
  art?: ArtKind;
  main?: MainCategory;
  size?: number;
  seed?: number;
}) {
  const v = of ? visualOf(of) : null;
  const art: ArtKind = artProp ?? v?.art ?? 'plato';
  const [main, light, pop] = MAIN_PALETTES[mainProp ?? v?.main ?? 'restaurantes'].art;
  const h = size * 0.72;
  const tilt = (seed % 3) * 6 - 6; // pequeña variación entre productos
  const u = useId().replace(/[^a-zA-Z0-9]/g, ''); // ids únicos: varias ilustraciones en la misma pantalla
  const onPlate = art === 'plato' || art === 'taza' || art === 'postre';

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
        {onPlate && (
          <>
            <Ellipse cx="100" cy="100" rx="84" ry="27" fill="#DCD5C8" />
            <Ellipse cx="100" cy="96" rx="84" ry="27" fill={`url(#plate${u})`} />
            <Ellipse cx="100" cy="96" rx="64" ry="19" fill="#FFFFFF" opacity="0.7" />
          </>
        )}
        {art === 'plato' && (
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
        {art === 'taza' && (
          // Taza de café vista de lado, sobre su plato.
          <>
            <Path d="M68 62 L132 62 L126 100 Q100 110 74 100 Z" fill={`url(#food${u})`} />
            <Ellipse cx="100" cy="62" rx="32" ry="9" fill={light} />
            <Ellipse cx="100" cy="62" rx="26" ry="6.5" fill="#3B2412" />
            <Path d="M131 70 Q150 72 146 86 Q142 96 127 92" stroke={main} strokeWidth="6" fill="none" />
          </>
        )}
        {art === 'postre' && (
          // Pastelito: base acanalada, crema y una cereza.
          <>
            <Path d="M70 70 L130 70 L122 102 Q100 108 78 102 Z" fill={main} />
            <Path d="M80 72 L84 100 M92 72 L94 103 M104 72 L104 104 M116 72 L114 102" stroke={light} strokeWidth="3" />
            <Path d="M64 72 Q66 46 100 42 Q134 46 136 72 Q100 80 64 72 Z" fill="#FBF3E4" />
            <Path d="M76 60 Q100 52 124 60" stroke={light} strokeWidth="4" fill="none" opacity="0.8" />
            <Circle cx="100" cy="38" r="8" fill={pop} />
          </>
        )}
        {art === 'helado' && (
          // Cono con dos bolas de helado (sin plato).
          <>
            <Path d="M78 70 L122 70 L100 126 Z" fill="#D9A55B" />
            <Path d="M84 78 L112 112 M96 74 L116 98 M104 74 L88 110 M116 76 L92 120" stroke="#B9823A" strokeWidth="2.5" />
            <Circle cx="88" cy="58" r="20" fill={light} />
            <Circle cx="112" cy="56" r="20" fill={main} />
            <Circle cx="100" cy="40" r="18" fill="#FBF3E4" />
            <Circle cx="106" cy="24" r="6" fill={pop} />
          </>
        )}
        {art === 'artesania' && (
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
        )}
      </Svg>
    </View>
  );
}
