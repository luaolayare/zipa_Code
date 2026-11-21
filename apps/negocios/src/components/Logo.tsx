import { Logo as BrandLogo } from '@zipa/shared';

/** "LocalmenteTuyo Negocios" con el logo compartido. `light`: sobre fondo oscuro. */
export function Logo({ light = false }: { light?: boolean }) {
  return <BrandLogo size={46} suffix="Negocios" tone={light ? 'light' : 'dark'} />;
}
