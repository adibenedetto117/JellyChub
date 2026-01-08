import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { tvConstants } from '@/utils/platform';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatPlayerTime } from '@/utils';
import { TVFocusableButton } from '@/components/tv';

interface TVVideoPlayerControlsProps {
  /** Current playback state */
  isPlaying: boolean;
  /** Whether content is currently loading/buffering */
  isLoading: boolean;
  /** Play/Pause handler */
  onPlayPause: () => void;
  /** Seek backward handler */
  onSeekBack: () => void;
  /** Seek forward handler */
  onSeekForward: () => void;
  /** Close player handler */
  onClose: () => void;
  /** Current progress in milliseconds */
  position: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Buffered position in milliseconds */
  buffered: number;
  /** Title to display */
  title: string;
  /** Optional subtitle (e.g., "S1 E5 - Episode Title") */
  subtitle?: string;
  /** Handler for subtitle toggle */
  onSubtitlePress?: () => void;
  /** Handler for audio track toggle */
  onAudioPress?: () => void;
  /** Handler for speed selection */
  onSpeedPress?: () => void;
  /** Current playback speed */
  playbackSpeed?: number;
  /** Whether subtitles are active */
  hasActiveSubtitle?: boolean;
  /** Handler for next episode */
  onNextEpisode?: () => void;
  /** Whether next episode is available */
  hasNextEpisode?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * TV-optimized video player controls with D-pad navigation support.
 * Features larger buttons and focus indicators for 10-foot UI.
 */
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
}: TVVideoPlayerControlsProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const [focusedButton, setFocusedButton] = useState<string | null>('play');

  // Progress bar calculations
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <View className="absolute inset-0">
      {/* Top gradient for visibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }}
      />

      {/* Bottom gradient for visibility */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 }}
      />

      {/* Top Row: Close and Title */}
      <View
        style={{ padding: tvConstants.controlBarPadding }}
        className="flex-row items-center"
      >
        <TVFocusableButton
          icon="close"
          onPress={onClose}
          size="medium"
          onFocus={() => setFocusedButton('close')}
          accessibilityLabel="Close player"
        />
        <View className="flex-1 mx-6">
          <Text className="text-white text-2xl font-bold" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-text-secondary text-lg mt-1" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Options buttons */}
        <View className="flex-row" style={{ gap: tvConstants.buttonGap }}>
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

      {/* Center Row: Playback Controls */}
      <View className="flex-1 justify-center items-center">
        <View
          className="flex-row items-center justify-center"
          style={{ gap: tvConstants.buttonGap * 2 }}
        >
          {/* Seek Back */}
          <TVFocusableButton
            icon="play-back"
            onPress={onSeekBack}
            size="large"
            onFocus={() => setFocusedButton('seekBack')}
            accessibilityLabel="Seek back 10 seconds"
          />

          {/* Play/Pause - Primary focus */}
          <View>
            {isLoading ? (
              <View
                style={{
                  width: tvConstants.controlButtonSize * 1.5,
                  height: tvConstants.controlButtonSize * 1.5,
                }}
                className="items-center justify-center"
              >
                <Ionicons name="sync" size={48} color="#FFFFFF" />
              </View>
            ) : (
              <TVFocusableButton
                icon={isPlaying ? 'pause' : 'play'}
                onPress={onPlayPause}
                size="large"
                autoFocus
                onFocus={() => setFocusedButton('play')}
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                style={{
                  width: tvConstants.controlButtonSize * 1.5,
                  height: tvConstants.controlButtonSize * 1.5,
                }}
              />
            )}
          </View>

          {/* Seek Forward */}
          <TVFocusableButton
            icon="play-forward"
            onPress={onSeekForward}
            size="large"
            onFocus={() => setFocusedButton('seekForward')}
            accessibilityLabel="Seek forward 10 seconds"
          />

          {/* Next Episode (if available) */}
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
      </View>

      {/* Bottom Row: Progress and Time */}
      <View
        style={{
          paddingHorizontal: tvConstants.controlBarPadding,
          paddingBottom: tvConstants.controlBarPadding,
        }}
      >
        {/* Time display */}
        <View className="flex-row justify-between mb-3">
          <Text className="text-white text-lg font-mono">
            {formatPlayerTime(position)}
          </Text>
          <Text className="text-white text-lg font-mono">
            {formatPlayerTime(duration)}
          </Text>
        </View>

        {/* Progress bar */}
        <View
          className="w-full bg-white/20 rounded-full overflow-hidden"
          style={{ height: tvConstants.progressBarHeight || 8 }}
        >
          {/* Buffered progress */}
          <View
            className="absolute h-full bg-white/30 rounded-full"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Playback progress */}
          <View
            className="absolute h-full rounded-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: accentColor,
            }}
          />
        </View>

        {/* Seek hint text */}
        <View className="flex-row justify-center mt-4">
          <Text className="text-text-secondary text-sm">
            Use LEFT/RIGHT to seek • UP/DOWN for volume • OK to play/pause
          </Text>
        </View>
      </View>
    </View>
  );
}
