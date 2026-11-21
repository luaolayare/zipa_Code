import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

import { revisarEntornoPanel } from '../../packages/shared/entorno';

// Panel privado del equipo: no se indexa, no se puede incrustar en otros sitios y no filtra la URL.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

// Candado de entornos (packages/shared/entorno.js): el panel en desarrollo nunca usa producción, y
// fuera de desarrollo solo la usa con ZIPA_ENTORNO=produccion. `next typegen` (typecheck) se omite:
// solo genera tipos y no se conecta a nada.
export default function config(phase: string): NextConfig {
  if (process.argv[2] !== 'typegen') revisarEntornoPanel(process.env, { desarrollo: phase === PHASE_DEVELOPMENT_SERVER });
  return nextConfig;
}
