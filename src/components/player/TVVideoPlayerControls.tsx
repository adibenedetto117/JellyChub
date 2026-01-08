import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { tvConstants } from '@/utils/platform';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatPlayerTime } from '@/utils';
import { TVFocusableButton } from '@/components/tv';

interface TVVideoPlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onClose: () => void;
  position: number;
  duration: number;
  buffered: number;
  title: string;
  subtitle?: string;
  onSubtitlePress?: () => void;
  onAudioPress?: () => void;
  onSpeedPress?: () => void;
  playbackSpeed?: number;
  hasActiveSubtitle?: boolean;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  visible?: boolean;
  seekIndicator?: { direction: 'left' | 'right'; seconds: number } | null;
}

export function TVVideoPlayerControls({
  isPlaying,
  isLoading,
  onPlayPause,
  onSeekBack,
  onSeekForward,
  onClose,
  position,
  duration,
  buffered,
  title,
  subtitle,
  onSubtitlePress,
  onAudioPress,
  onSpeedPress,
  playbackSpeed = 1,
  hasActiveSubtitle,
  onNextEpisode,
  hasNextEpisode,
  visible = true,
  seekIndicator,
}: TVVideoPlayerControlsProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const [focusedButton, setFocusedButton] = useState<string | null>('play');

  const controlsOpacity = useSharedValue(visible ? 1 : 0);
  const seekLeftOpacity = useSharedValue(0);
  const seekRightOpacity = useSharedValue(0);

  useEffect(() => {
    controlsOpacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, controlsOpacity]);

  useEffect(() => {
    if (seekIndicator) {
      if (seekIndicator.direction === 'left') {
        seekLeftOpacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 400 })
        );
      } else {
        seekRightOpacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 400 })
        );
      }
    }
  }, [seekIndicator, seekLeftOpacity, seekRightOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
    pointerEvents: controlsOpacity.value > 0.5 ? 'auto' : 'none',
  }));

  const seekLeftStyle = useAnimatedStyle(() => ({
    opacity: seekLeftOpacity.value,
  }));

  const seekRightStyle = useAnimatedStyle(() => ({
    opacity: seekRightOpacity.value,
  }));

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.topGradient}
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.bottomGradient}
      />

      <View style={styles.topRow}>
        <TVFocusableButton
          icon="close"
          onPress={onClose}
          size="medium"
          onFocus={() => setFocusedButton('close')}
          accessibilityLabel="Close player"
        />
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.optionsRow}>
          {onSubtitlePress && (
            <TVFocusableButton
              icon="text"
              onPress={onSubtitlePress}
              size="small"
              active={hasActiveSubtitle}
              onFocus={() => setFocusedButton('subtitle')}
              accessibilityLabel="Subtitles"
            />
          )}
          {onAudioPress && (
            <TVFocusableButton
              icon="volume-high"
              onPress={onAudioPress}
              size="small"
              onFocus={() => setFocusedButton('audio')}
              accessibilityLabel="Audio tracks"
            />
          )}
          {onSpeedPress && (
            <TVFocusableButton
              label={`${playbackSpeed}x`}
              onPress={onSpeedPress}
              size="small"
              onFocus={() => setFocusedButton('speed')}
              accessibilityLabel={`Playback speed ${playbackSpeed}x`}
            />
          )}
        </View>
      </View>

      <View style={styles.centerRow}>
        <Animated.View style={[styles.seekIndicator, styles.seekLeft, seekLeftStyle]}>
          <Ionicons name="play-back" size={48} color="#fff" />
          {seekIndicator?.direction === 'left' && (
            <Text style={styles.seekText}>-{seekIndicator.seconds}s</Text>
          )}
        </Animated.View>

        <View style={styles.controlsRow}>
          <TVFocusableButton
            icon="play-back"
            onPress={onSeekBack}
            size="large"
            onFocus={() => setFocusedButton('seekBack')}
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
                onFocus={() => setFocusedButton('play')}
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                style={styles.playButton}
              />
            )}
          </View>

          <TVFocusableButton
            icon="play-forward"
            onPress={onSeekForward}
            size="large"
            onFocus={() => setFocusedButton('seekForward')}
            accessibilityLabel="Seek forward 10 seconds"
          />

          {hasNextEpisode && onNextEpisode && (
            <TVFocusableButton
              icon="play-skip-forward"
              onPress={onNextEpisode}
              size="large"
              onFocus={() => setFocusedButton('next')}
              accessibilityLabel="Next episode"
            />
          )}
        </View>

        <Animated.View style={[styles.seekIndicator, styles.seekRight, seekRightStyle]}>
          <Ionicons name="play-forward" size={48} color="#fff" />
          {seekIndicator?.direction === 'right' && (
            <Text style={styles.seekText}>+{seekIndicator.seconds}s</Text>
          )}
        </Animated.View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatPlayerTime(position)}
          </Text>
          <Text style={styles.timeText}>
            {formatPlayerTime(duration)}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View
            style={[styles.progressBuffered, { width: `${bufferedPercent}%` }]}
          />
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%`, backgroundColor: accentColor },
            ]}
          />
        </View>

        <View style={styles.hintRow}>
          <Text style={styles.hintText}>
            LEFT/RIGHT to seek  |  OK to play/pause  |  BACK to exit
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tvConstants.controlBarPadding,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 24,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: tvConstants.buttonGap,
  },
  centerRow: {
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
  seekIndicator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  seekLeft: {
    left: 80,
  },
  seekRight: {
    right: 80,
  },
  seekText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  bottomRow: {
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingBottom: tvConstants.controlBarPadding,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
  },
  progressContainer: {
    height: tvConstants.progressBarHeight || 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBuffered: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  progressFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 4,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
