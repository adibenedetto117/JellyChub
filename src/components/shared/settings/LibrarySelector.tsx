import { View, Text, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useSettingsStore, MAX_LIBRARY_TABS } from '@/stores';
import {
  selectHasJellyseerr,
  DEFAULT_TAB_ORDER,
  DEFAULT_BOTTOM_BAR_CONFIG,
  type TabId,
} from '@/stores/settingsStore';
import { getLibraries, getLibraryIcon } from '@/api';
import type { Library } from '@/types/jellyfin';
import {
  TabPlacementRow,
  TabVisibilityToggle,
  TabOrderList,
  type TabPlacement,
} from './bottom-bar';

function getLibraryScreenName(collectionType: Library['CollectionType']): string {
  switch (collectionType) {
    case 'movies':
      return 'movies';
    case 'tvshows':
      return 'shows';
    case 'music':
      return 'music';
    case 'books':
    case 'audiobooks':
      return 'books';
    default:
      return 'library';
  }
}

export function LibrarySelector() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.Id ?? '';
  const isAdmin =
    (currentUser as { Policy?: { IsAdministrator?: boolean } })?.Policy?.IsAdministrator ?? false;
  const accentColor = useSettingsStore((s) => s.accentColor);
  const rawBottomBarConfig = useSettingsStore((s) => s.bottomBarConfig);
  const setBottomBarConfig = useSettingsStore((s) => s.setBottomBarConfig);
  const moveTabInOrder = useSettingsStore((s) => s.moveTabInOrder);
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const radarrUrl = useSettingsStore((s) => s.radarrUrl);
  const radarrApiKey = useSettingsStore((s) => s.radarrApiKey);
  const sonarrUrl = useSettingsStore((s) => s.sonarrUrl);
  const sonarrApiKey = useSettingsStore((s) => s.sonarrApiKey);

  const hasRadarr = !!(radarrUrl && radarrApiKey);
  const hasSonarr = !!(sonarrUrl && sonarrApiKey);

  const { data: libraries, isLoading } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
  });

  const browsableLibraries =
    libraries?.filter((lib) => {
      const excludeTypes = ['boxsets', 'playlists'];
      if (lib.CollectionType && excludeTypes.includes(lib.CollectionType)) {
        return false;
      }
      return true;
    }) ?? [];

  const hasLiveTV = libraries?.some((lib) => lib.CollectionType === 'livetv') ?? false;

  const bottomBarConfig = {
    ...DEFAULT_BOTTOM_BAR_CONFIG,
    ...rawBottomBarConfig,
    selectedLibraryIds: rawBottomBarConfig?.selectedLibraryIds ?? [],
    tabOrder: rawBottomBarConfig?.tabOrder ?? DEFAULT_TAB_ORDER,
    moreMenuTabs: rawBottomBarConfig?.moreMenuTabs ?? DEFAULT_BOTTOM_BAR_CONFIG.moreMenuTabs,
    landingPage: rawBottomBarConfig?.landingPage ?? 'home',
  };

  const selectedCount = bottomBarConfig.selectedLibraryIds.length;

  const getVisibleTabsInOrder = (): TabId[] => {
    const tabOrder = bottomBarConfig.tabOrder?.length > 0 ? bottomBarConfig.tabOrder : DEFAULT_TAB_ORDER;

    return tabOrder.filter((tabId) => {
      if (tabId === 'home') return bottomBarConfig.showHome;
      if (tabId === 'library') return bottomBarConfig.showLibrary;
      if (tabId === 'downloads') return bottomBarConfig.showDownloads;
      if (tabId === 'jellyseerr') return hasJellyseerr && bottomBarConfig.showJellyseerr;
      if (tabId === 'admin') return isAdmin && bottomBarConfig.showAdmin;
      if (tabId === 'radarr') return hasRadarr && bottomBarConfig.showRadarr;
      if (tabId === 'sonarr') return hasSonarr && bottomBarConfig.showSonarr;
      if (tabId === 'favorites') return bottomBarConfig.showFavorites;
      if (tabId === 'livetv') return hasLiveTV && bottomBarConfig.showLiveTV;
      if (tabId === 'more') return bottomBarConfig.showMore ?? true;
      if (tabId === 'settings') return true;
      return bottomBarConfig.selectedLibraryIds.includes(tabId);
    });
  };

  const handleSetLandingPage = (tabId: TabId) => {
    const library = browsableLibraries.find((l) => l.Id === tabId);
    const landingPageValue = library ? getLibraryScreenName(library.CollectionType) : tabId;
    setBottomBarConfig({ landingPage: landingPageValue });
  };

  const getLandingPageValue = (tabId: TabId): string => {
    const library = browsableLibraries.find((l) => l.Id === tabId);
    return library ? getLibraryScreenName(library.CollectionType) : tabId;
  };

  const getTabPlacement = (tabId: string, showKey: string): TabPlacement => {
    const isInMore = bottomBarConfig.moreMenuTabs.includes(tabId);
    if (isInMore) return 'more';
    const showValue = (bottomBarConfig as Record<string, unknown>)[showKey];
    const isInTabOrder = bottomBarConfig.tabOrder.includes(tabId);
    if (showValue && isInTabOrder) return 'bottomBar';
    return 'hidden';
  };

  const setTabPlacement = (tabId: string, showKey: string, placement: TabPlacement) => {
    const currentMoreTabs = bottomBarConfig.moreMenuTabs.filter((t) => t !== tabId);
    const currentTabOrder = bottomBarConfig.tabOrder.filter((t) => t !== tabId);

    if (placement === 'more') {
      setBottomBarConfig({
        [showKey]: false,
        moreMenuTabs: [...currentMoreTabs, tabId],
        tabOrder: currentTabOrder,
      });
    } else if (placement === 'bottomBar') {
      const settingsIndex = currentTabOrder.indexOf('settings');
      const newTabOrder = [...currentTabOrder];
      if (settingsIndex !== -1) {
        newTabOrder.splice(settingsIndex, 0, tabId);
      } else {
        newTabOrder.push(tabId);
      }
      setBottomBarConfig({
        [showKey]: true,
        moreMenuTabs: currentMoreTabs,
        tabOrder: newTabOrder,
      });
    } else {
      setBottomBarConfig({
        [showKey]: false,
        moreMenuTabs: currentMoreTabs,
        tabOrder: currentTabOrder,
      });
    }
  };

  const handleLibraryPlacementChange = (library: Library, placement: TabPlacement) => {
    const currentMoreTabs = bottomBarConfig.moreMenuTabs.filter((t) => t !== library.Id);
    const currentSelectedIds = bottomBarConfig.selectedLibraryIds.filter((id) => id !== library.Id);
    const currentTabOrder = bottomBarConfig.tabOrder.filter((t) => t !== library.Id);

    if (placement === 'more') {
      setBottomBarConfig({
        selectedLibraryIds: currentSelectedIds,
        moreMenuTabs: [...currentMoreTabs, library.Id],
        tabOrder: currentTabOrder,
      });
    } else if (placement === 'bottomBar') {
      if (currentSelectedIds.length >= MAX_LIBRARY_TABS) {
        return;
      }
      const settingsIndex = currentTabOrder.indexOf('settings');
      const newTabOrder = [...currentTabOrder];
      if (settingsIndex !== -1) {
        newTabOrder.splice(settingsIndex, 0, library.Id);
      } else {
        newTabOrder.push(library.Id);
      }
      setBottomBarConfig({
        selectedLibraryIds: [...currentSelectedIds, library.Id],
        moreMenuTabs: currentMoreTabs,
        tabOrder: newTabOrder,
      });
    } else {
      setBottomBarConfig({
        selectedLibraryIds: currentSelectedIds,
        moreMenuTabs: currentMoreTabs,
        tabOrder: currentTabOrder,
      });
    }
  };

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  return (
    <View>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 }}>
        Choose where each tab appears: Bottom Bar, More menu, or Hidden.
      </Text>

      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            fontWeight: '600',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Tabs
        </Text>
        <TabPlacementRow
          icon="home"
          title="Home"
          placement={getTabPlacement('home', 'showHome')}
          accentColor={accentColor}
          onPlacementChange={(p) => setTabPlacement('home', 'showHome', p)}
        />
        <TabPlacementRow
          icon="library"
          title="Library"
          placement={getTabPlacement('library', 'showLibrary')}
          accentColor={accentColor}
          onPlacementChange={(p) => setTabPlacement('library', 'showLibrary', p)}
        />
        <TabPlacementRow
          icon="download"
          title="Downloads"
          placement={getTabPlacement('downloads', 'showDownloads')}
          accentColor={accentColor}
          onPlacementChange={(p) => setTabPlacement('downloads', 'showDownloads', p)}
        />
        <TabPlacementRow
          icon="heart"
          title="Favorites"
          placement={getTabPlacement('favorites', 'showFavorites')}
          accentColor={accentColor}
          onPlacementChange={(p) => setTabPlacement('favorites', 'showFavorites', p)}
        />
        {hasJellyseerr && (
          <TabPlacementRow
            icon="star"
            title="Jellyseerr"
            placement={getTabPlacement('jellyseerr', 'showJellyseerr')}
            accentColor={accentColor}
            onPlacementChange={(p) => setTabPlacement('jellyseerr', 'showJellyseerr', p)}
          />
        )}
        {hasRadarr && (
          <TabPlacementRow
            icon="film"
            title="Radarr"
            placement={getTabPlacement('radarr', 'showRadarr')}
            accentColor={accentColor}
            onPlacementChange={(p) => setTabPlacement('radarr', 'showRadarr', p)}
          />
        )}
        {hasSonarr && (
          <TabPlacementRow
            icon="tv"
            title="Sonarr"
            placement={getTabPlacement('sonarr', 'showSonarr')}
            accentColor={accentColor}
            onPlacementChange={(p) => setTabPlacement('sonarr', 'showSonarr', p)}
          />
        )}
        {hasLiveTV && (
          <TabPlacementRow
            icon="radio"
            title="Live TV"
            placement={getTabPlacement('livetv', 'showLiveTV')}
            accentColor={accentColor}
            onPlacementChange={(p) => setTabPlacement('livetv', 'showLiveTV', p)}
          />
        )}
        {isAdmin && (
          <TabPlacementRow
            icon="shield"
            title="Admin"
            placement={getTabPlacement('admin', 'showAdmin')}
            accentColor={accentColor}
            onPlacementChange={(p) => setTabPlacement('admin', 'showAdmin', p)}
          />
        )}
        <TabVisibilityToggle
          icon="more"
          title="More"
          subtitle="Additional tabs in a popup menu"
          isSelected={bottomBarConfig.showMore ?? true}
          accentColor={accentColor}
          onToggle={() => setBottomBarConfig({ showMore: !(bottomBarConfig.showMore ?? true) })}
        />
      </View>

      <View>
        <Text
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            fontWeight: '600',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Libraries
        </Text>
        {browsableLibraries.map((library) => {
          const iconName = getLibraryIcon(library.CollectionType);
          const isOnBar = bottomBarConfig.selectedLibraryIds.includes(library.Id);
          const isInMore = bottomBarConfig.moreMenuTabs.includes(library.Id);
          const placement: TabPlacement = isInMore ? 'more' : isOnBar ? 'bottomBar' : 'hidden';

          return (
            <TabPlacementRow
              key={library.Id}
              icon={iconName}
              title={library.Name}
              placement={placement}
              accentColor={accentColor}
              onPlacementChange={(p) => handleLibraryPlacementChange(library, p)}
            />
          );
        })}
        {browsableLibraries.length === 0 && (
          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 14,
              paddingVertical: 16,
              textAlign: 'center',
            }}
          >
            No libraries found
          </Text>
        )}
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 8 }}>
          Max {MAX_LIBRARY_TABS} libraries on bottom bar ({selectedCount}/{MAX_LIBRARY_TABS} used)
        </Text>
      </View>

      <TabOrderList
        visibleTabs={getVisibleTabsInOrder()}
        libraries={browsableLibraries}
        landingPage={bottomBarConfig.landingPage}
        accentColor={accentColor}
        onMoveTab={moveTabInOrder}
        onSetLandingPage={handleSetLandingPage}
        getLandingPageValue={getLandingPageValue}
      />

      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 }}>
        Settings tab is always available.
      </Text>
    </View>
  );
}
