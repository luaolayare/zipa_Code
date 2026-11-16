import { BRAND, Button, CheckEmailView, ConsentCheckbox, Screen, TextField, colors, consentsFor, fonts, useAuth } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Store } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';

export default function Login() {
  const { signIn, signUp } = useAuth();
  // Si viene de "Calificar", al entrar vuelve al negocio para terminar la reseña.
  const { desde, negocio } = useLocalSearchParams<{ desde?: string; negocio?: string }>();
  const forReview = desde === 'calificar' && !!negocio;
  const [mode, setMode] = useState<'entrar' | 'crear'>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false); // sin marcar por defecto
  const [missingConsent, setMissingConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null); // correo de confirmación enviado

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Escribe un correo válido.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (mode === 'crear' && !accepted) {
      setMissingConsent(true);
      return setError('Para crear tu cuenta debes aceptar los Términos y la Política de privacidad.');
    }
    setError('');
    setLoading(true);
    try {
      if (mode === 'entrar') {
        await signIn(email.trim(), password);
      } else {
        const { needsEmailConfirmation } = await signUp(email.trim(), password, name.trim(), consentsFor('clientes'));
        if (needsEmailConfirmation) return setSentTo(email.trim());
      }
      if (forReview) router.replace({ pathname: '/calificar/[id]', params: { id: negocio! } });
      else router.replace('/explorar');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <Screen>
        <CheckEmailView email={sentTo} onContinue={() => { setSentTo(null); setMode('entrar'); setPassword(''); }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton />
      <View style={styles.logo}><Store size={26} color={colors.text} strokeWidth={2.2} /></View>
      <Text style={styles.title} accessibilityRole="header">{mode === 'entrar' ? `Entra a ${BRAND.name}` : 'Crea tu cuenta'}</Text>
      <Text style={styles.subtitle}>Califica los negocios que visitas y lleva el registro de tus reseñas.</Text>
      {forReview && (
        <View style={styles.notice}><Text style={styles.noticeText}>Inicia sesión para publicar tu reseña.</Text></View>
      )}
      {/* Pendiente: Continuar con Google y con Apple (Supabase Auth + expo-auth-session). */}
      {mode === 'crear' && <TextField label="Tu nombre" value={name} onChangeText={setName} autoComplete="name" />}
      <TextField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      {mode === 'crear' && (
        <ConsentCheckbox
          checked={accepted}
          onChange={(v) => { setAccepted(v); if (v) setMissingConsent(false); }}
          onOpenTerms={() => router.push('/legal/terminos')}
          onOpenPrivacy={() => router.push('/legal/privacidad')}
          invalid={missingConsent}
        />
      )}
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Button title={mode === 'entrar' ? 'Entrar' : 'Crear cuenta'} onPress={submit} loading={loading} />
      <Button
        variant="link"
        title={mode === 'entrar' ? '¿No tienes cuenta? Créala' : 'Ya tengo cuenta'}
        onPress={() => { setMode(mode === 'entrar' ? 'crear' : 'entrar'); setError(''); setMissingConsent(false); }}
      />
      <Button variant="link" title="Seguir como invitado" onPress={() => router.replace('/explorar')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  title: { fontFamily: fonts.hero, fontSize: 36, lineHeight: 39, letterSpacing: -1, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 16.5, lineHeight: 24, color: colors.textMuted, marginTop: -8 },
  notice: { backgroundColor: colors.accentSoft, borderRadius: 18, padding: 16 },
  noticeText: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.accentText },
  error: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.danger },
});
