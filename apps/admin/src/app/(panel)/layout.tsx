import { requireAdmin } from '@/lib/auth';

import { Nav } from './Nav';

// Todas las páginas del panel: exigen sesión, MFA (aal2) y rol del equipo.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, role } = await requireAdmin();
  const [{ count: negocios }, { count: videos }, { count: reportes }] = await Promise.all([
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'en_revision'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('video_status', 'pendiente'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pendiente'),
  ]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>▣</span>
          <span>Zipa lo tiene<small>Panel del equipo</small></span>
        </div>
        <Nav negocios={negocios ?? 0} videos={videos ?? 0} reportes={reportes ?? 0} />
        <div className="who">
          <span>Sesión de<br /><strong>{user.email}</strong></span>
          <span className="pill publicado" style={{ alignSelf: 'flex-start' }}>{role === 'admin' ? 'Administrador' : 'Revisor'}</span>
          <form action="/salir" method="post"><button className="btn ghost">Salir</button></form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
