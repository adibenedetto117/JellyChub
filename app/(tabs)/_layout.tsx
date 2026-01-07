import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/theme';
import { useSettingsStore, useAuthStore } from '@/stores';
import { selectHasJellyseerr, DEFAULT_TAB_ORDER, type TabId } from '@/stores/settingsStore';
import { getLibraries } from '@/api';
import { isTV, platformSelect } from '@/utils/platform';
import type { Library } from '@/types/jellyfin';

interface TabIconProps {
  name: string;
  focused: boolean;
  accentColor: string;
  isLandingPage?: boolean;
}

function TabIcon({ name, focused, accentColor, isLandingPage }: TabIconProps) {
  const icons: Record<string, string> = {
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

  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          fontSize: 20,
          color: focused ? accentColor : colors.text.tertiary,
          opacity: focused ? 1 : 0.6,
          textAlign: 'center',
        }}
      >
        {icons[name] ?? '?'}
      </Text>
      {isLandingPage && !focused && (
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
  );
}

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

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomBarConfig = useSettingsStore((s) => s.bottomBarConfig);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const offlineMode = useSettingsStore((s) => s.offlineMode);
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.Id ?? '';
  const isAdmin = (currentUser as { Policy?: { IsAdministrator?: boolean } })?.Policy?.IsAdministrator ?? false;
  const baseTabBarHeight = platformSelect({ mobile: 56, tablet: 52, tv: 0 });
  const tabBarHeight = baseTabBarHeight + insets.bottom;

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId && !offlineMode,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const selectedLibraries = libraries?.filter((lib) =>
    bottomBarConfig.selectedLibraryIds.includes(lib.Id)
  ) ?? [];

  const hasSelectedType = (type: string) =>
    selectedLibraries.some((lib) => lib.CollectionType === type);

  const getLibraryTitle = (type: string, defaultTitle: string) => {
    const lib = selectedLibraries.find((l) => l.CollectionType === type);
    return lib?.Name ?? defaultTitle;
  };

  const tabOrder = bottomBarConfig.tabOrder?.length > 0 ? bottomBarConfig.tabOrder : DEFAULT_TAB_ORDER;

  const landingPage = bottomBarConfig.landingPage ?? 'home';

  const getTabConfig = (tabId: TabId): TabConfig | null => {
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
    if (tabId === 'requests') {
      return {
        name: 'requests',
        title: 'Requests',
        iconName: 'requests',
        href: hasJellyseerr && bottomBarConfig.showRequests ? undefined : null,
        isLandingPage: landingPage === 'requests',
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
  };

  const orderedTabs: TabConfig[] = [];
  const usedScreenNames = new Set<string>();

  for (const tabId of tabOrder) {
    const config = getTabConfig(tabId);
    if (config && !usedScreenNames.has(config.name)) {
      orderedTabs.push(config);
      usedScreenNames.add(config.name);
    }
  }

  const allScreenNames = ['home', 'search', 'library', 'movies', 'shows', 'music', 'books', 'downloads', 'requests', 'admin', 'settings'];
  for (const name of allScreenNames) {
    if (!usedScreenNames.has(name)) {
      orderedTabs.push({
        name,
        title: name.charAt(0).toUpperCase() + name.slice(1),
        iconName: name,
        href: null,
        isLandingPage: landingPage === name,
      });
      usedScreenNames.add(name);
    }
  }

  if (isTV) {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          lazy: true,
        }}
      >
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
        <Tabs.Screen name="details/[type]/[id]" options={{ href: null }} />
        <Tabs.Screen name="playlist/[id]" options={{ href: null }} />
        <Tabs.Screen name="library/[id]" options={{ href: null }} />
        <Tabs.Screen name="favorites" options={{ href: null }} />
        <Tabs.Screen name="jellyseerr/[type]/[tmdbId]" options={{ href: null }} />
        <Tabs.Screen name="jellyseerr/genre/[type]/[id]" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: { display: 'none' },
      }}
    >
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
      <Tabs.Screen name="details/[type]/[id]" options={{ href: null }} />
      <Tabs.Screen name="playlist/[id]" options={{ href: null }} />
      <Tabs.Screen name="library/[id]" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="jellyseerr/[type]/[tmdbId]" options={{ href: null }} />
      <Tabs.Screen name="jellyseerr/genre/[type]/[id]" options={{ href: null }} />
    </Tabs>
  );
}
