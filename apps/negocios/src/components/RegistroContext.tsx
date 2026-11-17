import type { Business, BusinessType, Category, LocalFile, MainCategory } from '@zipa/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

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
  logo: LocalFile | null; // logo elegido en el celular (se sube al enviar el registro)
  logoUrl: string | null; // logo ya guardado (si se retoma un registro)
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
  logo: null,
  logoUrl: null,
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
  logoUrl: b.logoUrl,
  verificationSaved: false,
});

type Ctx = { draft: RegistroDraft; update: (p: Partial<RegistroDraft>) => void; reset: () => void; restored: boolean };
const RegistroCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = 'zipa:registro-negocio:v1';

/**
 * Lo que se guarda en el celular para retomar el registro si se cierra la app. La cédula o NIT
 * NO se guarda (dato sensible): se vuelve a pedir.
 */
export const draftToStore = (d: RegistroDraft): Partial<RegistroDraft> => {
  const { idNumber: _omit, ...rest } = d;
  return rest;
};

/** Hay algo que valga la pena retomar. */
export const hasProgress = (d: Partial<RegistroDraft>) => !!(d.name?.trim() || d.subcategoryId || d.address?.trim() || d.products?.length);

/** Lo que el negocio llena durante los 5 pasos del registro, guardado también en el celular. */
export function RegistroProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<RegistroDraft>(empty);
  const [restored, setRestored] = useState(false);
  const loaded = useRef(false);

  // Al abrir la app: si quedó un registro a medias, se retoma.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as Partial<RegistroDraft>) : null;
        if (saved && hasProgress(saved)) {
          setDraft((d) => ({ ...d, ...saved, idNumber: '' }));
          setRestored(true);
        }
      })
      .catch(() => {})
      .finally(() => { loaded.current = true; });
  }, []);

  // Cada cambio se guarda (después de cargar, para no pisar lo guardado con el borrador vacío).
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      (hasProgress(draft) ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draftToStore(draft))) : AsyncStorage.removeItem(STORAGE_KEY)).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const reset = () => {
    setDraft(empty);
    setRestored(false);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  return (
    <RegistroCtx.Provider value={{ draft, update: (p) => setDraft((d) => ({ ...d, ...p })), reset, restored }}>
      {children}
    </RegistroCtx.Provider>
  );
}

export function useRegistro() {
  const v = useContext(RegistroCtx);
  if (!v) throw new Error('useRegistro debe usarse dentro de <RegistroProvider>');
  return v;
}
