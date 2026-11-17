// Producto: foto grande (o vista 3D cuando exista), datos y calificar.
import { PlateArt, colors, fonts, formatCop, slideIndex, useAuth, type Business, type Product } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScanLine } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
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

  const comer = business?.category === 'comer';
  const ar = product.modelUrl ? arUrl(product.modelUrl) : null;
  // Galería: primero el video (si el equipo lo aprobó), luego la foto principal y las demás.
  const slides: { key: string; kind: 'video' | 'photo'; url: string; label: string | null }[] = [
    ...(videoUrl ? [{ key: 'video', kind: 'video' as const, url: videoUrl, label: 'Video del negocio' }] : []),
    ...(product.photoUrl ? [{ key: 'main', kind: 'photo' as const, url: product.photoUrl, label: product.photoLabel }] : []),
    ...product.photos.map((p) => ({ key: p.id, kind: 'photo' as const, url: p.url, label: p.label })),
  ];
  const rate = () => {
    if (!user) return router.push({ pathname: '/login', params: { desde: 'calificar', negocio: product.businessId } });
    router.push({ pathname: '/calificar/[id]', params: { id: product.businessId } });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
      <View style={[styles.stage, { paddingTop: insets.top + 12 }]}>
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
                    ? <ProductVideo url={s.url} label={`Video de ${product.name}`} />
                    : <Image source={{ uri: s.url }} style={styles.photo} accessibilityLabel={s.label ?? `Foto ${i + 1} de ${product.name}`} />}
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
              <Image source={{ uri: product.photoUrl }} style={styles.photo} accessibilityLabel={product.photoLabel ?? `Foto de ${product.name}`} />
            ) : (
              <PlateArt category={business?.category ?? 'comer'} size={300} />
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
            <Text style={styles.primaryText}>{comer ? 'Ver en mi mesa' : 'Ver en mi espacio'}</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={rate} style={({ pressed }) => [styles.outline, pressed && { opacity: 0.85 }]}>
          <Text style={styles.outlineText}>{comer ? 'Ya lo probé: calificar el negocio' : 'Ya lo compré: calificar el negocio'}</Text>
        </Pressable>
        {ar && <Text style={styles.note}>Tamaño aproximado. El producto real puede variar.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: colors.background },
  stage: { backgroundColor: colors.stage3d, paddingHorizontal: 20, paddingBottom: 20 },
  stageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stageBadge: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, overflow: 'hidden' },
  stageArt: { height: 340, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  photo: { width: '100%', height: '100%', borderRadius: 28 },
  gallery: { height: 340, marginTop: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(20,33,31,0.25)' },
  dotOn: { width: 20, backgroundColor: colors.text },
  caption: { textAlign: 'center', marginTop: 6, fontFamily: fonts.semibold, fontSize: 14.5, color: colors.textBody },
  body: { padding: 22, gap: 12 },
  businessName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted, textDecorationLine: 'underline' },
  h1: { fontFamily: fonts.hero, fontSize: 34, lineHeight: 37, letterSpacing: -1, color: colors.text, textAlign: 'left' },
  description: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 26, color: colors.textBody },
  price: { fontFamily: fonts.display, fontSize: 30, color: colors.price, marginVertical: 4 },
  primary: { minHeight: 58, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 6 },
  primaryText: { fontFamily: fonts.bold, fontSize: 17, color: '#FFFFFF' },
  outline: { minHeight: 58, borderRadius: 18, borderWidth: 1.5, borderColor: colors.text, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  outlineText: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  note: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textMuted, textAlign: 'center' },
});
