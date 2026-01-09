import { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const userId = currentUser?.Id ?? '';

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
      // Navigate to live TV with channel selected
      router.push(`/(tabs)/livetv?channelId=${item.Id}`);
    } else if (itemType === 'program') {
      // Navigate to program details
      navigateToDetails('program', item.Id, '/(tabs)/search');
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
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 16 }}>{t('search.title')}</Text>

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((filter) => (
            <Pressable
              key={filter.value}
              onPress={() => setActiveFilter(filter.value)}
              style={[
                styles.filterChip,
                activeFilter === filter.value && { backgroundColor: accentColor + '20', borderColor: accentColor },
              ]}
            >
              <Ionicons
                name={filter.icon as any}
                size={16}
                color={activeFilter === filter.value ? accentColor : 'rgba(255,255,255,0.5)'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter.value && { color: accentColor },
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

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
          contentContainerStyle={{ paddingHorizontal: 16 }}
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
  filterScroll: {
    paddingTop: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface.default,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
});
