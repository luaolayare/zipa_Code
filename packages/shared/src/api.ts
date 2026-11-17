import type { SupabaseClient } from '@supabase/supabase-js';

import { createTracker, type KeyValueStore } from './analytics';
import { DEMO_CATEGORIES, MIN_REVIEWS_FOR_RANKING, normalize } from './categories';
import { DEMO_BUSINESSES, DEMO_PRODUCTS, DEMO_REVIEWS } from './demo';
import type { ConsentInput } from './legal';
import { OffensiveTextError, findOffensiveWords } from './moderation';
import type { Business, BusinessType, Category, CategoryNode, MainCategory, Product, Review, ReviewStatus, SearchOptions } from './types';

/** Cédula o NIT sin puntos ni espacios: "1.234.567" → "1234567", "900.123.456-7" → "900123456-7". */
export const normalizeIdNumber = (raw: string) => raw.replace(/[^0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

/** true si parece una cédula o un NIT válido (misma regla que la base de datos). */
export const isValidIdNumber = (raw: string) => /^[0-9]{6,12}(-[0-9])?$/.test(normalizeIdNumber(raw));

/** Compilación de producción sin las variables de Supabase. */
export class MissingBackendError extends Error {
  constructor() {
    super('Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en esta compilación.');
    this.name = 'MissingBackendError';
  }
}

export type ReportTargetType = 'review' | 'business' | 'user';
export type ReportReason = 'ofensivo' | 'falso' | 'spam' | 'datos_personales' | 'otro';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'ofensivo', label: 'Es ofensivo, acosa o discrimina' },
  { id: 'falso', label: 'Es falso o engañoso' },
  { id: 'spam', label: 'Es publicidad o spam' },
  { id: 'datos_personales', label: 'Muestra datos personales de alguien' },
  { id: 'otro', label: 'Otro motivo' },
];

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

// Las filas llegan de Supabase sin tipos generados; se convierten aquí al modelo de la app.
const toBusiness = (r: any): Business => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  type: r.type,
  category: r.category,
  subcategoryId: r.subcategory_id ?? null,
  mainCategory: r.main_category ?? r.subcategory?.parent_id ?? null,
  subcategoryName: r.subcategory_name ?? r.subcategory?.name ?? null,
  tags: r.tags ?? (Array.isArray(r.business_tags) ? r.business_tags.map((t: { category_id: string }) => t.category_id) : []),
  logoUrl: r.logo_url ?? null,
  address: r.address,
  hours: r.hours,
  whatsapp: r.whatsapp,
  status: r.status,
  rating: r.rating == null ? null : Number(r.rating),
  reviewCount: r.review_count ?? 0,
  specialty: r.specialty ?? null,
  priceLevel: r.price_level ?? null,
  distanceM: null, // pendiente: calcular con la ubicación del cliente
  productCount: r.product_count ?? 0,
  reviewNote: r.review_note ?? null,
});

const toProduct = (r: any): Product => ({
  id: r.id,
  businessId: r.business_id,
  name: r.name,
  priceCop: r.price_cop,
  description: r.description,
  modelUrl: r.model_url,
  photoUrl: r.photo_url ?? null,
  videoPath: r.video_path ?? null,
  videoStatus: r.video_status ?? null,
  videoNote: r.video_note ?? null,
  status: r.status,
  available: r.available ?? true,
  section: r.section ?? null,
  sortOrder: r.sort_order ?? 0,
});

const toReview = (r: any): Review => ({
  id: r.id,
  businessId: r.business_id,
  userId: r.user_id,
  authorName: r.author_name ?? 'Cliente',
  stars: r.stars,
  text: r.text,
  reply: r.reply,
  createdAt: r.created_at,
  status: r.status ?? 'publicada',
  visited: !!r.visited,
  photoUrl: r.photo_url ?? null,
});

/**
 * Búsqueda sobre datos en memoria con las mismas reglas que public.buscar_negocios() (0013).
 * Solo se usa en desarrollo sin Supabase y en las pruebas.
 */
