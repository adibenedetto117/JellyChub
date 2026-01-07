import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';

interface ConnectionErrorProps {
  serverName?: string;
  serverUrl?: string;
  error?: string | null;
  isChecking?: boolean;
  onRetry: () => void;
}

export function ConnectionError({
  serverName,
  serverUrl,
  error,
  isChecking,
  onRetry,
}: ConnectionErrorProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);

  const handleGoToSettings = () => {
    router.push('/(auth)/server-select');
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
    >
      <View className="items-center w-full">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
        >
          <Ionicons name="cloud-offline" size={40} color="#ef4444" />
        </View>

        <Text className="text-white text-xl font-bold text-center mb-2">
          Connection Error
        </Text>

        <Text className="text-text-secondary text-center mb-4">
          {error || 'Unable to connect to the Jellyfin server'}
        </Text>

        {serverName && (
          <View className="bg-surface rounded-xl px-4 py-3 mb-6 w-full max-w-[320px]">
            <Text className="text-text-tertiary text-xs mb-1">Server</Text>
            <Text className="text-white font-medium">{serverName}</Text>
            {serverUrl && (
              <Text className="text-text-tertiary text-sm mt-1" numberOfLines={2}>
                {serverUrl}
              </Text>
            )}
          </View>
        )}

        <View className="w-full max-w-[320px]" style={{ gap: 12 }}>
          <Pressable
            onPress={onRetry}
            disabled={isChecking}
            className="w-full py-4 rounded-xl items-center justify-center flex-row"
            style={{ backgroundColor: accentColor, opacity: isChecking ? 0.7 : 1 }}
          >
            {isChecking ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text className="text-white font-semibold text-base ml-2">
                  Checking...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text className="text-white font-semibold text-base ml-2">
                  Try Again
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleGoToSettings}
            className="w-full py-4 rounded-xl items-center justify-center flex-row bg-surface"
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
            <Text className="text-white font-medium text-base ml-2">
              Change Server
            </Text>
          </Pressable>
        </View>

        <Text className="text-text-tertiary text-sm text-center mt-6 px-4">
          Make sure the server is running and accessible from your network
        </Text>
      </View>
    </ScrollView>
  );
}
