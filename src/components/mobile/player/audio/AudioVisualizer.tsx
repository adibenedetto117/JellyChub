import { useEffect, useMemo, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
  interpolate,
} from 'react-native-reanimated';
import { usePlayerStore, useSettingsStore } from '@/stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AudioVisualizerProps {
  style?: 'bars' | 'waveform';
  barCount?: number;
  height?: number;
  color?: string;
  activeColor?: string;
}

function VisualizerBar({
  index,
  isPlaying,
  color,
  activeColor,
  maxHeight,
  barWidth,
}: {
  index: number;
  isPlaying: boolean;
  color: string;
  activeColor: string;
  maxHeight: number;
  barWidth: number;
}) {
  const height = useSharedValue(0.2);
  const baseDelay = index * 80;
  const duration = 400 + Math.random() * 200;

  useEffect(() => {
    if (isPlaying) {
      const minHeight = 0.15 + Math.random() * 0.1;
      const maxH = 0.6 + Math.random() * 0.4;

      height.value = withDelay(
        baseDelay,
        withRepeat(
          withSequence(
            withTiming(maxH, { duration, easing: Easing.inOut(Easing.ease) }),
            withTiming(minHeight, { duration, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(0.15, { duration: 300 });
    }

    return () => {
      cancelAnimation(height);
    };
  }, [isPlaying, baseDelay, duration, height]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value * maxHeight,
    backgroundColor: isPlaying ? activeColor : color,
  }));

  return (
    <Animated.View
      style={[
        {
          width: barWidth,
          borderRadius: barWidth / 2,
          marginHorizontal: 2,
        },
        barStyle,
      ]}
    />
  );
}

function WaveformDot({
  index,
  isPlaying,
  color,
  activeColor,
  maxHeight,
  dotSize,
  totalDots,
}: {
  index: number;
  isPlaying: boolean;
  color: string;
  activeColor: string;
  maxHeight: number;
  dotSize: number;
  totalDots: number;
}) {
  const translateY = useSharedValue(0);
  const centerIndex = totalDots / 2;
  const distanceFromCenter = Math.abs(index - centerIndex);
  const baseDelay = distanceFromCenter * 50;

  useEffect(() => {
    if (isPlaying) {
      const amplitude = (maxHeight / 3) * (1 - distanceFromCenter / centerIndex * 0.5);
      translateY.value = withDelay(
        baseDelay,
        withRepeat(
          withSequence(
            withTiming(-amplitude, { duration: 300 + Math.random() * 100, easing: Easing.inOut(Easing.sin) }),
            withTiming(amplitude, { duration: 300 + Math.random() * 100, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(translateY);
      translateY.value = withTiming(0, { duration: 300 });
    }

    return () => {
      cancelAnimation(translateY);
    };
  }, [isPlaying, baseDelay, maxHeight, distanceFromCenter, centerIndex, translateY]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: isPlaying ? activeColor : color,
          marginHorizontal: 1,
        },
        dotStyle,
      ]}
    />
  );
}

export function AudioVisualizer({
  style = 'bars',
  barCount = 24,
  height = 60,
  color,
  activeColor,
}: AudioVisualizerProps) {
  const playerState = usePlayerStore((s) => s.playerState);
  const mediaType = usePlayerStore((s) => s.mediaType);
  const settingsAccentColor = useSettingsStore((s) => s.accentColor);

  const isPlaying = playerState === 'playing' && mediaType === 'audio';
  const barColor = color ?? 'rgba(255, 255, 255, 0.3)';
  const barActiveColor = activeColor ?? settingsAccentColor;

  const containerWidth = SCREEN_WIDTH - 80;
  const barWidth = Math.max(3, (containerWidth - barCount * 4) / barCount);

  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => i);
  }, [barCount]);

  if (style === 'waveform') {
    const dotSize = 6;
    const dotCount = Math.floor(containerWidth / (dotSize + 2));
    const dots = Array.from({ length: dotCount }, (_, i) => i);

    return (
      <View
        style={{
          height,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {dots.map((_, i) => (
          <WaveformDot
            key={i}
            index={i}
            isPlaying={isPlaying}
            color={barColor}
            activeColor={barActiveColor}
            maxHeight={height}
            dotSize={dotSize}
            totalDots={dotCount}
          />
        ))}
      </View>
    );
  }

  return (
    <View
      style={{
        height,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {bars.map((_, i) => (
        <VisualizerBar
          key={i}
          index={i}
          isPlaying={isPlaying}
          color={barColor}
          activeColor={barActiveColor}
          maxHeight={height}
          barWidth={barWidth}
        />
      ))}
    </View>
  );
}

export function MiniVisualizer({
  isPlaying,
  color,
  size = 20,
}: {
  isPlaying: boolean;
  color: string;
  size?: number;
}) {
  const barCount = 4;
  const barWidth = 3;
  const gap = 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: barCount }, (_, i) => (
        <MiniBar key={i} index={i} isPlaying={isPlaying} color={color} maxHeight={size} barWidth={barWidth} />
      ))}
    </View>
  );
}

function MiniBar({
  index,
  isPlaying,
  color,
  maxHeight,
  barWidth,
}: {
  index: number;
  isPlaying: boolean;
  color: string;
  maxHeight: number;
  barWidth: number;
}) {
  const height = useSharedValue(0.3);
  const delays = [0, 150, 75, 200];

  useEffect(() => {
    if (isPlaying) {
      height.value = withDelay(
        delays[index],
        withRepeat(
          withSequence(
            withTiming(0.9, { duration: 300, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.2, { duration: 300, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(0.3, { duration: 200 });
    }

    return () => {
      cancelAnimation(height);
    };
  }, [isPlaying, index, height]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value * maxHeight,
  }));

  return (
    <Animated.View
      style={[
        {
          width: barWidth,
          backgroundColor: color,
          borderRadius: barWidth / 2,
          marginHorizontal: 1,
        },
        barStyle,
      ]}
    />
  );
}
