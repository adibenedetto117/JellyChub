import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { JellyfinUser } from '@/types/jellyfin';

interface UserAvatarProps {
  user: JellyfinUser;
  isSelected: boolean;
  onPress: () => void;
}

export function UserAvatar({ user, isSelected, onPress }: UserAvatarProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        className={`items-center mr-4 p-3 rounded-2xl ${
          isSelected ? 'bg-accent/20 border border-accent/30' : 'bg-surface'
        }`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${
            isSelected ? 'bg-accent/30' : 'bg-surface-elevated'
          }`}
        >
          <Text className={`text-xl ${isSelected ? 'text-accent' : 'text-white'}`}>
            {user.Name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text
          className={`text-sm ${isSelected ? 'text-accent' : 'text-white'}`}
          numberOfLines={1}
        >
          {user.Name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
