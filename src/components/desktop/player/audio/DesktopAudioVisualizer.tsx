import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
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

interface DesktopAudioVisualizerProps {
  style?: 'bars' | 'waveform' | 'circular';
  barCount?: number;
  height?: number;
  width?: number;
  color?: string;
  activeColor?: string;
  onStyleChange?: (style: 'bars' | 'waveform' | 'circular') => void;
}

function VisualizerBar({
  index,
  isPlaying,
  color,
  activeColor,
  maxHeight,
  barWidth,
  isHovered,
}: {
  index: number;
  isPlaying: boolean;
  color: string;
  activeColor: string;
  maxHeight: number;
  barWidth: number;
  isHovered: boolean;
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
      height.value = withTiming(0.15, { duration: 250 });
    }

    return () => {
      cancelAnimation(height);
    };
  }, [isPlaying, baseDelay, duration, height]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value * maxHeight,
    backgroundColor: isPlaying ? activeColor : color,
    opacity: isHovered ? 1 : 0.9,
  }));

  return (
    <Animated.View
      style={[
        {
          width: barWidth,
          borderRadius: barWidth / 2,
          marginHorizontal: 1.5,
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
  isHovered,
}: {
  index: number;
  isPlaying: boolean;
  color: string;
  activeColor: string;
  maxHeight: number;
  dotSize: number;
  totalDots: number;
  isHovered: boolean;
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
      translateY.value = withTiming(0, { duration: 250 });
    }

    return () => {
      cancelAnimation(translateY);
    };
  }, [isPlaying, baseDelay, maxHeight, distanceFromCenter, centerIndex, translateY]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: isHovered ? 1 : 0.9,
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

function CircularBar({
  index,
  totalBars,
  isPlaying,
  color,
  activeColor,
  radius,
  barWidth,
  isHovered,
}: {
  index: number;
  totalBars: number;
  isPlaying: boolean;
  color: string;
  activeColor: string;
  radius: number;
  barWidth: number;
  isHovered: boolean;
}) {
  const height = useSharedValue(0.3);
  const angle = (index / totalBars) * Math.PI * 2;
  const baseDelay = index * 30;
  const duration = 300 + Math.random() * 200;

  useEffect(() => {
    if (isPlaying) {
      const minHeight = 0.2 + Math.random() * 0.1;
      const maxH = 0.5 + Math.random() * 0.5;

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
      height.value = withTiming(0.3, { duration: 250 });
    }

    return () => {
      cancelAnimation(height);
    };
  }, [isPlaying, baseDelay, duration, height]);

  const barStyle = useAnimatedStyle(() => {
    const barHeight = height.value * 25;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const rotation = (angle * 180) / Math.PI + 90;

    return {
      position: 'absolute',
      width: barWidth,
      height: barHeight,
      borderRadius: barWidth / 2,
      backgroundColor: isPlaying ? activeColor : color,
      opacity: isHovered ? 1 : 0.9,
      transform: [
        { translateX: x - barWidth / 2 },
        { translateY: y },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  return <Animated.View style={barStyle} />;
}

export function DesktopAudioVisualizer({
  style = 'bars',
  barCount = 32,
  height = 80,
  width = 400,
  color,
  activeColor,
  onStyleChange,
}: DesktopAudioVisualizerProps) {
  const playerState = usePlayerStore((s) => s.playerState);
  const mediaType = usePlayerStore((s) => s.mediaType);
  const settingsAccentColor = useSettingsStore((s) => s.accentColor);

  const [isHovered, setIsHovered] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(style);

  const isPlaying = playerState === 'playing' && mediaType === 'audio';
  const barColor = color ?? 'rgba(255, 255, 255, 0.3)';
  const barActiveColor = activeColor ?? settingsAccentColor;

  const barWidth = Math.max(3, (width - barCount * 3) / barCount);

  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => i);
  }, [barCount]);

  const handleClick = () => {
    const styles: Array<'bars' | 'waveform' | 'circular'> = ['bars', 'waveform', 'circular'];
    const currentIndex = styles.indexOf(currentStyle);
    const nextStyle = styles[(currentIndex + 1) % styles.length];
    setCurrentStyle(nextStyle);
    onStyleChange?.(nextStyle);
  };

  if (currentStyle === 'circular') {
    const circularBars = 36;
    const radius = height / 2 - 15;

    return (
      <Pressable
        onPress={handleClick}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={[
          styles.circularContainer,
          { width: height, height },
          isHovered && styles.containerHovered,
        ]}
      >
        {Array.from({ length: circularBars }, (_, i) => (
          <CircularBar
            key={i}
            index={i}
            totalBars={circularBars}
            isPlaying={isPlaying}
            color={barColor}
            activeColor={barActiveColor}
            radius={radius}
            barWidth={3}
            isHovered={isHovered}
          />
        ))}
      </Pressable>
    );
  }

  if (currentStyle === 'waveform') {
    const dotSize = 5;
    const dotCount = Math.floor(width / (dotSize + 2));
    const dots = Array.from({ length: dotCount }, (_, i) => i);

    return (
      <Pressable
        onPress={handleClick}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={[
          styles.container,
          { height, width },
          isHovered && styles.containerHovered,
        ]}
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
            isHovered={isHovered}
          />
        ))}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handleClick}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.barsContainer,
        { height, width },
        isHovered && styles.containerHovered,
      ]}
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
          isHovered={isHovered}
        />
      ))}
    </Pressable>
  );
}

export function DesktopMiniVisualizer({
  isPlaying,
  color,
  size = 24,
}: {
  isPlaying: boolean;
  color: string;
  size?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const barCount = 5;
  const barWidth = 3;

  return (
    <Pressable
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.miniContainer,
        { width: size, height: size },
        isHovered && styles.miniContainerHovered,
      ]}
    >
      {Array.from({ length: barCount }, (_, i) => (
        <MiniBar
          key={i}
          index={i}
          isPlaying={isPlaying}
          color={color}
          maxHeight={size}
          barWidth={barWidth}
          isHovered={isHovered}
        />
      ))}
    </Pressable>
  );
}

function MiniBar({
  index,
  isPlaying,
  color,
  maxHeight,
  barWidth,
  isHovered,
}: {
  index: number;
  isPlaying: boolean;
  color: string;
  maxHeight: number;
  barWidth: number;
  isHovered: boolean;
}) {
  const height = useSharedValue(0.3);
  const delays = [0, 120, 60, 180, 100];

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
      height.value = withTiming(0.3, { duration: 180 });
    }

    return () => {
      cancelAnimation(height);
    };
  }, [isPlaying, index, height]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value * maxHeight,
    opacity: isHovered ? 1 : 0.85,
  }));

  return (
    <Animated.View
      style={[
        {
          width: barWidth,
          backgroundColor: color,
          borderRadius: barWidth / 2,
          marginHorizontal: 0.5,
        },
        barStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    cursor: 'pointer',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderRadius: 8,
    cursor: 'pointer',
  },
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    cursor: 'pointer',
  },
  containerHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  miniContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderRadius: 4,
  },
  miniContainerHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
