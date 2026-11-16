// Editar los datos del negocio desde el panel.
import { Button, CATEGORIES, TextField, useAuth, type Business, type BusinessType, type Category } from '@zipa/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { BUSINESS_TYPES, Notice, type } from '@/components/kit';
import { OptionCards, OptionChips } from '@/components/OptionChips';
import { Page } from '@/components/Page';
import { BackButton } from '@/components/StepHeader';

export default function EditarNegocio() {
  const { api, user } = useAuth();
  const [original, setOriginal] = useState<Business | null>(null);
  const [f, setF] = useState({ name: '', type: 'emprendimiento' as BusinessType, category: 'comer' as Category, address: '', hours: '', whatsapp: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return void router.replace('/');
    api.myBusiness(user.id).then((b) => {
      if (!b) return router.replace('/panel');
      setOriginal(b);
      setF({ name: b.name, type: b.type, category: b.category, address: b.address, hours: b.hours ?? '', whatsapp: b.whatsapp ?? '' });
    }).catch(() => setError('No pudimos cargar tus datos.'));
  }, [api, user]);

  if (!original) {
    return <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>{error ? <Text style={type.error}>{error}</Text> : <ActivityIndicator size="large" />}</View>;
  }

  // Cambios que, en un negocio ya publicado, lo devuelven a revisión (migración 0009).
  const sensitive = f.name.trim() !== original.name || f.address.trim() !== original.address || f.type !== original.type || f.category !== original.category;
  const backToReview = original.status === 'publicado' && sensitive;

  const save = async () => {
    if (f.name.trim().length < 2) return setError('Escribe el nombre del negocio.');
    if (!f.address.trim()) return setError('Escribe la dirección.');
    setSaving(true);
    setError('');
    try {
      await api.updateBusiness(original.id, { ...f, hours: f.hours || null, whatsapp: f.whatsapp || null });
      router.back();
    } catch {
      setError('No pudimos guardar los cambios. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <BackButton />
        <Text style={type.h1}>Tus datos</Text>
      </View>
      <TextField label="Nombre del negocio" value={f.name} onChangeText={(name) => setF({ ...f, name })} maxLength={80} />
      <OptionCards<BusinessType> label="¿Qué tipo de negocio es?" options={BUSINESS_TYPES} value={f.type} onChange={(t) => setF({ ...f, type: t })} />
      <OptionChips<Category> label="Categoría" options={CATEGORIES} value={f.category} onChange={(category) => setF({ ...f, category })} />
      <TextField label="Dirección" value={f.address} onChangeText={(address) => setF({ ...f, address })} />
      <TextField label="Horario" value={f.hours} onChangeText={(hours) => setF({ ...f, hours })} placeholder="Ej: Lun a sáb, 7:00 a. m. a 9:00 p. m." />
      <TextField label="WhatsApp del negocio" value={f.whatsapp} onChangeText={(whatsapp) => setF({ ...f, whatsapp })} keyboardType="phone-pad" />
      {backToReview && (
        <Notice tone="warn">Cambiaste el nombre, la dirección, el tipo o la categoría. Al guardar, tu negocio vuelve a revisión y deja de verse hasta que lo aprobemos de nuevo.</Notice>
      )}
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title={backToReview ? 'Guardar y enviar a revisión' : 'Guardar cambios'} onPress={save} loading={saving} />
    </Page>
  );
}
