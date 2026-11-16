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
  videoPath: string | null; // video de ~20 s en el bucket privado "videos", materia prima del 3D
  status: ProductStatus;
}

/** Lo que el dueño ve de cada producto en su panel. */
export type Product3DState = 'en_3d' | 'video_recibido' | 'solo_foto';
export const product3DState = (p: Product): Product3DState => (p.modelUrl ? 'en_3d' : p.videoPath ? 'video_recibido' : 'solo_foto');

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
