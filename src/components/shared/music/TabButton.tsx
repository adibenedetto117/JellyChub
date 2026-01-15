import { Text, Pressable, StyleSheet } from 'react-native';
import { memo, useCallback } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
  accentColor: string;
}

export const TabButton = memo(function TabButton({ label, active, onPress, accentColor }: TabButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.tabButton, { backgroundColor: active ? accentColor : 'rgba(255,255,255,0.1)' }, animatedStyle]}>
        <Text style={[styles.tabButtonText, { color: active ? '#fff' : 'rgba(255,255,255,0.7)' }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tabButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
