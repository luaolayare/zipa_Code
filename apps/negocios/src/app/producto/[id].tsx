// Agregar o editar un producto desde el panel. id = "nuevo" para uno nuevo.
import { Button, confirmAsync, useAuth, type Business } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Notice, type } from '@/components/kit';
import { Page } from '@/components/Page';
import { ProductEditor, emptyProductForm, priceFrom, productFormError, type ProductForm } from '@/components/ProductEditor';
import { BackButton } from '@/components/StepHeader';

export default function ProductoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nuevo';
  const { api, user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [has3d, setHas3d] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return void router.replace('/');
    (async () => {
      try {
        const b = await api.myBusiness(user.id);
        if (!b) return router.replace('/panel');
        setBusiness(b);
        if (!isNew) {
          const p = (await api.myProducts(b.id)).find((x) => x.id === id);
          if (!p) return router.back();
          setForm({ name: p.name, price: p.priceCop ? String(p.priceCop) : '', description: p.description ?? '', photo: null, photoUrl: p.photoUrl, video: null, hasSavedVideo: !!p.videoPath });
          setHas3d(!!p.modelUrl);
        }
      } catch {
        setError('No pudimos cargar el producto.');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, user, id, isNew]);

  if (loading || !business || !user) {
    return <View style={{ flex: 1, justifyContent: 'center' }}>{error ? <Text style={type.error}>{error}</Text> : <ActivityIndicator size="large" />}</View>;
  }

  const word = business.category === 'comer' ? 'plato' : 'producto';

  const save = async () => {
    const e = productFormError(form, word);
    if (e) return setError(e);
    setError('');
    setSaving(form.video ? 'Subiendo el video…' : form.photo ? 'Subiendo la foto…' : 'Guardando…');
    try {
      await api.saveProduct(user.id, business.id, { name: form.name, priceCop: priceFrom(form.price), description: form.description, photo: form.photo, video: form.video }, isNew ? undefined : id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar. Intenta de nuevo.');
    } finally {
      setSaving('');
    }
  };

  const remove = async () => {
    const ok = await confirmAsync(`¿Borrar ${form.name || `este ${word}`}?`, 'Se borran también su foto y su video. Esta acción no se puede deshacer.', 'Borrar', true);
    if (!ok) return;
    setSaving('Borrando…');
    try {
      const p = (await api.myProducts(business.id)).find((x) => x.id === id);
      if (p) await api.deleteProduct(p);
      router.back();
    } catch {
      setError('No pudimos borrarlo. Intenta de nuevo.');
      setSaving('');
    }
  };

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <BackButton />
        <Text style={[type.h1, { flex: 1 }]} numberOfLines={1}>{isNew ? `Nuevo ${word}` : `Editar ${word}`}</Text>
      </View>
      {has3d && <Notice tone="success">Este {word} ya tiene vista 3D. Si grabas un video nuevo, prepararemos una vista 3D nueva.</Notice>}
      <ProductEditor value={form} onChange={(f) => { setForm(f); setError(''); }} category={business.category} />
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title={saving || (isNew ? `Agregar ${word}` : 'Guardar cambios')} onPress={save} loading={!!saving} />
      {!isNew && <Button title={`Borrar ${word}`} variant="danger" onPress={remove} disabled={!!saving} />}
    </Page>
  );
}
