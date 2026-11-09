import type { SupabaseClient } from '@supabase/supabase-js';

import { DEMO_BUSINESSES, DEMO_PRODUCTS, DEMO_REVIEWS } from './demo';
import type { ConsentInput } from './legal';
import { OffensiveTextError, findOffensiveWords } from './moderation';

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
import type { Business, BusinessType, Category, Product, Review } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
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
});

const toProduct = (r: any): Product => ({
  id: r.id,
  businessId: r.business_id,
  name: r.name,
  priceCop: r.price_cop,
  description: r.description,
  modelUrl: r.model_url,
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
  let demoReviews = [...DEMO_REVIEWS];
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
      if (!db) return DEMO_PRODUCTS.filter((p) => p.businessId === businessId);
      const { data, error } = await db.from('products').select('*').eq('business_id', businessId).order('created_at');
      if (error) throw error;
      return (data ?? []).map(toProduct);
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

    async submitForReview(businessId: string) {
      if (!db) return;
      const { error } = await db.from('businesses').update({ status: 'en_revision' }).eq('id', businessId);
      if (error) throw error;
    },
  };
}

export type Api = ReturnType<typeof createApi>;
