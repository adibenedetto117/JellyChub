import { View, Text, Pressable } from 'react-native';

interface Props {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export function EmptyState({ title, message, actionLabel, onAction, icon }: Props) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      {icon && (
        <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-4">
          <Text className="text-text-tertiary text-3xl">{icon}</Text>
        </View>
      )}
      <Text className="text-white text-xl font-semibold text-center mb-2">
        {title}
      </Text>
      {message && (
        <Text className="text-text-tertiary text-center mb-6">{message}</Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="bg-accent px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
