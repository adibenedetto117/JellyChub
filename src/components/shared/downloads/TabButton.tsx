import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface TabButtonProps {
  label: string;
  icon: string;
  active: boolean;
  count: number;
  onPress: () => void;
  accentColor: string;
}

export const TabButton = memo(function TabButton({
  label,
  icon,
  active,
  count,
  onPress,
  accentColor,
}: TabButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.tabButton,
          { backgroundColor: active ? accentColor : 'rgba(255,255,255,0.08)' },
          animatedStyle,
        ]}
      >
        <Ionicons name={icon as any} size={16} color={active ? '#fff' : 'rgba(255,255,255,0.6)'} />
        <Text style={[styles.tabButtonText, { color: active ? '#fff' : 'rgba(255,255,255,0.6)' }]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : accentColor + '40' }]}>
            <Text style={[styles.tabBadgeText, { color: active ? '#fff' : accentColor }]}>{count}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
