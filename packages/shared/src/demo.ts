import type { Business, Product, Review } from './types';

// Datos de ejemplo para desarrollar sin Supabase configurado.
export const DEMO_BUSINESSES: Business[] = [
  { id: 'b1', ownerId: 'demo', name: 'Arepas Mamá Inés', type: 'emprendimiento', category: 'comer', address: 'Calle del Arsenal #8-12', hours: 'Lunes a sábado, 8 a. m. a 9 p. m.', whatsapp: '3001234567', status: 'publicado', rating: 4.8, reviewCount: 38 },
  { id: 'b2', ownerId: 'demo', name: 'Tejidos Kaashi', type: 'emprendimiento', category: 'artesanias', address: 'Calle de la Moneda #7-40', hours: 'Todos los días, 9 a. m. a 7 p. m.', whatsapp: null, status: 'publicado', rating: 4.9, reviewCount: 24 },
  { id: 'b3', ownerId: 'demo', name: 'Café Sierra Viva', type: 'emprendimiento', category: 'cafe_dulces', address: 'Plaza San Diego', hours: '7 a. m. a 8 p. m.', whatsapp: null, status: 'publicado', rating: 4.7, reviewCount: 19 },
  { id: 'b4', ownerId: 'demo', name: 'La Fogata de Doña Rosa', type: 'establecido', category: 'comer', address: 'Calle del Cuartel #36-77', hours: '12 m. a 10 p. m.', whatsapp: null, status: 'publicado', rating: 4.7, reviewCount: 212 },
  { id: 'b5', ownerId: 'demo', name: 'Galería Manos de Bolívar', type: 'establecido', category: 'artesanias', address: 'Las Bóvedas, local 12', hours: '9 a. m. a 8 p. m.', whatsapp: null, status: 'publicado', rating: 4.6, reviewCount: 132 },
];

export const DEMO_PRODUCTS: Product[] = [
  { id: 'p1', businessId: 'b1', name: 'Arepa de huevo', priceCop: 7000, description: 'Arepa frita rellena de huevo y carne.', modelUrl: null, status: 'listo' },
  { id: 'p2', businessId: 'b2', name: 'Mochila wayuu', priceCop: 180000, description: 'Tejida a mano en una sola pieza.', modelUrl: null, status: 'listo' },
  { id: 'p3', businessId: 'b3', name: 'Café de la Sierra, 500 g', priceCop: 38000, description: 'Tostión media.', modelUrl: null, status: 'listo' },
  { id: 'p4', businessId: 'b4', name: 'Bandeja paisa', priceCop: 38000, description: 'Arroz, fríjoles, chicharrón, huevo y más.', modelUrl: null, status: 'listo' },
  { id: 'p5', businessId: 'b5', name: 'Sombrero vueltiao fino', priceCop: 260000, description: 'Caña flecha de 23 vueltas.', modelUrl: null, status: 'listo' },
];

export const DEMO_REVIEWS: Review[] = [
  { id: 'r1', businessId: 'b1', userId: 'u1', authorName: 'Tom', stars: 5, text: 'Con la vista 3D entendí qué era una arepa de huevo.', reply: null, createdAt: '2026-11-01T15:00:00Z' },
  { id: 'r2', businessId: 'b2', userId: 'u2', authorName: 'Julia', stars: 5, text: 'Vi la mochila por todos lados antes de ir.', reply: '¡Gracias por visitarnos!', createdAt: '2026-11-03T18:00:00Z' },
];
