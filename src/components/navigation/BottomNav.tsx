import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
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
  jellyseerr: { outline: 'add-circle-outline', filled: 'add-circle' },
  admin: { outline: 'shield-outline', filled: 'shield' },
  settings: { outline: 'settings-outline', filled: 'settings' },
  more: { outline: 'ellipsis-horizontal-circle-outline', filled: 'ellipsis-horizontal-circle' },
  radarr: { outline: 'film-outline', filled: 'film' },
  sonarr: { outline: 'tv-outline', filled: 'tv' },
  favorites: { outline: 'heart-outline', filled: 'heart' },
  livetv: { outline: 'radio-outline', filled: 'radio' },
};

const TAB_COLORS: Record<string, string> = {
  radarr: '#ffc230',
  sonarr: '#35c5f4',
  favorites: '#ef4444',
  livetv: '#a855f7',
  jellyseerr: '#7c3aed',
};

const TAB_ROUTES: Record<string, string> = {
  home: '/(tabs)/home',
  library: '/(tabs)/library',
  downloads: '/(tabs)/downloads',
  jellyseerr: '/(tabs)/requests',
  admin: '/(tabs)/admin',
  settings: '/(tabs)/settings',
  radarr: '/settings/radarr-manage',
  sonarr: '/settings/sonarr-manage',
  favorites: '/(tabs)/favorites',
  livetv: '/(tabs)/live-tv',
};

const TAB_NAMES: Record<string, string> = {
  home: 'Home',
  library: 'Library',
  downloads: 'Downloads',
  jellyseerr: 'Jellyseerr',
  admin: 'Admin',
  settings: 'Settings',
  radarr: 'Radarr',
  sonarr: 'Sonarr',
  favorites: 'Favorites',
  livetv: 'Live TV',
  more: 'More',
};

interface MoreMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  moreMenuTabs: string[];
  hasRadarr: boolean;
  hasSonarr: boolean;
  hasJellyseerr: boolean;
  hasLiveTV: boolean;
  libraries: Library[] | undefined;
}

