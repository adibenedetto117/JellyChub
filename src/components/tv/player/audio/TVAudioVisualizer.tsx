import { useEffect, useMemo } from 'react';
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
} from 'react-native-reanimated';
import { usePlayerStore, useSettingsStore } from '@/stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TVAudioVisualizerProps {
  style?: 'bars' | 'waveform';
  barCount?: number;
  height?: number;
  color?: string;
  activeColor?: string;
}

function TVVisualizerBar({
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
  const baseDelay = index * 60;
  const duration = 350 + Math.random() * 150;

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
          marginHorizontal: 3,
        },
        barStyle,
      ]}
    />
  );
}

function TVWaveformDot({
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
  const baseDelay = distanceFromCenter * 40;

  useEffect(() => {
    if (isPlaying) {
      const amplitude = (maxHeight / 3) * (1 - (distanceFromCenter / centerIndex) * 0.5);
      translateY.value = withDelay(
        baseDelay,
        withRepeat(
          withSequence(
            withTiming(-amplitude, { duration: 280 + Math.random() * 80, easing: Easing.inOut(Easing.sin) }),
            withTiming(amplitude, { duration: 280 + Math.random() * 80, easing: Easing.inOut(Easing.sin) })
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
          marginHorizontal: 2,
        },
        dotStyle,
      ]}
    />
  );
}

export function TVAudioVisualizer({
  style = 'bars',
  barCount = 32,
  height = 100,
  color,
  activeColor,
}: TVAudioVisualizerProps) {
  const playerState = usePlayerStore((s) => s.playerState);
  const mediaType = usePlayerStore((s) => s.mediaType);
  const settingsAccentColor = useSettingsStore((s) => s.accentColor);

  const isPlaying = playerState === 'playing' && mediaType === 'audio';
  const barColor = color ?? 'rgba(255, 255, 255, 0.3)';
  const barActiveColor = activeColor ?? settingsAccentColor;

  const containerWidth = SCREEN_WIDTH * 0.6;
  const barWidth = Math.max(4, (containerWidth - barCount * 6) / barCount);

  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => i);
  }, [barCount]);

  if (style === 'waveform') {
    const dotSize = 10;
    const dotCount = Math.floor(containerWidth / (dotSize + 4));
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
          <TVWaveformDot
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
        <TVVisualizerBar
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

export function TVMiniVisualizer({
  isPlaying,
  color,
  size = 32,
}: {
  isPlaying: boolean;
  color: string;
  size?: number;
}) {
  const barCount = 4;
  const barWidth = 5;

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
        <TVMiniBar key={i} index={i} isPlaying={isPlaying} color={color} maxHeight={size} barWidth={barWidth} />
      ))}
    </View>
  );
}

function TVMiniBar({
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
  const delays = [0, 120, 60, 160];

  useEffect(() => {
    if (isPlaying) {
      height.value = withDelay(
        delays[index],
        withRepeat(
          withSequence(
            withTiming(0.9, { duration: 280, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.2, { duration: 280, easing: Easing.inOut(Easing.ease) })
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
          marginHorizontal: 2,
        },
        barStyle,
      ]}
    />
  );
}
