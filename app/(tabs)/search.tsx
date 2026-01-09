import { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore } from '@/stores';
import { search, getImageUrl } from '@/api';
import type { SearchMediaType } from '@/api';
import { CachedImage } from '@/components/ui/CachedImage';
import { SkeletonSearchResults } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks';
import { getDisplayName, getDisplayImageUrl, navigateToDetails } from '@/utils';
import { colors } from '@/theme';
import type { SearchHint } from '@/types/jellyfin';

type FilterType = 'all' | SearchMediaType;

interface FilterOption {
  value: FilterType;
  label: string;
  icon: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All', icon: 'apps-outline' },
  { value: 'Movie', label: 'Movies', icon: 'film-outline' },
  { value: 'Series', label: 'TV Shows', icon: 'tv-outline' },
  { value: 'TvChannel', label: 'Channels', icon: 'radio-outline' },
  { value: 'Program', label: 'Programs', icon: 'calendar-outline' },
  { value: 'Audio', label: 'Music', icon: 'musical-notes-outline' },
  { value: 'MusicAlbum', label: 'Albums', icon: 'disc-outline' },
  { value: 'MusicArtist', label: 'Artists', icon: 'person-outline' },
  { value: 'Book', label: 'Books', icon: 'book-outline' },
  { value: 'AudioBook', label: 'Audiobooks', icon: 'headset-outline' },
];

