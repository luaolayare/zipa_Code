// Video del producto (aprobado por el equipo). Se repite solo y sin sonido, como una vitrina.
import { colors } from '@zipa/shared';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';

export function ProductVideo({ url, label }: { url: string; label: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true; // los videos se graban sin sonido
    p.play();
  });
  return <VideoView player={player} style={styles.video} contentFit="cover" nativeControls allowsPictureInPicture={false} accessibilityLabel={label} />;
}

const styles = StyleSheet.create({
  video: { width: '100%', height: '100%', borderRadius: 28, backgroundColor: colors.dark, overflow: 'hidden' },
});