export function searchDemo(
  businesses: Business[],
  { text = '', main = null, subcategory = null, order = 'relevancia', limit = 30, offset = 0 }: SearchOptions,
  products: Product[] = DEMO_PRODUCTS,
  categories: CategoryNode[] = DEMO_CATEGORIES,
): Business[] {
  const q = normalize(text).replace(/[^a-z0-9]+/g, ' ').trim();
  const has = (value: string | null | undefined) => !!value && normalize(value).replace(/[^a-z0-9]+/g, ' ').includes(q);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name;
  const rankable = (b: Business) => (b.reviewCount >= MIN_REVIEWS_FOR_RANKING ? 1 : 0);
  const list = businesses.filter(
    (b) =>
      (!main || b.mainCategory === main) &&
      (!subcategory || b.subcategoryId === subcategory || b.tags.includes(subcategory)) &&
      (!q || has(b.name) || has(b.specialty) || has(b.subcategoryName) ||
        products.some((p) => p.businessId === b.id && has(p.name)) || b.tags.some((t) => has(catName(t)))),
  );
  const byRating = (a: Business, b: Business) => rankable(b) - rankable(a) || (b.rating ?? -1) - (a.rating ?? -1) || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name, 'es');
  const starts = (b: Business) => (q && normalize(b.name).startsWith(q) ? 1 : 0);
  const sorted = [...list].sort((a, b) =>
    order === 'recientes' ? 0 : order === 'calificacion' ? byRating(a, b) : starts(b) - starts(a) || byRating(a, b),
  );
  return sorted.slice(offset, offset + Math.min(Math.max(limit, 1), 50));
}

/** Archivo local elegido o grabado en el celular. */
export interface LocalFile {
  uri: string;
  mimeType?: string | null;
}

export interface ProductInput {
  name: string;
  priceCop: number | null;
  description?: string | null;
  photo?: LocalFile | null; // nueva foto (si no cambia, se omite)
  video?: LocalFile | null; // nuevo video para el 3D (si no cambia, se omite)
  available?: boolean; // por defecto, disponible
  section?: string | null; // sección del menú
}

const extFor = (mime: string, fallback: string) => {
  const sub = mime.split('/')[1] ?? fallback;
  return ({ jpeg: 'jpg', quicktime: 'mov' } as Record<string, string>)[sub] ?? sub;
};

/** Sube un archivo local a Storage y devuelve su ruta. */
async function uploadFile(db: SupabaseClient, bucket: string, path: string, file: LocalFile, fallbackMime: string) {
  const mime = file.mimeType ?? fallbackMime;
  const body = await (await fetch(file.uri)).arrayBuffer();
  const { error } = await db.storage.from(bucket).upload(path, body, { contentType: mime, upsert: false });
  if (error) {
    if (/exceeded|too large|size/i.test(error.message)) throw new Error('El archivo es demasiado pesado. Graba un video más corto o elige una foto más liviana.');
    throw new Error('No pudimos subir el archivo. Revisa tu conexión e intenta de nuevo.');
  }
  return path;
}

/** Ruta de Storage a partir de la URL pública de un archivo del bucket "productos". */
/** Ruta dentro del bucket "negocios" de un logo guardado. */
const logoPathOf = (url: string | null) => {
  const tail = url?.split('/object/public/negocios/')[1];
  return tail ? decodeURIComponent(tail) : null;
};

const publicPathOf = (url: string | null) => {
  const tail = url?.split('/object/public/productos/')[1];
  return tail ? decodeURIComponent(tail) : null;
};

/** Reseña propia con el nombre del negocio. */
export type MyReview = Review & { businessName: string };

export interface BusinessEdit {
  name?: string;
  type?: BusinessType;
  category?: Category;
  subcategoryId?: string;
  address?: string;
  hours?: string | null;
  whatsapp?: string | null;
}

export interface NewBusiness {
  name: string;
  type: BusinessType;
  subcategoryId: string;
  address: string;
  hours?: string;
  whatsapp?: string;
}

