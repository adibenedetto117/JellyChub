import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useSettingsStore, MAX_LIBRARY_TABS } from '@/stores';
import { selectHasJellyseerr, DEFAULT_TAB_ORDER, DEFAULT_BOTTOM_BAR_CONFIG, type TabId } from '@/stores/settingsStore';
import { getLibraries, getLibraryIcon } from '@/api';
import { colors } from '@/theme';
import type { Library } from '@/types/jellyfin';

const ICON_MAP: Record<string, string> = {
  film: '\u25B6',
  tv: '\u25A3',
  'musical-notes': '\u266B',
  videocam: '\u25B6',
  book: '\u25AF',
  headset: '\u266B',
  home: '\u2302',
  folder: '\u25A6',
  list: '\u2630',
  library: '\u25A6',
  star: '\u2606',
  shield: '\u2318',
  download: '\u2193',
  search: '\u26B2',
  settings: '\u2699',
};

interface SpecialRowProps {
  icon: string;
  title: string;
  subtitle: string;
  isSelected: boolean;
  accentColor: string;
  onToggle: () => void;
}

function SpecialRow({ icon, title, subtitle, isSelected, accentColor, onToggle }: SpecialRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface.default }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: isSelected ? accentColor : 'rgba(255,255,255,0.1)',
        }}
      >
        <Text style={{ fontSize: 18, color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)' }}>
          {ICON_MAP[icon] ?? '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{title}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{subtitle}</Text>
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.3)',
          backgroundColor: isSelected ? accentColor : 'transparent',
        }}
      >
        {isSelected && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
      </View>
    </Pressable>
  );
}

interface LibraryRowProps {
  library: Library;
  isSelected: boolean;
  canSelect: boolean;
  accentColor: string;
  onToggle: () => void;
}

function LibraryRow({ library, isSelected, canSelect, accentColor, onToggle }: LibraryRowProps) {
  const iconName = getLibraryIcon(library.CollectionType);

  return (
    <Pressable
      onPress={onToggle}
      disabled={!isSelected && !canSelect}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface.default,
        opacity: !isSelected && !canSelect ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: isSelected ? accentColor : 'rgba(255,255,255,0.1)',
        }}
      >
        <Text style={{ fontSize: 18, color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)' }}>
          {ICON_MAP[iconName] ?? '\u25A6'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{library.Name}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          {library.CollectionType ? library.CollectionType.charAt(0).toUpperCase() + library.CollectionType.slice(1) : 'Mixed'}
        </Text>
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.3)',
          backgroundColor: isSelected ? accentColor : 'transparent',
        }}
      >
        {isSelected && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
      </View>
    </Pressable>
  );
}

interface OrderableRowProps {
  icon: string;
  title: string;
  accentColor: string;
  isLandingPage: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetLandingPage: () => void;
}

