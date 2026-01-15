import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TVAudiobookControlsProps {
  playerState: string;
  audiobookSpeed: number;
  accentColor: string;
  handlePlayPause: () => void;
  handleSkip: (seconds: number) => Promise<void>;
}

export function TVAudiobookControls({
  playerState,
  audiobookSpeed,
  accentColor,
  handlePlayPause,
  handleSkip,
}: TVAudiobookControlsProps) {
  const isLoading = playerState === 'loading' || playerState === 'buffering';

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Pressable onPress={() => handleSkip(-30)} style={styles.skipButton}>
          <Ionicons name="play-back" size={24} color="#fff" />
          <Text style={styles.skipLabel}>30s</Text>
        </Pressable>

        <Pressable onPress={() => handleSkip(-10)} style={styles.skipButton}>
          <Text style={styles.skipLabelSmall}>10s</Text>
        </Pressable>

        <Pressable onPress={handlePlayPause} style={styles.playButton}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <Ionicons
              name={playerState === 'playing' ? 'pause' : 'play'}
              size={48}
              color="#000"
              style={{ marginLeft: playerState === 'playing' ? 0 : 6 }}
            />
          )}
        </Pressable>

        <Pressable onPress={() => handleSkip(10)} style={styles.skipButton}>
          <Text style={styles.skipLabelSmall}>10s</Text>
        </Pressable>

        <Pressable onPress={() => handleSkip(30)} style={styles.skipButton}>
          <Text style={styles.skipLabel}>30s</Text>
          <Ionicons name="play-forward" size={24} color="#fff" />
        </Pressable>
      </View>

      {audiobookSpeed !== 1 && (
        <View style={[styles.speedBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.speedText}>{audiobookSpeed}x</Text>
        </View>
      )}

      <View style={styles.remoteHints}>
        <Text style={styles.hintText}>OK = Play/Pause | Left/Right = Skip 10s | Long Press = Skip 30s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  skipLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipLabelSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '600',
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  speedBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  speedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  remoteHints: {
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
});
