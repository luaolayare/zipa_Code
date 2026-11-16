import { Button, CheckEmailView, ConsentCheckbox, TextField, consentsFor, useAuth } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { type } from '@/components/kit';
import { Page } from '@/components/Page';
import { StepHeader } from '@/components/StepHeader';

const CONSENT_ERROR = 'Para registrar tu negocio debes aceptar los Términos y la Política de privacidad.';

// Paso 1: cuenta del dueño o encargado.
export default function Cuenta() {
  const { user, api, signUp, signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { entrar } = useLocalSearchParams<{ entrar?: string }>();
  const [hasAccount, setHasAccount] = useState(entrar === '1');
  const [accepted, setAccepted] = useState(false); // sin marcar por defecto
  const [missingConsent, setMissingConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null); // correo de confirmación enviado
  const [alreadyAccepted, setAlreadyAccepted] = useState<boolean | null>(null); // null = consultando

  const consent = (
    <ConsentCheckbox
      checked={accepted}
      onChange={(v) => { setAccepted(v); if (v) setMissingConsent(false); }}
      onOpenTerms={() => router.push('/legal/terminos')}
      onOpenPrivacy={() => router.push('/legal/privacidad')}
      invalid={missingConsent}
    />
  );

  const requireConsent = () => {
    if (accepted) return true;
    setMissingConsent(true);
    setError(CONSENT_ERROR);
    return false;
  };

  // Con sesión: si ya tiene negocio va al panel; si no, sigue el registro.
  // Los términos de negocios solo se piden si aún no aceptó la versión vigente
  // (por ejemplo, si la cuenta se creó en la app de clientes).
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        if (await api.myBusiness(user.id)) return router.replace('/panel');
        const ok = await api.hasAccepted(user.id, consentsFor('negocios'));
        if (alive) setAlreadyAccepted(ok);
      } catch {
        if (alive) setAlreadyAccepted(false);
      }
    })();
    return () => { alive = false; };
  }, [api, user]);

  if (user) {
    const next = async () => {
      if (!alreadyAccepted && !requireConsent()) return;
      setError('');
      setLoading(true);
      try {
        if (!alreadyAccepted) await api.recordConsents(user.id, consentsFor('negocios'));
        router.push('/registro/datos');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No pudimos guardar tu aceptación. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    return (
      <Page>
        <StepHeader step={1} title="Tu cuenta" />
        <Text style={type.body}>Entraste como {user.email}.</Text>
        {alreadyAccepted === false && consent}
        {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
        <Button title="Seguir" onPress={next} loading={loading || alreadyAccepted === null} />
      </Page>
    );
  }

  if (sentTo) {
    return (
      <Page>
        <StepHeader step={1} title="Confirma tu correo" />
        <CheckEmailView email={sentTo} onContinue={() => { setSentTo(null); setHasAccount(true); setPassword(''); }} />
      </Page>
    );
  }

  const submit = async () => {
    if (!hasAccount && !name.trim()) return setError('Escribe tu nombre.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Escribe un correo válido.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (!hasAccount && !requireConsent()) return;
    setError('');
    setLoading(true);
    try {
      if (hasAccount) {
        await signIn(email.trim(), password);
        // La sesión cambia y esta pantalla pasa al caso "ya tiene sesión", que decide a dónde seguir.
      } else {
        const { needsEmailConfirmation } = await signUp(email.trim(), password, name.trim(), consentsFor('negocios'));
        if (needsEmailConfirmation) return setSentTo(email.trim());
        router.push('/registro/datos');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <StepHeader step={1} title={hasAccount ? 'Entra a tu cuenta' : 'Crea tu cuenta'} />
      <Text style={type.body}>Esta es la cuenta del dueño o encargado. Con ella administras tu negocio.</Text>
      {!hasAccount && <TextField label="Tu nombre" value={name} onChangeText={setName} placeholder="Ej: Inés Pérez" />}
      <TextField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 6 caracteres" />
      {!hasAccount && consent}
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title={hasAccount ? 'Entrar' : 'Crear cuenta y seguir'} onPress={submit} loading={loading} />
      <Button
        variant="link"
        title={hasAccount ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
        onPress={() => { setHasAccount(!hasAccount); setError(''); setMissingConsent(false); }}
      />
    </Page>
  );
}
