import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { memo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring, type SharedValue } from 'react-native-reanimated';

// Custom SkipIcon component - displays the seconds text overlay on the refresh icon
function SkipIcon({ size = 24, seconds = 10, direction = 'forward', color = '#fff' }: { size?: number; seconds?: number; direction?: 'forward' | 'back'; color?: string }) {
  const isBack = direction === 'back';
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        name="refresh"
        size={size}
        color={color}
        style={{ transform: [{ scaleX: isBack ? -1 : 1 }] }}
      />
      <Text style={{ color: color, fontSize: size * 0.4, fontWeight: '700', position: 'absolute', top: size * 0.28 }}>{seconds}</Text>
    </View>
  );
}

export { SkipIcon };

interface PlayButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPress: () => void;
  accentColor: string;
  scale: Animated.SharedValue<number>;
}

export const PlayButton = memo(function PlayButton({
  isPlaying,
  isLoading,
  onPress,
  accentColor,
  scale,
}: PlayButtonProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const accessibilityLabel = isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play';

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        className="w-20 h-20 rounded-full items-center justify-center mx-6"
        style={{ backgroundColor: accentColor }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={isPlaying ? 'Pauses playback' : 'Starts playback'}
        accessibilityState={{ disabled: isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : isPlaying ? (
          <Ionicons name="pause" size={36} color="#fff" />
        ) : (
          <Ionicons name="play" size={36} color="#fff" />
        )}
      </Pressable>
    </Animated.View>
  );
});

interface SeekButtonProps {
  direction: 'back' | 'forward';
  onPress: () => void;
  accentColor: string;
}

export const SeekButton = memo(function SeekButton({
  direction,
  onPress,
  accentColor,
}: SeekButtonProps) {
  const isForward = direction === 'forward';
  return (
    <Pressable
      onPress={onPress}
      className="w-14 h-14 rounded-full bg-white/10 items-center justify-center mx-6 active:bg-white/20"
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={isForward ? 'Skip forward 10 seconds' : 'Skip back 10 seconds'}
      accessibilityHint={isForward ? 'Jumps forward in the video' : 'Jumps back in the video'}
    >
      <SkipIcon size={22} seconds={10} direction={direction} color={accentColor} />
    </Pressable>
  );
});

interface ControlButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isActive?: boolean;
  accentColor: string;
  label?: string;
  size?: 'small' | 'medium';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const ControlButton = memo(function ControlButton({
  iconName,
  onPress,
  isActive = false,
  accentColor,
  label,
  size = 'medium',
  accessibilityLabel: customAccessibilityLabel,
  accessibilityHint,
}: ControlButtonProps) {
  const dimensions = size === 'small' ? 'h-9 px-3' : 'h-10 px-4';
  const iconSize = size === 'small' ? 16 : 20;
  const textSize = size === 'small' ? 'text-xs' : 'text-sm';

  const accessibilityLabel = customAccessibilityLabel || label || iconName.replace(/-/g, ' ');

  return (
    <Pressable
      onPress={onPress}
      className={`${dimensions} rounded-full items-center justify-center flex-row active:bg-white/20`}
      style={{ backgroundColor: isActive ? accentColor + '40' : 'rgba(255,255,255,0.1)' }}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: isActive }}
    >
      {label ? (
        <Text className={`text-white ${textSize} font-medium`} accessible={false}>{label}</Text>
      ) : (
        <Ionicons name={iconName} size={iconSize} color="#fff" />
      )}
    </Pressable>
  );
});

interface SkipSegmentButtonProps {
  label: string;
  subLabel?: string;
  onPress: () => void;
  isPreview?: boolean;
}

export const SkipSegmentButton = memo(function SkipSegmentButton({
  label,
  subLabel,
  onPress,
  isPreview = false,
}: SkipSegmentButtonProps) {
  const accessibilityLabel = subLabel ? `${label}, ${subLabel}` : label;
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        right: 32,
        bottom: 120,
        backgroundColor: isPreview ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.95)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: isPreview ? 1 : 0,
        borderColor: 'rgba(255,255,255,0.3)',
      }}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Skips this segment"
    >
      <Text style={{ color: '#000', fontSize: 15, fontWeight: '600' }} accessible={false}>
        {label}
      </Text>
      {subLabel && (
        <Text style={{ color: '#666', fontSize: 13, marginLeft: 8 }} accessible={false}>
          {subLabel}
        </Text>
      )}
    </Pressable>
  );
});

interface VolumeIndicatorProps {
  value: number;
  visible: boolean;
  accentColor: string;
}

