import { normalize } from './categories';

/**
 * Filtro básico de palabras ofensivas para reseñas y respuestas (exigencia de App Store y Google Play
 * para contenido generado por usuarios). Es una primera barrera: los reportes y la revisión humana
 * cubren lo que se escape.
 *
 * La MISMA lista vive en supabase/migrations/0004_reportes_y_bloqueos.sql (función texto_ofensivo),
 * para que no se pueda saltar desde fuera de la app. Si cambias una, cambia la otra.
 */
export const OFFENSIVE_WORDS = [
  'hijueputa', 'hijuepucha', 'hpta', 'hp', 'gonorrea', 'malparido', 'malparida', 'malnacido', 'malnacida',
  'puta', 'puto', 'putas', 'putos', 'mierda', 'mierdero', 'pendejo', 'pendeja', 'imbecil', 'idiota',
  'estupido', 'estupida', 'perra', 'zorra', 'marica', 'maricon', 'careverga', 'verga', 'cabron', 'cabrona',
  'culo', 'culicagado', 'huevon', 'guevon', 'webon', 'gueva', 'carechimba', 'lameculos',
  'retrasado', 'mongolico', 'subnormal',
] as const;

/**
 * Palabras ofensivas encontradas en el texto (sin tildes ni mayúsculas, por palabra completa,
 * incluido el plural: "malparido", "malparidos", "maricones").
 */
export function findOffensiveWords(text: string): string[] {
  const words = ` ${normalize(text).replace(/[^a-z0-9]+/g, ' ')} `;
  return OFFENSIVE_WORDS.filter((w) => [w, `${w}s`, `${w}es`].some((form) => words.includes(` ${form} `)));
}

export const OFFENSIVE_MESSAGE =
  'Tu texto tiene palabras ofensivas. Cuenta tu experiencia con respeto: así ayudas a otros viajeros y al negocio.';

/** Error que se lanza al publicar un texto con palabras ofensivas. */
export class OffensiveTextError extends Error {
  constructor() {
    super(OFFENSIVE_MESSAGE);
    this.name = 'OffensiveTextError';
  }
}

/** Las cuentas nuevas califican 24 horas después de crearse (misma regla que la migración 0012). */
export const NEW_ACCOUNT_REVIEW_WAIT_MS = 24 * 60 * 60 * 1000;

/**
 * Si la cuenta todavía no puede publicar su primera reseña en un negocio, devuelve desde cuándo
 * podrá (ISO); si ya puede, null. Solo informa: la base de datos es la que aplica la regla.
 */
export function reviewAllowedFrom(accountCreatedAt: string | undefined, now: Date): string | null {
  const created = accountCreatedAt ? Date.parse(accountCreatedAt) : NaN;
  if (Number.isNaN(created)) return null;
  const from = created + NEW_ACCOUNT_REVIEW_WAIT_MS;
  return from > now.getTime() ? new Date(from).toISOString() : null;
}
