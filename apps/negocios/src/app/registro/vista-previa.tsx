import { BRAND, Button, colors, fonts, municipio, useAuth, catalogTitle, radius, spacing, typography } from '@zipa/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BusinessPreview } from '@/components/BusinessPreview';
import { type } from '@/components/kit';
import { Page } from '@/components/Page';
import { priceFrom, productInputFrom } from '@/components/ProductEditor';
import { useRegistro } from '@/components/RegistroContext';
import { StepHeader } from '@/components/StepHeader';

// Paso 5: el negocio ve su tarjeta tal como la verán los clientes y la envía a revisión.
export default function VistaPrevia() {
  const { draft, update, reset } = useRegistro();
  const { api, user } = useAuth();
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const publish = async () => {
    if (!user) return router.replace('/registro/cuenta');
    if (!draft.verificationSaved && !draft.photoUri) return router.replace('/registro/verificacion');
    setError('');
    try {
      // 1. El negocio. Si un intento anterior ya lo creó, se actualiza en vez de crear otro.
      setProgress('Guardando tu negocio…');
      const data = {
        name: draft.name.trim(),
        type: draft.type,
        subcategoryId: draft.subcategoryId,
        address: draft.address.trim(),
        municipioCodigo: draft.municipioCodigo,
        latitud: draft.latitud,
        longitud: draft.longitud,
        hours: draft.hours.trim() || undefined,
        whatsapp: draft.whatsapp.trim() || undefined,
      };
      let id = draft.businessId;
      if (id) await api.updateBusiness(id, data);
      else {
        id = await api.registerBusiness(user.id, data);
        update({ businessId: id });
      }
      await api.setBusinessTags(id, draft.tags);

      // Logo (opcional): se sube una vez; si falla, el registro sigue y el panel lo avisa para que
      // se agregue desde «Tus datos» (antes el error se perdía sin que nadie se enterara).
      let logoFailed = false;
      if (draft.logo) {
        setProgress('Subiendo tu logo…');
        try {
          const logoUrl = await api.uploadBusinessLogo(user.id, id, draft.logo);
          update({ logo: null, logoUrl });
        } catch {
          logoFailed = true;
        }
      }

      // 2. Foto al espacio privado y cédula/NIT a la tabla privada.
      if (!draft.verificationSaved && draft.photoUri) {
        setProgress('Subiendo la foto de tu local…');
        await api.saveVerification(user.id, id, { uri: draft.photoUri, mimeType: draft.photoMimeType }, draft.idNumber);
        update({ verificationSaved: true });
      }

      // 3. Productos con su foto y su video (los que ya se guardaron no se repiten).
      const products = [...draft.products];
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (p.savedId) continue;
        setProgress(`Subiendo ${p.form.name} (${i + 1} de ${products.length})…`);
        const saved = await api.saveProduct(user.id, id, {
          name: p.form.name,
          priceCop: priceFrom(p.form.price),
          description: p.form.description,
          photo: p.form.photo,
          video: p.form.video,
          available: p.form.available,
          section: p.form.section,
          ...productInputFrom(p.form),
        });
        products[i] = { ...p, savedId: saved.id };
        update({ products: [...products] });
      }

      // 4. A revisión.
      setProgress('Enviando a revisión…');
      await api.submitForReview(id);
      reset();
      router.dismissAll();
      router.replace(logoFailed ? { pathname: '/panel', params: { aviso: 'logo' } } : '/panel');
    } catch (e) {
      setError((e as { message?: string } | null)?.message || 'No pudimos enviar tu negocio. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setProgress('');
    }
  };

  return (
    <Page>
      <StepHeader step={5} title="Vista previa" />
      <Text style={type.body}>Así verán tu negocio los clientes en la app.</Text>
      <BusinessPreview logoUri={draft.logo?.uri ?? draft.logoUrl} name={draft.name} of={draft} type={draft.type} address={[draft.address.trim(), municipio(draft.municipioCodigo)?.nombre].filter(Boolean).join(', ')} productCount={draft.products.length} />

      <View style={styles.summary}>
        <Row label="Horario" value={draft.hours.trim() || 'Sin horario'} />
        <Row label="WhatsApp" value={draft.whatsapp.trim() || 'Sin número'} />
        <Row label={catalogTitle(draft)} value={draft.products.map((p) => p.form.name).join(', ') || '—'} />
        <Row label="Videos" value={`${draft.products.filter((p) => p.form.video).length} de ${draft.products.length}`} last />
      </View>

      {!!error && <Text style={type.error} accessibilityRole="alert">{error}</Text>}
      <Button title={progress || 'Enviar a revisión'} onPress={publish} loading={!!progress} />
      {!!progress && <Text style={[type.caption, { textAlign: 'center' }]} accessibilityLiveRegion="polite">{progress}</Text>}
      <Text style={[type.help, { textAlign: 'center' }]}>
        Revisamos tu negocio antes de publicarlo. Al enviarlo aceptas las condiciones para negocios de {BRAND.name}.
      </Text>
    </Page>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { ...typography.caption, fontFamily: fonts.regular, color: colors.textMuted },
  value: { ...typography.label, flex: 1, textAlign: 'right', fontFamily: fonts.bold, color: colors.text },
});
