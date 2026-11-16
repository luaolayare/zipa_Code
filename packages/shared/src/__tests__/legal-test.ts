import { describe, expect, it } from '@jest/globals';

import { BRAND } from '../brand';
import { POLITICA_PRIVACIDAD, TERMINOS_CLIENTES, TERMINOS_NEGOCIOS, consentsFor } from '../legal';

const DOCS = [POLITICA_PRIVACIDAD, TERMINOS_CLIENTES, TERMINOS_NEGOCIOS];

describe('documentos legales', () => {
  it.each(DOCS)('$id tiene versión, fecha válida y contenido', (doc) => {
    expect(doc.VERSION).toMatch(/^\d+\.\d+$/);
    expect(doc.FECHA).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(doc.FECHA))).toBe(false);
    expect(doc.sections.length).toBeGreaterThan(0);
    for (const s of doc.sections) expect(s.paragraphs.length).toBeGreaterThan(0);
  });

  it('usan el nombre de la marca y no el nombre anterior', () => {
    for (const doc of DOCS) {
      const texto = JSON.stringify(doc);
      expect(texto).toContain(BRAND.name);
      expect(texto).not.toMatch(/Vitrina/);
    }
  });

  it('la política de privacidad cita la Ley 1581 de 2012', () => {
    expect(JSON.stringify(POLITICA_PRIVACIDAD)).toContain('Ley 1581 de 2012');
  });
});

describe('consentsFor', () => {
  it('clientes aceptan privacidad y términos de clientes en su versión vigente', () => {
    expect(consentsFor('clientes')).toEqual([
      { document: 'privacidad', version: POLITICA_PRIVACIDAD.VERSION, app: 'clientes' },
      { document: 'terminos_clientes', version: TERMINOS_CLIENTES.VERSION, app: 'clientes' },
    ]);
  });

  it('negocios aceptan privacidad y términos de negocios', () => {
    expect(consentsFor('negocios').map((c) => c.document)).toEqual(['privacidad', 'terminos_negocios']);
  });
});
