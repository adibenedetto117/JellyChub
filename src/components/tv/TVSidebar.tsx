import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { tvConstants } from '@/utils/platform';
import { useAuthStore } from '@/stores';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { label: 'Home', route: '/(tabs)/home', icon: 'H' },
  { label: 'Search', route: '/(tabs)/search', icon: 'S' },
  { label: 'Movies', route: '/(tabs)/movies', icon: 'M' },
  { label: 'TV Shows', route: '/(tabs)/shows', icon: 'T' },
  { label: 'Music', route: '/(tabs)/music', icon: 'A' },
  { label: 'Books', route: '/(tabs)/books', icon: 'B' },
  { label: 'Downloads', route: '/(tabs)/downloads', icon: 'D' },
  { label: 'Settings', route: '/(tabs)/settings', icon: 'G' },
];

export function TVSidebar() {
  const pathname = usePathname();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [isExpanded, setIsExpanded] = useState(false);

  const width = useSharedValue(80);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  const handleFocus = () => {
    width.value = withTiming(tvConstants.sidebarWidth, { duration: 200 });
    setIsExpanded(true);
  };

  const handleBlur = () => {
    width.value = withTiming(80, { duration: 200 });
    setIsExpanded(false);
  };

  const isActive = (route: string) => pathname.includes(route.replace('/(tabs)/', ''));

  return (
    <Animated.View
      style={animatedStyle}
      className="bg-surface h-full"
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <View className="py-8 px-4">
        <View className="items-center mb-8">
          <View className="w-12 h-12 rounded-full bg-accent items-center justify-center">
            <Text className="text-white text-xl font-bold">J</Text>
          </View>
          {isExpanded && (
            <Text className="text-white font-bold mt-2">JellyChub</Text>
          )}
        </View>

        <ScrollView>
          {menuItems.map((item) => (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route as any)}
              className={`flex-row items-center py-3 px-2 rounded-xl mb-1 ${
                isActive(item.route) ? 'bg-accent' : ''
              }`}
            >
              <View className="w-10 h-10 items-center justify-center">
                <Text
                  className={`text-lg font-semibold ${
                    isActive(item.route) ? 'text-white' : 'text-text-tertiary'
                  }`}
                >
                  {item.icon}
                </Text>
              </View>
              {isExpanded && (
                <Text
                  className={`ml-3 ${
                    isActive(item.route) ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {item.label}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>

        <View className="mt-auto pt-8">
          <View className="flex-row items-center py-3 px-2">
            <View className="w-10 h-10 rounded-full bg-background items-center justify-center">
              <Text className="text-text-tertiary">
                {currentUser?.Name?.charAt(0).toUpperCase() ?? 'U'}
              </Text>
            </View>
            {isExpanded && (
              <Text className="text-text-secondary ml-3" numberOfLines={1}>
                {currentUser?.Name ?? 'User'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
