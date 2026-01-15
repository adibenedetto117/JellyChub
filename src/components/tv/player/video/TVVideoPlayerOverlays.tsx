import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface SeekIndicatorInfo {
  direction: 'left' | 'right';
  seconds: number;
}

interface TVVideoPlayerOverlaysProps {
  seekIndicator?: SeekIndicatorInfo | null;
  seekLeftOpacity: SharedValue<number>;
  seekRightOpacity: SharedValue<number>;
}

export function TVVideoPlayerOverlays({
  seekIndicator,
  seekLeftOpacity,
  seekRightOpacity,
}: TVVideoPlayerOverlaysProps) {
  const seekLeftStyle = useAnimatedStyle(() => ({
    opacity: seekLeftOpacity.value,
  }));

  const seekRightStyle = useAnimatedStyle(() => ({
    opacity: seekRightOpacity.value,
  }));

  return (
    <>
      <Animated.View style={[styles.seekIndicator, styles.seekLeft, seekLeftStyle]}>
        <Ionicons name="play-back" size={48} color="#fff" />
        {seekIndicator?.direction === 'left' && (
          <Text style={styles.seekText}>-{seekIndicator.seconds}s</Text>
        )}
      </Animated.View>

      <Animated.View style={[styles.seekIndicator, styles.seekRight, seekRightStyle]}>
        <Ionicons name="play-forward" size={48} color="#fff" />
        {seekIndicator?.direction === 'right' && (
          <Text style={styles.seekText}>+{seekIndicator.seconds}s</Text>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
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
});
