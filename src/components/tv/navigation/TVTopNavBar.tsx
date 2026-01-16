import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, findNodeHandle, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { tvConstants } from '@/utils/platform';
import { useAuthStore, useSettingsStore, selectHasJellyseerr } from '@/stores';

type IconName = keyof typeof Ionicons.glyphMap;

const TV_ACCENT_GOLD = '#D4A84B';

interface MenuItem {
  label: string;
  route: string;
  icon: IconName;
  iconFilled: IconName;
  requiresJellyseerr?: boolean;
}

const menuItems: MenuItem[] = [
  { label: 'Home', route: '/(tabs)/home', icon: 'home-outline', iconFilled: 'home' },
  { label: 'Search', route: '/(tabs)/search', icon: 'search-outline', iconFilled: 'search' },
  { label: 'Library', route: '/(tabs)/library', icon: 'library-outline', iconFilled: 'library' },
  { label: 'Movies', route: '/(tabs)/movies', icon: 'film-outline', iconFilled: 'film' },
  { label: 'TV Shows', route: '/(tabs)/shows', icon: 'tv-outline', iconFilled: 'tv' },
  { label: 'Settings', route: '/(tabs)/settings', icon: 'settings-outline', iconFilled: 'settings' },
];

interface NavItemProps {
  item: MenuItem;
  isActive: boolean;
  isFocused: boolean;
  onPress: () => void;
  onFocus: () => void;
  onBlur: () => void;
  itemRef: React.RefObject<any>;
  nextFocusLeft?: number;
  nextFocusRight?: number;
  nextFocusDown?: number;
}

function NavItem({
  item,
  isActive,
  isFocused,
  onPress,
  onFocus,
  onBlur,
  itemRef,
  nextFocusLeft,
  nextFocusRight,
  nextFocusDown,
}: NavItemProps) {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(isActive ? 0.3 : 0);

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(1.08, { duration: tvConstants.focusDuration });
      bgOpacity.value = withTiming(0.4, { duration: tvConstants.focusDuration });
    } else {
      scale.value = withTiming(1, { duration: tvConstants.focusDuration });
      bgOpacity.value = withTiming(isActive ? 0.3 : 0, { duration: tvConstants.focusDuration });
    }
  }, [isFocused, isActive, scale, bgOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        ref={itemRef}
        onPress={onPress}
        onFocus={onFocus}
        onBlur={onBlur}
        style={styles.navItem}
        accessible
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isActive }}
        nextFocusLeft={nextFocusLeft}
        nextFocusRight={nextFocusRight}
        nextFocusDown={nextFocusDown}
      >
        <Animated.View style={[styles.navItemBg, backgroundStyle]} />
        <Ionicons
          name={isActive ? item.iconFilled : item.icon}
          size={24}
          color={isActive ? TV_ACCENT_GOLD : isFocused ? '#fff' : 'rgba(255,255,255,0.6)'}
        />
        <Text
          style={[
            styles.navItemLabel,
            { color: isActive ? '#fff' : isFocused ? '#fff' : 'rgba(255,255,255,0.6)' },
            isActive && styles.navItemLabelActive,
          ]}
        >
          {item.label}
        </Text>
        {(isFocused || isActive) && (
          <View style={[styles.navItemIndicator, { backgroundColor: TV_ACCENT_GOLD }]} />
        )}
      </Pressable>
    </Animated.View>
  );
}

interface TVTopNavBarProps {
  onNavFocus?: () => void;
  onNavBlur?: () => void;
  firstContentRef?: React.RefObject<any>;
}

export function TVTopNavBar({ onNavFocus, onNavBlur, firstContentRef }: TVTopNavBarProps) {
  const pathname = usePathname();
  const currentUser = useAuthStore((state) => state.currentUser);
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const itemRefs = useRef<(React.RefObject<any>)[]>(
    menuItems.map(() => ({ current: null }))
  );

  const [nodeHandles, setNodeHandles] = useState<(number | null)[]>([]);
  const [firstContentHandle, setFirstContentHandle] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const handles = itemRefs.current.map((ref) =>
        ref.current ? findNodeHandle(ref.current) : null
      );
      setNodeHandles(handles);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (firstContentRef?.current) {
      const timer = setTimeout(() => {
        const handle = findNodeHandle(firstContentRef.current);
        setFirstContentHandle(handle);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [firstContentRef]);

  const filteredItems = menuItems.filter((item) => {
    if (item.requiresJellyseerr && !hasJellyseerr) return false;
    return true;
  });

  const checkIsActive = useCallback((route: string) => {
    const routePath = route.replace('/(tabs)/', '');
    return pathname.includes(routePath);
  }, [pathname]);

  const handleItemPress = useCallback((route: string) => {
    router.push(route as any);
  }, []);

  const handleItemFocus = useCallback((index: number) => {
    setFocusedIndex(index);
    onNavFocus?.();
  }, [onNavFocus]);

  const handleItemBlur = useCallback(() => {
    setFocusedIndex(-1);
    onNavBlur?.();
  }, [onNavBlur]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>J</Text>
        </View>
        <Text style={styles.appName}>JELLYCHUB</Text>
      </View>

      <View style={styles.navItems}>
        {filteredItems.map((item, index) => {
          const itemIndex = menuItems.indexOf(item);
          return (
            <NavItem
              key={item.route}
              item={item}
              isActive={checkIsActive(item.route)}
              isFocused={focusedIndex === index}
              onPress={() => handleItemPress(item.route)}
              onFocus={() => handleItemFocus(index)}
              onBlur={handleItemBlur}
              itemRef={itemRefs.current[itemIndex]}
              nextFocusLeft={index > 0 ? nodeHandles[menuItems.indexOf(filteredItems[index - 1])] ?? undefined : undefined}
              nextFocusRight={index < filteredItems.length - 1 ? nodeHandles[menuItems.indexOf(filteredItems[index + 1])] ?? undefined : undefined}
              nextFocusDown={firstContentHandle ?? undefined}
            />
          );
        })}
      </View>

      <View style={styles.userContainer}>
        <View style={styles.userAvatar}>
          <Text style={styles.userInitial}>
            {currentUser?.Name?.charAt(0).toUpperCase() ?? 'U'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingVertical: 16,
    backgroundColor: 'rgba(8, 8, 8, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 48,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: TV_ACCENT_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '700',
  },
  appName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: 12,
  },
  navItems: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  navItemBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: TV_ACCENT_GOLD,
    borderRadius: 8,
  },
  navItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  navItemLabelActive: {
    fontWeight: '600',
  },
  navItemIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 1,
  },
  userContainer: {
    marginLeft: 'auto',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
