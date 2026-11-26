// Datos del sitio que NO se inventan. Mientras un valor sea null, la web muestra «Por completar» en ese
// punto y el build lo advierte (y `build:estricto` falla). Complétalos aquí y vuelve a publicar.
export const SITIO = {
  dominio: 'https://localmentetuyo.com',
  marca: 'LocalmenteTuyo',
  eslogan: 'Lo mejor de aquí, cerquita de ti.',
  desarrollador: { nombre: 'SCALIX Cloud', web: 'https://scalix-cloud.com/' },

  // Enlaces públicos de Google Play. Hoy las apps están en prueba interna: no hay enlace público todavía.
  // Cuando estén abiertas al público:
  //   clientes: 'https://play.google.com/store/apps/details?id=com.localmentetuyo.app'
  //   negocios: 'https://play.google.com/store/apps/details?id=com.localmentetuyo.negocios'
  play: {
    clientes: null,
    negocios: null,
  },

  // Responsable del tratamiento (Ley 1581 de 2012; Decreto 1377 de 2013, art. 13: nombre o razón social,
  // domicilio, dirección, correo y teléfono). El número de identificación NO se publica ni se guarda aquí.
  responsable: {
    // Nombre completo de la persona natural titular (o razón social de la empresa, si es ella la responsable).
    nombre: 'Luis Alfredo Olaya Requenet',
    domicilio: 'Zipaquirá, Cundinamarca, Colombia',
    direccion: 'Carrera 22 # 9-68', // solo se muestra en la política de privacidad
    correoPrivacidad: 'luaolayare17@gmail.com',
    telefono: '+57 318 486 4874', // solo en la política y en soporte, como texto (no es canal de WhatsApp)
  },

  correoSoporte: 'luaolayare17@gmail.com',

  plazos: {
    supresionDias: 30, // días naturales para completar la supresión tras una solicitud válida (sin exceder la ley)
    interesMeses: 12, // conservación máxima de un registro de interés comercial
  },
  edadMinima: 18,
  // Fecha de esta versión de los documentos (AAAA-MM-DD). Se actualiza al publicar cambios.
  fechaVigencia: '2026-11-26',
};
