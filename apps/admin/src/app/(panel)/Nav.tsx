'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Nav({ negocios, videos, reportes }: { negocios: number; videos: number; reportes: number }) {
  const path = usePathname();
  const item = (href: string, label: string, count?: number) => {
    const active = href === '/' ? path === '/' : path.startsWith(href);
    return (
      <Link href={href} aria-current={active ? 'page' : undefined}>
        {label}
        {!!count && <span className="count" aria-label={`${count} pendientes`}>{count}</span>}
      </Link>
    );
  };
  return (
    <nav className="nav" aria-label="Secciones">
      {item('/', 'Resumen')}
      {item('/negocios', 'Negocios', negocios)}
      {item('/videos', 'Videos', videos)}
      {item('/reportes', 'Reportes', reportes)}
      {item('/bitacora', 'Bitácora')}
    </nav>
  );
}
