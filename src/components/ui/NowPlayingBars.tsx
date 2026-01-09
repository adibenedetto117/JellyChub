import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface NowPlayingBarsProps {
  isPlaying: boolean;
  color?: string;
  size?: 'small' | 'medium';
}

// Simplified animation - just 2 bars with simple up/down motion
export function NowPlayingBars({ isPlaying, color = '#fff', size = 'medium' }: NowPlayingBarsProps) {
  const bar1Height = useSharedValue(0.4);
  const bar2Height = useSharedValue(0.6);

  const barWidth = size === 'small' ? 2 : 3;
  const barGap = size === 'small' ? 2 : 3;
  const maxHeight = size === 'small' ? 12 : 16;

  useEffect(() => {
    if (isPlaying) {
      // Simple alternating animation - much lighter on CPU
      bar1Height.value = withRepeat(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true // reverse for smooth alternation
      );

      bar2Height.value = withRepeat(
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(bar1Height);
      cancelAnimation(bar2Height);
      bar1Height.value = withTiming(0.4, { duration: 200 });
      bar2Height.value = withTiming(0.6, { duration: 200 });
    }

    return () => {
      cancelAnimation(bar1Height);
      cancelAnimation(bar2Height);
    };
  }, [isPlaying]);

  const bar1Style = useAnimatedStyle(() => ({
    height: bar1Height.value * maxHeight,
  }));

  const bar2Style = useAnimatedStyle(() => ({
    height: bar2Height.value * maxHeight,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: color }, bar1Style]} />
      <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: color, marginLeft: barGap }, bar2Style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 16,
  },
  bar: {
    borderRadius: 1,
  },
});
