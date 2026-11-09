import type { LegalDocument } from './tipos';

// BORRADOR para revisión de un abogado. Los textos entre [CORCHETES] los completa el responsable.
export const TERMINOS_NEGOCIOS: LegalDocument = {
  id: 'terminos_negocios',
  title: 'Términos y condiciones para negocios',
  VERSION: '1.0',
  FECHA: '2026-11-08',
  borrador: true,
  intro:
    'Estos términos regulan el uso de la app Vitrina Negocios por parte de restaurantes, emprendimientos y sus responsables. Al crear tu cuenta y registrar tu negocio los aceptas.',
  sections: [
    {
      heading: '1. Quiénes somos',
      paragraphs: [
        'Vitrina Local es operado por [NOMBRE DEL RESPONSABLE], identificado con [NIT/CÉDULA], con domicilio en [CIUDAD], Colombia. Contacto: [CORREO DE SOPORTE].',
      ],
    },
    {
      heading: '2. Qué ofrece Vitrina Local',
      paragraphs: [
        'Una vitrina digital donde tu negocio aparece para clientes y turistas, con tus productos en 3D y las reseñas de tus clientes.',
        'Vitrina Local no vende tus productos, no recibe pagos de tus clientes ni interviene en tus ventas. Tú eres el único responsable de tus productos, precios, horarios, calidad, atención, permisos y obligaciones legales y tributarias, incluido el Estatuto del Consumidor (Ley 1480 de 2011).',
        'Condiciones comerciales del servicio: [CONDICIONES COMERCIALES O GRATUIDAD].',
      ],
    },
    {
      heading: '3. Registro y verificación',
      paragraphs: [
        'Quien registra el negocio declara que es su dueño o que está autorizado para representarlo, y que la información que entrega es verdadera y está actualizada.',
        'Para publicar el negocio revisamos la cédula o NIT del responsable y una foto del local o puesto. Podemos pedir información adicional o rechazar el registro si no podemos verificarlo. La cédula o NIT no se muestra a los clientes.',
        'No necesitas estar inscrito en la Cámara de Comercio para registrarte, pero sí debes cumplir las normas que apliquen a tu actividad.',
      ],
    },
    {
      heading: '4. Fotos, videos y modelos 3D que subes',
      paragraphs: [
        'Las fotos y videos siguen siendo tuyos. Al subirlos nos das una licencia gratuita, no exclusiva, válida en todo el mundo y por el tiempo que estén publicados, para guardarlos, procesarlos (incluido generar modelos 3D a partir de los videos), adaptarlos al formato de la app, mostrarlos en las apps de Vitrina Local y usarlos para promocionar tu negocio dentro de Vitrina Local.',
        'Si quieres que usemos tu contenido en publicidad fuera de las apps (redes sociales, sitio web, material impreso), te pediremos autorización aparte.',
        'Declaras que tienes los derechos sobre ese contenido y, si aparecen personas, su autorización. Cuando retires un producto o elimines tu cuenta, dejaremos de mostrar ese contenido y lo borraremos en un plazo de [PLAZO DE BORRADO] días.',
        'Los modelos 3D son representaciones aproximadas generadas automáticamente. Revisa cómo quedan antes de publicarlos.',
      ],
    },
    {
      heading: '5. Información y precios',
      paragraphs: [
        'Mantén actualizados tus precios, horarios y productos. Los precios se muestran en pesos colombianos y son responsabilidad tuya.',
        'No publiques productos que no tengas disponibles ni imágenes que no correspondan al producto real.',
      ],
    },
    {
      heading: '6. Reseñas de tus clientes',
      paragraphs: [
        'Puedes responder las reseñas de forma respetuosa. No puedes borrarlas ni editarlas, ni ofrecer beneficios a cambio de reseñas positivas, ni publicar reseñas sobre tu propio negocio o tu competencia.',
        'Si una reseña incumple las reglas, puedes reportarla desde la app y la revisaremos.',
      ],
    },
    {
      heading: '7. Contenido prohibido',
      paragraphs: [
        'No está permitido publicar contenido falso o engañoso, sexual, violento, discriminatorio, que infrinja derechos de terceros, que promocione productos ilegales o que requieran permisos que no tienes, ni datos personales de terceros sin su autorización.',
      ],
    },
    {
      heading: '8. Suspensión y retiro',
      paragraphs: [
        'Podemos ocultar productos o suspender negocios que incumplan estos términos, que tengan reportes fundados o que no podamos verificar. Si es posible, te avisaremos el motivo y podrás responder a [CORREO DE SOPORTE].',
        'Puedes retirar tu negocio y eliminar tu cuenta en cualquier momento desde el Panel.',
      ],
    },
    {
      heading: '9. Responsabilidad',
      paragraphs: [
        'Trabajamos para que la app funcione bien, pero no garantizamos un número de visitas, ventas ni que el servicio esté disponible todo el tiempo. En lo que permita la ley, no respondemos por la relación entre tu negocio y tus clientes.',
      ],
    },
    {
      heading: '10. Datos personales',
      paragraphs: [
        'Tratamos tus datos y los de tu negocio según la Política de privacidad, que también aceptas al crear tu cuenta.',
      ],
    },
    {
      heading: '11. Cambios a estos términos',
      paragraphs: [
        'Si cambiamos estos términos te avisaremos en la app con anticipación y te pediremos aceptar la nueva versión para seguir publicando.',
      ],
    },
    {
      heading: '12. Ley aplicable',
      paragraphs: [
        'Estos términos se rigen por la ley colombiana. Cualquier diferencia se intentará resolver primero por acuerdo directo escribiendo a [CORREO DE SOPORTE]; si no, la resolverán los jueces de [CIUDAD], Colombia.',
      ],
    },
  ],
};
