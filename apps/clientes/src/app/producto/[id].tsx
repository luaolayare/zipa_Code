// Producto: galería (video aprobado y fotos), datos, «Ver en 3D» solo si hay modelo, y calificar.
import { PlateArt, colors, fonts, formatCop, radius, sizes, slideIndex, spacing, typography, useAuth, type Business, type Product, restaurantOf } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScanLine } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { PhotoViewer } from '@/components/PhotoViewer';
import { ProductVideo } from '@/components/ProductVideo';

/**
 * Realidad aumentada con el visor de cada sistema (sin construir un visor propio):
 * Android abre Scene Viewer con el .glb; iPhone abre Quick Look con el .usdz.
 * Devuelve null si el modelo no sirve para este celular.
 */
function arUrl(modelUrl: string): string | null {
  if (Platform.OS === 'android' && /\.glb(\?|$)/i.test(modelUrl)) {
    return `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_preferred`;
  }
  if (Platform.OS === 'ios' && /\.usdz(\?|$)/i.test(modelUrl)) return modelUrl;
  return null;
}

export default function ProductoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [business, setBusiness] = useState<Business | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null); // foto abierta a pantalla completa

  // Analítica: producto o plato consultado.
  useEffect(() => { api.track('product_view', { productId: id }); }, [api, id]);

  useEffect(() => {
    api.getProduct(id)
      .then(async (p) => {
        // Negocio y video en paralelo, y la pantalla se muestra cuando ya se sabe si hay video:
        // así la galería se arma una sola vez y empieza en el primer elemento (antes el video
        // llegaba después y se insertaba delante, y la galería quedaba en la segunda posición).
        // Solo los videos aprobados por el equipo (la base de datos no entrega los demás).
        const [b, v] = await Promise.all([
          p ? api.getBusiness(p.businessId).catch(() => null) : null,
          p?.videoPath && p.videoStatus === 'aprobado' ? api.videoUrl(p.videoPath).catch(() => null) : null,
        ]);
        setBusiness(b);
        setVideoUrl(v);
        setProduct(p);
      })
      .catch(() => setProduct(null));
  }, [api, id]);

  if (product === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.h1}>Este producto no está disponible</Text>
        <BackButton />
      </View>
    );
  }

  const comer = business ? restaurantOf(business) : false; // restaurante: «Ya lo probé»
  const ar = product.modelUrl ? arUrl(product.modelUrl) : null;
  // Galería: primero el video (si el equipo lo aprobó), luego la foto principal y las demás.
  const slides: { key: string; kind: 'video' | 'photo'; url: string; label: string | null }[] = [
    ...(videoUrl ? [{ key: 'video', kind: 'video' as const, url: videoUrl, label: 'Video del negocio' }] : []),
    ...(product.photoUrl ? [{ key: 'main', kind: 'photo' as const, url: product.photoUrl, label: product.photoLabel }] : []),
    ...product.photos.map((p) => ({ key: p.id, kind: 'photo' as const, url: p.url, label: p.label })),
  ];
  const photos = slides.filter((s) => s.kind === 'photo');
  const openPhoto = (url: string) => setViewer(Math.max(photos.findIndex((p) => p.url === url), 0));
  const rate = () => {
    if (!user) return router.push({ pathname: '/login', params: { desde: 'calificar', negocio: product.businessId } });
    router.push({ pathname: '/calificar/[id]', params: { id: product.businessId } });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom }}>
      <View style={[styles.stage, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.stageTop}>
          <BackButton onDark />
          <Text style={styles.stageBadge}>{product.modelUrl ? 'Vista 3D' : slides.length > 1 ? `${slide + 1} de ${slides.length}` : videoUrl ? 'Video del negocio' : product.photoUrl ? 'Foto del negocio' : 'Ilustración'}</Text>
        </View>
        {slides.length > 1 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onLayout={(e) => setSlideWidth(e.nativeEvent.layout.width)}
              // Solo con el ancho ya medido: antes, un desplazamiento al montar dividía por 1 y el
              // contador marcaba «2 de N» mostrando el primero (auditoría Beta 2, C10).
              onMomentumScrollEnd={(e) => slideWidth > 0 && setSlide(slideIndex(e.nativeEvent.contentOffset.x, slideWidth, slides.length))}
              onScroll={(e) => slideWidth > 0 && setSlide(slideIndex(e.nativeEvent.contentOffset.x, slideWidth, slides.length))}
              scrollEventThrottle={32}
              style={styles.gallery}
              accessibilityLabel={`Galería de ${product.name}: ${slides.length} elementos. Desliza para ver más.`}>
              {slides.map((s, i) => (
                <View key={s.key} style={{ width: slideWidth || 1, height: '100%' }}>
                  {s.kind === 'video'
                    ? <ProductVideo url={s.url} label={`Video de ${product.name}`} active={slide === i} />
                    : (
                      <Pressable accessibilityRole="button" accessibilityLabel={`${s.label ?? `Foto ${i + 1} de ${product.name}`}. Toca para ampliar.`} onPress={() => openPhoto(s.url)} style={{ flex: 1 }}>
                        <Image source={{ uri: s.url }} style={styles.photo} />
                      </Pressable>
                    )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.dots} accessibilityElementsHidden>
              {slides.map((s, i) => <View key={s.key} style={[styles.dot, i === slide && styles.dotOn]} />)}
            </View>
            {!!slides[slide]?.label && <Text style={styles.caption}>{slides[slide].label}</Text>}
          </View>
        ) : (
          <View style={styles.stageArt}>
            {videoUrl ? (
              <ProductVideo url={videoUrl} label={`Video de ${product.name}`} />
            ) : product.photoUrl ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`${product.photoLabel ?? `Foto de ${product.name}`}. Toca para ampliar.`} onPress={() => openPhoto(product.photoUrl!)} style={{ flex: 1, alignSelf: 'stretch' }}>
                <Image source={{ uri: product.photoUrl }} style={styles.photo} />
              </Pressable>
            ) : (
              <PlateArt of={business} size={300} />
            )}
          </View>
        )}
      </View>

      <View style={styles.body}>
        {!!business && (
          <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/negocio/[id]', params: { id: business.id } })}>
            <Text style={styles.businessName}>{business.name}</Text>
          </Pressable>
        )}
        <Text style={styles.h1} accessibilityRole="header">{product.name}</Text>
        {!!product.description && <Text style={styles.description}>{product.description}</Text>}
        <Text style={styles.price}>{formatCop(product.priceCop)}</Text>


        {ar && (
          <Pressable accessibilityRole="button" onPress={() => Linking.openURL(ar)} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]}>
            <ScanLine size={22} color="#FFFFFF" />
            <Text style={styles.primaryText}>Ver en 3D</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={rate} style={({ pressed }) => [styles.outline, pressed && { opacity: 0.85 }]}>
          <Text style={styles.outlineText}>{comer ? 'Ya lo probé: calificar el negocio' : 'Ya lo compré: calificar el negocio'}</Text>
        </Pressable>
        {ar && <Text style={styles.note}>Tamaño aproximado. El producto real puede variar.</Text>}
      </View>
      {viewer !== null && photos.length > 0 && <PhotoViewer photos={photos} start={viewer} title={product.name} onClose={() => setViewer(null)} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background },
  stage: { backgroundColor: colors.stage3d, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  stageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stageBadge: { ...typography.label, fontFamily: fonts.bold, backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, overflow: 'hidden' },
  stageArt: { height: 340, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  photo: { width: '100%', height: '100%', borderRadius: radius.xl },
  gallery: { height: 340, marginTop: spacing.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm }, // puntos: medida fina, fuera de la escala
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(20,33,31,0.25)' },
  dotOn: { width: 20, backgroundColor: colors.text },
  caption: { ...typography.label, color: colors.textBody, textAlign: 'center', marginTop: spacing.xs },
  body: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.xs },
  businessName: { ...typography.label, color: colors.textMuted, textDecorationLine: 'underline' },
  h1: { ...typography.title, textAlign: 'left' },
  description: { ...typography.body, marginTop: spacing.xxs },
  price: { ...typography.title, color: colors.price, marginVertical: spacing.xs },
  primary: { minHeight: sizes.button, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  primaryText: { ...typography.subtitle, color: '#FFFFFF' },
  outline: { minHeight: sizes.button, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.text, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.md },
  outlineText: { ...typography.subtitle, textAlign: 'center' },
  note: { ...typography.caption, textAlign: 'center' },
});
