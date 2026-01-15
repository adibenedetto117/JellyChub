import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ShuffleMode = 'off' | 'all' | 'album' | 'new';
type RepeatMode = 'off' | 'all' | 'one';

interface TVMusicPlayerControlsProps {
  playerState: string;
  showLoading: boolean;
  shuffleMode: ShuffleMode;
  repeatMode: RepeatMode;
  accentColor: string;
  onPlayPause: () => void;
  onSkipPrevious: () => void;
  onSkipNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

export function TVMusicPlayerControls({
  playerState,
  showLoading,
  shuffleMode,
  repeatMode,
  accentColor,
  onPlayPause,
  onSkipPrevious,
  onSkipNext,
  onToggleShuffle,
  onToggleRepeat,
}: TVMusicPlayerControlsProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onToggleShuffle}
        style={[
          styles.modeButton,
          shuffleMode !== 'off' && styles.modeButtonActive,
        ]}
      >
        <Ionicons
          name={shuffleMode === 'album' ? 'albums' : 'shuffle'}
          size={28}
          color={shuffleMode !== 'off' ? accentColor : 'rgba(255,255,255,0.5)'}
        />
      </Pressable>

      <Pressable onPress={onSkipPrevious} style={styles.skipButton}>
        <Ionicons name="play-skip-back" size={36} color="#fff" />
      </Pressable>

      <Pressable onPress={onPlayPause} style={styles.playButton}>
        {showLoading ? (
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

      <Pressable onPress={onSkipNext} style={styles.skipButton}>
        <Ionicons name="play-skip-forward" size={36} color="#fff" />
      </Pressable>

      <Pressable
        onPress={onToggleRepeat}
        style={[
          styles.modeButton,
          repeatMode !== 'off' && styles.modeButtonActive,
        ]}
      >
        <View>
          <Ionicons
            name="repeat"
            size={28}
            color={repeatMode !== 'off' ? accentColor : 'rgba(255,255,255,0.5)'}
          />
          {repeatMode === 'one' && (
            <View style={[styles.repeatOneBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.repeatOneText}>1</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  modeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  skipButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  repeatOneBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
