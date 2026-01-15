import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { tvConstants } from '@/utils/platform';

interface TVFocusRingProps {
  borderOpacity: SharedValue<number>;
  accentColor: string;
}

export function TVFocusRing({ borderOpacity, accentColor }: TVFocusRingProps) {
  const borderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.focusRing,
        { borderColor: accentColor },
        borderAnimatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

interface TVShadowGlowProps {
  shadowOpacity: SharedValue<number>;
  width: number;
  height: number;
  accentColor: string;
}

export function TVShadowGlow({ shadowOpacity, width, height, accentColor }: TVShadowGlowProps) {
  const shadowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: shadowOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.shadowContainer,
        {
          width: width + 20,
          height: height + 20,
          shadowColor: accentColor,
        },
        shadowAnimatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  focusRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: tvConstants.focusRingWidth,
  },
  shadowContainer: {
    position: 'absolute',
    top: -10,
    left: -10,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
});
