import { Button, Screen, TextField, colors, useAuth } from '@zipa/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { StepHeader } from '@/components/StepHeader';

// Paso 1: cuenta del dueño o encargado.
export default function Cuenta() {
  const { user, signUp, signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasAccount, setHasAccount] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return (
      <Screen>
        <StepHeader step={1} title="Tu cuenta" />
        <Text style={styles.body}>Entraste como {user.email}.</Text>
        <Button title="Seguir" onPress={() => router.push('/registro/datos')} />
      </Screen>
    );
  }

  const submit = async () => {
    if (!hasAccount && !name.trim()) return setError('Escribe tu nombre.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Escribe un correo válido.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    setError('');
    setLoading(true);
    try {
      if (hasAccount) {
        await signIn(email.trim(), password);
        router.replace('/panel');
      } else {
        await signUp(email.trim(), password, name.trim());
        router.push('/registro/datos');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <StepHeader step={1} title={hasAccount ? 'Entra a tu cuenta' : 'Crea tu cuenta'} />
      <Text style={styles.body}>Esta es la cuenta del dueño o encargado. Con ella administras tu negocio.</Text>
      {!hasAccount && <TextField label="Tu nombre" value={name} onChangeText={setName} placeholder="Ej: Inés Pérez" />}
      <TextField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 6 caracteres" />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title={hasAccount ? 'Entrar' : 'Crear cuenta y seguir'} onPress={submit} loading={loading} />
      <Button variant="link" title={hasAccount ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'} onPress={() => setHasAccount(!hasAccount)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  error: { color: colors.danger, fontWeight: '600' },
});
