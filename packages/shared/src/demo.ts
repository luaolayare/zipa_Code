import type { Business, Product, Review } from './types';

// Datos de ejemplo para desarrollar sin Supabase configurado (los mismos del prototipo).

export const DEMO_PRODUCTS: Product[] = [
  { id: 'p1', businessId: 'b1', name: 'Arepa de huevo', priceCop: 7000, description: 'Arepa frita rellena de huevo y carne, con hogao y suero.', modelUrl: null, status: 'listo' },
  { id: 'p2', businessId: 'b1', name: 'Mojarra del día', priceCop: 22000, description: 'Con arroz de coco, patacones y limón. Solo fines de semana.', modelUrl: null, status: 'listo' },
  { id: 'p3', businessId: 'b2', name: 'Mochila wayuu', priceCop: 180000, description: 'Tejida a mano en una sola pieza. Cada diseño es único.', modelUrl: null, status: 'listo' },
  { id: 'p4', businessId: 'b2', name: 'Sombrero vueltiao', priceCop: 120000, description: 'Fibra de caña flecha trenzada, 19 vueltas.', modelUrl: null, status: 'listo' },
  { id: 'p5', businessId: 'b3', name: 'Café de la Sierra, 500 g', priceCop: 38000, description: 'Tostión media, cultivado por familias de la Sierra Nevada.', modelUrl: null, status: 'listo' },
  { id: 'p6', businessId: 'b3', name: 'Tinto campesino', priceCop: 5000, description: 'Café filtrado con panela, servido en taza de barro.', modelUrl: null, status: 'listo' },
  { id: 'p7', businessId: 'b4', name: 'Bandeja paisa', priceCop: 38000, description: 'Arroz, fríjoles, chicharrón, huevo, aguacate, maduro y arepa.', modelUrl: null, status: 'listo' },
  { id: 'p8', businessId: 'b4', name: 'Arepa de la casa', priceCop: 9000, description: 'Arepa asada con queso costeño.', modelUrl: null, status: 'listo' },
  { id: 'p9', businessId: 'b5', name: 'Sombrero vueltiao fino', priceCop: 260000, description: 'Caña flecha de 23 vueltas, tejido más fino y flexible.', modelUrl: null, status: 'listo' },
  { id: 'p10', businessId: 'b5', name: 'Mochila arhuaca', priceCop: 320000, description: 'Lana tejida por artesanas de la Sierra Nevada.', modelUrl: null, status: 'listo' },
  { id: 'p11', businessId: 'b6', name: 'Cazuela de mariscos', priceCop: 56000, description: 'Camarón, calamar y pescado en salsa de coco, en olla de barro.', modelUrl: null, status: 'listo' },
  { id: 'p12', businessId: 'b6', name: 'Mojarra frita', priceCop: 48000, description: 'Con arroz de coco, patacones y limón.', modelUrl: null, status: 'listo' },
  { id: 'p13', businessId: 'b7', name: 'Cocadas surtidas', priceCop: 3000, description: 'De coco, arequipe y guayaba, hechas cada mañana.', modelUrl: null, status: 'listo' },
];

const productCount = (businessId: string) => DEMO_PRODUCTS.filter((p) => p.businessId === businessId).length;

type DemoBusiness = Omit<Business, 'ownerId' | 'status' | 'productCount'>;

const demo = (b: DemoBusiness): Business => ({ ...b, ownerId: 'demo', status: 'publicado', productCount: productCount(b.id) });

