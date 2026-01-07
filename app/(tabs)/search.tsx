import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useSettingsStore } from '@/stores';
import { search, getImageUrl } from '@/api';
import { CachedImage } from '@/components/ui/CachedImage';
import type { SearchHint } from '@/types/jellyfin';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';

  const getImageForItem = (item: SearchHint): string | null => {
    if (item.PrimaryImageTag) {
      return getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.PrimaryImageTag });
    }
    if (item.AlbumId) {
      return getImageUrl(item.AlbumId, 'Primary', { maxWidth: 120 });
    }
    if (item.SeriesId) {
      return getImageUrl(item.SeriesId, 'Primary', { maxWidth: 120 });
    }
    return getImageUrl(item.Id, 'Primary', { maxWidth: 120 });
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', userId, query],
    queryFn: () => search(userId, query, 50),
    enabled: !!userId && query.length >= 2,
  });

  const results = data?.SearchHints ?? [];

  const handleItemPress = (item: SearchHint) => {
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
      router.push(`/details/artist/${item.Id}`);
    } else if (t === 'musicalbum') {
      router.push(`/details/album/${item.Id}`);
    } else {
      router.push(`/details/${t}/${item.Id}`);
    }
  };

  const getLabel = (item: SearchHint) => {
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
  };

  const renderItem = ({ item }: { item: SearchHint }) => {
    const imageUrl = getImageForItem(item);
    const isSquare = ['musicalbum', 'audio', 'musicartist'].includes((item.Type || '').toLowerCase());

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
            fallbackText={item.Name.charAt(0).toUpperCase()}
            showSkeleton={false}
          />
        </View>
        <View className="flex-1">
          <Text className="text-white font-medium" numberOfLines={1}>
            {item.Name}
          </Text>
          <Text className="text-text-tertiary text-sm" numberOfLines={1}>
            {getLabel(item)}
          </Text>
        </View>
      </Pressable>
    );
  };

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
          {(isLoading || isFetching) && query.length >= 2 && (
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
