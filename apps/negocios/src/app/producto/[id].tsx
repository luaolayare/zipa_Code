// Agregar o editar un producto desde el panel. id = "nuevo" para uno nuevo.
import { Button, confirmAsync, useAuth, type Business, type Product } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Notice, type } from '@/components/kit';
import { Page } from '@/components/Page';
import { ProductEditor, emptyProductForm, extrasFrom, priceFrom, productFormError, productInputFrom, type ProductForm } from '@/components/ProductEditor';
import { BackButton } from '@/components/StepHeader';

export default function ProductoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nuevo';
  const { api, user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [saved, setSaved] = useState<Product | null>(null); // producto guardado (para mostrar el estado del video)
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
          setForm({ name: p.name, price: p.priceCop ? String(p.priceCop) : '', description: p.description ?? '', photo: null, photoUrl: p.photoUrl, video: null, hasSavedVideo: !!p.videoPath, available: p.available, section: p.section ?? '', photoLabel: p.photoLabel ?? '', extras: extrasFrom(p.photos) });
          setSaved(p);
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
      await api.saveProduct(user.id, business.id, { name: form.name, priceCop: priceFrom(form.price), description: form.description, photo: form.photo, video: form.video, available: form.available, section: form.section, ...productInputFrom(form) }, isNew ? undefined : id);
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
      {saved?.videoPath && !form.video && saved.videoStatus === 'pendiente' && (
        <Notice tone="warn">Tu video está en revisión. Cuando el equipo lo apruebe, los clientes lo verán en tu vitrina.</Notice>
      )}
      {saved?.videoPath && !form.video && saved.videoStatus === 'aprobado' && (
        <Notice tone="success">Tu video está aprobado y los clientes ya lo ven. Si grabas otro, volverá a revisión.</Notice>
      )}
      {saved?.videoPath && !form.video && saved.videoStatus === 'rechazado' && (
        <Notice tone="danger">
          <View style={{ gap: 6 }}>
            <Text style={[type.strong, { color: '#A12E15' }]}>No aprobamos este video.</Text>
            {!!saved.videoNote && <Text style={type.body}>Motivo: {saved.videoNote}</Text>}
            <Text style={type.small}>Graba uno nuevo y toca «Guardar cambios».</Text>
          </View>
        </Notice>
      )}
      <ProductEditor value={form} onChange={(f) => { setForm(f); setError(''); }} category={business.category} />
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title={saving || (isNew ? `Agregar ${word}` : 'Guardar cambios')} onPress={save} loading={!!saving} />
      {!isNew && <Button title={`Borrar ${word}`} variant="danger" onPress={remove} disabled={!!saving} />}
    </Page>
  );
}
