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
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  priceCop: number | null;
  description: string | null;
  modelUrl: string | null; // archivo 3D (.glb / .usdz) generado desde el video
  status: ProductStatus;
}

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
