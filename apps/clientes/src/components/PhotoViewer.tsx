// Fotos a pantalla completa: deslizar entre fotos y acercar (2x, 3x) para ver detalles.
// Sin librerías nuevas: al acercar, la foto se agranda y se mueve arrastrando (desplazamiento en
// los dos ejes). Funciona igual en Android, iOS y la vista web de desarrollo.
import { slideIndex } from '@zipa/shared';
import { X, ZoomIn, ZoomOut } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ViewerPhoto {
  url: string;
  label: string | null;
}


export function PhotoViewer({ photos, start, onClose, title }: { photos: ViewerPhoto[]; start: number; onClose: () => void; title: string }) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(Math.min(Math.max(start, 0), photos.length - 1));
  const [zoom, setZoom] = useState<1 | 2 | 3>(1);
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const panX = useRef<ComponentRef<typeof ScrollView>>(null);
  const panY = useRef<ComponentRef<typeof ScrollView>>(null);

  // Al acercar, empieza mostrando el centro de la foto.
  useEffect(() => {
    if (zoom === 1) return;
    const t = setTimeout(() => {
      panX.current?.scrollTo({ x: (W * zoom - W) / 2, animated: false });
      panY.current?.scrollTo({ y: (H * zoom - H) / 2, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [zoom, W, H]);

  const photo = photos[index];
  if (!photo) return null;
  const zoomIn = () => setZoom(zoom === 1 ? 2 : 3);
  const zoomOut = () => setZoom(zoom === 3 ? 2 : 1);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root} accessibilityViewIsModal>
        {zoom === 1 ? (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onLayout={() => pager.current?.scrollTo({ x: index * W, animated: false })}
            onMomentumScrollEnd={(e) => setIndex(slideIndex(e.nativeEvent.contentOffset.x, W, photos.length))}
            accessibilityLabel={`Fotos de ${title}. Desliza para ver más.`}>
            {photos.map((p, i) => (
              <Image key={`${p.url}-${i}`} source={{ uri: p.url }} style={{ width: W, height: H }} resizeMode="contain" accessibilityLabel={p.label ?? `Foto ${i + 1} de ${title}`} />
            ))}
          </ScrollView>
        ) : (
          <ScrollView ref={panX} horizontal showsHorizontalScrollIndicator={false} bounces={false}>
            <ScrollView ref={panY} showsVerticalScrollIndicator={false} bounces={false} nestedScrollEnabled>
              <Image source={{ uri: photo.url }} style={{ width: W * zoom, height: H * zoom }} resizeMode="contain" accessibilityLabel={`${photo.label ?? `Foto ${index + 1} de ${title}`}, ampliada ${zoom} veces`} />
            </ScrollView>
          </ScrollView>
        )}

        <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar fotos" onPress={onClose} style={styles.round} hitSlop={8}>
            <X size={24} color="#FFFFFF" />
          </Pressable>
          {photos.length > 1 && <Text style={styles.counter}>{index + 1} de {photos.length}</Text>}
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          {!!photo.label && <Text style={styles.caption} numberOfLines={2}>{photo.label}</Text>}
          <View style={styles.zoomRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Alejar" accessibilityState={{ disabled: zoom === 1 }} disabled={zoom === 1} onPress={zoomOut} style={[styles.round, zoom === 1 && styles.off]} hitSlop={8}>
              <ZoomOut size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.zoomText}>{zoom === 1 ? 'Toca + para acercar' : `${zoom}x · arrastra para mover`}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Acercar" accessibilityState={{ disabled: zoom === 3 }} disabled={zoom === 3} onPress={zoomIn} style={[styles.round, zoom === 3 && styles.off]} hitSlop={8}>
              <ZoomIn size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 12, paddingHorizontal: 16, alignItems: 'center' },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.35 },
  counter: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  caption: { color: '#FFFFFF', fontSize: 15, textAlign: 'center' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  zoomText: { color: '#FFFFFF', fontSize: 14, minWidth: 170, textAlign: 'center' },
});
