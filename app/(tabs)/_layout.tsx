import { useMemo, useCallback, memo } from 'react';
import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/theme';
import { useSettingsStore, useAuthStore } from '@/stores';
import { selectHasJellyseerr, DEFAULT_TAB_ORDER, type TabId } from '@/stores/settingsStore';
import { getLibraries } from '@/api';
import { isTV } from '@/utils/platform';
import type { Library } from '@/types/jellyfin';

// Static icon mapping - defined outside component to avoid recreation
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
  livetv: '\u25CE',
};

interface TabIconProps {
  name: string;
  focused: boolean;
  accentColor: string;
  isLandingPage?: boolean;
}

// Memoized TabIcon component to prevent unnecessary re-renders
const TabIcon = memo(function TabIcon({ name, focused, accentColor, isLandingPage }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <Text
        style={[
          styles.tabIconText,
          { color: focused ? accentColor : colors.text.tertiary },
          { opacity: focused ? 1 : 0.6 },
        ]}
      >
        {TAB_ICONS[name] ?? '?'}
      </Text>
      {isLandingPage && !focused && (
        <View style={[styles.landingIndicator, { backgroundColor: accentColor }]} />
      )}
    </View>
  );
});

interface TabConfig {
  name: string;
  title: string;
  iconName: string;
  href: undefined | null;
  isLandingPage: boolean;
}

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

// Screen options configured statically to avoid recreation
const SCREEN_OPTIONS = {
  headerShown: false,
  lazy: true,
  unmountOnBlur: true, // Unmount inactive tabs to free memory and stop queries
  tabBarStyle: { display: 'none' } as const,
  animation: 'none' as const, // Disable animation for instant tab switches
  freezeOnBlur: true, // Freeze inactive screens to prevent re-renders
} as const;

const TV_SCREEN_OPTIONS = {
  ...SCREEN_OPTIONS,
} as const;

// All possible screen names for consistent tab ordering
const ALL_SCREEN_NAMES = ['home', 'search', 'library', 'movies', 'shows', 'music', 'books', 'livetv', 'downloads', 'requests', 'admin', 'settings'];

