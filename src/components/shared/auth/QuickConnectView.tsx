import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from '@/providers';

interface QuickConnectViewProps {
  code: string;
  accentColor: string;
  onCancel: () => void;
}

export function QuickConnectView({ code, accentColor, onCancel }: QuickConnectViewProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Animated.View
        entering={FadeIn.duration(400)}
        className="flex-1 justify-center items-center px-6"
      >
        <View className="w-16 h-16 rounded-2xl bg-accent/20 items-center justify-center mb-6">
          <Text className="text-3xl text-accent">Q</Text>
        </View>

        <Text className="text-white text-2xl font-bold mb-2">{t('auth.quickConnect')}</Text>
        <Text className="text-text-secondary text-center mb-8 px-8">
          {t('auth.quickConnectInstructions')}
        </Text>

        <View className="bg-surface px-10 py-6 rounded-2xl mb-8 border border-white/5">
          <Text className="text-4xl font-mono text-accent tracking-[0.3em]">{code}</Text>
        </View>

        <View className="flex-row items-center mb-2">
          <ActivityIndicator color={accentColor} size="small" />
          <Text className="text-text-tertiary ml-3">{t('auth.waitingForAuth')}</Text>
        </View>

        <Pressable className="mt-6 py-3 px-8" onPress={onCancel}>
          <Text className="text-text-secondary">{t('common.cancel')}</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
