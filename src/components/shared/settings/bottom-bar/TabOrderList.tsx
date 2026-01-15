import { View, Text } from 'react-native';
import { TabItem } from './TabItem';
import { getLibraryIcon } from '@/api';
import type { Library } from '@/types/jellyfin';
import type { TabId } from '@/stores/settingsStore';

export const CORE_TAB_INFO: Record<string, { icon: string; title: string }> = {
  home: { icon: 'home', title: 'Home' },
  search: { icon: 'search', title: 'Search' },
  library: { icon: 'library', title: 'Library' },
  downloads: { icon: 'download', title: 'Downloads' },
  jellyseerr: { icon: 'star', title: 'Jellyseerr' },
  admin: { icon: 'shield', title: 'Admin' },
  radarr: { icon: 'film', title: 'Radarr' },
  sonarr: { icon: 'tv', title: 'Sonarr' },
  favorites: { icon: 'heart', title: 'Favorites' },
  livetv: { icon: 'radio', title: 'Live TV' },
  more: { icon: 'more', title: 'More' },
  settings: { icon: 'settings', title: 'Settings' },
};

interface TabOrderListProps {
  visibleTabs: TabId[];
  libraries: Library[];
  landingPage: string;
  accentColor: string;
  onMoveTab: (tabId: TabId, direction: 'up' | 'down') => void;
  onSetLandingPage: (tabId: TabId) => void;
  getLandingPageValue: (tabId: TabId) => string;
}

export function TabOrderList({
  visibleTabs,
  libraries,
  landingPage,
  accentColor,
  onMoveTab,
  onSetLandingPage,
  getLandingPageValue,
}: TabOrderListProps) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text
        style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 11,
          fontWeight: '600',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Tab Order and Landing Page
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 }}>
        Use arrows to reorder. Tap a tab to set it as your landing page after login.
      </Text>
      {visibleTabs.map((tabId, index, arr) => {
        const coreInfo = CORE_TAB_INFO[tabId];
        const library = libraries.find((l) => l.Id === tabId);

        if (!coreInfo && !library) return null;

        const icon = coreInfo?.icon ?? getLibraryIcon(library?.CollectionType);
        const title = coreInfo?.title ?? library?.Name ?? tabId;
        const landingPageValue = getLandingPageValue(tabId);
        const isLandingPage = landingPage === landingPageValue;

        return (
          <TabItem
            key={tabId}
            icon={icon}
            title={title}
            accentColor={accentColor}
            isLandingPage={isLandingPage}
            canMoveUp={index > 0}
            canMoveDown={index < arr.length - 1}
            onMoveUp={() => onMoveTab(tabId, 'up')}
            onMoveDown={() => onMoveTab(tabId, 'down')}
            onSetLandingPage={() => onSetLandingPage(tabId)}
          />
        );
      })}
    </View>
  );
}
