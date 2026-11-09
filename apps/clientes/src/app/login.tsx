import { Button, Screen, TextField, colors, useAuth } from '@zipa/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'entrar' | 'crear'>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Escribe un correo válido.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    setError('');
    setLoading(true);
    try {
      if (mode === 'entrar') await signIn(email.trim(), password);
      else await signUp(email.trim(), password, name.trim());
      router.replace('/explorar');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{mode === 'entrar' ? 'Entra a Vitrina Local' : 'Crea tu cuenta'}</Text>
      <Text style={styles.subtitle}>Guarda tus lugares favoritos y califica los negocios que visitas.</Text>
      {/* TODO fase 2: Continuar con Google y con Apple (Supabase Auth + expo-auth-session). */}
      {mode === 'crear' && <TextField label="Tu nombre" value={name} onChangeText={setName} autoComplete="name" />}
      <TextField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Button title={mode === 'entrar' ? 'Entrar' : 'Crear cuenta'} onPress={submit} loading={loading} />
      <Button
        variant="link"
        title={mode === 'entrar' ? '¿No tienes cuenta? Créala' : 'Ya tengo cuenta'}
        onPress={() => setMode(mode === 'entrar' ? 'crear' : 'entrar')}
      />
      <Button variant="link" title="Seguir como invitado" onPress={() => router.replace('/explorar')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  error: { color: colors.danger, fontWeight: '600' },
});