function OrderableRow({
  icon,
  title,
  accentColor,
  isLandingPage,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onSetLandingPage,
}: OrderableRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface.default,
      }}
    >
      <Pressable
        onPress={onSetLandingPage}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: isLandingPage ? accentColor : 'rgba(255,255,255,0.1)',
        }}
      >
        <Text style={{ fontSize: 16, color: isLandingPage ? '#fff' : 'rgba(255,255,255,0.6)' }}>
          {ICON_MAP[icon] ?? '?'}
        </Text>
      </Pressable>
      <Pressable onPress={onSetLandingPage} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{title}</Text>
          {isLandingPage && (
            <View
              style={{
                marginLeft: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
                backgroundColor: accentColor + '30',
                borderRadius: 4,
              }}
            >
              <Text style={{ color: accentColor, fontSize: 10, fontWeight: '600' }}>START</Text>
            </View>
          )}
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={onMoveUp}
          disabled={!canMoveUp}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canMoveUp ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
          }}
        >
          <Text style={{ color: canMoveUp ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 16 }}>{'\u2191'}</Text>
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={!canMoveDown}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canMoveDown ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
          }}
        >
          <Text style={{ color: canMoveDown ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 16 }}>{'\u2193'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const CORE_TAB_INFO: Record<string, { icon: string; title: string }> = {
  home: { icon: 'home', title: 'Home' },
  search: { icon: 'search', title: 'Search' },
  library: { icon: 'library', title: 'Library' },
  downloads: { icon: 'download', title: 'Downloads' },
  requests: { icon: 'star', title: 'Requests' },
  admin: { icon: 'shield', title: 'Admin' },
  settings: { icon: 'settings', title: 'Settings' },
};

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

export function LibrarySelector() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.Id ?? '';
  const isAdmin = (currentUser as { Policy?: { IsAdministrator?: boolean } })?.Policy?.IsAdministrator ?? false;
  const accentColor = useSettingsStore((s) => s.accentColor);
  const rawBottomBarConfig = useSettingsStore((s) => s.bottomBarConfig);
  const setBottomBarConfig = useSettingsStore((s) => s.setBottomBarConfig);
  const toggleLibraryOnBottomBar = useSettingsStore((s) => s.toggleLibraryOnBottomBar);
  const moveTabInOrder = useSettingsStore((s) => s.moveTabInOrder);
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);

  const bottomBarConfig = {
    ...DEFAULT_BOTTOM_BAR_CONFIG,
    ...rawBottomBarConfig,
    selectedLibraryIds: rawBottomBarConfig?.selectedLibraryIds ?? [],
    tabOrder: rawBottomBarConfig?.tabOrder ?? DEFAULT_TAB_ORDER,
    landingPage: rawBottomBarConfig?.landingPage ?? 'home',
  };

  const { data: libraries, isLoading } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
  });

  const browsableLibraries = libraries?.filter((lib) => {
    const excludeTypes = ['boxsets', 'playlists'];
    if (lib.CollectionType && excludeTypes.includes(lib.CollectionType)) {
      return false;
    }
    return true;
  }) ?? [];

  const selectedCount = bottomBarConfig.selectedLibraryIds.length;
  const canSelectMore = selectedCount < MAX_LIBRARY_TABS;

  const getVisibleTabsInOrder = (): TabId[] => {
    const tabOrder = bottomBarConfig.tabOrder?.length > 0 ? bottomBarConfig.tabOrder : DEFAULT_TAB_ORDER;

    return tabOrder.filter((tabId) => {
      if (tabId === 'home') return bottomBarConfig.showHome;
      if (tabId === 'library') return bottomBarConfig.showLibrary;
      if (tabId === 'downloads') return bottomBarConfig.showDownloads;
      if (tabId === 'requests') return hasJellyseerr && bottomBarConfig.showRequests;
      if (tabId === 'admin') return isAdmin && bottomBarConfig.showAdmin;
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
        Choose which tabs appear on the bottom bar. Only Settings is always visible.
      </Text>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 }}>
          Core Tabs
        </Text>
        <SpecialRow
          icon="home"
          title="Home"
          subtitle="Continue watching, recommendations"
          isSelected={bottomBarConfig.showHome}
          accentColor={accentColor}
          onToggle={() => setBottomBarConfig({ showHome: !bottomBarConfig.showHome })}
        />
        <SpecialRow
          icon="library"
          title="Library"
          subtitle="Browse all your libraries"
          isSelected={bottomBarConfig.showLibrary}
          accentColor={accentColor}
          onToggle={() => setBottomBarConfig({ showLibrary: !bottomBarConfig.showLibrary })}
        />
        <SpecialRow
          icon="download"
          title="Downloads"
          subtitle="Offline content"
          isSelected={bottomBarConfig.showDownloads}
          accentColor={accentColor}
          onToggle={() => setBottomBarConfig({ showDownloads: !bottomBarConfig.showDownloads })}
        />
        {hasJellyseerr && (
          <SpecialRow
            icon="star"
            title="Requests"
            subtitle="Jellyseerr media requests"
            isSelected={bottomBarConfig.showRequests}
            accentColor={accentColor}
            onToggle={() => setBottomBarConfig({ showRequests: !bottomBarConfig.showRequests })}
          />
        )}
        {isAdmin && (
          <SpecialRow
            icon="shield"
            title="Admin"
            subtitle="Server administration"
            isSelected={bottomBarConfig.showAdmin}
            accentColor={accentColor}
            onToggle={() => setBottomBarConfig({ showAdmin: !bottomBarConfig.showAdmin })}
          />
        )}
      </View>

      <View>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 }}>
          Libraries ({selectedCount}/{MAX_LIBRARY_TABS} on bottom bar)
        </Text>
        {browsableLibraries.map((library) => {
          const isSelected = bottomBarConfig.selectedLibraryIds.includes(library.Id);
          return (
            <LibraryRow
              key={library.Id}
              library={library}
              isSelected={isSelected}
              canSelect={canSelectMore}
              accentColor={accentColor}
              onToggle={() => toggleLibraryOnBottomBar(library.Id)}
            />
          );
        })}
        {browsableLibraries.length === 0 && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, paddingVertical: 16, textAlign: 'center' }}>
            No libraries found
          </Text>
        )}
      </View>

      <View style={{ marginTop: 24 }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 }}>
          Tab Order and Landing Page
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 }}>
          Use arrows to reorder. Tap a tab to set it as your landing page after login.
        </Text>
        {getVisibleTabsInOrder().map((tabId, index, arr) => {
          const coreInfo = CORE_TAB_INFO[tabId];
          const library = browsableLibraries.find((l) => l.Id === tabId);

          if (!coreInfo && !library) return null;

          const icon = coreInfo?.icon ?? getLibraryIcon(library?.CollectionType);
          const title = coreInfo?.title ?? library?.Name ?? tabId;
          const landingPageValue = getLandingPageValue(tabId);
          const isLandingPage = bottomBarConfig.landingPage === landingPageValue;

          return (
            <OrderableRow
              key={tabId}
              icon={icon}
              title={title}
              accentColor={accentColor}
              isLandingPage={isLandingPage}
              canMoveUp={index > 0}
              canMoveDown={index < arr.length - 1}
              onMoveUp={() => moveTabInOrder(tabId, 'up')}
              onMoveDown={() => moveTabInOrder(tabId, 'down')}
              onSetLandingPage={() => handleSetLandingPage(tabId)}
            />
          );
        })}
      </View>

      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 }}>
        Settings tab is always available.
      </Text>
    </View>
  );
}
