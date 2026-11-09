import type { LegalDocument } from './tipos';

// BORRADOR para revisión de un abogado. Los textos entre [CORCHETES] los completa el responsable.
export const TERMINOS_CLIENTES: LegalDocument = {
  id: 'terminos_clientes',
  title: 'Términos y condiciones para clientes',
  VERSION: '1.0',
  FECHA: '2026-11-08',
  borrador: true,
  intro:
    'Estos términos regulan el uso de la app Vitrina Local por parte de clientes y turistas. Al crear una cuenta los aceptas. Si no estás de acuerdo, puedes seguir explorando como invitado sin crear cuenta.',
  sections: [
    {
      heading: '1. Quiénes somos',
      paragraphs: [
        'Vitrina Local es un directorio de restaurantes y emprendimientos locales operado por [NOMBRE DEL RESPONSABLE], identificado con [NIT/CÉDULA], con domicilio en [CIUDAD], Colombia. Contacto: [CORREO DE SOPORTE].',
      ],
    },
    {
      heading: '2. Vitrina Local no vende productos',
      paragraphs: [
        'La app muestra información de negocios independientes. No vendemos, no cobramos ni entregamos sus productos, y no somos parte de la compra que hagas.',
        'Cada negocio es el único responsable de sus productos, precios, disponibilidad, horarios, calidad y atención, y de cumplir con el Estatuto del Consumidor (Ley 1480 de 2011). Los precios que ves los publica el negocio y pueden cambiar.',
        'Los modelos 3D y la vista en realidad aumentada son representaciones aproximadas creadas a partir de videos del negocio. El producto real puede variar en tamaño, color o presentación.',
      ],
    },
    {
      heading: '3. Tu cuenta',
      paragraphs: [
        'Debes dar información verdadera, mantener tu contraseña en reserva y avisarnos si alguien usa tu cuenta sin permiso. La cuenta es personal.',
        'Puedes eliminar tu cuenta en cualquier momento desde Perfil.',
      ],
    },
    {
      heading: '4. Reseñas',
      paragraphs: [
        'Puedes publicar una reseña por negocio, sobre una experiencia real tuya. La reseña se publica con tu nombre y el negocio puede responderla.',
        'Eres responsable de lo que escribes. Al publicar una reseña nos das permiso gratuito y no exclusivo para mostrarla en las apps mientras esté publicada.',
        'No publicamos reseñas a cambio de pago ni permitimos que los negocios las borren o las editen. Sí podemos retirar las que incumplan estos términos.',
      ],
    },
    {
      heading: '5. Contenido prohibido',
      paragraphs: [
        'No está permitido publicar contenido que: insulte, amenace o acose a otras personas; sea discriminatorio; sea sexual o violento; incluya datos personales de terceros (teléfonos, direcciones, fotos de personas sin su permiso); sea falso o engañoso, como reseñas de negocios que no visitaste o escritas por el propio negocio o su competencia; sea publicidad o spam; o infrinja derechos de autor o la ley colombiana.',
        'Puedes reportar reseñas y negocios desde la app y bloquear a otros usuarios. Revisamos los reportes y podemos retirar el contenido.',
      ],
    },
    {
      heading: '6. Suspensión de cuentas',
      paragraphs: [
        'Podemos suspender o cerrar cuentas que incumplan estos términos, que intenten manipular las calificaciones o que pongan en riesgo a otros usuarios. Si es posible, te avisaremos el motivo y podrás responder a [CORREO DE SOPORTE].',
      ],
    },
    {
      heading: '7. Propiedad intelectual',
      paragraphs: [
        'La marca, el diseño y el software de Vitrina Local son de [NOMBRE DEL RESPONSABLE]. Las fotos, videos y modelos 3D de cada negocio pertenecen a ese negocio o se usan con su autorización.',
      ],
    },
    {
      heading: '8. Responsabilidad',
      paragraphs: [
        'Trabajamos para que la app funcione bien y la información sea útil, pero no garantizamos que esté libre de errores ni disponible todo el tiempo. En lo que permita la ley, no respondemos por la relación entre tú y los negocios.',
      ],
    },
    {
      heading: '9. Datos personales',
      paragraphs: [
        'Tratamos tus datos según la Política de privacidad, que también aceptas al crear tu cuenta.',
      ],
    },
    {
      heading: '10. Cambios a estos términos',
      paragraphs: [
        'Si cambiamos estos términos te avisaremos en la app. Si sigues usando tu cuenta después del cambio, te pediremos aceptar la nueva versión.',
      ],
    },
    {
      heading: '11. Ley aplicable',
      paragraphs: [
        'Estos términos se rigen por la ley colombiana. Cualquier diferencia se intentará resolver primero por acuerdo directo escribiendo a [CORREO DE SOPORTE]; si no, la resolverán los jueces de [CIUDAD], Colombia, sin perjuicio de los derechos que te da el Estatuto del Consumidor.',
      ],
    },
  ],
};
