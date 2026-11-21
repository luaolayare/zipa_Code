// Antes de registrarse: ¿dónde está el negocio?
// - Ciudad activa: registro normal (y luego la revisión del equipo, como siempre).
// - En preparación: se avisa que todavía no abre; puede dejar su interés o, si el equipo lo invitó,
//   hacer el registro completo (se publica cuando el equipo lo apruebe y la ciudad abra).
// - Próximamente: solo puede dejar su interés (sin cuenta, documentos ni fotos).
import { BRAND, Button, etiquetaMunicipio, spacing, type Municipio } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Notice, type } from '@/components/kit';
import { Page } from '@/components/Page';
import { useRegistro } from '@/components/RegistroContext';
import { BackButton } from '@/components/StepHeader';
import { MunicipioPicker, useEstadosCiudades } from '@/components/Ubicacion';

export default function DondeEsta() {
  const { cambiar } = useLocalSearchParams<{ cambiar?: string }>();
  const { draft, update } = useRegistro();
  const ciudades = useEstadosCiudades();
  const [elegido, setElegido] = useState<Municipio | null>(null);
  const estado = elegido ? ciudades.estadoDe(elegido.codigo) : null;

  const registrar = () => {
    if (!elegido) return;
    // Cambiar de municipio borra el punto del local: era de otro lugar.
    update({ municipioCodigo: elegido.codigo, ...(draft.municipioCodigo !== elegido.codigo ? { latitud: null, longitud: null } : {}) });
    if (cambiar) router.back();
    else router.push('/registro/cuenta');
  };
  const interes = () => elegido && router.push({ pathname: '/registro/interes', params: { municipio: elegido.codigo } });

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <BackButton />
        <Text style={[type.title, { flex: 1 }]} accessibilityRole="header">¿Dónde está tu negocio?</Text>
      </View>
      <Text style={type.help}>Elige el municipio donde atiendes a tus clientes.</Text>
      <MunicipioPicker value={elegido?.codigo ?? null} onPick={setElegido} ciudades={ciudades} />

      {elegido && estado === 'activa' && (
        <Notice tone="success">
          <Text style={type.label}>{BRAND.name} ya está en {elegido.nombre}.</Text>
          <Text style={type.help}>Registra tu negocio: el equipo lo revisa antes de publicarlo.</Text>
        </Notice>
      )}
      {elegido && estado && estado !== 'activa' && (
        <Notice tone="warn">
          <Text style={type.label}>{BRAND.name} todavía no está disponible en {etiquetaMunicipio(elegido)}. Puedes registrar tu interés para una futura apertura.</Text>
          <Text style={type.help}>
            {estado === 'en_preparacion'
              ? 'Estamos sumando negocios en tu ciudad. Si nuestro equipo ya habló contigo, también puedes hacer el registro completo: lo publicaremos cuando lo aprobemos y la ciudad abra.'
              : 'Te escribiremos cuando lleguemos. No necesitas crear una cuenta ni enviar documentos.'}
          </Text>
        </Notice>
      )}

      {elegido && estado === 'activa' && <Button title="Registrar mi negocio" onPress={registrar} />}
      {elegido && estado && estado !== 'activa' && <Button title="Registrar mi interés" onPress={interes} />}
      {elegido && estado === 'en_preparacion' && <Button title="El equipo me invitó: registrar mi negocio" variant="outline" onPress={registrar} />}
      {elegido && !estado && !ciudades.error && <Text style={type.help}>Consultando si ya estamos en {elegido.nombre}…</Text>}
    </Page>
  );
}
