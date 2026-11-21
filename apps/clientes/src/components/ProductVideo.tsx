// Video del producto (aprobado por el equipo). Se repite solo y sin sonido, como una vitrina.
//
// Para que no se trabe con datos móviles:
// - se guarda en caché (`useCaching`), así que cada repetición sale del celular en vez de volver a
//   descargarse;
// - junta más video antes de arrancar y antes de seguir tras una pausa por señal (`bufferOptions`);
// - solo se reproduce mientras se ve: se pausa al deslizar a una foto o al salir de la pantalla;
// - mientras carga se ve un indicador, y si no se puede reproducir lo dice en vez de quedarse negro.
import { colors, radius, spacing, typography } from '@zipa/shared';
import { useEvent } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function ProductVideo({ url, label, active = true }: { url: string; label: string; active?: boolean }) {
  const player = useVideoPlayer({ uri: url, useCaching: true }, (p) => {
    p.loop = true;
    p.muted = true; // los videos se graban sin sonido
    p.bufferOptions = {
      preferredForwardBufferDuration: 15, // segundos que intenta tener listos por delante
      minBufferForPlayback: 4, // Android: no reanuda con menos de 4 s (evita arrancar y frenar)
      waitsToMinimizeStalling: true, // iOS: espera lo justo para no frenar a mitad
    };
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  // Solo se reproduce cuando está a la vista (slide activo), la pantalla está enfocada y el video ya
  // cargó: pedir play() antes de tiempo deja un error sin atrapar si el video no se puede leer.
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); player.pause(); };
  }, [player]));
  useEffect(() => {
    if (!active || !focused) player.pause();
    else if (status === 'readyToPlay') player.play();
  }, [player, active, focused, status]);

  return (
    <View style={styles.video}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls allowsPictureInPicture={false} accessibilityLabel={label} />
      {status === 'loading' && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
      {status === 'error' && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.msg}>No pudimos reproducir el video. Revisa tu conexión o desliza para ver las fotos.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  video: { width: '100%', height: '100%', borderRadius: radius.xl, backgroundColor: colors.dark, overflow: 'hidden' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  msg: { ...typography.label, color: '#FFFFFF', textAlign: 'center' },
});
