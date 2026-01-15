import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface OfflineModeButtonProps {
  onPress: () => void;
  animationDelay?: number;
}

export function OfflineModeButton({
  onPress,
  animationDelay = 400,
}: OfflineModeButtonProps) {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)} className="mt-6">
      <Pressable
        className="bg-surface/50 rounded-2xl py-4 items-center border border-white/5"
        onPress={onPress}
      >
        <View className="flex-row items-center">
          <Text className="text-text-secondary text-lg mr-2">⬇</Text>
          <Text className="text-text-secondary font-medium">Use Offline Mode</Text>
        </View>
        <Text className="text-text-muted text-xs mt-1">Access your downloaded content</Text>
      </Pressable>
    </Animated.View>
  );
}
