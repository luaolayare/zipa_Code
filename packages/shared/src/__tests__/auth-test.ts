import { describe, expect, it } from '@jest/globals';

import { authErrorMessage } from '../auth';

describe('authErrorMessage (errores de Supabase Auth en español)', () => {
  it.each([
    [{ code: 'invalid_credentials' }, 'El correo o la contraseña no coinciden.'],
    [{ message: 'Invalid login credentials' }, 'El correo o la contraseña no coinciden.'],
    [{ code: 'email_not_confirmed' }, 'Aún no confirmas tu correo. Abre el enlace que te enviamos y vuelve a entrar.'],
    [{ message: 'User already registered' }, 'Ya existe una cuenta con ese correo. Entra con tu contraseña.'],
    [{ code: 'weak_password' }, 'La contraseña es muy débil. Usa al menos 8 caracteres, con letras y números.'],
    [{ status: 429 }, 'Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentar.'],
    [{ message: 'Email address "x" is invalid' }, 'Ese correo no es válido. Revisa cómo está escrito.'],
    [{ message: 'TypeError: Network request failed' }, 'No hay conexión. Revisa tu internet e intenta de nuevo.'],
  ])('%j → mensaje claro', (error, esperado) => {
    expect(authErrorMessage(error)).toBe(esperado);
  });

  it('nunca muestra el mensaje técnico en inglés', () => {
    expect(authErrorMessage({ message: 'Database error saving new user' })).toBe(
      'No pudimos completar la operación. Intenta de nuevo en unos minutos.',
    );
  });
});
