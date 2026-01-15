import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { tvConstants } from '@/utils/platform';
import { TVFocusableButton } from '@/components/tv';

interface TVVideoPlaybackControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  onFocusChange?: (button: string) => void;
}

export function TVVideoPlaybackControls({
  isPlaying,
  isLoading,
  onPlayPause,
  onSeekBack,
  onSeekForward,
  onNextEpisode,
  hasNextEpisode,
  onFocusChange,
}: TVVideoPlaybackControlsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <TVFocusableButton
          icon="play-back"
          onPress={onSeekBack}
          size="large"
          onFocus={() => onFocusChange?.('seekBack')}
          accessibilityLabel="Seek back 10 seconds"
        />

        <View style={styles.playButtonContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <TVFocusableButton
              icon={isPlaying ? 'pause' : 'play'}
              onPress={onPlayPause}
              size="large"
              autoFocus
              onFocus={() => onFocusChange?.('play')}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              style={styles.playButton}
            />
          )}
        </View>

        <TVFocusableButton
          icon="play-forward"
          onPress={onSeekForward}
          size="large"
          onFocus={() => onFocusChange?.('seekForward')}
          accessibilityLabel="Seek forward 10 seconds"
        />

        {hasNextEpisode && onNextEpisode && (
          <TVFocusableButton
            icon="play-skip-forward"
            onPress={onNextEpisode}
            size="large"
            onFocus={() => onFocusChange?.('next')}
            accessibilityLabel="Next episode"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tvConstants.buttonGap * 2,
  },
  playButtonContainer: {
    marginHorizontal: 16,
  },
  playButton: {
    width: tvConstants.controlButtonSize * 1.5,
    height: tvConstants.controlButtonSize * 1.5,
  },
  loadingContainer: {
    width: tvConstants.controlButtonSize * 1.5,
    height: tvConstants.controlButtonSize * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
