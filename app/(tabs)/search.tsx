import { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useSettingsStore } from '@/stores';
import { search, getImageUrl } from '@/api';
import { CachedImage } from '@/components/ui/CachedImage';
import { useDebounce } from '@/hooks';
import { getDisplayName, getDisplayImageUrl } from '@/utils';
import type { SearchHint } from '@/types/jellyfin';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
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

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', userId, debouncedQuery],
    queryFn: () => search(userId, debouncedQuery, 50),
    enabled: !!userId && debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes for search results
  });

  const results = data?.SearchHints ?? [];

  // Memoize navigation handler
  const handleItemPress = useCallback((item: SearchHint) => {
    const t = item.Type.toLowerCase();
    if (t === 'audio') {
      router.push(`/player/music?itemId=${item.Id}`);
    } else if (t === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (t === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else if (t === 'musicartist') {
      router.push(`/(tabs)/details/artist/${item.Id}`);
    } else if (t === 'musicalbum') {
      router.push(`/(tabs)/details/album/${item.Id}`);
    } else {
      router.push(`/(tabs)/details/${t}/${item.Id}`);
    }
  }, []);

  // Memoize label getter
  const getLabel = useCallback((item: SearchHint) => {
    const t = (item.Type || '').toLowerCase();
    switch (t) {
      case 'musicartist': return 'Artist';
      case 'musicalbum': return item.AlbumArtist ? `Album by ${item.AlbumArtist}` : 'Album';
      case 'audio': return item.AlbumArtist || item.Artists?.[0] || 'Song';
      case 'movie': return item.ProductionYear ? `Movie (${item.ProductionYear})` : 'Movie';
      case 'series': return item.ProductionYear ? `Series (${item.ProductionYear})` : 'Series';
      case 'episode': return item.Series || 'Episode';
      default: return item.Type;
    }
  }, []);

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
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Search</Text>

        <View className="bg-surface rounded-xl flex-row items-center px-4">
          <TextInput
            className="flex-1 text-white py-3"
            placeholder="Search movies, shows, music..."
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
      </View>

      {query.length < 2 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-tertiary">Start typing to search</Text>
        </View>
      ) : results.length === 0 && !isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-tertiary">No results found</Text>
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
                {results.length} results
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
