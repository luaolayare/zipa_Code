import type { SupabaseClient } from '@supabase/supabase-js';

import { DEMO_BUSINESSES, DEMO_PRODUCTS, DEMO_REVIEWS } from './demo';
import type { ConsentInput } from './legal';
import { OffensiveTextError, findOffensiveWords } from './moderation';
import type { Business, BusinessType, Category, Product, Review } from './types';

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
  status: r.status,
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
});

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
  address?: string;
  hours?: string | null;
  whatsapp?: string | null;
}

export interface NewBusiness {
  name: string;
  type: BusinessType;
  category: Category;
  address: string;
  hours?: string;
  whatsapp?: string;
}

/**
 * Acceso a datos. Con un cliente de Supabase usa la base real;
 * con null usa datos de ejemplo en memoria.
 */
export function createApi(db: SupabaseClient | null) {
  // Los datos de ejemplo solo existen en desarrollo. Una compilación de producción sin Supabase
  // es un error de configuración: nunca debe mostrar negocios, precios ni reseñas inventados.
  if (!db && !__DEV__) throw new MissingBackendError();

  let demoReviews = [...DEMO_REVIEWS];
  let demoProducts = [...DEMO_PRODUCTS];
  const demoConsents: (ConsentInput & { userId: string; acceptedAt: string })[] = [];
  const demoReports: (ReportInput & { reporterId: string })[] = [];
  const demoBlocks = new Set<string>(); // `${bloqueador}:${bloqueado}`

  return {
    isDemo: db === null,

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

    async listBusinesses(): Promise<Business[]> {
      if (!db) return DEMO_BUSINESSES;
      const { data, error } = await db.from('businesses_public').select('*');
      if (error) throw error;
      return (data ?? []).map(toBusiness);
    },

    async getBusiness(id: string): Promise<Business | null> {
      if (!db) return DEMO_BUSINESSES.find((b) => b.id === id) ?? null;
      const { data, error } = await db.from('businesses_public').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? toBusiness(data) : null;
    },

    async listProducts(businessId: string): Promise<Product[]> {
      if (!db) return demoProducts.filter((p) => p.businessId === businessId);
      const { data, error } = await db.from('products').select('*').eq('business_id', businessId).order('created_at');
      if (error) throw error;
      return (data ?? []).map(toProduct);
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
    async listReviews(businessId: string, viewerId?: string): Promise<Review[]> {
      if (!db) return demoReviews.filter((r) => r.businessId === businessId && !demoBlocks.has(`${viewerId}:${r.userId}`));
      // En la base, la vista reviews_public ya oculta las de usuarios bloqueados (migración 0004).
      const { data, error } = await db
        .from('reviews_public')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toReview);
    },

    async createReview(businessId: string, userId: string, authorName: string, stars: Review['stars'], text: string) {
      if (findOffensiveWords(text).length) throw new OffensiveTextError();
      if (!db) {
        demoReviews.unshift({ id: String(Date.now()), businessId, userId, authorName, stars, text, reply: null, createdAt: new Date().toISOString() });
        return;
      }
      const { error } = await db.from('reviews').insert({ business_id: businessId, user_id: userId, stars, text });
      // La base aplica el mismo filtro (trigger) por si alguien publica sin pasar por la app.
      if (error?.message?.includes('texto_ofensivo')) throw new OffensiveTextError();
      if (error) throw error;
    },

    async myBusiness(ownerId: string): Promise<Business | null> {
      if (!db) return null;
      const { data, error } = await db.from('businesses').select('*').eq('owner_id', ownerId).maybeSingle();
      if (error) throw error;
      return data ? toBusiness({ ...data, rating: null, review_count: 0, product_count: 0 }) : null;
    },

    async registerBusiness(ownerId: string, input: NewBusiness): Promise<string> {
      if (!db) return 'demo-' + Date.now();
      const { data, error } = await db
        .from('businesses')
        .insert({ owner_id: ownerId, ...input, status: 'borrador' })
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
      const { data, error } = await db.from('products').select('*').eq('business_id', businessId).order('created_at');
      if (error) throw error;
      return (data ?? []).map(toProduct);
    },

    /**
     * Crea o actualiza un producto del negocio propio. La foto va al bucket público "productos"
     * y el video (sin sonido) al privado "videos", ambos en la carpeta del dueño.
     * El modelo 3D lo genera después el servidor a partir del video.
     */
    async saveProduct(ownerId: string, businessId: string, input: ProductInput, productId?: string): Promise<Product> {
      const fields = { name: input.name.trim(), price_cop: input.priceCop, description: input.description?.trim() || null };
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
          status: 'procesando',
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
      if (edit.category !== undefined) row.category = edit.category;
      if (edit.address !== undefined) row.address = edit.address.trim();
      if (edit.hours !== undefined) row.hours = edit.hours?.trim() || null;
      if (edit.whatsapp !== undefined) row.whatsapp = edit.whatsapp?.trim() || null;
      const { data, error } = await db.from('businesses').update(row).eq('id', businessId).select('*').single();
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
