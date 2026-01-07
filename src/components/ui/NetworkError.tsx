import { View, Text, Pressable } from 'react-native';

interface Props {
  onRetry: () => void;
  message?: string;
}

export function NetworkError({ onRetry, message }: Props) {
  return (
    <View className="flex-1 bg-background items-center justify-center p-6">
      <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-4">
        <Text className="text-error text-3xl">!</Text>
      </View>
      <Text className="text-white text-xl font-semibold mb-2">
        Connection Error
      </Text>
      <Text className="text-text-tertiary text-center mb-6">
        {message ?? 'Unable to connect to the server. Please check your connection and try again.'}
      </Text>
      <Pressable
        onPress={onRetry}
        className="bg-accent px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold">Retry</Text>
      </Pressable>
    </View>
  );
}
