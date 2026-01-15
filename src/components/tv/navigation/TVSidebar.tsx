import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, findNodeHandle, UIManager, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { tvConstants } from '@/utils/platform';
import { useAuthStore, useSettingsStore } from '@/stores';

type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  label: string;
  route: string;
  icon: IconName;
  iconFilled: IconName;
}

const menuItems: MenuItem[] = [
  { label: 'Home', route: '/(tabs)/home', icon: 'home-outline', iconFilled: 'home' },
  { label: 'Search', route: '/(tabs)/search', icon: 'search-outline', iconFilled: 'search' },
  { label: 'Library', route: '/(tabs)/library', icon: 'library-outline', iconFilled: 'library' },
  { label: 'Movies', route: '/(tabs)/movies', icon: 'film-outline', iconFilled: 'film' },
  { label: 'TV Shows', route: '/(tabs)/shows', icon: 'tv-outline', iconFilled: 'tv' },
  { label: 'Music', route: '/(tabs)/music', icon: 'musical-notes-outline', iconFilled: 'musical-notes' },
  { label: 'Live TV', route: '/(tabs)/livetv', icon: 'radio-outline', iconFilled: 'radio' },
  { label: 'Downloads', route: '/(tabs)/downloads', icon: 'cloud-download-outline', iconFilled: 'cloud-download' },
  { label: 'Settings', route: '/(tabs)/settings', icon: 'settings-outline', iconFilled: 'settings' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SidebarItemProps {
  item: MenuItem;
  isActive: boolean;
  isExpanded: boolean;
  isFocused: boolean;
  accentColor: string;
  onPress: () => void;
  onFocus: () => void;
  onBlur: () => void;
  autoFocus?: boolean;
}

function SidebarItem({
  item,
  isActive,
  isExpanded,
  isFocused,
  accentColor,
  onPress,
  onFocus,
  onBlur,
  autoFocus,
}: SidebarItemProps) {
  const scale = useSharedValue(1);
  const backgroundOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(1.05, { duration: tvConstants.focusDuration });
      if (!isActive) {
        backgroundOpacity.value = withTiming(0.3, { duration: tvConstants.focusDuration });
      }
    } else {
      scale.value = withTiming(1, { duration: tvConstants.focusDuration });
      if (!isActive) {
        backgroundOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
      }
    }
  }, [isFocused, isActive, scale, backgroundOpacity]);

  useEffect(() => {
    backgroundOpacity.value = withTiming(isActive ? 1 : isFocused ? 0.3 : 0, {
      duration: tvConstants.focusDuration,
    });
  }, [isActive, isFocused, backgroundOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
    backgroundColor: accentColor,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={animatedStyle}
      hasTVPreferredFocus={autoFocus}
      accessible
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: isActive }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 12,
          borderRadius: 12,
          marginBottom: 4,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 12,
            },
            backgroundStyle,
          ]}
        />

        <View
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isActive || isFocused ? item.iconFilled : item.icon}
            size={26}
            color={isActive || isFocused ? '#fff' : 'rgba(255,255,255,0.6)'}
          />
        </View>

        {isExpanded && (
          <Text
            style={{
              marginLeft: 12,
              fontSize: 16,
              fontWeight: isActive ? '700' : '500',
              color: isActive || isFocused ? '#fff' : 'rgba(255,255,255,0.7)',
            }}
          >
            {item.label}
          </Text>
        )}

        {isFocused && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 12,
              borderWidth: 3,
              borderColor: accentColor,
            }}
          />
        )}
      </View>
    </AnimatedPressable>
  );
}

export function TVSidebar() {
  const pathname = usePathname();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const width = useSharedValue(80);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  const handleContainerFocus = useCallback(() => {
    width.value = withTiming(tvConstants.sidebarWidth, { duration: 200 });
    setIsExpanded(true);
  }, [width]);

  const handleContainerBlur = useCallback(() => {
    width.value = withTiming(80, { duration: 200 });
    setIsExpanded(false);
    setFocusedIndex(-1);
  }, [width]);

  const isActive = useCallback((route: string) => {
    const routePath = route.replace('/(tabs)/', '');
    return pathname.includes(routePath);
  }, [pathname]);

  const handleItemPress = useCallback((route: string) => {
    router.push(route as any);
  }, []);

  const handleItemFocus = useCallback((index: number) => {
    setFocusedIndex(index);
    if (!isExpanded) {
      handleContainerFocus();
    }
  }, [isExpanded, handleContainerFocus]);

  const handleItemBlur = useCallback(() => {
  }, []);

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          height: '100%',
          backgroundColor: '#111',
          borderRightWidth: 1,
          borderRightColor: 'rgba(255,255,255,0.1)',
        },
      ]}
      onFocus={handleContainerFocus}
      onBlur={handleContainerBlur}
    >
      <View style={{ flex: 1, paddingVertical: 24, paddingHorizontal: 8 }}>
        <View
          style={{
            alignItems: 'center',
            marginBottom: 32,
            paddingHorizontal: 8,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: accentColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>J</Text>
          </View>
          {isExpanded && (
            <Text
              style={{
                color: '#fff',
                fontWeight: 'bold',
                marginTop: 8,
                fontSize: 16,
              }}
            >
              JellyChub
            </Text>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {menuItems.map((item, index) => (
            <SidebarItem
              key={item.route}
              item={item}
              isActive={isActive(item.route)}
              isExpanded={isExpanded}
              isFocused={focusedIndex === index}
              accentColor={accentColor}
              onPress={() => handleItemPress(item.route)}
              onFocus={() => handleItemFocus(index)}
              onBlur={handleItemBlur}
              autoFocus={index === 0 && pathname === '/'}
            />
          ))}
        </ScrollView>

        <View
          style={{
            marginTop: 'auto',
            paddingTop: 24,
            paddingHorizontal: 8,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>
                {currentUser?.Name?.charAt(0).toUpperCase() ?? 'U'}
              </Text>
            </View>
            {isExpanded && (
              <Text
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  marginLeft: 12,
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                {currentUser?.Name ?? 'User'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
