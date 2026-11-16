export type Category = 'comer' | 'artesanias' | 'cafe_dulces';
export type BusinessType = 'emprendimiento' | 'establecido';
export type BusinessStatus = 'borrador' | 'en_revision' | 'publicado' | 'rechazado';
export type ProductStatus = 'procesando' | 'listo' | 'error';

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  type: BusinessType;
  category: Category;
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
}

export type VideoStatus = 'pendiente' | 'aprobado' | 'rechazado';

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
}
