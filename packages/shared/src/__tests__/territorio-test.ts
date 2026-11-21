import { describe, expect, test } from '@jest/globals';

import {
  DEPARTAMENTOS,
  ZIPAQUIRA,
  buscarMunicipios,
  estadoDe,
  etiquetaMunicipio,
  municipio,
  municipioMasCercano,
  normalizarTexto,
  vistaCiudad,
  type EstadoCiudad,
} from '../territorio';
import { MUNICIPIOS } from '../territorio/municipios';

describe('catálogo DIVIPOLA', () => {
  test('tiene los 1.122 municipios y áreas, con códigos DANE únicos de 5 dígitos', () => {
    expect(MUNICIPIOS).toHaveLength(1122);
    const codigos = new Set(MUNICIPIOS.map((m) => m[0]));
    expect(codigos.size).toBe(1122);
    expect(MUNICIPIOS.every((m) => /^\d{5}$/.test(m[0]) && DEPARTAMENTOS[m[2]])).toBe(true);
    expect(Object.keys(DEPARTAMENTOS)).toHaveLength(33);
  });

  test('Zipaquirá, Bogotá D. C., Tunja y Pasto con su departamento', () => {
    expect(municipio(ZIPAQUIRA)).toMatchObject({ nombre: 'Zipaquirá', departamento: 'Cundinamarca' });
    expect(etiquetaMunicipio(municipio('11001'))).toBe('Bogotá, D. C.');
    expect(etiquetaMunicipio(municipio('15001'))).toBe('Tunja, Boyacá');
    expect(etiquetaMunicipio(municipio('52001'))).toBe('Pasto, Nariño');
    expect(municipio('99999')).toBeNull();
    expect(municipio(null)).toBeNull();
  });
});

describe('buscar municipios', () => {
  test('sin tildes ni mayúsculas, primero los que empiezan por el texto', () => {
    expect(buscarMunicipios('zipaquira')[0].codigo).toBe(ZIPAQUIRA);
    expect(buscarMunicipios('BOGOTA')[0].codigo).toBe('11001');
    expect(buscarMunicipios('cucuta')[0].nombre).toBe('San José de Cúcuta');
  });

  test('homónimos: Armenia aparece en cada departamento y se distingue escribiendo el departamento', () => {
    const armenias = buscarMunicipios('armenia').filter((m) => m.nombre === 'Armenia');
    expect(armenias.map((m) => m.departamento).sort()).toEqual(['Antioquia', 'Quindío']);
    expect(buscarMunicipios('armenia quindio')[0]).toMatchObject({ nombre: 'Armenia', departamento: 'Quindío' });
  });

  test('las ciudades activas van primero y menos de 2 letras no busca', () => {
    expect(buscarMunicipios('a', 20)).toEqual([]);
    const conZipa = buscarMunicipios('zi', 5, [ZIPAQUIRA]);
    expect(conZipa[0].codigo).toBe(ZIPAQUIRA);
    expect(buscarMunicipios('san', 7)).toHaveLength(7);
  });

  test('normalizarTexto igual que la base', () => {
    expect(normalizarTexto('  Bogotá, D. C. ')).toBe('bogota d c');
    expect(normalizarTexto('Piendamó - Tunía')).toBe('piendamo tunia');
  });
});

describe('municipio más cercano (sin enviar coordenadas)', () => {
  test('la plaza de Zipaquirá, el centro de Bogotá y Tunja', () => {
    expect(municipioMasCercano(5.0225, -74.0049)?.codigo).toBe(ZIPAQUIRA);
    expect(municipioMasCercano(4.5981, -74.0758)?.codigo).toBe('11001');
    expect(municipioMasCercano(5.5353, -73.3678)?.codigo).toBe('15001');
  });

  test('fuera de Colombia: null', () => {
    expect(municipioMasCercano(40.4168, -3.7038)).toBeNull(); // Madrid
    expect(municipioMasCercano(-12.0464, -77.0428)).toBeNull(); // Lima
  });
});

describe('estado de la ciudad y qué mostrar', () => {
  const configuradas = new Map<string, EstadoCiudad>([[ZIPAQUIRA, 'activa'], ['25175', 'en_preparacion']]);

  test('las ciudades no configuradas son «próximamente»', () => {
    expect(estadoDe(ZIPAQUIRA, configuradas)).toBe('activa');
    expect(estadoDe('25175', configuradas)).toBe('en_preparacion');
    expect(estadoDe('15001', configuradas)).toBe('proximamente');
    expect(estadoDe(null, configuradas)).toBe('proximamente');
  });

  test('distingue ciudad no habilitada, error, ciudad activa sin negocios y catálogo', () => {
    expect(vistaCiudad('proximamente', 'listo', 0)).toBe('no_habilitada');
    expect(vistaCiudad('en_preparacion', 'error', 0)).toBe('no_habilitada');
    expect(vistaCiudad('activa', 'cargando', 0)).toBe('cargando');
    expect(vistaCiudad('activa', 'error', 0)).toBe('error');
    expect(vistaCiudad('activa', 'listo', 0)).toBe('sin_negocios');
    expect(vistaCiudad('activa', 'listo', 3)).toBe('catalogo');
  });
});
