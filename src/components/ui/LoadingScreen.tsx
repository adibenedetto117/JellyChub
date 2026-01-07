import { View, Text, ActivityIndicator } from 'react-native';
import { useSettingsStore } from '@/stores';

interface Props {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: Props) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator color={accentColor} size="large" />
      <Text className="text-text-tertiary mt-4">{message}</Text>
    </View>
  );
}
