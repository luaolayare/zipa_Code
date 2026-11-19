import { describe, expect, it } from '@jest/globals';

import { DEMO_CATEGORIES } from '../categories';
import {
  CLASSIFICATION_EXAMPLES,
  DELIVERY_MODES,
  DELIVERY_NOTE_MAX,
  configuredSocial,
  deliverySummary,
  emptyLinks,
  normalizeSocialLink,
  socialLabel,
  validateLinks,
} from '../contact';
import { PHOTO_PRESETS, resizeFor } from '../photos';
import { productWord } from '../presentation';

const url = (r: ReturnType<typeof normalizeSocialLink>) => (r.ok ? r.url : `ERROR: ${r.error}`);

describe('clasificación: café y productos (ayuda «¿Qué vendes principalmente?»)', () => {
  it('café empacado es un producto local (Emprendimientos) y café preparado es una cafetería (Restaurantes)', () => {
    const empacado = CLASSIFICATION_EXAMPLES.find((e) => e.sells.startsWith('Café empacado'))!;
    const preparado = CLASSIFICATION_EXAMPLES.find((e) => e.sells.startsWith('Café preparado'))!;
    expect([empacado.main, empacado.subcategoryId]).toEqual(['emprendimientos', 'productos_locales']);
    expect([preparado.main, preparado.subcategoryId]).toEqual(['restaurantes', 'cafeterias']);
    // Y con eso cambian las palabras: el café empacado se vende como producto; el preparado, como plato.
    expect(productWord({ mainCategory: empacado.main, subcategoryId: empacado.subcategoryId, category: 'artesanias' })).toBe('producto');
    expect(productWord({ mainCategory: preparado.main, subcategoryId: preparado.subcategoryId, category: 'cafe_dulces' })).toBe('plato');
  });

  it('cada ejemplo apunta a una subcategoría que existe, dentro de su categoría principal y con su nombre', () => {
    for (const e of CLASSIFICATION_EXAMPLES) {
      const sub = DEMO_CATEGORIES.find((c) => c.id === e.subcategoryId);
      expect(sub?.parentId).toBe(e.main);
      expect(sub?.name).toBe(e.subcategory);
    }
  });
});

describe('redes sociales: validar y dejar el enlace en https', () => {
  it('Instagram: acepta @usuario, usuario con puntos o el enlace completo', () => {
    expect(url(normalizeSocialLink('instagram', '@zipa_lo.tiene'))).toBe('https://www.instagram.com/zipa_lo.tiene');
    expect(url(normalizeSocialLink('instagram', 'http://instagram.com/zipa/?hl=es'))).toBe('https://www.instagram.com/zipa');
    expect(url(normalizeSocialLink('instagram', 'https://www.Instagram.com/zipa'))).toBe('https://www.instagram.com/zipa');
  });

  it('TikTok: acepta @usuario o el enlace con @', () => {
    expect(url(normalizeSocialLink('tiktok', '@heladosdon'))).toBe('https://www.tiktok.com/@heladosdon');
    expect(url(normalizeSocialLink('tiktok', 'tiktok.com/@heladosdon?lang=es'))).toBe('https://www.tiktok.com/@heladosdon');
    expect(normalizeSocialLink('tiktok', 'tiktok.com/heladosdon').ok).toBe(false);
  });

  it('Facebook: página, perfil con id, fb.com y m.facebook.com', () => {
    expect(url(normalizeSocialLink('facebook', 'mi.pagina'))).toBe('https://www.facebook.com/mi.pagina');
    expect(url(normalizeSocialLink('facebook', 'https://m.facebook.com/MiPagina/'))).toBe('https://www.facebook.com/MiPagina');
    expect(url(normalizeSocialLink('facebook', 'fb.com/MiPagina'))).toBe('https://www.facebook.com/MiPagina');
    expect(url(normalizeSocialLink('facebook', 'https://www.facebook.com/profile.php?id=100012345678'))).toBe('https://www.facebook.com/profile.php?id=100012345678');
  });

  it('sitio web: agrega https, pasa http a https y quita "www."', () => {
    expect(url(normalizeSocialLink('website', 'tunegocio.com'))).toBe('https://tunegocio.com');
    expect(url(normalizeSocialLink('website', 'http://www.TuNegocio.com.co/menu'))).toBe('https://tunegocio.com.co/menu');
    expect(url(normalizeSocialLink('website', 'https://tunegocio.com/'))).toBe('https://tunegocio.com');
  });

  it('vacío es válido (sin enlace)', () => {
    expect(normalizeSocialLink('website', '   ')).toEqual({ ok: true, url: null });
  });

  it('rechaza enlaces peligrosos o engañosos', () => {
    const malos: [Parameters<typeof normalizeSocialLink>[0], string][] = [
      ['website', 'javascript:alert(1)'],
      ['website', 'data:text/html,<script>'],
      ['website', 'https://usuario@evil.com'],
      ['website', 'https://192.168.0.1/admin'],
      ['website', 'http://localhost:3000'],
      ['website', 'https://tunegocio.com/"><script>'],
      ['website', 'tu negocio.com'],
      ['website', 'bit.ly/abc'],
      ['website', 'x'.repeat(190) + '.com/' + 'y'.repeat(20)],
      ['instagram', 'https://evil.com/zipa'],
      ['instagram', 'https://instagram.com.evil.com/zipa'],
      ['instagram', '@zipa lo tiene'],
      ['facebook', 'https://facebook.com.evil.com/pagina'],
      ['facebook', 'https://evil.com/facebook.com'],
      ['tiktok', 'https://evil.com/@zipa'],
    ];
    for (const [red, valor] of malos) expect([red, valor, normalizeSocialLink(red, valor).ok]).toEqual([red, valor, false]);
  });

  it('el texto del botón muestra el usuario o el dominio', () => {
    expect(socialLabel('instagram', 'https://www.instagram.com/zipa')).toBe('@zipa');
    expect(socialLabel('tiktok', 'https://www.tiktok.com/@zipa')).toBe('@zipa');
    expect(socialLabel('website', 'https://tunegocio.com/menu')).toBe('tunegocio.com/menu');
  });
});

