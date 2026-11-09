import type { BusinessType, Category } from '@zipa/shared';
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface DraftProduct {
  name: string;
  priceCop: number | null;
  videoUri: string | null; // video de 20 s grabado con el celular
}

export interface RegistroDraft {
  name: string;
  type: BusinessType;
  category: Category;
  address: string;
  hours: string;
  whatsapp: string;
  photoUri: string | null; // foto del local o puesto
  idNumber: string; // cédula o NIT, solo visible para el equipo de revisión
  products: DraftProduct[];
}

const empty: RegistroDraft = {
  name: '',
  type: 'emprendimiento',
  category: 'comer',
  address: '',
  hours: '',
  whatsapp: '',
  photoUri: null,
  idNumber: '',
  products: [],
};

const Ctx = createContext<{ draft: RegistroDraft; update: (p: Partial<RegistroDraft>) => void; reset: () => void } | null>(null);

/** Guarda en memoria lo que el negocio llena durante los 5 pasos del registro. */
export function RegistroProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<RegistroDraft>(empty);
  return (
    <Ctx.Provider value={{ draft, update: (p) => setDraft((d) => ({ ...d, ...p })), reset: () => setDraft(empty) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRegistro() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRegistro debe usarse dentro de <RegistroProvider>');
  return v;
}