const MoreMenu = memo(function MoreMenu({
  visible,
  onClose,
  onNavigate,
  moreMenuTabs,
  hasRadarr,
  hasSonarr,
  hasJellyseerr,
  hasLiveTV,
  libraries,
}: MoreMenuProps) {
  const insets = useSafeAreaInsets();

  const visibleItems = useMemo(() => {
    return moreMenuTabs.filter((tabId) => {
      if (tabId === 'radarr' && !hasRadarr) return false;
      if (tabId === 'sonarr' && !hasSonarr) return false;
      if (tabId === 'jellyseerr' && !hasJellyseerr) return false;
      if (tabId === 'livetv' && !hasLiveTV) return false;
      // Check if tabId is a library ID (not in TAB_ICONS) and verify the library exists
      if (!(tabId in TAB_ICONS)) {
        const libraryExists = libraries?.some((lib) => lib.Id === tabId);
        if (!libraryExists) return false;
      }
      return true;
    });
  }, [moreMenuTabs, hasRadarr, hasSonarr, hasJellyseerr, hasLiveTV, libraries]);

  // Helper function to get item info for both regular tabs and libraries
  const getItemInfo = useCallback((tabId: string): { icon: IconName; name: string; route: string } | null => {
    // Check if it's a library ID (not in TAB_ICONS)
    if (!(tabId in TAB_ICONS)) {
      const library = libraries?.find((lib) => lib.Id === tabId);
      if (library) {
        const screenName = getLibraryScreenName(library.CollectionType);
        const icons = TAB_ICONS[screenName] || TAB_ICONS.library;
        return {
          icon: icons.outline,
          name: library.Name,
          route: `/(tabs)/library/${library.Id}`,
        };
      }
      return null;
    }

    // Regular tab
    const icons = TAB_ICONS[tabId];
    const route = TAB_ROUTES[tabId];
    if (!route) return null;

    return {
      icon: icons?.outline || 'ellipse-outline',
      name: TAB_NAMES[tabId] || tabId,
      route,
    };
  }, [libraries]);

  if (!visible || visibleItems.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={moreStyles.overlay}>
        <Pressable style={moreStyles.overlayPress} onPress={onClose} />

        <View style={[moreStyles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          {/* Drag Handle */}
          <View style={moreStyles.handleContainer}>
            <View style={moreStyles.handle} />
          </View>

          {/* Title */}
          <Text style={moreStyles.title}>More</Text>

          {/* Menu Items */}
          <View style={moreStyles.itemsContainer}>
              {visibleItems.map((tabId, index) => {
                const itemInfo = getItemInfo(tabId);
                if (!itemInfo) return null;
                const isLast = index === visibleItems.length - 1;

                return (
                  <View key={tabId}>
                    <Pressable
                      style={({ pressed }) => [
                        moreStyles.menuItem,
                        pressed && moreStyles.menuItemPressed,
                      ]}
                      onPress={() => {
                        haptics.light();
                        onClose();
                        setTimeout(() => onNavigate(itemInfo.route), 100);
                      }}
                    >
                      <View style={moreStyles.menuItemContent}>
                        <Ionicons name={itemInfo.icon} size={28} color="#fff" />
                        <Text style={moreStyles.itemName}>{itemInfo.name}</Text>
                      </View>
                    </Pressable>
                    {!isLast && <View style={moreStyles.separator} />}
                  </View>
                );
              })}
            </View>
        </View>
      </View>
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
  const moreMenuTabs = bottomBarConfig.moreMenuTabs ?? [];

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

  // Check if user has live TV libraries
  const hasLiveTV = useMemo(
    () => libraries?.some((lib) => lib.CollectionType === 'livetv') ?? false,
    [libraries]
  );

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
    if (tabId === 'jellyseerr') {
      return hasJellyseerr && bottomBarConfig.showJellyseerr
        ? { id: 'jellyseerr', name: 'Jellyseerr', icon: icons.jellyseerr.outline, iconFilled: icons.jellyseerr.filled, route: '/(tabs)/requests' }
        : null;
    }
    if (tabId === 'admin') {
      return isAdmin && bottomBarConfig.showAdmin
        ? { id: 'admin', name: 'Admin', icon: icons.admin.outline, iconFilled: icons.admin.filled, route: '/(tabs)/admin' }
        : null;
    }
    if (tabId === 'radarr') {
      return hasRadarr && bottomBarConfig.showRadarr
        ? { id: 'radarr', name: 'Radarr', icon: icons.radarr.outline, iconFilled: icons.radarr.filled, route: '/settings/radarr-manage' }
        : null;
    }
    if (tabId === 'sonarr') {
      return hasSonarr && bottomBarConfig.showSonarr
        ? { id: 'sonarr', name: 'Sonarr', icon: icons.sonarr.outline, iconFilled: icons.sonarr.filled, route: '/settings/sonarr-manage' }
        : null;
    }
    if (tabId === 'favorites') {
      return bottomBarConfig.showFavorites
        ? { id: 'favorites', name: 'Favorites', icon: icons.favorites.outline, iconFilled: icons.favorites.filled, route: '/(tabs)/favorites' }
        : null;
    }
    if (tabId === 'livetv') {
      return hasLiveTV && bottomBarConfig.showLiveTV
        ? { id: 'livetv', name: 'Live TV', icon: icons.livetv.outline, iconFilled: icons.livetv.filled, route: '/(tabs)/live-tv' }
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
  }, [offlineMode, bottomBarConfig, hasJellyseerr, isAdmin, libraries, hasRadarr, hasSonarr, hasLiveTV]);

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

  // Handle tab press - must be before early return
  const handleTabPress = useCallback((tab: TabConfig) => {
    if (tab.id === 'more') {
      haptics.light();
      setShowMoreMenu(true);
    } else {
      handleNavigate(tab.route);
    }
  }, [handleNavigate]);

  // Early return after all hooks
  if (shouldHide) return null;

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
        onNavigate={(route) => router.navigate(route as any)}
        moreMenuTabs={moreMenuTabs}
        hasRadarr={hasRadarr}
        hasSonarr={hasSonarr}
        hasJellyseerr={hasJellyseerr}
        hasLiveTV={hasLiveTV}
        libraries={libraries}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  overlayPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleContainer: {
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    width: '100%',
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  itemsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  menuItem: {
    paddingVertical: 22,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  menuItemLast: {},
  menuItemPressed: {
    opacity: 0.6,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#ffffff',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 0,
  },
});
