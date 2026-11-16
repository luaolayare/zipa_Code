export const CATEGORIA: Record<string, string> = { comer: 'Comer', artesanias: 'Artesanías', cafe_dulces: 'Café y dulces' };
export const TIPO: Record<string, string> = { emprendimiento: 'Emprendimiento', establecido: 'Negocio establecido' };
export const ESTADO: Record<string, string> = { en_revision: 'En revisión', publicado: 'Publicado', rechazado: 'No aprobado', borrador: 'Sin terminar' };
export const MOTIVO: Record<string, string> = {
  ofensivo: 'Ofensivo, acoso o discriminación',
  falso: 'Falso o engañoso',
  spam: 'Publicidad o spam',
  datos_personales: 'Datos personales de alguien',
  otro: 'Otro motivo',
};

export const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

export const pesos = (n: number | null) => (n == null ? 'Sin precio' : '$' + n.toLocaleString('es-CO'));
