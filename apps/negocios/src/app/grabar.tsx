// Cámara para grabar el video del producto con el que se crea la vista 3D.
// Sin sonido: la app nunca pide permiso de micrófono.
import { Button, colors, fonts } from '@zipa/shared';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VIDEO_SECONDS, finishRecording } from '@/components/media';

const TIPS = ['Pon el producto en el centro, sobre una mesa despejada.', 'Camina despacio a su alrededor, sin acercarte ni alejarte.', 'Mejor con luz de día y sin reflejos fuertes.'];

export default function Grabar() {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const done = useRef(false);

  // Si la persona sale con el gesto de atrás, quien abrió la cámara recibe "sin video".
  useEffect(() => () => { if (!done.current) finishRecording(null); }, []);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed((s) => Math.min(VIDEO_SECONDS, s + 0.1)), 100);
    return () => clearInterval(t);
  }, [recording]);

  const close = (file: { uri: string; mimeType: string } | null) => {
    done.current = true;
    finishRecording(file);
    router.back();
  };

  const start = async () => {
    if (!camera.current || !ready) return;
    setError('');
    setElapsed(0);
    setRecording(true);
    try {
      const video = await camera.current.recordAsync({ maxDuration: VIDEO_SECONDS });
      setRecording(false);
      if (video?.uri) close({ uri: video.uri, mimeType: video.uri.endsWith('.mov') ? 'video/quicktime' : 'video/mp4' });
    } catch {
      setRecording(false);
      setError('No pudimos grabar. Intenta de nuevo.');
    }
  };

  const stop = () => camera.current?.stopRecording();

  if (!permission) return <View style={styles.dark} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.dark, styles.center]}>
        <Text style={styles.title}>Necesitamos la cámara</Text>
        <Text style={styles.body}>La usamos solo mientras grabas el video de tu producto. El video se graba sin sonido.</Text>
        {permission.canAskAgain ? (
          <Button title="Permitir la cámara" variant="accent" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
        ) : (
          <Text style={styles.body}>Actívala en los ajustes del celular, en los permisos de Zipa lo tiene Negocios.</Text>
        )}
        <Button title="Volver" variant="link" onPress={() => close(null)} />
      </SafeAreaView>
    );
  }

  const progress = elapsed / VIDEO_SECONDS;
  const remaining = Math.max(0, Math.ceil(VIDEO_SECONDS - elapsed));

  return (
    <View style={styles.dark}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} mode="video" mute videoQuality="720p" onCameraReady={() => setReady(true)} />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <View style={styles.badge}><Text style={styles.badgeText}>{recording ? `Grabando · ${remaining} s` : 'Video del producto · sin sonido'}</Text></View>
          {!recording && (
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sin grabar" onPress={() => close(null)} style={styles.close}>
              <X size={24} color="#FFFFFF" />
            </Pressable>
          )}
        </View>

        {/* Guía: el producto va dentro del círculo. */}
        <View style={styles.guide} pointerEvents="none">
          <View style={[styles.ring, recording && styles.ringOn]} />
        </View>

        <View style={styles.bottom}>
          <Text style={styles.tip}>{recording ? 'Da la vuelta completa alrededor del producto, despacio.' : TIPS.join('\n')}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recording ? 'Terminar la grabación' : 'Empezar a grabar'}
            onPress={recording ? stop : start}
            disabled={!ready}
            style={[styles.shutter, !ready && { opacity: 0.4 }]}>
            <View style={recording ? styles.stopIcon : styles.recIcon} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#0B1413' },
  center: { justifyContent: 'center', padding: 28, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 28, color: '#FFFFFF' },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: '#CFE1DF' },
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  badge: { backgroundColor: 'rgba(20,33,31,0.8)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  badgeText: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF' },
  close: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(20,33,31,0.8)', alignItems: 'center', justifyContent: 'center' },
  guide: { alignItems: 'center' },
  ring: { width: 250, height: 250, borderRadius: 125, borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)', borderStyle: 'dashed' },
  ringOn: { borderColor: colors.accent, borderStyle: 'solid' },
  bottom: { gap: 16, paddingBottom: 12, alignItems: 'center' },
  tip: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: '#FFFFFF', textAlign: 'center', backgroundColor: 'rgba(20,33,31,0.75)', padding: 14, borderRadius: 18, overflow: 'hidden', alignSelf: 'stretch' },
  track: { alignSelf: 'stretch', height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.accent },
  error: { fontFamily: fonts.semibold, color: '#FFB4A2' },
  shutter: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  recIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.price },
  stopIcon: { width: 30, height: 30, borderRadius: 6, backgroundColor: colors.price },
});
