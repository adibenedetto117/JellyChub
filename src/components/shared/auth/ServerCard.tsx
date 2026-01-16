import { View, Text, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { ServerInfo } from '@/api';

interface ServerCardProps {
  server: {
    id: string;
    name: string;
    url: string;
    customHeaders?: Record<string, string>;
  };
  status:
    | {
        isOnline: boolean;
        serverInfo: ServerInfo | null;
        isChecking: boolean;
      }
    | undefined;
  isActive?: boolean;
  onSelect: () => void;
  onRemove: () => void;
  index: number;
}

export function ServerCard({
  server,
  status,
  isActive,
  onSelect,
  onRemove,
  index,
}: ServerCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const isOnline = status?.isOnline ?? false;
  const isChecking = status?.isChecking ?? true;
  const serverVersion = status?.serverInfo?.Version;
  const hasCustomHeaders =
    server.customHeaders && Object.keys(server.customHeaders).length > 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={animatedStyle}
    >
      <Pressable
        className={`bg-surface rounded-2xl p-4 mb-3 border ${
          isActive ? 'border-accent' : 'border-white/5'
        }`}
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <View
                className={`w-2 h-2 rounded-full mr-2 ${
                  isChecking
                    ? 'bg-warning'
                    : isOnline
                    ? 'bg-success'
                    : 'bg-error'
                }`}
              />
              <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                {server.name}
              </Text>
              {isActive && (
                <View className="bg-accent/20 rounded px-2 py-0.5 ml-2">
                  <Text className="text-accent text-xs font-medium">Active</Text>
                </View>
              )}
              {hasCustomHeaders && (
                <Text className="text-text-muted text-xs ml-2">[Headers]</Text>
              )}
            </View>
            <Text className="text-text-tertiary text-sm" numberOfLines={1}>
              {server.url}
            </Text>
            {serverVersion && (
              <Text className="text-text-muted text-xs mt-1">
                Jellyfin {serverVersion}
              </Text>
            )}
          </View>
          {!isActive && (
            <Pressable
              className="p-2 -mr-2 -mt-1"
              onPress={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-text-tertiary text-lg">x</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
