'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Nav({ negocios, videos, resenas, reportes }: { negocios: number; videos: number; resenas: number; reportes: number }) {
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
      {item('/analitica', 'Analítica')}
      <p className="nav-group">Negocios</p>
      {item('/negocios', 'Negocios', negocios)}
      {item('/destacados', 'Destacados')}
      {item('/categorias', 'Categorías')}
      <p className="nav-group">Moderación</p>
      {item('/videos', 'Videos', videos)}
      {item('/resenas', 'Reseñas', resenas)}
      {item('/reportes', 'Reportes', reportes)}
      {item('/bitacora', 'Bitácora')}
      <p className="nav-group">Plataforma</p>
      {item('/sistema', 'Sistema')}
    </nav>
  );
}
