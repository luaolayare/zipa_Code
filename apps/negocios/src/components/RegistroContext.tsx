import type { Business, BusinessType, Category, MainCategory } from '@zipa/shared';
import { createContext, useContext, useState, type ReactNode } from 'react';

import type { ProductForm } from './ProductEditor';

export interface DraftProduct {
  form: ProductForm; // nombre, precio, descripción, foto y video (archivos locales hasta enviar)
  savedId: string | null; // id ya creado en la base, para no duplicarlo si hay que reintentar el envío
}

export interface RegistroDraft {
  name: string;
  type: BusinessType;
  mainCategory: MainCategory;
  subcategoryId: string; // '' mientras no elija
  tags: string[]; // etiquetas secundarias, hasta 3
  category: Category; // vieja: se deriva de la subcategoría (colores y textos)
  address: string;
  hours: string;
  whatsapp: string;
  photoUri: string | null; // foto del local o puesto (archivo local hasta enviar el registro)
  photoMimeType: string | null;
  idNumber: string; // cédula o NIT, solo visible para el equipo de revisión
  products: DraftProduct[];
  businessId: string | null; // id ya creado en la base, para no duplicarlo si hay que reintentar el envío
  verificationSaved: boolean; // la foto y la cédula ya se guardaron (en un intento anterior)
}

const empty: RegistroDraft = {
  name: '',
  type: 'emprendimiento',
  mainCategory: 'restaurantes',
  subcategoryId: '',
  tags: [],
  category: 'comer',
  address: '',
  hours: '',
  whatsapp: '',
  photoUri: null,
  photoMimeType: null,
  idNumber: '',
  products: [],
  businessId: null,
  verificationSaved: false,
};

/** Retoma un registro que quedó sin terminar (negocio en borrador o no aprobado). */
export const draftFromBusiness = (b: Business): Partial<RegistroDraft> => ({
  name: b.name,
  type: b.type,
  mainCategory: b.mainCategory ?? (b.category === 'comer' ? 'restaurantes' : 'emprendimientos'),
  subcategoryId: b.subcategoryId ?? '',
  tags: b.tags,
  category: b.category,
  address: b.address,
  hours: b.hours ?? '',
  whatsapp: b.whatsapp ?? '',
  businessId: b.id,
  verificationSaved: false,
});

type Ctx = { draft: RegistroDraft; update: (p: Partial<RegistroDraft>) => void; reset: () => void };
const RegistroCtx = createContext<Ctx | null>(null);

/** Guarda en memoria lo que el negocio llena durante los 5 pasos del registro. */
export function RegistroProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<RegistroDraft>(empty);
  return (
    <RegistroCtx.Provider value={{ draft, update: (p) => setDraft((d) => ({ ...d, ...p })), reset: () => setDraft(empty) }}>
      {children}
    </RegistroCtx.Provider>
  );
}

export function useRegistro() {
  const v = useContext(RegistroCtx);
  if (!v) throw new Error('useRegistro debe usarse dentro de <RegistroProvider>');
  return v;
}
