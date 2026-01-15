import { Text, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface BackButtonProps {
  label: string;
  onPress: () => void;
}

export function BackButton({ label, onPress }: BackButtonProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} className="pt-4 pb-2">
      <Pressable
        className="flex-row items-center py-2 -ml-1"
        onPress={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text className="text-accent mr-1">{'<'}</Text>
        <Text className="text-accent">{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
