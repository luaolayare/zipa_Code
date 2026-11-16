// Bienvenida de la app de negocios.
import { BRAND, Button, colors, fonts, useAuth } from '@zipa/shared';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { PlateArt } from '@/components/PlateArt';

const BENEFICIOS: [string, string][] = [
  ['Aparece ante turistas', ` que buscan dónde comer y qué comprar en ${BRAND.city}.`],
  ['Muestra tus productos en 3D', ' grabando un video corto con tu celular.'],
  ['Recibe y responde reseñas', ' para ganar la confianza de nuevos clientes.'],
];

export default function Inicio() {
  const { user } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} bounces={false}>
        <View style={styles.hero}>
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            {/* Decoración: anillo y plato en 3D asomando por la derecha. */}
            <View style={styles.ring} pointerEvents="none" />
            <View style={styles.plate} pointerEvents="none"><PlateArt category="comer" size={176} /></View>
            <Logo light />
            <Text style={styles.title}>Que los turistas encuentren tu negocio.</Text>
            <Text style={styles.lead}>Registra tu restaurante o emprendimiento, muestra tus productos en 3D y recibe reseñas de tus clientes.</Text>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {BENEFICIOS.map(([bold, rest]) => (
            <View key={bold} style={styles.benefit}>
              <View style={styles.check}><Check size={20} color={colors.primary} strokeWidth={3} /></View>
              <Text style={styles.benefitText}><Text style={styles.benefitBold}>{bold}</Text>{rest}</Text>
            </View>
          ))}

          <View style={styles.info}>
            <Text style={styles.infoText}>Son 5 pasos. Ten a mano tu cédula o NIT y una foto de tu local.</Text>
          </View>

          {user ? (
            <Button title="Ir a mi panel" variant="accent" onPress={() => router.push('/panel')} />
          ) : (
            <>
              <Button title="Registrar mi negocio" variant="accent" onPress={() => router.push('/registro/cuenta')} />
              <Button title="Ya tengo cuenta" variant="outline" onPress={() => router.push({ pathname: '/registro/cuenta', params: { entrar: '1' } })} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.dark, overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroInner: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 34, gap: 22 },
  ring: { position: 'absolute', right: -110, top: -30, width: 290, height: 290, borderRadius: 145, borderWidth: 38, borderColor: '#1E3431' },
  plate: { position: 'absolute', right: -18, top: 74, transform: [{ rotate: '-9deg' }] },
  title: { fontFamily: fonts.hero, fontSize: 44, lineHeight: 46, letterSpacing: -1.5, color: '#FFFFFF', marginTop: 128, maxWidth: 340 },
  lead: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 26, color: '#C9D6D3', maxWidth: 360 },
  body: { padding: 24, gap: 18 },
  benefit: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  check: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  benefitText: { flex: 1, fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, color: colors.textBody },
  benefitBold: { fontFamily: fonts.bold, color: colors.text },
  info: { padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  infoText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.textBody },
});
