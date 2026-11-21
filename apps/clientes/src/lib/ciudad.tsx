// Ciudad que se explora (no es lo mismo que dónde está el celular).
// - La ciudad elegida se guarda en el celular y controla qué negocios se ven.
// - La ubicación física solo se pide cuando la persona toca «Usar mi ubicación»: se usa una vez, de forma
//   aproximada, para sugerir el municipio más cercano (calculado aquí mismo) y no se guarda ni se envía.
// - Si la persona eligió una ciudad a mano, nunca se reemplaza sola por su ubicación.
// - Sin ciudad elegida ni ubicación: se sugiere Zipaquirá y se avisa que se puede cambiar.
import {
  ZIPAQUIRA,
  deviceStore,
  estadoDe,
  municipio,
  municipioMasCercano,
  useAuth,
  type EstadoCiudad,
  type Municipio,
} from '@zipa/shared';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const CLAVE = 'localmentetuyo.ciudad.v1';

/** De dónde salió la ciudad: la eligió la persona, salió de su ubicación o es la sugerencia inicial. */
export type OrigenCiudad = 'manual' | 'ubicacion' | 'sugerida';

export type ResultadoUbicacion =
  | { tipo: 'ok'; municipio: Municipio }
  | { tipo: 'denegado' }
  | { tipo: 'desactivada' }
  | { tipo: 'fuera_de_colombia' }
  | { tipo: 'error' };

interface CiudadValor {
  listo: boolean; // ya se leyó la ciudad guardada
  codigo: string;
  municipio: Municipio;
  origen: OrigenCiudad;
  /** Estado comercial de la ciudad elegida; null mientras se consulta (o si falló la consulta). */
  estado: EstadoCiudad | null;
  estadosError: boolean;
  /** Ciudades abiertas al público (para sugerir cuando la elegida no está activa). */
  activas: Municipio[];
  estadoDe: (codigo: string) => EstadoCiudad | null;
  elegir: (codigo: string, origen?: OrigenCiudad) => void;
  /** Pide permiso (solo cuando la persona lo toca) y devuelve el municipio más cercano, sin elegirlo. */
  ubicar: () => Promise<ResultadoUbicacion>;
  recargarEstados: () => void;
}

const Ctx = createContext<CiudadValor | null>(null);

async function ubicacionActual(pedirPermiso: boolean): Promise<ResultadoUbicacion> {
  try {
    const actual = await Location.getForegroundPermissionsAsync();
    let concedido = actual.granted;
    if (!concedido && pedirPermiso && actual.canAskAgain) concedido = (await Location.requestForegroundPermissionsAsync()).granted;
    if (!concedido) return { tipo: 'denegado' };
    if (!(await Location.hasServicesEnabledAsync())) return { tipo: 'desactivada' };
    // Una sola lectura aproximada (la última conocida si es reciente): basta para saber el municipio.
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
    const m = municipioMasCercano(pos.coords.latitude, pos.coords.longitude);
    return m ? { tipo: 'ok', municipio: m } : { tipo: 'fuera_de_colombia' };
  } catch {
    return { tipo: 'error' };
  }
}

export function CiudadProvider({ children }: { children: ReactNode }) {
  const { api } = useAuth();
  const [listo, setListo] = useState(false);
  const [sel, setSel] = useState<{ codigo: string; origen: OrigenCiudad }>({ codigo: ZIPAQUIRA, origen: 'sugerida' });
  const [estados, setEstados] = useState<Map<string, EstadoCiudad> | null>(null);
  const [estadosError, setEstadosError] = useState(false);

  // Estados de las ciudades: se piden al abrir y cada vez que se toca «Intentar de nuevo».
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vivo = true;
    api
      .listCityStatuses()
      .then((l) => { if (vivo) { setEstados(new Map(l.map((c) => [c.codigo, c.estado]))); setEstadosError(false); } })
      .catch(() => { if (vivo) setEstadosError(true); });
    return () => { vivo = false; };
  }, [api, intento]);
  const recargarEstados = useCallback(() => {
    setEstadosError(false);
    setIntento((n) => n + 1);
  }, []);

  const guardar = useCallback((s: { codigo: string; origen: OrigenCiudad }) => {
    setSel(s);
    deviceStore.setItem(CLAVE, JSON.stringify(s)).catch(() => {});
  }, []);

  // Al abrir: la ciudad guardada. Si no hay, y el permiso YA estaba concedido, se usa la ubicación (sin
  // preguntar); si no, Zipaquirá como sugerencia.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const raw = await deviceStore.getItem(CLAVE);
        const g = raw ? (JSON.parse(raw) as { codigo?: string; origen?: OrigenCiudad }) : null;
        if (g?.codigo && municipio(g.codigo)) {
          if (vivo) setSel({ codigo: g.codigo, origen: g.origen ?? 'manual' });
          return;
        }
        const u = await ubicacionActual(false);
        if (vivo && u.tipo === 'ok') guardar({ codigo: u.municipio.codigo, origen: 'ubicacion' });
      } catch {
        // Sin almacenamiento: queda la sugerencia (Zipaquirá).
      } finally {
        if (vivo) setListo(true);
      }
    })();
    return () => { vivo = false; };
  }, [guardar]);

  const valor = useMemo<CiudadValor>(() => {
    const activas = estados ? [...estados].filter(([, e]) => e === 'activa').map(([c]) => municipio(c)).filter((m): m is Municipio => !!m) : [];
    return {
      listo,
      codigo: sel.codigo,
      municipio: municipio(sel.codigo) ?? (municipio(ZIPAQUIRA) as Municipio),
      origen: sel.origen,
      estado: estados ? estadoDe(sel.codigo, estados) : null,
      estadosError,
      activas,
      estadoDe: (c) => (estados ? estadoDe(c, estados) : null),
      elegir: (codigo, origen = 'manual') => { if (municipio(codigo)) guardar({ codigo, origen }); },
      ubicar: () => ubicacionActual(true),
      recargarEstados,
    };
  }, [listo, sel, estados, estadosError, guardar, recargarEstados]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useCiudad(): CiudadValor {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCiudad debe usarse dentro de <CiudadProvider>');
  return v;
}
