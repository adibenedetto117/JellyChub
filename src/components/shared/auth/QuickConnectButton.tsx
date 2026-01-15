import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface QuickConnectButtonProps {
  onPress: () => void;
  animationDelay?: number;
}

export function QuickConnectButton({
  onPress,
  animationDelay = 400,
}: QuickConnectButtonProps) {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)} className="mt-6">
      <View className="flex-row items-center justify-center mb-4">
        <View className="flex-1 h-px bg-white/10" />
        <Text className="text-text-muted text-xs mx-4">{t('auth.or')}</Text>
        <View className="flex-1 h-px bg-white/10" />
      </View>

      <Pressable
        className="py-3.5 rounded-xl items-center border border-white/10"
        onPress={onPress}
      >
        <Text className="text-text-secondary font-medium">{t('auth.useQuickConnect')}</Text>
      </Pressable>

      <Text className="text-text-muted text-xs text-center mt-3">
        {t('auth.quickConnectDesc')}
      </Text>
    </Animated.View>
  );
}
