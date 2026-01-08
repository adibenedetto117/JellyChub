import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore, useAuthStore } from '@/stores';
import { selectHasJellyseerr, DEFAULT_TAB_ORDER, type TabId } from '@/stores/settingsStore';
import { getLibraries } from '@/api';
import { platformSelect, isTV } from '@/utils/platform';
import { haptics } from '@/utils/haptics';
import type { Library } from '@/types/jellyfin';

// Spring config for press animations - defined outside to prevent recreation
const PRESS_SPRING_CONFIG = { damping: 15, stiffness: 400 };

type IconName = keyof typeof Ionicons.glyphMap;

// Tab configuration interface
interface TabConfig {
  id: string;
  name: string;
  icon: IconName;
  iconFilled: IconName;
  route: string;
}

interface NavTabProps {
  icon: IconName;
  iconFilled: IconName;
  name: string;
  isActive: boolean;
  accentColor: string;
  onPress: () => void;
  reduceMotion?: boolean;
}

const NavTab = memo(function NavTab({ icon, iconFilled, name, isActive, accentColor, onPress, reduceMotion }: NavTabProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(0.9, PRESS_SPRING_CONFIG);
    }
  }, [scale, reduceMotion]);

  const handlePressOut = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(1, PRESS_SPRING_CONFIG);
    }
  }, [scale, reduceMotion]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tab}
      accessible={true}
      accessibilityRole="tab"
      accessibilityLabel={name}
      accessibilityState={{ selected: isActive }}
      accessibilityHint={`Navigate to ${name}`}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <View style={styles.iconContainer} accessible={false}>
          <Ionicons
            name={isActive ? iconFilled : icon}
            size={22}
            color={isActive ? accentColor : 'rgba(255,255,255,0.5)'}
          />
          {isActive && (
            <View style={[styles.activeIndicator, { backgroundColor: accentColor }]} />
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: isActive ? accentColor : 'rgba(255,255,255,0.5)' }
          ]}
          accessible={false}
        >
          {name}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const TAB_ICONS: Record<string, { outline: IconName; filled: IconName }> = {
  home: { outline: 'home-outline', filled: 'home' },
  search: { outline: 'search-outline', filled: 'search' },
  library: { outline: 'grid-outline', filled: 'grid' },
  movies: { outline: 'film-outline', filled: 'film' },
  shows: { outline: 'tv-outline', filled: 'tv' },
  music: { outline: 'musical-notes-outline', filled: 'musical-notes' },
  books: { outline: 'book-outline', filled: 'book' },
  downloads: { outline: 'cloud-download-outline', filled: 'cloud-download' },
  requests: { outline: 'add-circle-outline', filled: 'add-circle' },
  admin: { outline: 'shield-outline', filled: 'shield' },
  settings: { outline: 'settings-outline', filled: 'settings' },
  more: { outline: 'ellipsis-horizontal-circle-outline', filled: 'ellipsis-horizontal-circle' },
};

interface MoreMenuItem {
  id: string;
  name: string;
  icon: IconName;
  route: string;
  color: string;
  description?: string;
}

const MORE_MENU_ITEMS: MoreMenuItem[] = [
  { id: 'radarr', name: 'Radarr', icon: 'film', route: '/settings/radarr-manage', color: '#ffc230', description: 'Movie management' },
  { id: 'sonarr', name: 'Sonarr', icon: 'tv', route: '/settings/sonarr-manage', color: '#35c5f4', description: 'TV series management' },
  { id: 'favorites', name: 'Favorites', icon: 'heart', route: '/(tabs)/favorites', color: '#ef4444', description: 'Your favorite media' },
  { id: 'livetv', name: 'Live TV', icon: 'radio', route: '/(tabs)/live-tv', color: '#a855f7', description: 'Watch live channels' },
];

interface MoreMenuProps {
  visible: boolean;
  onClose: () => void;
  accentColor: string;
  onNavigate: (route: string) => void;
  hasRadarr: boolean;
  hasSonarr: boolean;
}

