// Interés de un comerciante de una ciudad que todavía no abre. No crea un negocio ni una cuenta, y solo
// pide lo necesario para avisarle (sin cédula, NIT, fotos ni documentos).
import { BRAND, Button, TextField, colors, fonts, municipio, radius, spacing, typography, useAuth } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Notice, type } from '@/components/kit';
import { OptionChips } from '@/components/OptionChips';
import { Page } from '@/components/Page';
import { BackButton } from '@/components/StepHeader';

type Tipo = 'restaurante' | 'emprendimiento';

export default function Interes() {
  const { municipio: codigo } = useLocalSearchParams<{ municipio: string }>();
  const m = municipio(codigo);
  const { api } = useAuth();
  const [f, setF] = useState({ negocio: '', tipo: 'restaurante' as Tipo, nombre: '', whatsapp: '' });
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  if (!m) {
    return (
      <Page>
        <BackButton />
        <Text style={type.error}>Elige primero el municipio de tu negocio.</Text>
      </Page>
    );
  }

  const enviar = async () => {
    if (f.negocio.trim().length < 2) return setError('Escribe el nombre de tu negocio.');
    if (f.nombre.trim().length < 2) return setError('Escribe tu nombre.');
    if (f.whatsapp.replace(/\D/g, '').length < 10) return setError('Escribe un WhatsApp válido, por ejemplo 300 123 4567.');
    if (!acepta) return setError('Necesitamos tu autorización para contactarte.');
    setError('');
    setEnviando(true);
    try {
      await api.registerInterest({ municipioCodigo: m.codigo, businessName: f.negocio.trim(), kind: f.tipo, contactName: f.nombre.trim(), whatsapp: f.whatsapp, acceptsContact: true });
      setListo(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Ocurrió un problema al guardar los datos. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <Page>
        <Text style={type.title} accessibilityRole="header">¡Gracias, {f.nombre.trim().split(/\s+/)[0]}!</Text>
        <Notice tone="success">
          <Text style={type.label}>Guardamos el interés de {f.negocio.trim()}.</Text>
          <Text style={type.help}>Te escribiremos por WhatsApp cuando {BRAND.name} llegue a {m.nombre}. Tu negocio todavía no se publica.</Text>
        </Notice>
        <Button title="Volver al inicio" onPress={() => router.dismissAll()} />
      </Page>
    );
  }

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <BackButton />
        <Text style={[type.title, { flex: 1 }]} accessibilityRole="header">Registra tu interés</Text>
      </View>
      <Notice tone="info">
        <Text style={type.label}>{BRAND.name} todavía no está disponible en {m.nombre}.</Text>
        <Text style={type.help}>Déjanos tus datos y te avisaremos cuando abramos. No publicamos nada todavía.</Text>
      </Notice>
      <TextField label="Nombre del negocio" value={f.negocio} onChangeText={(negocio) => setF({ ...f, negocio })} maxLength={80} placeholder="Ej: Almojábanas Doña Rosa" />
      <OptionChips<Tipo> label="¿Qué es?" options={[{ id: 'restaurante', label: 'Restaurante' }, { id: 'emprendimiento', label: 'Emprendimiento' }]} value={f.tipo} onChange={(tipo) => setF({ ...f, tipo })} />
      <TextField label="Tu nombre" value={f.nombre} onChangeText={(nombre) => setF({ ...f, nombre })} maxLength={80} />
      <TextField label="WhatsApp" value={f.whatsapp} onChangeText={(whatsapp) => setF({ ...f, whatsapp })} keyboardType="phone-pad" placeholder="Ej: 300 123 4567" />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acepta }} onPress={() => setAcepta(!acepta)} style={styles.check}>
        <View style={[styles.box, acepta && styles.boxOn]}>{acepta && <Check size={16} color="#FFFFFF" strokeWidth={3} />}</View>
        <Text style={styles.checkText}>Autorizo a {BRAND.name} a escribirme por WhatsApp para avisarme cuando abra en {m.nombre}. Solo usarán estos datos para eso.</Text>
      </Pressable>
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title="Registrar mi interés" onPress={enviar} loading={enviando} />
    </Page>
  );
}

const styles = StyleSheet.create({
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs },
  box: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { flex: 1, ...typography.body, fontFamily: fonts.regular, color: colors.textBody },
});
