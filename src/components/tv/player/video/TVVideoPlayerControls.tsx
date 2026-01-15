import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/stores/settingsStore';
import { tvConstants } from '@/utils/platform';
import { TVVideoPlayerHeader } from './TVVideoPlayerHeader';
import { TVVideoPlaybackControls } from './TVVideoPlaybackControls';
import { TVVideoPlayerOverlays } from './TVVideoPlayerOverlays';
import { TVVideoSeekBar } from './TVVideoSeekBar';
import { TVVideoOptionsMenu } from './TVVideoOptionsMenu';

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

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.topRow}>
        <TVVideoPlayerHeader
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          onFocusChange={setFocusedButton}
        />
        <TVVideoOptionsMenu
          onSubtitlePress={onSubtitlePress}
          onAudioPress={onAudioPress}
          onSpeedPress={onSpeedPress}
          playbackSpeed={playbackSpeed}
          hasActiveSubtitle={hasActiveSubtitle}
          onFocusChange={setFocusedButton}
        />
      </View>

      <View style={styles.centerRow}>
        <TVVideoPlayerOverlays
          seekIndicator={seekIndicator}
          seekLeftOpacity={seekLeftOpacity}
          seekRightOpacity={seekRightOpacity}
        />
        <TVVideoPlaybackControls
          isPlaying={isPlaying}
          isLoading={isLoading}
          onPlayPause={onPlayPause}
          onSeekBack={onSeekBack}
          onSeekForward={onSeekForward}
          onNextEpisode={onNextEpisode}
          hasNextEpisode={hasNextEpisode}
          onFocusChange={setFocusedButton}
        />
      </View>

      <View style={styles.bottomRow}>
        <TVVideoSeekBar
          position={position}
          duration={duration}
          buffered={buffered}
          accentColor={accentColor}
        />
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tvConstants.controlBarPadding,
  },
  centerRow: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
