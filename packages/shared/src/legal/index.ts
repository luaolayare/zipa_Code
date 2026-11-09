import { POLITICA_PRIVACIDAD } from './politica-privacidad';
import { TERMINOS_CLIENTES } from './terminos-clientes';
import { TERMINOS_NEGOCIOS } from './terminos-negocios';
import type { ConsentInput, LegalApp, LegalDocument } from './tipos';

export * from './tipos';
export { POLITICA_PRIVACIDAD, TERMINOS_CLIENTES, TERMINOS_NEGOCIOS };

/** Términos que aplican en cada app. */
export const TERMINOS_POR_APP: Record<LegalApp, LegalDocument> = {
  clientes: TERMINOS_CLIENTES,
  negocios: TERMINOS_NEGOCIOS,
};

/** Lo que se acepta al registrarse en cada app: privacidad + sus términos, en la versión vigente. */
export const consentsFor = (app: LegalApp): ConsentInput[] => [
  { document: POLITICA_PRIVACIDAD.id, version: POLITICA_PRIVACIDAD.VERSION, app },
  { document: TERMINOS_POR_APP[app].id, version: TERMINOS_POR_APP[app].VERSION, app },
];