export default function SearchScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const userId = currentUser?.Id ?? '';

  // Get the currently selected filter option
  const activeFilterOption = FILTER_OPTIONS.find(f => f.value === activeFilter) || FILTER_OPTIONS[0];

  // Handle filter selection from modal
  const handleFilterSelect = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setFilterModalVisible(false);
  }, []);

  // Handle back button press
  const handleBack = () => {
    if (router.canDismiss()) {
      router.dismiss();
    } else {
      router.back();
    }
  };

  // Debounce search query to reduce API calls while typing
  const debouncedQuery = useDebounce(query, 300);

  // Memoize image URL getter
  const getImageForItem = useCallback((item: SearchHint): string | null => {
    let rawImageUrl: string | null = null;
    if (item.PrimaryImageTag) {
      rawImageUrl = getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.PrimaryImageTag });
    } else if (item.AlbumId) {
      rawImageUrl = getImageUrl(item.AlbumId, 'Primary', { maxWidth: 120 });
    } else if (item.SeriesId) {
      rawImageUrl = getImageUrl(item.SeriesId, 'Primary', { maxWidth: 120 });
    } else {
      rawImageUrl = getImageUrl(item.Id, 'Primary', { maxWidth: 120 });
    }
    return getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  }, [hideMedia]);

  const searchOptions = useMemo(() => ({
    limit: 50,
    includeItemTypes: activeFilter !== 'all' ? [activeFilter as SearchMediaType] : undefined,
  }), [activeFilter]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', userId, debouncedQuery, activeFilter],
    queryFn: () => search(userId, debouncedQuery, searchOptions),
    enabled: !!userId && debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes for search results
  });

  const results = data?.SearchHints ?? [];

  // Memoize navigation handler
  const handleItemPress = useCallback((item: SearchHint) => {
    const itemType = item.Type.toLowerCase();
    if (itemType === 'audio') {
      router.push(`/player/music?itemId=${item.Id}`);
    } else if (itemType === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (itemType === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else if (itemType === 'musicartist') {
      navigateToDetails('artist', item.Id, '/(tabs)/search');
    } else if (itemType === 'musicalbum') {
      navigateToDetails('album', item.Id, '/(tabs)/search');
    } else if (itemType === 'tvchannel') {
      // Navigate to live TV player with channel selected
      router.push(`/player/livetv?channelId=${item.Id}`);
    } else if (itemType === 'program') {
      // Programs are Live TV items - navigate to the channel player
      // Use ChannelId from the program if available, otherwise use the item Id
      const channelId = (item as any).ChannelId || item.Id;
      router.push(`/player/livetv?channelId=${channelId}`);
    } else {
      navigateToDetails(itemType, item.Id, '/(tabs)/search');
    }
  }, []);

  // Memoize label getter
  const getLabel = useCallback((item: SearchHint) => {
    const itemType = (item.Type || '').toLowerCase();
    switch (itemType) {
      case 'musicartist': return t('search.artistLabel');
      case 'musicalbum': return item.AlbumArtist ? t('search.albumBy', { artist: item.AlbumArtist }) : t('search.albumLabel');
      case 'audio': return item.AlbumArtist || item.Artists?.[0] || t('search.songLabel');
      case 'movie': return item.ProductionYear ? `${t('mediaTypes.movie')} (${item.ProductionYear})` : t('mediaTypes.movie');
      case 'series': return item.ProductionYear ? `${t('mediaTypes.series')} (${item.ProductionYear})` : t('mediaTypes.series');
      case 'episode': return item.Series || t('mediaTypes.episode');
      case 'tvchannel': return (item as any).ChannelNumber ? `Channel ${(item as any).ChannelNumber}` : 'Live TV Channel';
      case 'program': {
        // Show start time for programs
        const startDate = (item as any).StartDate;
        if (startDate) {
          const time = new Date(startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `Live TV - ${time}`;
        }
        return 'Live TV Program';
      }
      default: return item.Type;
    }
  }, [t]);

  // Memoize renderItem to prevent unnecessary re-renders
  const renderItem = useCallback(({ item }: { item: SearchHint }) => {
    const imageUrl = getImageForItem(item);
    const isSquare = ['musicalbum', 'audio', 'musicartist'].includes((item.Type || '').toLowerCase());
    const displayName = getDisplayName(item as any, hideMedia);

    return (
      <Pressable
        onPress={() => handleItemPress(item)}
        className="flex-row items-center p-3 bg-surface rounded-xl mb-2"
      >
        <View
          className="rounded-lg bg-background-secondary items-center justify-center mr-3 overflow-hidden"
          style={{ width: isSquare ? 48 : 40, height: 48 }}
        >
          <CachedImage
            uri={imageUrl}
            style={{ width: isSquare ? 48 : 40, height: 48 }}
            borderRadius={8}
            fallbackText={displayName.charAt(0).toUpperCase()}
            showSkeleton={false}
          />
        </View>
        <View className="flex-1">
          <Text className="text-white font-medium" numberOfLines={1}>
            {displayName}
          </Text>
          <Text className="text-text-tertiary text-sm" numberOfLines={1}>
            {getLabel(item)}
          </Text>
        </View>
      </Pressable>
    );
  }, [getImageForItem, handleItemPress, getLabel, hideMedia]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', flex: 1 }}>{t('search.title')}</Text>
          <Pressable
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color={accentColor} />
          </Pressable>
        </View>

        <View className="bg-surface rounded-xl flex-row items-center px-4">
          <TextInput
            className="flex-1 text-white py-3"
            placeholder={t('search.placeholder')}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {(isLoading || isFetching) && debouncedQuery.length >= 2 && (
            <ActivityIndicator color={accentColor} size="small" />
          )}
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} className="p-2">
              <Text className="text-text-tertiary">X</Text>
            </Pressable>
          )}
        </View>

        {/* Filter Dropdown Button */}
        <Pressable
          onPress={() => setFilterModalVisible(true)}
          style={[styles.filterDropdown, { borderColor: accentColor + '40' }]}
        >
          <View style={styles.filterDropdownLeft}>
            <Ionicons
              name={activeFilterOption.icon as any}
              size={18}
              color={accentColor}
            />
            <Text style={[styles.filterDropdownText, { color: '#fff' }]}>
              {activeFilterOption.label}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>

      {/* Filter Selection Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('search.filterBy')}</Text>
            {FILTER_OPTIONS.map((filter) => (
              <Pressable
                key={filter.value}
                onPress={() => handleFilterSelect(filter.value)}
                style={[
                  styles.modalOption,
                  activeFilter === filter.value && { backgroundColor: accentColor + '15' },
                ]}
              >
                <View style={styles.modalOptionLeft}>
                  <Ionicons
                    name={filter.icon as any}
                    size={22}
                    color={activeFilter === filter.value ? accentColor : 'rgba(255,255,255,0.6)'}
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      activeFilter === filter.value && { color: accentColor },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </View>
                {activeFilter === filter.value && (
                  <Ionicons name="checkmark" size={22} color={accentColor} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {query.length < 2 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-tertiary">{t('search.startTyping')}</Text>
        </View>
      ) : isLoading && results.length === 0 ? (
        <SkeletonSearchResults count={8} />
      ) : results.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-tertiary">{t('common.noResults')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.Id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListHeaderComponent={
            results.length > 0 ? (
              <Text className="text-text-secondary text-sm mb-3">
                {t('search.resultsCount', { count: results.length })}
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  filterDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterDropdownText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    paddingVertical: 8,
  },
  modalTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
});
