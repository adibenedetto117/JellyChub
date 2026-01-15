import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore } from '@/stores';
import { DesktopNavButton } from './DesktopNavButton';

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

const COLLAPSED_WIDTH = 68;
const EXPANDED_WIDTH = 240;
const ANIMATION_DURATION = 200;

interface DesktopSidebarProps {
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function DesktopSidebar({
  defaultExpanded = true,
  onExpandedChange,
}: DesktopSidebarProps) {
  const pathname = usePathname();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const sidebarRef = useRef<View>(null);

  const width = useSharedValue(defaultExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  const toggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    width.value = withTiming(newExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH, {
      duration: ANIMATION_DURATION,
    });
    onExpandedChange?.(newExpanded);
  }, [isExpanded, width, onExpandedChange]);

  const isActive = useCallback((route: string) => {
    const routePath = route.replace('/(tabs)/', '');
    return pathname.includes(routePath);
  }, [pathname]);

  const handleItemPress = useCallback((route: string) => {
    router.push(route as any);
  }, []);

  const handleItemFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleItemBlur = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  const handleKeyDown = useCallback((e: any) => {
    const key = e.nativeEvent?.key;

    if (key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, menuItems.length - 1));
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (key === 'Enter' && focusedIndex >= 0) {
      handleItemPress(menuItems[focusedIndex].route);
    }
  }, [focusedIndex, handleItemPress]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleExpanded();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [toggleExpanded]);

  return (
    <Animated.View
      ref={sidebarRef}
      style={[styles.container, animatedStyle]}
      accessible
      accessibilityLabel="Main navigation sidebar"
    >
      <View style={styles.header}>
        <Pressable
          onPress={toggleExpanded}
          style={styles.logoContainer}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          accessibilityHint="Press to toggle sidebar"
        >
          <View style={[styles.logo, { backgroundColor: accentColor }]}>
            <Text style={styles.logoText}>J</Text>
          </View>
          {isExpanded && (
            <Text style={styles.appName}>JellyChub</Text>
          )}
        </Pressable>

        <Pressable
          onPress={toggleExpanded}
          style={[styles.toggleButton, !isExpanded && styles.toggleButtonCollapsed]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Collapse' : 'Expand'}
        >
          <Ionicons
            name={isExpanded ? 'chevron-back' : 'chevron-forward'}
            size={16}
            color="rgba(255,255,255,0.6)"
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContent}
      >
        {menuItems.map((item, index) => (
          <DesktopNavButton
            key={item.route}
            icon={item.icon}
            iconFilled={item.iconFilled}
            label={item.label}
            active={isActive(item.route)}
            isExpanded={isExpanded}
            onPress={() => handleItemPress(item.route)}
            onFocus={() => handleItemFocus(index)}
            onBlur={handleItemBlur}
            tabIndex={index + 1}
            accessibilityLabel={`Navigate to ${item.label}`}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.userContainer}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Current user: ${currentUser?.Name ?? 'User'}`}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentUser?.Name?.charAt(0).toUpperCase() ?? 'U'}
            </Text>
          </View>
          {isExpanded && (
            <Text style={styles.userName} numberOfLines={1}>
              {currentUser?.Name ?? 'User'}
            </Text>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: '#0f0f0f',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  appName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  toggleButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonCollapsed: {
    display: 'none',
  },
  menuContainer: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  userName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
});
