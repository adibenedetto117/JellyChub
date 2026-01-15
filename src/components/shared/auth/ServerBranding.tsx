import { View, Text, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ServerBrandingProps {
  serverName: string;
  serverVersion?: string;
  isLoading: boolean;
  animationDelay?: number;
}

export function ServerBranding({
  serverName,
  serverVersion,
  isLoading,
  animationDelay = 100,
}: ServerBrandingProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(400)}
      className="pt-4 pb-6 items-center"
    >
      <View className="w-16 h-16 rounded-2xl bg-accent/20 items-center justify-center mb-4">
        <Text className="text-2xl text-accent">{serverName.charAt(0).toUpperCase()}</Text>
      </View>

      {isLoading ? (
        <View className="h-8 items-center justify-center">
          <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
        </View>
      ) : (
        <>
          <Text className="text-2xl font-bold text-white text-center">{serverName}</Text>
          {serverVersion && (
            <Text className="text-text-muted text-sm mt-1">Jellyfin {serverVersion}</Text>
          )}
        </>
      )}
    </Animated.View>
  );
}
