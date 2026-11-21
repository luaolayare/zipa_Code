// Editar los datos del negocio desde el panel.
import { Button, TextField, colors, distanciaKm, etiquetaMunicipio, legacyCategoryFor, municipio, useAuth, type Business, type BusinessType, spacing } from '@zipa/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { BUSINESS_TYPES, Notice, type } from '@/components/kit';
import { CategoryPicker, type Classification } from '@/components/CategoryPicker';
import { LogoPicker } from '@/components/LogoPicker';
import { OptionCards } from '@/components/OptionChips';
import { Page } from '@/components/Page';
import { BackButton } from '@/components/StepHeader';
import { MunicipioPicker, PuntoDelLocal, useEstadosCiudades } from '@/components/Ubicacion';

export default function EditarNegocio() {
  const { api, user } = useAuth();
  const [original, setOriginal] = useState<Business | null>(null);
  const [f, setF] = useState({ name: '', type: 'emprendimiento' as BusinessType, address: '', hours: '', whatsapp: '' });
  const [c, setC] = useState<Classification>({ mainCategory: 'restaurantes', subcategoryId: '', tags: [] });
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState('');
  const [lugar, setLugar] = useState<{ municipioCodigo: string; latitud: number | null; longitud: number | null }>({ municipioCodigo: '', latitud: null, longitud: null });
  const [cambiarMunicipio, setCambiarMunicipio] = useState(false);
  const ciudades = useEstadosCiudades();

  useEffect(() => {
    if (!user) return void router.replace('/');
    api.myBusiness(user.id).then((b) => {
      if (!b) return router.replace('/panel');
      setOriginal(b);
      setLugar({ municipioCodigo: b.municipioCodigo, latitud: b.latitud, longitud: b.longitud });
      setF({ name: b.name, type: b.type, address: b.address, hours: b.hours ?? '', whatsapp: b.whatsapp ?? '' });
      setC({ mainCategory: b.mainCategory ?? (b.category === 'comer' ? 'restaurantes' : 'emprendimientos'), subcategoryId: b.subcategoryId ?? '', tags: b.tags });
    }).catch(() => setError('No pudimos cargar tus datos.'));
  }, [api, user]);

  if (!original) {
    return <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>{error ? <Text style={type.error}>{error}</Text> : <ActivityIndicator size="large" />}</View>;
  }

  // Cambios que, en un negocio ya publicado, lo devuelven a revisión (migración 0009).
  // La categoría cuenta solo si cambia de grupo (ej.: de restaurante a artesanías).
  const newLegacy = c.subcategoryId ? legacyCategoryFor(c.subcategoryId, c.mainCategory) : original.category;
  // Municipio o punto movido más de 300 m también (migración 0024). Poner el punto por primera vez, no.
  const movido = original.latitud != null && original.longitud != null
    && (lugar.latitud == null || lugar.longitud == null || distanciaKm(original.latitud, original.longitud, lugar.latitud, lugar.longitud) > 0.3);
  const sensitive = f.name.trim() !== original.name || f.address.trim() !== original.address || f.type !== original.type || newLegacy !== original.category
    || lugar.municipioCodigo !== original.municipioCodigo || movido;
  const muni = municipio(lugar.municipioCodigo);
  const backToReview = original.status === 'publicado' && sensitive;

  const save = async () => {
    if (f.name.trim().length < 2) return setError('Escribe el nombre del negocio.');
    if (!c.subcategoryId) return setError('Elige qué ofreces principalmente.');
    if (!f.address.trim()) return setError('Escribe la dirección.');
    setSaving(true);
    setError('');
    try {
      await api.updateBusiness(original.id, {
        ...f, subcategoryId: c.subcategoryId, hours: f.hours || null, whatsapp: f.whatsapp || null,
        ...(lugar.municipioCodigo !== original.municipioCodigo ? { municipioCodigo: lugar.municipioCodigo } : {}),
        ...(lugar.latitud !== original.latitud || lugar.longitud !== original.longitud ? { latitud: lugar.latitud, longitud: lugar.longitud } : {}),
      });
      await api.setBusinessTags(original.id, c.tags);
      router.back();
    } catch (e) {
      setError(e instanceof Error && (e.message.includes('etiqueta') || e.message.includes('todavía no está disponible')) ? e.message : 'Ocurrió un problema al guardar los cambios. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <BackButton />
        <Text style={type.title}>Tus datos</Text>
      </View>
      <LogoPicker
        name={f.name}
        uri={original.logoUrl}
        busy={logoBusy}
        onPick={async (file) => {
          if (!user) return;
          setLogoBusy(true);
          setError('');
          try {
            const logoUrl = await api.uploadBusinessLogo(user.id, original.id, file);
            setOriginal({ ...original, logoUrl });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'No pudimos guardar el logo.');
          } finally {
            setLogoBusy(false);
          }
        }}
        onRemove={async () => {
          setLogoBusy(true);
          try {
            await api.removeBusinessLogo(original.id);
            setOriginal({ ...original, logoUrl: null });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'No pudimos quitar el logo.');
          } finally {
            setLogoBusy(false);
          }
        }}
      />
      <TextField label="Nombre del negocio" value={f.name} onChangeText={(name) => setF({ ...f, name })} maxLength={80} />
      <CategoryPicker value={c} onChange={({ category: _legacy, ...patch }) => { setC({ ...c, ...patch }); setError(''); }} />
      <OptionCards<BusinessType> label="¿Cómo se describe?" options={BUSINESS_TYPES} value={f.type} onChange={(t) => setF({ ...f, type: t })} />
      <Notice tone="info">
        <Text style={type.label}>Municipio: {muni ? etiquetaMunicipio(muni) : '—'}</Text>
        <Text style={[type.label, { color: colors.primary, textDecorationLine: 'underline' }]} accessibilityRole="button" onPress={() => setCambiarMunicipio(!cambiarMunicipio)}>{cambiarMunicipio ? 'Dejar el municipio como está' : 'Cambiar municipio'}</Text>
      </Notice>
      {cambiarMunicipio && (
        <MunicipioPicker
          value={lugar.municipioCodigo}
          ciudades={ciudades}
          onPick={(m) => { setLugar({ municipioCodigo: m.codigo, latitud: null, longitud: null }); setCambiarMunicipio(false); }}
        />
      )}
      <TextField label="Dirección" value={f.address} onChangeText={(address) => setF({ ...f, address })} />
      {muni && <PuntoDelLocal municipioCodigo={muni.codigo} latitud={lugar.latitud} longitud={lugar.longitud} onChange={(p) => setLugar({ ...lugar, ...p })} />}
      <TextField label="Horario" value={f.hours} onChangeText={(hours) => setF({ ...f, hours })} placeholder="Ej: Lun a sáb, 7:00 a. m. a 9:00 p. m." />
      <TextField label="WhatsApp del negocio" value={f.whatsapp} onChangeText={(whatsapp) => setF({ ...f, whatsapp })} keyboardType="phone-pad" />
      {backToReview && (
        <Notice tone="warn">Cambiaste el nombre, la dirección, el municipio, el punto del local, el tipo o la categoría. Al guardar, tu negocio vuelve a revisión y deja de verse hasta que lo aprobemos de nuevo.</Notice>
      )}
      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title={backToReview ? 'Guardar y enviar a revisión' : 'Guardar cambios'} onPress={save} loading={saving} />
    </Page>
  );
}