export default function TabLayout() {
  const bottomBarConfig = useSettingsStore((s) => s.bottomBarConfig);
  const offlineMode = useSettingsStore((s) => s.offlineMode);
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.Id ?? '';
  const isAdmin = useMemo(
    () => (currentUser as { Policy?: { IsAdministrator?: boolean } })?.Policy?.IsAdministrator ?? false,
    [currentUser]
  );

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId && !offlineMode,
    staleTime: Infinity,
  });

  // Memoize selected libraries computation
  const selectedLibraries = useMemo(
    () => libraries?.filter((lib) => bottomBarConfig.selectedLibraryIds.includes(lib.Id)) ?? [],
    [libraries, bottomBarConfig.selectedLibraryIds]
  );

  // Memoize tab order
  const tabOrder = useMemo(
    () => bottomBarConfig.tabOrder?.length > 0 ? bottomBarConfig.tabOrder : DEFAULT_TAB_ORDER,
    [bottomBarConfig.tabOrder]
  );

  const landingPage = bottomBarConfig.landingPage ?? 'home';

  // Memoize getTabConfig to prevent recreation on every render
  const getTabConfig = useCallback((tabId: TabId): TabConfig | null => {
    // In offline mode, only show downloads and settings
    if (offlineMode) {
      if (tabId === 'downloads') {
        return {
          name: 'downloads',
          title: 'Downloads',
          iconName: 'downloads',
          href: undefined,
          isLandingPage: true,
        };
      }
      if (tabId === 'settings') {
        return {
          name: 'settings',
          title: 'Settings',
          iconName: 'settings',
          href: undefined,
          isLandingPage: false,
        };
      }
      // Hide all other tabs in offline mode
      return null;
    }

    if (tabId === 'home') {
      return {
        name: 'home',
        title: 'Home',
        iconName: 'home',
        href: bottomBarConfig.showHome ? undefined : null,
        isLandingPage: landingPage === 'home',
      };
    }
    if (tabId === 'search') {
      return {
        name: 'search',
        title: 'Search',
        iconName: 'search',
        href: null,
        isLandingPage: landingPage === 'search',
      };
    }
    if (tabId === 'library') {
      return {
        name: 'library',
        title: 'Library',
        iconName: 'library',
        href: undefined,
        isLandingPage: landingPage === 'library',
      };
    }
    if (tabId === 'downloads') {
      return {
        name: 'downloads',
        title: 'Downloads',
        iconName: 'downloads',
        href: bottomBarConfig.showDownloads ? undefined : null,
        isLandingPage: landingPage === 'downloads',
      };
    }
    if (tabId === 'jellyseerr' || tabId === 'requests') {
      return {
        name: 'requests',
        title: 'Jellyseerr',
        iconName: 'requests',
        href: hasJellyseerr && bottomBarConfig.showJellyseerr ? undefined : null,
        isLandingPage: landingPage === 'requests' || landingPage === 'jellyseerr',
      };
    }
    if (tabId === 'admin') {
      return {
        name: 'admin',
        title: 'Admin',
        iconName: 'admin',
        href: isAdmin && bottomBarConfig.showAdmin ? undefined : null,
        isLandingPage: landingPage === 'admin',
      };
    }
    if (tabId === 'settings') {
      return {
        name: 'settings',
        title: 'Settings',
        iconName: 'settings',
        href: undefined,
        isLandingPage: landingPage === 'settings',
      };
    }
    if (tabId === 'livetv') {
      return {
        name: 'livetv',
        title: 'Live TV',
        iconName: 'livetv',
        href: undefined,
        isLandingPage: landingPage === 'livetv',
      };
    }

    const library = libraries?.find((l) => l.Id === tabId);
    if (library) {
      const screenName = getLibraryScreenName(library.CollectionType);
      return {
        name: screenName,
        title: library.Name,
        iconName: screenName,
        href: bottomBarConfig.selectedLibraryIds.includes(tabId) ? undefined : null,
        isLandingPage: landingPage === screenName,
      };
    }

    return null;
  }, [offlineMode, bottomBarConfig, landingPage, hasJellyseerr, isAdmin, libraries]);

  // Memoize the entire orderedTabs computation to prevent recalculation on every render
  const orderedTabs = useMemo(() => {
    const tabs: TabConfig[] = [];
    const usedScreenNames = new Set<string>();

    for (const tabId of tabOrder) {
      const config = getTabConfig(tabId);
      if (config && !usedScreenNames.has(config.name)) {
        tabs.push(config);
        usedScreenNames.add(config.name);
      }
    }

    // Fill in remaining screens that weren't in the tab order
    for (const name of ALL_SCREEN_NAMES) {
      if (!usedScreenNames.has(name)) {
        tabs.push({
          name,
          title: name.charAt(0).toUpperCase() + name.slice(1),
          iconName: name,
          href: null,
          isLandingPage: landingPage === name,
        });
        usedScreenNames.add(name);
      }
    }

    return tabs;
  }, [tabOrder, getTabConfig, landingPage]);

  if (isTV) {
    return (
      <Tabs screenOptions={TV_SCREEN_OPTIONS}>
        <Tabs.Screen name="home" />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="library" />
        <Tabs.Screen name="downloads" />
        <Tabs.Screen name="requests" options={{ href: hasJellyseerr ? undefined : null }} />
        <Tabs.Screen name="admin" options={{ href: isAdmin ? undefined : null }} />
        <Tabs.Screen name="settings" />
        <Tabs.Screen name="movies" options={{ href: null }} />
        <Tabs.Screen name="shows" options={{ href: null }} />
        <Tabs.Screen name="music" options={{ href: null }} />
        <Tabs.Screen name="books" options={{ href: null }} />
        <Tabs.Screen name="livetv" />
        <Tabs.Screen name="details/[type]/[id]" options={{ href: null }} />
        <Tabs.Screen name="playlist/[id]" options={{ href: null }} />
        <Tabs.Screen name="library/[id]" options={{ href: null }} />
        <Tabs.Screen name="favorites" options={{ href: null }} />
        <Tabs.Screen name="jellyseerr/[type]/[tmdbId]" options={{ href: null }} />
        <Tabs.Screen name="jellyseerr/genre/[type]/[id]" options={{ href: null }} />
        <Tabs.Screen name="queue" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <Tabs screenOptions={SCREEN_OPTIONS}>
      {orderedTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            href: tab.href,
          }}
        />
      ))}
      {/* Detail screens hidden from tab bar but accessible via navigation */}
      <Tabs.Screen name="details/[type]/[id]" options={{ href: null }} />
      <Tabs.Screen name="playlist/[id]" options={{ href: null }} />
      <Tabs.Screen name="library/[id]" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="jellyseerr/[type]/[tmdbId]" options={{ href: null }} />
      <Tabs.Screen name="jellyseerr/genre/[type]/[id]" options={{ href: null }} />
      <Tabs.Screen name="queue" options={{ href: null }} />
    </Tabs>
  );
}

// Styles moved outside component to prevent recreation on each render
const styles = StyleSheet.create({
  tabIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconText: {
    fontSize: 20,
    textAlign: 'center',
  },
  landingIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
