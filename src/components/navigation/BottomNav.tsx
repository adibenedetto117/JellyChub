import { View, Text, Pressable } from 'react-native';
import { memo, useCallback } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useSettingsStore, useAuthStore } from '@/stores';
import { selectHasJellyseerr, DEFAULT_TAB_ORDER, type TabId } from '@/stores/settingsStore';
import { getLibraries } from '@/api';
import { colors } from '@/theme';
import { platformSelect, isTV } from '@/utils/platform';
import type { Library } from '@/types/jellyfin';

interface NavTabProps {
  icon: string;
  name: string;
  isActive: boolean;
  isLandingPage: boolean;
  accentColor: string;
  onPress: () => void;
}

const NavTab = memo(function NavTab({ icon, name, isActive, isLandingPage, accentColor, onPress }: NavTabProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 2,
      }}
    >
      <Animated.View style={[{ alignItems: 'center' }, animatedStyle]}>
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              fontSize: 20,
              color: isActive ? accentColor : colors.text.tertiary,
              opacity: isActive ? 1 : 0.6,
              textAlign: 'center',
            }}
          >
            {icon}
          </Text>
          {isLandingPage && !isActive && (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: accentColor,
              }}
            />
          )}
        </View>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '500',
            marginTop: 4,
            color: isActive ? accentColor : colors.text.tertiary,
          }}
        >
          {name}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const TAB_ICONS: Record<string, string> = {
  home: '\u2302',
  search: '\u26B2',
  library: '\u25A6',
  movies: '\u25B6',
  shows: '\u25A4',
  music: '\u266B',
  books: '\u25AF',
  downloads: '\u2193',
  requests: '\u2606',
  admin: '\u2318',
  settings: '\u2699',
};

const HIDDEN_PATHS = [
  '/player/',
  '/reader/',
  '/(auth)',
  '/login',
  '/server-select',
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

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomBarConfig = useSettingsStore((s) => s.bottomBarConfig);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const offlineMode = useSettingsStore((s) => s.offlineMode);
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.Id ?? '';
  const isAdmin = (currentUser as { Policy?: { IsAdministrator?: boolean } })?.Policy?.IsAdministrator ?? false;

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId && !offlineMode,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const shouldHide = isTV || !pathname || HIDDEN_PATHS.some(p => pathname.includes(p));

  if (shouldHide) return null;

  const baseHeight = platformSelect({ mobile: 56, tablet: 52, tv: 0 });
  const height = baseHeight + insets.bottom;

  const tabOrder = bottomBarConfig.tabOrder?.length > 0 ? bottomBarConfig.tabOrder : DEFAULT_TAB_ORDER;
  const landingPage = bottomBarConfig.landingPage ?? 'home';

  const selectedLibraries = libraries?.filter((lib) =>
    bottomBarConfig.selectedLibraryIds.includes(lib.Id)
  ) ?? [];

  interface TabConfig {
    id: string;
    name: string;
    icon: string;
    route: string;
    isLandingPage: boolean;
  }

  const getTabConfig = (tabId: TabId): TabConfig | null => {
    if (offlineMode) {
      if (tabId === 'downloads') {
        return { id: 'downloads', name: 'Downloads', icon: TAB_ICONS.downloads, route: '/(tabs)/downloads', isLandingPage: true };
      }
      if (tabId === 'settings') {
        return { id: 'settings', name: 'Settings', icon: TAB_ICONS.settings, route: '/(tabs)/settings', isLandingPage: false };
      }
      return null;
    }

    if (tabId === 'home') {
      return bottomBarConfig.showHome
        ? { id: 'home', name: 'Home', icon: TAB_ICONS.home, route: '/(tabs)/home', isLandingPage: landingPage === 'home' }
        : null;
    }
    if (tabId === 'library') {
      return { id: 'library', name: 'Library', icon: TAB_ICONS.library, route: '/(tabs)/library', isLandingPage: landingPage === 'library' };
    }
    if (tabId === 'downloads') {
      return bottomBarConfig.showDownloads
        ? { id: 'downloads', name: 'Downloads', icon: TAB_ICONS.downloads, route: '/(tabs)/downloads', isLandingPage: landingPage === 'downloads' }
        : null;
    }
    if (tabId === 'requests') {
      return hasJellyseerr && bottomBarConfig.showRequests
        ? { id: 'requests', name: 'Requests', icon: TAB_ICONS.requests, route: '/(tabs)/requests', isLandingPage: landingPage === 'requests' }
        : null;
    }
    if (tabId === 'admin') {
      return isAdmin && bottomBarConfig.showAdmin
        ? { id: 'admin', name: 'Admin', icon: TAB_ICONS.admin, route: '/(tabs)/admin', isLandingPage: landingPage === 'admin' }
        : null;
    }
    if (tabId === 'settings') {
      return { id: 'settings', name: 'Settings', icon: TAB_ICONS.settings, route: '/(tabs)/settings', isLandingPage: landingPage === 'settings' };
    }

    const library = libraries?.find((l) => l.Id === tabId);
    if (library) {
      const screenName = getLibraryScreenName(library.CollectionType);
      return bottomBarConfig.selectedLibraryIds.includes(tabId)
        ? { id: screenName, name: library.Name, icon: TAB_ICONS[screenName] || TAB_ICONS.library, route: `/(tabs)/${screenName}`, isLandingPage: landingPage === screenName }
        : null;
    }

    return null;
  };

  const tabs: TabConfig[] = [];
  const usedScreenNames = new Set<string>();

  for (const tabId of tabOrder) {
    const config = getTabConfig(tabId);
    if (config && !usedScreenNames.has(config.id)) {
      tabs.push(config);
      usedScreenNames.add(config.id);
    }
  }

  const isTabActive = (route: string, tabId: string) => {
    if (!pathname) return false;
    const tabPath = route.replace('/(tabs)/', '');
    return pathname.startsWith(`/(tabs)/${tabPath}`) || pathname === `/${tabPath}`;
  };

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height,
        backgroundColor: colors.background.primary,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        borderTopWidth: 0.5,
        flexDirection: 'row',
        paddingBottom: insets.bottom + 6,
        paddingTop: 6,
      }}
    >
      {tabs.map((tab) => {
        const isActive = isTabActive(tab.route, tab.id);

        return (
          <NavTab
            key={tab.id}
            icon={tab.icon}
            name={tab.name}
            isActive={isActive}
            isLandingPage={tab.isLandingPage}
            accentColor={accentColor}
            onPress={() => router.replace(tab.route as any)}
          />
        );
      })}
    </View>
  );
}