const MoreMenu = memo(function MoreMenu({ visible, onClose, accentColor, onNavigate, hasRadarr, hasSonarr }: MoreMenuProps) {
  const insets = useSafeAreaInsets();

  const visibleItems = useMemo(() => {
    return MORE_MENU_ITEMS.filter((item) => {
      if (item.id === 'radarr' && !hasRadarr) return false;
      if (item.id === 'sonarr' && !hasSonarr) return false;
      return true;
    });
  }, [hasRadarr, hasSonarr]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={moreStyles.overlay} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={moreStyles.backdropFade}
        />
      </Pressable>
      <Animated.View
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown.duration(200)}
        style={[moreStyles.container, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={moreStyles.handle} />
        <Text style={moreStyles.title}>More</Text>
        <View style={moreStyles.grid}>
          {visibleItems.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                moreStyles.menuItem,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => {
                haptics.light();
                onClose();
                setTimeout(() => onNavigate(item.route), 150);
              }}
            >
              <View style={[moreStyles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={moreStyles.itemName}>{item.name}</Text>
              {item.description && (
                <Text style={moreStyles.itemDescription}>{item.description}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
});

const HIDDEN_PATHS = [
  '/player/',
  '/reader/',
  '(auth)',
  'login',
  'server-select',
];

function getLibraryScreenName(collectionType: Library['CollectionType']): string {
  switch (collectionType) {
    case 'movies': return 'movies';
    case 'tvshows': return 'shows';
    case 'music': return 'music';
    case 'books':
    case 'audiobooks': return 'books';
    default: return 'library';
  }
}

export const BottomNav = memo(function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomBarConfig = useSettingsStore((s) => s.bottomBarConfig);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const offlineMode = useSettingsStore((s) => s.offlineMode);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const radarrUrl = useSettingsStore((s) => s.radarrUrl);
  const radarrApiKey = useSettingsStore((s) => s.radarrApiKey);
  const sonarrUrl = useSettingsStore((s) => s.sonarrUrl);
  const sonarrApiKey = useSettingsStore((s) => s.sonarrApiKey);
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.Id ?? '';
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const hasRadarr = !!(radarrUrl && radarrApiKey);
  const hasSonarr = !!(sonarrUrl && sonarrApiKey);

  // Memoize admin check
  const isAdmin = useMemo(
    () => (currentUser as { Policy?: { IsAdministrator?: boolean } })?.Policy?.IsAdministrator ?? false,
    [currentUser]
  );

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId && !offlineMode,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const baseHeight = platformSelect({ mobile: 56, tablet: 52, tv: 0 });
  const height = baseHeight + insets.bottom;

  // Memoize hide check to avoid repeated string operations
  const shouldHide = useMemo(
    () => isTV || !pathname || HIDDEN_PATHS.some(p => pathname.includes(p)),
    [pathname]
  );

  // Memoize tab order computation
  const tabOrder = useMemo(
    () => bottomBarConfig.tabOrder?.length > 0 ? bottomBarConfig.tabOrder : DEFAULT_TAB_ORDER,
    [bottomBarConfig.tabOrder]
  );

  // Memoize getTabConfig to prevent recreation
  const getTabConfig = useCallback((tabId: TabId): TabConfig | null => {
    const icons = TAB_ICONS;

    if (offlineMode) {
      if (tabId === 'downloads') {
        return { id: 'downloads', name: 'Downloads', icon: icons.downloads.outline, iconFilled: icons.downloads.filled, route: '/(tabs)/downloads' };
      }
      if (tabId === 'settings') {
        return { id: 'settings', name: 'Settings', icon: icons.settings.outline, iconFilled: icons.settings.filled, route: '/(tabs)/settings' };
      }
      return null;
    }

    if (tabId === 'home') {
      return bottomBarConfig.showHome
        ? { id: 'home', name: 'Home', icon: icons.home.outline, iconFilled: icons.home.filled, route: '/(tabs)/home' }
        : null;
    }
    if (tabId === 'library') {
      return bottomBarConfig.showLibrary
        ? { id: 'library', name: 'Library', icon: icons.library.outline, iconFilled: icons.library.filled, route: '/(tabs)/library' }
        : null;
    }
    if (tabId === 'downloads') {
      return bottomBarConfig.showDownloads
        ? { id: 'downloads', name: 'Downloads', icon: icons.downloads.outline, iconFilled: icons.downloads.filled, route: '/(tabs)/downloads' }
        : null;
    }
    if (tabId === 'requests') {
      return hasJellyseerr && bottomBarConfig.showRequests
        ? { id: 'requests', name: 'Requests', icon: icons.requests.outline, iconFilled: icons.requests.filled, route: '/(tabs)/requests' }
        : null;
    }
    if (tabId === 'admin') {
      return isAdmin && bottomBarConfig.showAdmin
        ? { id: 'admin', name: 'Admin', icon: icons.admin.outline, iconFilled: icons.admin.filled, route: '/(tabs)/admin' }
        : null;
    }
    if (tabId === 'settings') {
      return { id: 'settings', name: 'Settings', icon: icons.settings.outline, iconFilled: icons.settings.filled, route: '/(tabs)/settings' };
    }
    if (tabId === 'more') {
      return bottomBarConfig.showMore
        ? { id: 'more', name: 'More', icon: icons.more.outline, iconFilled: icons.more.filled, route: 'more' }
        : null;
    }

    const library = libraries?.find((l) => l.Id === tabId);
    if (library) {
      const screenName = getLibraryScreenName(library.CollectionType);
      const screenIcons = icons[screenName] || icons.library;
      return bottomBarConfig.selectedLibraryIds.includes(tabId)
        ? { id: screenName, name: library.Name, icon: screenIcons.outline, iconFilled: screenIcons.filled, route: `/(tabs)/${screenName}` }
        : null;
    }

    return null;
  }, [offlineMode, bottomBarConfig, hasJellyseerr, isAdmin, libraries]);

  // Memoize the entire tabs array computation
  const tabs = useMemo(() => {
    const result: TabConfig[] = [];
    const usedScreenNames = new Set<string>();

    for (const tabId of tabOrder) {
      const config = getTabConfig(tabId);
      if (config && !usedScreenNames.has(config.id)) {
        result.push(config);
        usedScreenNames.add(config.id);
      }
    }

    return result;
  }, [tabOrder, getTabConfig]);

  // Memoize isTabActive function
  const isTabActive = useCallback((route: string) => {
    if (!pathname) return false;
    const tabPath = route.replace('/(tabs)/', '');
    return pathname.startsWith(`/(tabs)/${tabPath}`) || pathname === `/${tabPath}`;
  }, [pathname]);

  // Memoize navigation handler factory
  const handleNavigate = useCallback((route: string) => {
    haptics.light();
    router.navigate(route as any);
  }, [router]);

  // Early return after all hooks
  if (shouldHide) return null;

  const handleTabPress = useCallback((tab: TabConfig) => {
    if (tab.id === 'more') {
      haptics.light();
      setShowMoreMenu(true);
    } else {
      handleNavigate(tab.route);
    }
  }, [handleNavigate]);

  return (
    <>
      <View
        style={[styles.container, { height, paddingBottom: insets.bottom }]}
        accessible={true}
        accessibilityRole="tablist"
        accessibilityLabel="Main navigation"
      >
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <NavTab
              key={tab.id}
              icon={tab.icon}
              iconFilled={tab.iconFilled}
              name={tab.name}
              isActive={tab.id === 'more' ? showMoreMenu : isTabActive(tab.route)}
              accentColor={accentColor}
              onPress={() => handleTabPress(tab)}
              reduceMotion={reduceMotion}
            />
          ))}
        </View>
      </View>
      <MoreMenu
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        accentColor={accentColor}
        onNavigate={(route) => router.navigate(route as any)}
        hasRadarr={hasRadarr}
        hasSonarr={hasSonarr}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0a',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});

const moreStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItem: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  itemDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
});
