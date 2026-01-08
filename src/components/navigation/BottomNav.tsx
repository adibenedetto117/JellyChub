import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  livetv: '/(tabs)/livetv',
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
  t: (key: string) => string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.6;
const DISMISS_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 400;

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
  t,
}: MoreMenuProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_MAX_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const isOpen = useSharedValue(false);

  const visibleItems = useMemo(() => {
    return moreMenuTabs.filter((tabId) => {
      if (tabId === 'radarr' && !hasRadarr) return false;
      if (tabId === 'sonarr' && !hasSonarr) return false;
      if (tabId === 'jellyseerr' && !hasJellyseerr) return false;
      if (tabId === 'livetv' && !hasLiveTV) return false;
      if (!(tabId in TAB_ICONS)) {
        const libraryExists = libraries?.some((lib) => lib.Id === tabId);
        if (!libraryExists) return false;
      }
      return true;
    });
  }, [moreMenuTabs, hasRadarr, hasSonarr, hasJellyseerr, hasLiveTV, libraries]);

  const getItemInfo = useCallback((tabId: string): { icon: IconName; name: string; route: string; color: string } | null => {
    if (!(tabId in TAB_ICONS)) {
      const library = libraries?.find((lib) => lib.Id === tabId);
      if (library) {
        const screenName = getLibraryScreenName(library.CollectionType);
        const icons = TAB_ICONS[screenName] || TAB_ICONS.library;
        return {
          icon: icons.outline,
          name: library.Name,
          route: `/library/${library.Id}`,
          color: '#8b5cf6',
        };
      }
      return null;
    }

    const icons = TAB_ICONS[tabId];
    const route = TAB_ROUTES[tabId];
    if (!route) return null;

    const tabNameKeys: Record<string, string> = {
      home: 'nav.home',
      library: 'nav.library',
      downloads: 'nav.downloads',
      jellyseerr: 'nav.jellyseerr',
      admin: 'nav.admin',
      settings: 'nav.settings',
      radarr: 'nav.radarr',
      sonarr: 'nav.sonarr',
      favorites: 'nav.favorites',
      livetv: 'nav.liveTV',
      more: 'nav.more',
    };
    const translatedName = tabNameKeys[tabId] ? t(tabNameKeys[tabId]) : (TAB_NAMES[tabId] || tabId);

    return {
      icon: icons?.outline || 'ellipse-outline',
      name: translatedName,
      route,
      color: TAB_COLORS[tabId] || '#8b5cf6',
    };
  }, [libraries, t]);

  // Open/close animation
  useEffect(() => {
    if (visible) {
      isOpen.value = true;
      translateY.value = withTiming(0, { duration: 280 });
      overlayOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(SHEET_MAX_HEIGHT, { duration: 220 });
      overlayOpacity.value = withTiming(0, { duration: 180 });
      setTimeout(() => {
        isOpen.value = false;
      }, 220);
    }
  }, [visible, translateY, overlayOpacity, isOpen]);

  const closeSheet = useCallback(() => {
    translateY.value = withTiming(SHEET_MAX_HEIGHT, { duration: 200 });
    overlayOpacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(onClose)();
    });
  }, [onClose, translateY, overlayOpacity]);

  const panGesture = useMemo(() => Gesture.Pan()
    .onUpdate((event) => {
      // Only allow dragging down, with rubber band effect for up
      if (event.translationY < 0) {
        translateY.value = event.translationY * 0.2; // Rubber band up
      } else {
        translateY.value = event.translationY;
      }
      // Update overlay opacity based on drag
      const progress = Math.min(1, event.translationY / SHEET_MAX_HEIGHT);
      overlayOpacity.value = 1 - progress;
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_THRESHOLD ||
        event.velocityY > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        runOnJS(closeSheet)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
        overlayOpacity.value = withTiming(1, { duration: 150 });
      }
    }), [translateY, overlayOpacity, closeSheet]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: overlayOpacity.value > 0 ? 'auto' : 'none',
  }));

  const containerStyle = useAnimatedStyle(() => ({
    pointerEvents: isOpen.value ? 'auto' : 'none',
  }));

  if (visibleItems.length === 0) return null;

  return (
    <Animated.View style={[moreStyles.fullScreen, containerStyle]}>
      {/* Backdrop */}
      <Animated.View style={[moreStyles.overlayBackground, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
      </Animated.View>

      {/* Bottom Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[moreStyles.sheet, { paddingBottom: insets.bottom + 16 }, sheetStyle]}>
          {/* Drag Handle */}
          <View style={moreStyles.handleContainer}>
            <View style={moreStyles.handle} />
          </View>

          {/* Title */}
          <View style={moreStyles.titleContainer}>
            <Text style={moreStyles.title}>{t('nav.more')}</Text>
          </View>

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
                      closeSheet();
                      setTimeout(() => onNavigate(itemInfo.route), 200);
                    }}
                  >
                    <View style={moreStyles.menuItemRow}>
                      <View style={[moreStyles.iconBackground, { backgroundColor: itemInfo.color + '15' }]}>
                        <Ionicons name={itemInfo.icon} size={22} color={itemInfo.color} />
                      </View>
                      <Text style={moreStyles.itemName} numberOfLines={1}>{itemInfo.name}</Text>
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                    </View>
                  </Pressable>
                  {!isLast && <View style={moreStyles.separator} />}
                </View>
              );
            })}
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
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
  const { t } = useTranslation();
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
        return { id: 'downloads', name: t('nav.downloads'), icon: icons.downloads.outline, iconFilled: icons.downloads.filled, route: '/(tabs)/downloads' };
      }
      if (tabId === 'settings') {
        return { id: 'settings', name: t('nav.settings'), icon: icons.settings.outline, iconFilled: icons.settings.filled, route: '/(tabs)/settings' };
      }
      return null;
    }

    if (tabId === 'home') {
      return bottomBarConfig.showHome
        ? { id: 'home', name: t('nav.home'), icon: icons.home.outline, iconFilled: icons.home.filled, route: '/(tabs)/home' }
        : null;
    }
    if (tabId === 'library') {
      return bottomBarConfig.showLibrary
        ? { id: 'library', name: t('nav.library'), icon: icons.library.outline, iconFilled: icons.library.filled, route: '/(tabs)/library' }
        : null;
    }
    if (tabId === 'downloads') {
      return bottomBarConfig.showDownloads
        ? { id: 'downloads', name: t('nav.downloads'), icon: icons.downloads.outline, iconFilled: icons.downloads.filled, route: '/(tabs)/downloads' }
        : null;
    }
    if (tabId === 'jellyseerr') {
      return hasJellyseerr && bottomBarConfig.showJellyseerr
        ? { id: 'jellyseerr', name: t('nav.jellyseerr'), icon: icons.jellyseerr.outline, iconFilled: icons.jellyseerr.filled, route: '/(tabs)/requests' }
        : null;
    }
    if (tabId === 'admin') {
      return isAdmin && bottomBarConfig.showAdmin
        ? { id: 'admin', name: t('nav.admin'), icon: icons.admin.outline, iconFilled: icons.admin.filled, route: '/(tabs)/admin' }
        : null;
    }
    if (tabId === 'radarr') {
      return hasRadarr && bottomBarConfig.showRadarr
        ? { id: 'radarr', name: t('nav.radarr'), icon: icons.radarr.outline, iconFilled: icons.radarr.filled, route: '/settings/radarr-manage' }
        : null;
    }
    if (tabId === 'sonarr') {
      return hasSonarr && bottomBarConfig.showSonarr
        ? { id: 'sonarr', name: t('nav.sonarr'), icon: icons.sonarr.outline, iconFilled: icons.sonarr.filled, route: '/settings/sonarr-manage' }
        : null;
    }
    if (tabId === 'favorites') {
      return bottomBarConfig.showFavorites
        ? { id: 'favorites', name: t('nav.favorites'), icon: icons.favorites.outline, iconFilled: icons.favorites.filled, route: '/(tabs)/favorites' }
        : null;
    }
    if (tabId === 'livetv') {
      return hasLiveTV && bottomBarConfig.showLiveTV
        ? { id: 'livetv', name: t('nav.liveTV'), icon: icons.livetv.outline, iconFilled: icons.livetv.filled, route: '/(tabs)/livetv' }
        : null;
    }
    if (tabId === 'settings') {
      return { id: 'settings', name: t('nav.settings'), icon: icons.settings.outline, iconFilled: icons.settings.filled, route: '/(tabs)/settings' };
    }
    if (tabId === 'more') {
      return bottomBarConfig.showMore
        ? { id: 'more', name: t('nav.more'), icon: icons.more.outline, iconFilled: icons.more.filled, route: 'more' }
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
  }, [offlineMode, bottomBarConfig, hasJellyseerr, isAdmin, libraries, hasRadarr, hasSonarr, hasLiveTV, t]);

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
        t={t}
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
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#151515',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
  titleContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  itemsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBackground: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 70,
    marginRight: 12,
    marginVertical: 4,
  },
});