/**
 * Acceso a datos. Con un cliente de Supabase usa la base real;
 * con null usa datos de ejemplo en memoria.
 */
export function createApi(db: SupabaseClient | null, options: { storage?: KeyValueStore | null; app?: 'clientes' | 'negocios' } = {}) {
  // Los datos de ejemplo solo existen en desarrollo. Una compilación de producción sin Supabase
  // es un error de configuración: nunca debe mostrar negocios, precios ni reseñas inventados.
  if (!db && !__DEV__) throw new MissingBackendError();

  let demoReviews = [...DEMO_REVIEWS];
  let demoProducts = [...DEMO_PRODUCTS];
  const demoConsents: (ConsentInput & { userId: string; acceptedAt: string })[] = [];
  const demoReports: (ReportInput & { reporterId: string })[] = [];
  const demoBlocks = new Set<string>(); // `${bloqueador}:${bloqueado}`

  // Analítica anónima de uso (migración 0015). En modo demo no envía nada.
  const track = createTracker(db, options.storage ?? null, options.app ?? 'clientes');

  return {
    track,
    isDemo: !db,

    /**
     * Elimina la cuenta y todo lo asociado (perfil, reseñas, negocio, productos, aceptaciones,
     * reportes, bloqueos y archivos). Lo hace la Edge Function eliminar-cuenta con permisos de servidor.
     */
    async deleteAccount(userId: string) {
      if (!db) {
        demoReviews = demoReviews.filter((r) => r.userId !== userId);
        return;
      }
      const { error } = await db.functions.invoke('eliminar-cuenta', { method: 'POST' });
      if (error) throw new Error('No pudimos eliminar tu cuenta. Intenta de nuevo o escríbenos a soporte.');
    },

    /** Reporta una reseña, un negocio o un usuario para que el equipo lo revise. */
    async report(reporterId: string, input: ReportInput) {
      if (!db) {
        demoReports.push({ ...input, reporterId });
        return;
      }
      const { error } = await db.from('reports').insert({
        reporter_id: reporterId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details?.trim() || null,
      });
      // 23505 = ya lo había reportado: para quien reporta es lo mismo.
      if (error && error.code !== '23505') throw error;
    },

    /** Deja de ver las reseñas de esa persona. */
    async blockUser(blockerId: string, blockedId: string) {
      if (!db) {
        demoBlocks.add(`${blockerId}:${blockedId}`);
        return;
      }
      const { error } = await db.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
      if (error && error.code !== '23505') throw error;
    },

    async unblockUser(blockerId: string, blockedId: string) {
      if (!db) {
        demoBlocks.delete(`${blockerId}:${blockedId}`);
        return;
      }
      const { error } = await db.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
      if (error) throw error;
    },

    /** true si la persona ya aceptó la versión vigente de todos esos documentos. */
    async hasAccepted(userId: string, consents: ConsentInput[]): Promise<boolean> {
      if (!db) return consents.every((c) => demoConsents.some((d) => d.userId === userId && d.document === c.document && d.version === c.version));
      const { data, error } = await db.from('consents').select('document, version').eq('user_id', userId);
      if (error) throw error;
      return consents.every((c) => (data ?? []).some((d) => d.document === c.document && d.version === c.version));
    },

    /** Guarda la aceptación de documentos legales de alguien que ya tiene sesión. */
    async recordConsents(userId: string, consents: ConsentInput[]) {
      if (!db) {
        const acceptedAt = new Date().toISOString();
        demoConsents.push(...consents.map((c) => ({ ...c, userId, acceptedAt })));
        return;
      }
      const { error } = await db.from('consents').insert(consents.map((c) => ({ user_id: userId, document: c.document, version: c.version, app: c.app })));
      if (error) throw error;
    },

    /** Categorías y subcategorías (también las inactivas, para poder mostrar su nombre). */
    async listCategories(): Promise<CategoryNode[]> {
      if (!db) return DEMO_CATEGORIES;
      const { data, error } = await db.from('categories').select('id, parent_id, name, sort_order, active').order('sort_order');
      if (error) throw error;
      return (data ?? []).map((c) => ({ id: c.id, parentId: c.parent_id, name: c.name, sortOrder: c.sort_order, active: c.active }));
    },

    /**
     * Búsqueda y listados en el servidor (buscar_negocios, migración 0013): por nombre del negocio,
     * producto o plato, y subcategoría; con filtros y en páginas de hasta 50.
     */
    async searchBusinesses(options: SearchOptions = {}): Promise<Business[]> {
      const { text = '', main = null, subcategory = null, order = 'relevancia', limit = 30, offset = 0 } = options;
      if (!db) return searchDemo(DEMO_BUSINESSES, { text, main, subcategory, order, limit, offset });
      const { data, error } = await db.rpc('buscar_negocios', {
        p_texto: text.trim() || null,
        p_categoria: main,
        p_subcategoria: subcategory,
        p_orden: order,
        p_limite: limit,
        p_desde: offset,
      });
      if (error) throw error;
      return ((data as unknown[]) ?? []).map(toBusiness);
    },

    /** Cuántos negocios publicados tiene cada categoría principal (sin descargarlos). */
    async countByMainCategory(): Promise<Record<MainCategory, number>> {
      if (!db) {
        return {
          emprendimientos: DEMO_BUSINESSES.filter((b) => b.mainCategory === 'emprendimientos').length,
          restaurantes: DEMO_BUSINESSES.filter((b) => b.mainCategory === 'restaurantes').length,
        };
      }
      const count = async (main: MainCategory) => {
        const { count: n, error } = await db.from('businesses_public').select('id', { count: 'exact', head: true }).eq('main_category', main);
        if (error) throw error;
        return n ?? 0;
      };
      const [emprendimientos, restaurantes] = await Promise.all([count('emprendimientos'), count('restaurantes')]);
      return { emprendimientos, restaurantes };
    },

    /** Etiquetas secundarias del negocio propio: reemplaza las que tenía por estas (hasta 3). */
    async setBusinessTags(businessId: string, tags: string[]) {
      if (!db) return;
      const { data, error } = await db.from('business_tags').select('category_id').eq('business_id', businessId);
      if (error) throw error;
      const current = (data ?? []).map((t) => t.category_id as string);
      const remove = current.filter((t) => !tags.includes(t));
      const add = tags.filter((t) => !current.includes(t));
      if (remove.length) {
        const { error: e } = await db.from('business_tags').delete().eq('business_id', businessId).in('category_id', remove);
        if (e) throw e;
      }
      if (add.length) {
        const { error: e } = await db.from('business_tags').insert(add.map((category_id) => ({ business_id: businessId, category_id })));
        if (e) throw new Error(e.message.includes('hasta 3') ? 'Puedes agregar hasta 3 etiquetas.' : e.message.includes('no está disponible') ? 'Una de las etiquetas ya no está disponible.' : 'No pudimos guardar las etiquetas.');
      }
    },

    async getBusiness(id: string): Promise<Business | null> {
      if (!db) return DEMO_BUSINESSES.find((b) => b.id === id) ?? null;
      const { data, error } = await db.from('businesses_public').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? toBusiness(data) : null;
    },

    async listProducts(businessId: string): Promise<Product[]> {
      if (!db) return demoProducts.filter((p) => p.businessId === businessId);
      const { data, error } = await db.from('products').select('*').eq('business_id', businessId).order('sort_order').order('created_at');
      if (error) throw error;
      return (data ?? []).map(toProduct);
    },

    /** El negocio marca un producto como disponible o "no disponible hoy" (sin borrarlo). */
    async setProductAvailable(productId: string, available: boolean) {
      if (!db) {
        demoProducts = demoProducts.map((p) => (p.id === productId ? { ...p, available } : p));
        return;
      }
      const { error } = await db.from('products').update({ available }).eq('id', productId);
      if (error) throw error;
    },

    /** Un producto de un negocio publicado (o del propio negocio). */
    async getProduct(id: string): Promise<Product | null> {
      if (!db) return demoProducts.find((p) => p.id === id) ?? null;
      const { data, error } = await db.from('products').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? toProduct(data) : null;
    },

    /** Reseñas que escribió una persona, con el nombre del negocio (pantalla Perfil). */
    async myReviews(userId: string): Promise<MyReview[]> {
      const mine = !db
        ? demoReviews.filter((r) => r.userId === userId)
        : await (async () => {
            const { data, error } = await db.from('reviews_public').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []).map(toReview);
          })();
      if (!mine.length) return [];
      const ids = [...new Set(mine.map((r) => r.businessId))];
      let names: Record<string, string> = {};
      if (!db) names = Object.fromEntries(DEMO_BUSINESSES.map((b) => [b.id, b.name]));
      else {
        const { data } = await db.from('businesses_public').select('id, name').in('id', ids);
        names = Object.fromEntries((data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]));
      }
      return mine.map((r) => ({ ...r, businessName: names[r.businessId] ?? 'Negocio' }));
    },

    /** Reseñas del negocio. Con `viewerId`, sin las de personas que esa persona bloqueó. */
    /**
     * Reseñas de un negocio, las más recientes primero. Con `page` trae solo esa página (la ficha
     * del cliente pide de a 20, ver docs/PRUEBAS_DE_CARGA.md); sin `page`, todas (panel del negocio).
     */
    async listReviews(businessId: string, viewerId?: string, page?: { limit: number; offset: number }): Promise<Review[]> {
      if (!db) {
        const all = demoReviews.filter((r) => r.businessId === businessId && !demoBlocks.has(`${viewerId}:${r.userId}`));
        return page ? all.slice(page.offset, page.offset + page.limit) : all;
      }
      // En la base, la vista reviews_public ya oculta las de usuarios bloqueados (migración 0004).
      let q = db.from('reviews_public').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).order('id');
      if (page) q = q.range(page.offset, page.offset + page.limit - 1);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(toReview);
    },

    /**
     * Sube el logo del negocio propio al bucket público "negocios" (carpeta del dueño), lo guarda
     * en businesses.logo_url y borra el anterior. Devuelve la dirección pública del logo.
     */
    async uploadBusinessLogo(ownerId: string, businessId: string, file: LocalFile): Promise<string> {
      if (!db) return file.uri;
      const mime = file.mimeType ?? 'image/jpeg';
      const path = await uploadFile(db, 'negocios', `${ownerId}/${businessId}/logo-${Date.now()}.${extFor(mime, 'jpg')}`, file, 'image/jpeg');
      const url = db.storage.from('negocios').getPublicUrl(path).data.publicUrl;
      const { data: before } = await db.from('businesses').select('logo_url').eq('id', businessId).maybeSingle();
      const { error } = await db.from('businesses').update({ logo_url: url }).eq('id', businessId);
      if (error) {
        await db.storage.from('negocios').remove([path]);
        throw new Error('No pudimos guardar el logo. Intenta de nuevo.');
      }
      const oldPath = logoPathOf(before?.logo_url ?? null);
      if (oldPath) await db.storage.from('negocios').remove([oldPath]);
      return url;
    },

    /** Quita el logo del negocio propio (y borra el archivo). */
    async removeBusinessLogo(businessId: string) {
      if (!db) return;
      const { data: before } = await db.from('businesses').select('logo_url').eq('id', businessId).maybeSingle();
      const { error } = await db.from('businesses').update({ logo_url: null }).eq('id', businessId);
      if (error) throw new Error('No pudimos quitar el logo. Intenta de nuevo.');
      const oldPath = logoPathOf(before?.logo_url ?? null);
      if (oldPath) await db.storage.from('negocios').remove([oldPath]);
    },

    /**
     * Crea o edita la reseña de esta persona para el negocio: hay UNA por persona y negocio
     * (migración 0011). Calificar de nuevo reemplaza estrellas y texto.
     */
    async saveMyReview(businessId: string, userId: string, authorName: string, stars: Review['stars'], text: string, photo?: LocalFile | null): Promise<ReviewStatus> {
      if (findOffensiveWords(text).length) throw new OffensiveTextError();
      if (!db) {
        demoReviews = [
          { id: String(Date.now()), businessId, userId, authorName, stars, text, reply: null, createdAt: new Date().toISOString(), status: 'publicada', photoUrl: photo?.uri ?? null },
          ...demoReviews.filter((r) => !(r.businessId === businessId && r.userId === userId)),
        ];
        return 'publicada';
      }
      // La foto va primero al bucket público "resenas", en la carpeta de quien califica.
      let photoUrl: string | null = null;
      if (photo) {
        const mime = photo.mimeType ?? 'image/jpeg';
        const path = await uploadFile(db, 'resenas', `${userId}/${businessId}/${Date.now()}.${extFor(mime, 'jpg')}`, photo, 'image/jpeg');
        photoUrl = db.storage.from('resenas').getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await db.rpc('guardar_mi_resena', { p_business: businessId, p_stars: stars, p_text: text, p_photo_url: photoUrl });
      // La base aplica el mismo filtro (trigger) por si alguien publica sin pasar por la app.
      if (error?.message?.includes('texto_ofensivo')) throw new OffensiveTextError();
      if (error) {
        // Las reglas contra el spam (migración 0012) ya vienen explicadas en español.
        const rules = ['No puedes calificar', 'Podrás calificar', 'Llegaste al máximo', 'Las cuentas con un negocio', 'Foto no válida'];
        throw new Error(rules.some((r) => error.message.includes(r)) ? error.message + '.' : 'No pudimos guardar tu reseña. Revisa tu conexión e intenta de nuevo.');
      }
      return (data as ReviewStatus) ?? 'publicada';
    },

    /**
     * Registra que esta persona visitó el negocio (abrió su QR del mostrador). Así su reseña sale
     * con el sello "Visitó el negocio". El código del QR solo lo tienen el negocio y el equipo.
     */
    async registerVisit(businessId: string, token: string): Promise<boolean> {
      if (!db) return true;
      const { data, error } = await db.rpc('registrar_visita', { p_business: businessId, p_token: token });
      return !error && data === true;
    },

    /** Código que va en el QR del negocio (solo lo ve su dueño). */
    async myQrToken(businessId: string): Promise<string | null> {
      if (!db) return 'demo';
      const { data } = await db.from('business_qr').select('token').eq('business_id', businessId).maybeSingle();
      return (data?.token as string | undefined) ?? null;
    },

    /** La reseña que esta persona ya dejó en el negocio, si existe. */
    async getMyReview(businessId: string, userId: string): Promise<Review | null> {
      if (!db) return demoReviews.find((r) => r.businessId === businessId && r.userId === userId) ?? null;
      const { data, error } = await db.from('reviews_public').select('*').eq('business_id', businessId).eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data ? toReview(data) : null;
    },

    /**
     * Enlace temporal (1 hora) para reproducir el video de un producto. Solo funciona si el equipo
     * aprobó el video y el negocio está publicado, o si quien lo pide es su dueño o el equipo.
     */
    async videoUrl(path: string): Promise<string | null> {
      if (!db) return null;
      const { data, error } = await db.storage.from('videos').createSignedUrl(path, 3600);
      return error ? null : data.signedUrl;
    },

    async myBusiness(ownerId: string): Promise<Business | null> {
      if (!db) return null;
      const { data, error } = await db
        .from('businesses')
        .select('*, subcategory:categories!businesses_subcategory_id_fkey(name, parent_id), business_tags(category_id)')
        .eq('owner_id', ownerId)
        .maybeSingle();
      if (error) throw error;
      return data ? toBusiness({ ...data, rating: null, review_count: 0, product_count: 0 }) : null;
    },

    async registerBusiness(ownerId: string, input: NewBusiness): Promise<string> {
      if (!db) return 'demo-' + Date.now();
      const { data, error } = await db
        .from('businesses')
        // La base pone la categoría vieja a partir de la subcategoría (trigger businesses_clasificar).
        .insert({ owner_id: ownerId, name: input.name, type: input.type, subcategory_id: input.subcategoryId, address: input.address, hours: input.hours, whatsapp: input.whatsapp, status: 'borrador' })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },

    /**
     * Guarda la verificación: la foto va al bucket privado "verificaciones" en la carpeta del dueño
     * y la cédula/NIT a business_verifications (solo la ve el dueño). La foto se borra al terminar
     * la revisión (Edge Function revisar-negocio).
     */
    async saveVerification(ownerId: string, businessId: string, photo: { uri: string; mimeType?: string | null }, idNumber: string) {
      const cleanId = normalizeIdNumber(idNumber);
      if (!db) return;
      const mime = photo.mimeType ?? 'image/jpeg';
      const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      const path = `${ownerId}/${businessId}/local-${Date.now()}.${ext}`;
      const body = await (await fetch(photo.uri)).arrayBuffer();
      const { error: uploadError } = await db.storage.from('verificaciones').upload(path, body, { contentType: mime, upsert: false });
      if (uploadError) throw new Error('No pudimos subir la foto de tu local. Revisa tu conexión e intenta de nuevo.');
      const { error } = await db.from('business_verifications').upsert({ business_id: businessId, photo_path: path, id_number: cleanId });
      if (error) {
        await db.storage.from('verificaciones').remove([path]); // no dejar fotos sueltas
        throw error;
      }
    },

    /** Productos del negocio propio (incluye los de un negocio aún no publicado). */
    async myProducts(businessId: string): Promise<Product[]> {
      if (!db) return demoProducts.filter((p) => p.businessId === businessId);
      const { data, error } = await db.from('products').select('*').eq('business_id', businessId).order('sort_order').order('created_at');
      if (error) throw error;
      return (data ?? []).map(toProduct);
    },

    /**
     * Crea o actualiza un producto del negocio propio. La foto va al bucket público "productos"
     * y el video (sin sonido) al privado "videos", ambos en la carpeta del dueño.
     * El modelo 3D lo genera después el servidor a partir del video.
     */
    async saveProduct(ownerId: string, businessId: string, input: ProductInput, productId?: string): Promise<Product> {
      const fields = {
        name: input.name.trim(),
        price_cop: input.priceCop,
        description: input.description?.trim() || null,
        available: input.available ?? true,
        section: input.section?.trim() || null,
      };
      if (!db) {
        const existing = demoProducts.find((p) => p.id === productId);
        const p: Product = {
          id: productId ?? 'demo-p-' + Date.now(),
          businessId,
          name: fields.name,
          priceCop: fields.price_cop,
          description: fields.description,
          modelUrl: existing?.modelUrl ?? null,
          photoUrl: input.photo?.uri ?? existing?.photoUrl ?? null,
          videoPath: input.video?.uri ?? existing?.videoPath ?? null,
          videoStatus: input.video ? 'pendiente' : existing?.videoStatus ?? null,
          videoNote: input.video ? null : existing?.videoNote ?? null,
          status: 'procesando',
          available: fields.available,
          section: fields.section,
          sortOrder: existing?.sortOrder ?? 0,
        };
        demoProducts = [...demoProducts.filter((x) => x.id !== p.id), p];
        return p;
      }

      let id = productId;
      let old: Product | null = null;
      if (id) {
        const { data, error } = await db.from('products').select('*').eq('id', id).single();
        if (error) throw error;
        old = toProduct(data);
        const { error: e2 } = await db.from('products').update(fields).eq('id', id);
        if (e2) throw e2;
      } else {
        const { data, error } = await db.from('products').insert({ business_id: businessId, ...fields }).select('id').single();
        if (error) throw error;
        id = data.id as string;
      }

      const folder = `${ownerId}/${businessId}/${id}`;
      const patch: Record<string, string> = {};
      const toRemove: { bucket: string; path: string }[] = [];
      if (input.photo) {
        const mime = input.photo.mimeType ?? 'image/jpeg';
        const path = await uploadFile(db, 'productos', `${folder}/foto-${Date.now()}.${extFor(mime, 'jpg')}`, input.photo, 'image/jpeg');
        patch.photo_url = db.storage.from('productos').getPublicUrl(path).data.publicUrl;
        const oldPath = publicPathOf(old?.photoUrl ?? null);
        if (oldPath) toRemove.push({ bucket: 'productos', path: oldPath });
      }
      if (input.video) {
        const mime = input.video.mimeType ?? 'video/mp4';
        patch.video_path = await uploadFile(db, 'videos', `${folder}/video-${Date.now()}.${extFor(mime, 'mp4')}`, input.video, 'video/mp4');
        if (old?.videoPath) toRemove.push({ bucket: 'videos', path: old.videoPath });
      }
      if (Object.keys(patch).length) {
        const { error } = await db.from('products').update(patch).eq('id', id);
        if (error) throw error;
      }
      // Los archivos reemplazados ya no se usan: se borran (si falla, no afecta al producto).
      for (const f of toRemove) await db.storage.from(f.bucket).remove([f.path]);

      const { data, error } = await db.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      return toProduct(data);
    },

    /** Borra un producto propio con su foto y su video. */
    async deleteProduct(product: Product) {
      if (!db) {
        demoProducts = demoProducts.filter((p) => p.id !== product.id);
        return;
      }
      const { error } = await db.from('products').delete().eq('id', product.id);
      if (error) throw error;
      const photo = publicPathOf(product.photoUrl);
      if (photo) await db.storage.from('productos').remove([photo]);
      if (product.videoPath) await db.storage.from('videos').remove([product.videoPath]);
    },

    /**
     * Edita los datos del negocio propio. Si ya estaba publicado y cambia nombre, dirección, tipo
     * o categoría, la base lo devuelve a revisión (migración 0009). Devuelve el negocio actualizado.
     */
    async updateBusiness(businessId: string, edit: BusinessEdit): Promise<Business> {
      if (!db) throw new Error('Sin conexión a la base de datos.');
      const row: Record<string, unknown> = {};
      if (edit.name !== undefined) row.name = edit.name.trim();
      if (edit.type !== undefined) row.type = edit.type;
      if (edit.subcategoryId !== undefined) row.subcategory_id = edit.subcategoryId;
      else if (edit.category !== undefined) row.category = edit.category;
      if (edit.address !== undefined) row.address = edit.address.trim();
      if (edit.hours !== undefined) row.hours = edit.hours?.trim() || null;
      if (edit.whatsapp !== undefined) row.whatsapp = edit.whatsapp?.trim() || null;
      const { data, error } = await db.from('businesses').update(row).eq('id', businessId).select('*, subcategory:categories!businesses_subcategory_id_fkey(name, parent_id), business_tags(category_id)').single();
      if (error) throw error;
      return toBusiness({ ...data, rating: null, review_count: 0, product_count: 0 });
    },

    /** El negocio responde (o corrige su respuesta a) una reseña. Vacío = quitar la respuesta. */
    async replyToReview(reviewId: string, reply: string) {
      const text = reply.trim();
      if (text && findOffensiveWords(text).length) throw new OffensiveTextError();
      if (!db) {
        demoReviews = demoReviews.map((r) => (r.id === reviewId ? { ...r, reply: text || null } : r));
        return;
      }
      const { data, error } = await db
        .from('reviews')
        .update({ reply: text || null, replied_at: text ? new Date().toISOString() : null })
        .eq('id', reviewId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('No pudimos guardar tu respuesta. Intenta de nuevo.');
    },

    async submitForReview(businessId: string) {
      if (!db) return;
      const { error } = await db.from('businesses').update({ status: 'en_revision' }).eq('id', businessId);
      if (error) throw error;
    },
  };
}

export type Api = ReturnType<typeof createApi>;
