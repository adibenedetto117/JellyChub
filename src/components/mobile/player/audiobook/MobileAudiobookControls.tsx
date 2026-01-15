import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { AudiobookPlayerCore, AudiobookModalView } from '@/hooks';

interface MobileAudiobookControlsProps {
  playerState: string;
  audiobookSpeed: number;
  sleepTimeRemaining: number | null;
  accentColor: string;
  playButtonScale: AudiobookPlayerCore['playButtonScale'];
  handlePlayPause: () => void;
  handleSkip: (seconds: number) => Promise<void>;
  setModalView: (view: AudiobookModalView) => void;
}

export function MobileAudiobookControls({
  playerState,
  audiobookSpeed,
  sleepTimeRemaining,
  accentColor,
  playButtonScale,
  handlePlayPause,
  handleSkip,
  setModalView,
}: MobileAudiobookControlsProps) {
  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.quickActions}>
        <Pressable
          onPress={() => setModalView('speed')}
          style={[styles.quickActionButton, audiobookSpeed !== 1 && { backgroundColor: accentColor }]}
        >
          <Text style={styles.quickActionText}>{audiobookSpeed}x</Text>
        </Pressable>

        <Pressable
          onPress={() => setModalView('sleep')}
          style={[styles.quickActionButton, sleepTimeRemaining ? { backgroundColor: accentColor } : null]}
        >
          <Ionicons name="moon" size={18} color="#fff" />
          {sleepTimeRemaining ? (
            <Text style={styles.quickActionText}>{sleepTimeRemaining}m</Text>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => setModalView('bookmarks')}
          style={styles.quickActionButton}
        >
          <Ionicons name="bookmark" size={18} color="#fff" />
        </Pressable>

        <Pressable
          onPress={() => setModalView('chapters')}
          style={styles.quickActionButton}
        >
          <Ionicons name="list" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.playbackControls}>
        <Pressable onPress={() => handleSkip(-30)} style={styles.skipButton}>
          <Ionicons name="play-back" size={20} color="#fff" />
          <Text style={styles.skipText}>30</Text>
        </Pressable>

        <Pressable onPress={() => handleSkip(-10)} style={styles.skipButtonSmall}>
          <Text style={styles.skipTextSmall}>10</Text>
        </Pressable>

        <Animated.View style={playButtonStyle}>
          <Pressable onPress={handlePlayPause} style={styles.playButton}>
            {playerState === 'loading' || playerState === 'buffering' ? (
              <ActivityIndicator size="large" color="#000" />
            ) : (
              <Ionicons
                name={playerState === 'playing' ? 'pause' : 'play'}
                size={36}
                color="#000"
                style={{ marginLeft: playerState === 'playing' ? 0 : 4 }}
              />
            )}
          </Pressable>
        </Animated.View>

        <Pressable onPress={() => handleSkip(10)} style={styles.skipButtonSmall}>
          <Text style={styles.skipTextSmall}>10</Text>
        </Pressable>

        <Pressable onPress={() => handleSkip(30)} style={styles.skipButton}>
          <Text style={styles.skipText}>30</Text>
          <Ionicons name="play-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  skipButtonSmall: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipTextSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
});
