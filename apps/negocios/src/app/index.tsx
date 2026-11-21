// Bienvenida de la app de negocios.
import { BRAND, Button, colors, fonts, useAuth, PlateArt, radius, spacing, typography } from '@zipa/shared';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';

const BENEFICIOS: [string, string][] = [
  ['Aparece ante turistas', ` que buscan dónde comer y qué comprar en ${BRAND.city}.`],
  ['Muestra tus productos en video', ', grabado con tu celular en 20 segundos.'],
  ['Recibe y responde reseñas', ' para ganar la confianza de nuevos clientes.'],
];

export default function Inicio() {
  const { user } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} bounces={false}>
        <View style={styles.hero}>
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            {/* Decoración: anillo y plato ilustrado asomando por la derecha. */}
            <View style={styles.ring} pointerEvents="none" />
            <View style={styles.plate} pointerEvents="none"><PlateArt art="plato" main="restaurantes" size={176} /></View>
            <Logo light />
            <Text style={styles.title}>Que los turistas encuentren tu negocio.</Text>
            <Text style={styles.lead}>Registra tu restaurante o emprendimiento, muestra tus productos con fotos y video, y recibe reseñas de tus clientes.</Text>
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
  hero: { backgroundColor: colors.dark, overflow: 'hidden', borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroInner: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xl },
  ring: { position: 'absolute', right: -110, top: -30, width: 290, height: 290, borderRadius: radius.pill, borderWidth: 38, borderColor: '#1E3431' },
  plate: { position: 'absolute', right: -18, top: 74, transform: [{ rotate: '-9deg' }] },
  title: { ...typography.display, color: '#FFFFFF', marginTop: 128, maxWidth: 340 }, // 128: deja ver la ilustración encima (posición, no ritmo)
  lead: { ...typography.subtitle, fontFamily: fonts.regular, color: colors.onPrimaryMuted, maxWidth: 360 },
  body: { padding: spacing.lg, gap: spacing.lg },
  benefit: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  check: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxs },
  benefitText: { ...typography.subtitle, flex: 1, fontFamily: fonts.regular, color: colors.textBody },
  benefitBold: { fontFamily: fonts.bold, color: colors.text },
  info: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  infoText: { ...typography.body, color: colors.textBody },
});
