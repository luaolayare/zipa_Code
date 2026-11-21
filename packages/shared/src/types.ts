/** Categoría vieja (antes de la Beta 2). Se conserva por compatibilidad y para los colores. */
export type Category = 'comer' | 'artesanias' | 'cafe_dulces';

/** Las dos categorías principales (migración 0013). */
export type MainCategory = 'emprendimientos' | 'restaurantes';

/** Categoría o subcategoría administrada por el equipo (tabla categories). */
export interface CategoryNode {
  id: string;
  parentId: MainCategory | null; // null: es una categoría principal
  name: string;
  sortOrder: number;
  active: boolean;
}

export type SearchOrder = 'relevancia' | 'calificacion' | 'recientes';

export interface SearchOptions {
  text?: string;
  main?: MainCategory | null;
  subcategory?: string | null;
  order?: SearchOrder;
  limit?: number;
  offset?: number;
}
export type BusinessType = 'emprendimiento' | 'establecido';
export type BusinessStatus = 'borrador' | 'en_revision' | 'publicado' | 'rechazado';
export type ProductStatus = 'procesando' | 'listo' | 'error';

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  type: BusinessType;
  category: Category; // vieja: la sincroniza la base desde subcategoryId
  subcategoryId: string | null; // subcategoría principal (de ahí sale la categoría principal)
  mainCategory: MainCategory | null;
  subcategoryName: string | null;
  tags: string[]; // etiquetas secundarias ("también ofrece"), hasta 3
  logoUrl: string | null; // logo que subió el negocio (bucket público "negocios")
  address: string;
  hours: string | null;
  whatsapp: string | null;
  status: BusinessStatus;
  rating: number | null; // promedio de reseñas
  reviewCount: number;
  specialty: string | null; // lo que vende, en palabras del negocio: "Comida callejera", "Artesanías wayuu"
  priceLevel: 1 | 2 | 3 | null; // $, $$ o $$$
  distanceM: number | null; // distancia al cliente en metros (se calculará con la ubicación)
  productCount: number; // productos con modelo 3D
  reviewNote?: string | null; // motivo del rechazo (solo lo ve el dueño)
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  priceCop: number | null;
  description: string | null;
  modelUrl: string | null; // archivo 3D (.glb / .usdz) generado desde el video
  photoUrl: string | null; // foto del producto (lo que se ve mientras no hay modelo 3D)
  videoPath: string | null; // video de ~20 s en el bucket privado "videos"
  videoStatus: VideoStatus | null; // el equipo lo revisa antes de que lo vean los clientes
  videoNote: string | null; // motivo si el equipo no aprobó el video
  status: ProductStatus;
  photoLabel: string | null; // descripción corta de la foto principal
  photos: ProductPhoto[]; // hasta 3 fotos más (otros diseños o presentaciones)
  available: boolean; // false: "No disponible hoy" (sigue en el menú)
  section: string | null; // sección del menú: "Entradas", "Bebidas"...
  sortOrder: number;
}

export type VideoStatus = 'pendiente' | 'aprobado' | 'rechazado';

/** Foto adicional de un producto (migración 0017). */
export interface ProductPhoto {
  id: string;
  url: string;
  label: string | null;
  position: number;
}

/** Estado del video de un producto, para el panel del negocio. */
export type ProductVideoState = 'sin_video' | VideoStatus;
export const productVideoState = (p: Product): ProductVideoState => (p.videoPath ? (p.videoStatus ?? 'pendiente') : 'sin_video');

export interface Review {
  id: string;
  businessId: string;
  userId: string;
  authorName: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string;
  reply: string | null;
  createdAt: string;
  status?: ReviewStatus; // 'en_espera': la ve solo su autor hasta que el equipo la revise
  visited?: boolean; // abrió la ficha con el QR del negocio (sello "Reseña con QR"; no prueba visita ni consumo)
  photoUrl?: string | null; // foto que agregó el cliente
}

export type ReviewStatus = 'publicada' | 'en_espera' | 'rechazada';
