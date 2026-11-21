export declare const PROYECTO_PRODUCCION: string;
export declare function revisarEntorno(env?: Record<string, string | undefined>): { perfil: string | null; destino: 'local' | 'produccion' | 'pruebas' };
export declare function revisarEntornoPanel(env?: Record<string, string | undefined>, opciones?: { desarrollo?: boolean }): { destino: 'pruebas' | 'produccion' };
