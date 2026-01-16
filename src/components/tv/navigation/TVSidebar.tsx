import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, findNodeHandle, UIManager, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { tvConstants } from '@/utils/platform';
import { useAuthStore, useSettingsStore, selectHasJellyseerr } from '@/stores';

type IconName = keyof typeof Ionicons.glyphMap;

const TV_ACCENT_GOLD = '#D4A84B';
const TV_ACCENT_GOLD_DIM = 'rgba(212, 168, 75, 0.15)';

interface MenuItem {
  label: string;
  route: string;
  icon: IconName;
  iconFilled: IconName;
  requiresJellyseerr?: boolean;
}

const baseMenuItems: MenuItem[] = [
  { label: 'Home', route: '/(tabs)/home', icon: 'home-outline', iconFilled: 'home' },
  { label: 'Search', route: '/(tabs)/search', icon: 'search-outline', iconFilled: 'search' },
  { label: 'Library', route: '/(tabs)/library', icon: 'library-outline', iconFilled: 'library' },
  { label: 'Movies', route: '/(tabs)/movies', icon: 'film-outline', iconFilled: 'film' },
  { label: 'TV Shows', route: '/(tabs)/shows', icon: 'tv-outline', iconFilled: 'tv' },
  { label: 'Music', route: '/(tabs)/music', icon: 'musical-notes-outline', iconFilled: 'musical-notes' },
  { label: 'Live TV', route: '/(tabs)/livetv', icon: 'radio-outline', iconFilled: 'radio' },
  { label: 'Requests', route: '/(tabs)/requests', icon: 'sparkles-outline', iconFilled: 'sparkles', requiresJellyseerr: true },
  { label: 'Downloads', route: '/(tabs)/downloads', icon: 'cloud-download-outline', iconFilled: 'cloud-download' },
  { label: 'Settings', route: '/(tabs)/settings', icon: 'settings-outline', iconFilled: 'settings' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SidebarItemProps {
  item: MenuItem;
  isActive: boolean;
  isExpanded: boolean;
  isFocused: boolean;
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
  onPress,
  onFocus,
  onBlur,
  autoFocus,
}: SidebarItemProps) {
  const scale = useSharedValue(1);
  const indicatorWidth = useSharedValue(isActive ? 4 : 0);
  const bgOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(1.02, { duration: tvConstants.focusDuration });
      if (!isActive) {
        bgOpacity.value = withTiming(0.5, { duration: tvConstants.focusDuration });
      }
    } else {
      scale.value = withTiming(1, { duration: tvConstants.focusDuration });
      if (!isActive) {
        bgOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
      }
    }
  }, [isFocused, isActive, scale, bgOpacity]);

  useEffect(() => {
    indicatorWidth.value = withTiming(isActive ? 4 : 0, { duration: tvConstants.focusDuration });
    bgOpacity.value = withTiming(isActive ? 1 : isFocused ? 0.5 : 0, {
      duration: tvConstants.focusDuration,
    });
  }, [isActive, isFocused, indicatorWidth, bgOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
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
          paddingVertical: 16,
          paddingHorizontal: 16,
          marginBottom: 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              left: 0,
              bottom: 4,
              backgroundColor: TV_ACCENT_GOLD,
              borderTopRightRadius: 2,
              borderBottomRightRadius: 2,
            },
            indicatorStyle,
          ]}
        />

        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: TV_ACCENT_GOLD_DIM,
            },
            backgroundStyle,
          ]}
        />

        <View
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isActive ? item.iconFilled : item.icon}
            size={28}
            color={isActive ? TV_ACCENT_GOLD : isFocused ? '#fff' : 'rgba(255,255,255,0.5)'}
          />
        </View>

        {isExpanded && (
          <Text
            style={{
              marginLeft: 16,
              fontSize: 18,
              fontWeight: isActive ? '600' : '400',
              color: isActive ? '#fff' : isFocused ? '#fff' : 'rgba(255,255,255,0.6)',
              letterSpacing: 0.5,
            }}
          >
            {item.label}
          </Text>
        )}

        {isFocused && (
          <View
            style={{
              position: 'absolute',
              top: 2,
              left: 2,
              right: 2,
              bottom: 2,
              borderWidth: 2,
              borderColor: TV_ACCENT_GOLD,
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
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const menuItems = useMemo(() => {
    return baseMenuItems.filter((item) => {
      if (item.requiresJellyseerr && !hasJellyseerr) {
        return false;
      }
      return true;
    });
  }, [hasJellyseerr]);

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

  const checkIsActive = useCallback((route: string) => {
    const routePath = route.replace('/(tabs)/', '');
    return pathname.includes(routePath);
  }, [pathname]);

  const currentPageLabel = useMemo(() => {
    const activeItem = menuItems.find((item) => checkIsActive(item.route));
    return activeItem?.label ?? 'Home';
  }, [checkIsActive, menuItems]);

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
          backgroundColor: '#080808',
          borderRightWidth: 1,
          borderRightColor: 'rgba(255,255,255,0.06)',
        },
      ]}
      onFocus={handleContainerFocus}
      onBlur={handleContainerBlur}
    >
      <View style={{ flex: 1, paddingVertical: 32 }}>
        <View
          style={{
            paddingHorizontal: 16,
            marginBottom: 40,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                backgroundColor: TV_ACCENT_GOLD,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#000', fontSize: 24, fontWeight: '700' }}>J</Text>
            </View>
            {isExpanded && (
              <View style={{ marginLeft: 16 }}>
                <Text
                  style={{
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: 20,
                    letterSpacing: 1,
                  }}
                >
                  JELLYCHUB
                </Text>
                <Text
                  style={{
                    color: TV_ACCENT_GOLD,
                    fontSize: 13,
                    fontWeight: '500',
                    marginTop: 2,
                    letterSpacing: 0.5,
                  }}
                >
                  {currentPageLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {menuItems.map((item, index) => (
            <SidebarItem
              key={item.route}
              item={item}
              isActive={checkIsActive(item.route)}
              isExpanded={isExpanded}
              isFocused={focusedIndex === index}
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
            paddingTop: 32,
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
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
                backgroundColor: 'rgba(255,255,255,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '500' }}>
                {currentUser?.Name?.charAt(0).toUpperCase() ?? 'U'}
              </Text>
            </View>
            {isExpanded && (
              <Text
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  marginLeft: 14,
                  fontSize: 15,
                  fontWeight: '500',
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