export const VolumeIndicator = memo(function VolumeIndicator({
  value,
  visible,
  accentColor,
}: VolumeIndicatorProps) {
  if (!visible) return null;

  const volumePercent = Math.round(value * 100);
  const volumeLabel = value === 0 ? 'Muted' : `Volume ${volumePercent}%`;

  return (
    <View
      style={{
        position: 'absolute',
        left: 40,
        top: '50%',
        marginTop: -80,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 12,
        padding: 16,
        minWidth: 60,
      }}
      pointerEvents="none"
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={volumeLabel}
      accessibilityValue={{ min: 0, max: 100, now: volumePercent }}
    >
      <Ionicons
        name={value === 0 ? "volume-mute" : value < 0.5 ? "volume-low" : "volume-high"}
        size={28}
        color="#fff"
      />
      <View
        style={{
          width: 6,
          height: 100,
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderRadius: 3,
          marginTop: 12,
          overflow: 'hidden',
        }}
        accessible={false}
      >
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${value * 100}%`,
            backgroundColor: accentColor,
            borderRadius: 3,
          }}
        />
      </View>
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 8 }} accessible={false}>
        {volumePercent}%
      </Text>
    </View>
  );
});

interface BrightnessIndicatorProps {
  value: number;
  visible: boolean;
  accentColor: string;
}

export const BrightnessIndicator = memo(function BrightnessIndicator({
  value,
  visible,
  accentColor,
}: BrightnessIndicatorProps) {
  if (!visible) return null;

  const brightnessPercent = Math.round(value * 100);

  return (
    <View
      style={{
        position: 'absolute',
        right: 40,
        top: '50%',
        marginTop: -80,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 12,
        padding: 16,
        minWidth: 60,
      }}
      pointerEvents="none"
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={`Brightness ${brightnessPercent}%`}
      accessibilityValue={{ min: 0, max: 100, now: brightnessPercent }}
    >
      <Ionicons name="sunny" size={28} color="#fff" />
      <View
        style={{
          width: 6,
          height: 100,
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderRadius: 3,
          marginTop: 12,
          overflow: 'hidden',
        }}
        accessible={false}
      >
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${value * 100}%`,
            backgroundColor: accentColor,
            borderRadius: 3,
          }}
        />
      </View>
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 8 }} accessible={false}>
        {brightnessPercent}%
      </Text>
    </View>
  );
});

interface SeekIndicatorProps {
  visible: boolean;
  currentTime: number;
  seekTime: number;
  seekDelta: number;
  accentColor: string;
  formatTime: (ms: number) => string;
}

export const SeekIndicator = memo(function SeekIndicator({
  visible,
  currentTime,
  seekTime,
  seekDelta,
  accentColor,
  formatTime,
}: SeekIndicatorProps) {
  if (!visible) return null;

  const isForward = seekDelta >= 0;
  const absDelta = Math.abs(seekDelta);
  const deltaSeconds = Math.round(absDelta / 1000);
  const direction = isForward ? 'forward' : 'back';

  return (
    <View
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -80 }, { translateY: -40 }],
        backgroundColor: 'rgba(0,0,0,0.85)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        minWidth: 160,
      }}
      pointerEvents="none"
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Seeking ${direction} ${deltaSeconds} seconds to ${formatTime(seekTime)}`}
      accessibilityLiveRegion="polite"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }} accessible={false}>
        <Ionicons
          name={isForward ? "play-forward" : "play-back"}
          size={24}
          color={accentColor}
        />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
          {isForward ? '+' : '-'}{deltaSeconds}s
        </Text>
      </View>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }} accessible={false}>
        {formatTime(seekTime)}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }} accessible={false}>
        from {formatTime(currentTime)}
      </Text>
    </View>
  );
});

interface SubtitleOffsetControlProps {
  offset: number;
  onOffsetChange: (offset: number) => void;
  accentColor: string;
  visible: boolean;
}

export const SubtitleOffsetControl = memo(function SubtitleOffsetControl({
  offset,
  onOffsetChange,
  accentColor,
  visible,
}: SubtitleOffsetControlProps) {
  if (!visible) return null;

  const adjustOffset = useCallback((delta: number) => {
    onOffsetChange(offset + delta);
  }, [offset, onOffsetChange]);

  const resetOffset = useCallback(() => {
    onOffsetChange(0);
  }, [onOffsetChange]);

  const offsetLabel = offset === 0 ? 'Sync' : `${offset > 0 ? '+' : ''}${(offset / 1000).toFixed(1)}s`;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 180,
        left: '50%',
        transform: [{ translateX: -100 }],
        backgroundColor: 'rgba(0,0,0,0.85)',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={`Subtitle offset: ${offsetLabel}`}
      accessibilityHint="Adjust subtitle timing"
    >
      <Pressable
        onPress={() => adjustOffset(-100)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Decrease subtitle offset"
        accessibilityHint="Moves subtitles earlier by 100 milliseconds"
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }} accessible={false}>-</Text>
      </Pressable>

      <Pressable
        onPress={resetOffset}
        style={{ paddingHorizontal: 8 }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Current offset: ${offsetLabel}. Tap to reset`}
        accessibilityHint="Resets subtitle offset to zero"
      >
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500', minWidth: 70, textAlign: 'center' }} accessible={false}>
          {offsetLabel}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => adjustOffset(100)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Increase subtitle offset"
        accessibilityHint="Moves subtitles later by 100 milliseconds"
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }} accessible={false}>+</Text>
      </Pressable>
    </View>
  );
});