export const DEMO_BUSINESSES: Business[] = [
  demo({ id: 'b1', name: 'Arepas Mamá Inés', type: 'emprendimiento', category: 'comer', specialty: 'Comida callejera', priceLevel: 1, distanceM: 200, address: 'Calle del Arsenal #8-12', hours: 'Lunes a sábado, 8 a. m. a 9 p. m.', whatsapp: '3001234567', rating: 4.8, reviewCount: 38 }),
  demo({ id: 'b2', name: 'Tejidos Kaashi', type: 'emprendimiento', category: 'artesanias', specialty: 'Artesanías wayuu', priceLevel: 2, distanceM: 300, address: 'Calle de la Moneda #7-40', hours: 'Todos los días, 9 a. m. a 7 p. m.', whatsapp: null, rating: 4.9, reviewCount: 24 }),
  demo({ id: 'b3', name: 'Café Sierra Viva', type: 'emprendimiento', category: 'cafe_dulces', specialty: 'Café de origen', priceLevel: 2, distanceM: 450, address: 'Plaza San Diego', hours: '7 a. m. a 8 p. m.', whatsapp: null, rating: 4.7, reviewCount: 19 }),
  demo({ id: 'b4', name: 'La Fogata de Doña Rosa', type: 'establecido', category: 'comer', specialty: 'Comida típica', priceLevel: 2, distanceM: 350, address: 'Calle del Cuartel #36-77', hours: '12 m. a 10 p. m.', whatsapp: null, rating: 4.7, reviewCount: 212 }),
  demo({ id: 'b6', name: 'Mar y Coco', type: 'establecido', category: 'comer', specialty: 'Mariscos', priceLevel: 3, distanceM: 600, address: 'Calle Santo Domingo #33-10', hours: '12 m. a 11 p. m.', whatsapp: null, rating: 4.5, reviewCount: 486 }),
  demo({ id: 'b5', name: 'Galería Manos de Bolívar', type: 'establecido', category: 'artesanias', specialty: 'Artesanías del Caribe', priceLevel: 3, distanceM: 500, address: 'Las Bóvedas, local 12', hours: '9 a. m. a 8 p. m.', whatsapp: null, rating: 4.6, reviewCount: 132 }),
  demo({ id: 'b7', name: 'Dulces de Palenque', type: 'emprendimiento', category: 'cafe_dulces', specialty: 'Dulces típicos', priceLevel: 1, distanceM: 150, address: 'Portal de los Dulces', hours: '8 a. m. a 6 p. m.', whatsapp: null, rating: 4.9, reviewCount: 56 }),
];

export const DEMO_REVIEWS: Review[] = [
  { id: 'r1', businessId: 'b1', userId: 'u1', authorName: 'Tom, turista de Canadá', stars: 5, text: 'No sabía qué era una arepa de huevo. Con la vista 3D entendí y ahora vuelvo cada día.', reply: null, createdAt: '2026-11-01T15:00:00Z' },
  { id: 'r2', businessId: 'b2', userId: 'u2', authorName: 'Julia, turista de Alemania', stars: 5, text: 'Pude ver la mochila por todos lados antes de ir a la tienda. Llegué directo a comprarla.', reply: '¡Gracias por visitarnos!', createdAt: '2026-11-03T18:00:00Z' },
  { id: 'r3', businessId: 'b3', userId: 'u3', authorName: 'Mariana', stars: 4, text: 'Muy buen café y te explican de dónde viene. El lugar es pequeño.', reply: null, createdAt: '2026-11-02T10:00:00Z' },
  { id: 'r4', businessId: 'b4', userId: 'u4', authorName: 'Laura, turista de México', stars: 5, text: 'Vi la bandeja en 3D antes de pedir y llegó tal cual. Enorme, alcanza para dos.', reply: null, createdAt: '2026-11-04T20:00:00Z' },
  { id: 'r5', businessId: 'b6', userId: 'u5', authorName: 'Sofía', stars: 4, text: 'La cazuela es muy buena. En 3D se ve más pequeña de lo que llega.', reply: null, createdAt: '2026-11-05T21:00:00Z' },
  { id: 'r6', businessId: 'b5', userId: 'u6', authorName: 'Pedro', stars: 4, text: 'Productos de muy buena calidad, precios altos pero lo vale.', reply: null, createdAt: '2026-11-05T16:00:00Z' },
  { id: 'r7', businessId: 'b7', userId: 'u7', authorName: 'Emma, turista de Francia', stars: 5, text: 'Las mejores cocadas que probé en Cartagena, y la señora es encantadora.', reply: null, createdAt: '2026-11-06T17:00:00Z' },
];
