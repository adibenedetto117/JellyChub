import { View, Text, Image } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  showLogo?: boolean;
}

export function AuthHeader({ title, subtitle, showLogo = true }: AuthHeaderProps) {
  return (
    <Animated.View entering={FadeIn.duration(600)} className="pt-12 pb-8 items-center">
      {showLogo && (
        <Image
          source={require('../../../../assets/icon.png')}
          className="w-20 h-20 rounded-2xl mb-4"
        />
      )}
      <Text className="text-3xl font-bold text-white tracking-tight">
        {title}
      </Text>
      <Text className="text-text-secondary text-center mt-2">
        {subtitle}
      </Text>
    </Animated.View>
  );
}
