export const CATEGORIA: Record<string, string> = { comer: 'Comer', artesanias: 'Artesanías', cafe_dulces: 'Café y dulces' };
/** Subcategoría (migración 0013) o, si no viene, la categoría vieja. */
export const clasificacion = (b: { category: string; subcategory?: unknown }) => {
  const s = (Array.isArray(b.subcategory) ? b.subcategory[0] : b.subcategory) as { name: string; parent_id: string | null } | null | undefined;
  return s ? `${s.parent_id === 'restaurantes' ? 'Restaurante' : 'Emprendimiento'} · ${s.name}` : CATEGORIA[b.category] ?? b.category;
};
export const TIPO: Record<string, string> = { emprendimiento: 'Emprendimiento', establecido: 'Negocio establecido' };
export const ESTADO: Record<string, string> = { en_revision: 'En revisión', publicado: 'Publicado', rechazado: 'No aprobado', borrador: 'Sin terminar' };
export const MOTIVO: Record<string, string> = {
  ofensivo: 'Ofensivo, acoso o discriminación',
  falso: 'Falso o engañoso',
  spam: 'Publicidad o spam',
  datos_personales: 'Datos personales de alguien',
  otro: 'Otro motivo',
};

export const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

export const pesos = (n: number | null) => (n == null ? 'Sin precio' : '$' + n.toLocaleString('es-CO'));

/** 1.234 · "—" si no hay dato. */
export const numero = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('es-CO'));

/** "16 nov." para un día "2026-11-16" (sin convertir de zona horaria). */
export const dia = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

/** "12,3 MB". */
export const bytes = (n: number) => {
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} ${u[i]}`;
};
