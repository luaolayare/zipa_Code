import { requireAdmin } from '@/lib/auth';

import { Categorias, type Categoria } from './Categorias';

export default async function CategoriasPage() {
  const { supabase, role } = await requireAdmin();
  const [{ data: cats, error }, { data: negocios }, { data: tags }] = await Promise.all([
    supabase.from('categories').select('id, parent_id, name, sort_order, active').order('sort_order'),
    supabase.from('businesses').select('subcategory_id'),
    supabase.from('business_tags').select('category_id'),
  ]);
  // Cuántos negocios usan cada subcategoría (como principal o como etiqueta).
  const usos: Record<string, number> = {};
  for (const n of negocios ?? []) usos[n.subcategory_id] = (usos[n.subcategory_id] ?? 0) + 1;
  for (const t of tags ?? []) usos[t.category_id] = (usos[t.category_id] ?? 0) + 1;

  const lista: Categoria[] = (cats ?? []).map((c) => ({ id: c.id, parentId: c.parent_id, name: c.name, sortOrder: c.sort_order, active: c.active, usos: usos[c.id] ?? 0 }));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="overline">Negocios</p>
          <h1>Categorías</h1>
          <p>Las subcategorías que ven los clientes y que eligen los negocios. Una desactivada deja de ofrecerse, pero los negocios que ya la tienen la conservan.</p>
        </div>
      </div>
      {error && <p className="notice error">No pudimos cargar las categorías.</p>}
      {role !== 'admin' && <p className="notice warn" style={{ marginBottom: 16 }}>Solo el rol administrador puede cambiar las categorías. Tú puedes consultarlas.</p>}
      <Categorias lista={lista} puedeEditar={role === 'admin'} />
    </>
  );
}
