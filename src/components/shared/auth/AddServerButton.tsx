import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface AddServerButtonProps {
  onPress: () => void;
  animationDelay?: number;
}

export function AddServerButton({ onPress, animationDelay = 300 }: AddServerButtonProps) {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <Pressable
        className="bg-surface rounded-2xl py-4 items-center border border-white/5 border-dashed"
        onPress={onPress}
      >
        <View className="flex-row items-center">
          <Text className="text-accent text-xl mr-2">+</Text>
          <Text className="text-accent font-semibold">{t('auth.addServer')}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