describe('modalidades de entrega (solo informativas)', () => {
  const base = { instagram: '', facebook: '', tiktok: '', website: '', deliveryModes: [], deliveryNote: '' };

  it('ordena, quita repetidos y arma el resumen corto', () => {
    const r = validateLinks({ ...base, deliveryModes: ['envios_nacionales', 'presencial', 'presencial'] });
    expect(r.ok && r.links.deliveryModes).toEqual(['presencial', 'envios_nacionales']);
    expect(deliverySummary(['envios_nacionales', 'domicilio_local'])).toBe('Domicilio local · Envíos nacionales');
    expect(deliverySummary([])).toBe('');
  });

  it('las seis modalidades del pedido existen', () => {
    expect(DELIVERY_MODES.map((m) => m.label)).toEqual([
      'Atención presencial', 'Recogida en el establecimiento', 'Entrega a convenir', 'Domicilio local', 'Envíos nacionales', 'Envíos internacionales',
    ]);
  });

  it('condiciones: espacios normalizados, límite de largo y sin palabras ofensivas', () => {
    const ok = validateLinks({ ...base, deliveryNote: '  Domicilio   gratis en el centro  ' });
    expect(ok.ok && ok.links.deliveryNote).toBe('Domicilio gratis en el centro');
    expect(validateLinks({ ...base, deliveryNote: 'a'.repeat(DELIVERY_NOTE_MAX + 1) })).toMatchObject({ ok: false, field: 'deliveryNote' });
    expect(validateLinks({ ...base, deliveryNote: 'Envíos rápidos, malparido' })).toMatchObject({ ok: false, field: 'deliveryNote' });
  });

  it('un enlace inválido detiene el guardado e indica el campo', () => {
    expect(validateLinks({ ...base, website: 'javascript:alert(1)' })).toMatchObject({ ok: false, field: 'website' });
  });

  it('solo se muestran las redes configuradas', () => {
    expect(configuredSocial(null)).toEqual([]);
    expect(configuredSocial({ ...emptyLinks, tiktok: 'https://www.tiktok.com/@zipa' }).map((n) => n.id)).toEqual(['tiktok']);
  });
});

describe('fotos: tamaño final', () => {
  it('reduce el lado más largo sin deformar y nunca agranda', () => {
    expect(resizeFor(4000, 3000, 1600)).toEqual({ width: 1600 });
    expect(resizeFor(3000, 4000, 1600)).toEqual({ height: 1600 });
    expect(resizeFor(1200, 800, 1600)).toBeNull();
    expect(resizeFor(0, 0, 1600)).toBeNull();
  });

  it('producto y logo se recortan cuadrados; el documento de verificación no se recorta', () => {
    expect(PHOTO_PRESETS.producto).toMatchObject({ edit: true, aspect: [1, 1] });
    expect(PHOTO_PRESETS.logo.maxSide).toBeLessThan(PHOTO_PRESETS.producto.maxSide);
    expect(PHOTO_PRESETS.verificacion.edit).toBe(false);
  });
});
