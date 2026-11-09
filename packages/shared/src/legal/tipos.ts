/** Documentos que el usuario acepta. Deben coincidir con el check de la tabla consents. */
export type LegalDocumentId = 'privacidad' | 'terminos_clientes' | 'terminos_negocios';

export type LegalApp = 'clientes' | 'negocios';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  VERSION: string;
  FECHA: string; // AAAA-MM-DD, fecha de esta versión
  /** true mientras el texto no lo haya revisado un abogado. La pantalla lo avisa. */
  borrador: boolean;
  intro: string;
  sections: LegalSection[];
}

/** Lo que se guarda cuando alguien acepta un documento. */
export interface ConsentInput {
  document: LegalDocumentId;
  version: string;
  app: LegalApp;
}
