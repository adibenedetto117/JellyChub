import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useSettingsStore } from '@/stores';
import { jellyfinClient, getImageUrl } from '@/api/client';
import { CachedImage } from '@/components/ui/CachedImage';

interface SearchItem {
  Id: string;
  Name: string;
  Type: string;
  ProductionYear?: number;
  PrimaryImageTag?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  Artists?: string[];
  Album?: string;
  Series?: string;
  SeriesId?: string;
}

async function searchApi(userId: string, query: string): Promise<SearchItem[]> {
  const res = await jellyfinClient.api.get(
    `/Search/Hints?userId=${userId}&searchTerm=${encodeURIComponent(query)}&Limit=50`
  );
  return res.data?.SearchHints ?? [];
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const user = useAuthStore((s) => s.currentUser);
  const accent = useSettingsStore((s) => s.accentColor);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', user?.Id, query],
    queryFn: () => searchApi(user!.Id, query),
    enabled: !!user?.Id && query.length >= 2,
  });

  // Sort results - exact/starts with matches first
  const sorted = [...results].sort((a, b) => {
    const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    const aName = (a.Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const bName = (b.Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const aScore = aName === q ? 100 : aName.startsWith(q) ? 50 : 0;
    const bScore = bName === q ? 100 : bName.startsWith(q) ? 50 : 0;
    return bScore - aScore;
  });

  const goTo = (item: SearchItem) => {
    Keyboard.dismiss();
    const t = (item.Type || '').toLowerCase();

    if (t === 'audio') {
      router.push(`/player/music?itemId=${item.Id}`);
    } else if (t === 'musicartist') {
      router.push(`/details/artist/${item.Id}`);
    } else if (t === 'musicalbum') {
      router.push(`/details/album/${item.Id}`);
    } else if (t === 'movie') {
      router.push(`/details/movie/${item.Id}`);
    } else if (t === 'series') {
      router.push(`/details/series/${item.Id}`);
    } else if (t === 'episode') {
      router.push(`/details/episode/${item.Id}`);
    } else if (t === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (t === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else if (t === 'playlist') {
      router.push(`/details/playlist/${item.Id}`);
    } else {
      router.push(`/details/${t}/${item.Id}`);
    }
  };

  const getLabel = (item: SearchItem) => {
    const t = (item.Type || '').toLowerCase();
    switch (t) {
      case 'musicartist': return 'Artist';
      case 'musicalbum': return `Album${item.AlbumArtist ? ` by ${item.AlbumArtist}` : ''}`;
      case 'audio': return item.AlbumArtist || item.Artists?.[0] || 'Song';
      case 'movie': return `Movie${item.ProductionYear ? ` (${item.ProductionYear})` : ''}`;
      case 'series': return `Series${item.ProductionYear ? ` (${item.ProductionYear})` : ''}`;
      case 'episode': return item.Series || 'Episode';
      default: return item.Type;
    }
  };

  const getImageForItem = (item: SearchItem): string | null => {
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 10 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#333' }} />
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, alignItems: 'center' }}>
        <View style={{ flex: 1, backgroundColor: '#1c1c1c', borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
          <TextInput
            ref={inputRef}
            style={{ flex: 1, color: '#fff', paddingVertical: 12, fontSize: 16 }}
            placeholder="Search..."
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={accent}
          />
          {isLoading && <ActivityIndicator color={accent} size="small" />}
          {query.length > 0 && !isLoading && (
            <Pressable onPress={() => setQuery('')}>
              <Text style={{ color: '#666', fontSize: 18, paddingLeft: 8 }}>×</Text>
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => { Keyboard.dismiss(); router.back(); }} style={{ paddingLeft: 12 }}>
          <Text style={{ color: accent, fontSize: 16 }}>Cancel</Text>
        </Pressable>
      </View>

      {query.length < 2 ? (
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <Text style={{ color: '#555', fontSize: 15 }}>Type to search your library</Text>
        </View>
      ) : sorted.length === 0 && !isLoading ? (
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <Text style={{ color: '#555', fontSize: 15 }}>No results for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(i) => i.Id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
          renderItem={({ item }) => {
            const imageUrl = getImageForItem(item);
            const isSquare = ['musicalbum', 'audio', 'musicartist'].includes((item.Type || '').toLowerCase());

            return (
              <Pressable
                onPress={() => goTo(item)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' }}
              >
                <View style={{ width: isSquare ? 48 : 40, height: 48, borderRadius: isSquare ? 4 : 3, backgroundColor: '#222', marginRight: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                  <CachedImage
                    uri={imageUrl}
                    style={{ width: isSquare ? 48 : 40, height: 48 }}
                    borderRadius={isSquare ? 4 : 3}
                    fallbackText={(item.Name || '?')[0].toUpperCase()}
                    showSkeleton={false}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 15 }} numberOfLines={1}>{item.Name}</Text>
                  <Text style={{ color: '#777', fontSize: 13, marginTop: 2 }} numberOfLines={1}>{getLabel(item)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
