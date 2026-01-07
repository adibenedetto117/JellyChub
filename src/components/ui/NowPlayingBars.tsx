import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface NowPlayingBarsProps {
  isPlaying: boolean;
  color?: string;
  size?: 'small' | 'medium';
}

export function NowPlayingBars({ isPlaying, color = '#fff', size = 'medium' }: NowPlayingBarsProps) {
  const bar1Height = useSharedValue(0.3);
  const bar2Height = useSharedValue(0.5);
  const bar3Height = useSharedValue(0.4);

  const barWidth = size === 'small' ? 2 : 3;
  const barGap = size === 'small' ? 2 : 3;
  const maxHeight = size === 'small' ? 12 : 16;

  useEffect(() => {
    if (isPlaying) {
      bar1Height.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 350, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      bar2Height.value = withDelay(
        100,
        withRepeat(
          withSequence(
            withTiming(0.5, { duration: 350, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.3, { duration: 350, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.8, { duration: 300, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );

      bar3Height.value = withDelay(
        200,
        withRepeat(
          withSequence(
            withTiming(0.6, { duration: 300, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.2, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.5, { duration: 350, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
    } else {
      cancelAnimation(bar1Height);
      cancelAnimation(bar2Height);
      cancelAnimation(bar3Height);
      bar1Height.value = withTiming(0.4, { duration: 300 });
      bar2Height.value = withTiming(0.6, { duration: 300 });
      bar3Height.value = withTiming(0.4, { duration: 300 });
    }

    return () => {
      cancelAnimation(bar1Height);
      cancelAnimation(bar2Height);
      cancelAnimation(bar3Height);
    };
  }, [isPlaying]);

  const bar1Style = useAnimatedStyle(() => ({
    height: bar1Height.value * maxHeight,
  }));

  const bar2Style = useAnimatedStyle(() => ({
    height: bar2Height.value * maxHeight,
  }));

  const bar3Style = useAnimatedStyle(() => ({
    height: bar3Height.value * maxHeight,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: color }, bar1Style]} />
      <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: color, marginHorizontal: barGap }, bar2Style]} />
      <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: color }, bar3Style]} />
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
