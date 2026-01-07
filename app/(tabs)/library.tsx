import { View, Text, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore } from '@/stores';
import { useResponsive } from '@/hooks';
import {
  getLibraries,
  getItems,
  getImageUrl,
  getLibraryIcon,
} from '@/api';
import { SearchButton, HomeButton, AnimatedGradient } from '@/components/ui';
import { CachedImage } from '@/components/ui/CachedImage';
import { SkeletonRow } from '@/components/ui/Skeleton';
import type { BaseItem, Library, CollectionType } from '@/types/jellyfin';

function getIoniconName(iconName: string): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    film: 'film-outline',
    tv: 'tv-outline',
    'musical-notes': 'musical-notes-outline',
    videocam: 'videocam-outline',
    book: 'book-outline',
    headset: 'headset-outline',
    home: 'home-outline',
    folder: 'folder-outline',
    list: 'list-outline',
    library: 'library-outline',
  };
  return iconMap[iconName] ?? 'library-outline';
}

function getItemTypes(collectionType: CollectionType): string[] {
  if (!collectionType) return ['Movie', 'Series', 'MusicAlbum'];
  const typeMap: Record<string, string[]> = {
    movies: ['Movie'],
    tvshows: ['Series'],
    music: ['MusicAlbum'],
    books: ['Book', 'AudioBook'],
    audiobooks: ['AudioBook'],
    musicvideos: ['MusicVideo'],
    homevideos: ['Video'],
    boxsets: ['BoxSet'],
    playlists: ['Playlist'],
  };
  return typeMap[collectionType] || ['Movie', 'Series', 'MusicAlbum'];
}

function getDetailRoute(item: BaseItem): string {
  const type = item.Type?.toLowerCase();
  if (type === 'movie') return `/details/movie/${item.Id}`;
  if (type === 'series') return `/details/series/${item.Id}`;
  if (type === 'musicalbum') return `/details/album/${item.Id}`;
  if (type === 'audiobook') return `/player/audiobook?itemId=${item.Id}`;
  if (type === 'book') {
    const container = (item as any).Container?.toLowerCase() || '';
    const path = (item as any).Path?.toLowerCase() || '';
    const isPdf = container === 'pdf' || path.endsWith('.pdf');
    return isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`;
  }
  return `/details/${type}/${item.Id}`;
}

interface LibraryCardProps {
  item: BaseItem;
  isSquare?: boolean;
  onPress: () => void;
  cardWidth: number;
  cardHeight: number;
  fontSize: number;
}

const LibraryCard = memo(function LibraryCard({ item, isSquare, onPress, cardWidth, cardHeight, fontSize }: LibraryCardProps) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: cardWidth * 2, tag: item.ImageTags.Primary })
    : null;

  return (
    <Pressable onPress={onPress} style={styles.cardPressable}>
      <View style={[styles.cardContainer, { width: cardWidth, height: cardHeight }]}>
        <CachedImage
          uri={imageUrl}
          style={{ width: cardWidth, height: cardHeight }}
          borderRadius={8}
          fallbackText={item.Name?.charAt(0) ?? '?'}
        />
      </View>
      <Text
        style={[styles.cardTitle, { width: cardWidth, fontSize }]}
        numberOfLines={1}
      >
        {item.Name}
      </Text>
    </Pressable>
  );
});

interface LibrarySectionProps {
  library: Library;
  userId: string;
  accentColor: string;
}

const LibrarySection = memo(function LibrarySection({ library, userId, accentColor }: LibrarySectionProps) {
  const { isTablet, isTV, fontSize } = useResponsive();
  const iconName = getLibraryIcon(library.CollectionType);
  const itemTypes = getItemTypes(library.CollectionType);
  const isSquare = library.CollectionType === 'music';

  const cardWidth = isTV ? 180 : isTablet ? 140 : isSquare ? 120 : 100;
  const cardHeight = isSquare ? cardWidth : cardWidth * 1.5;
  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;
  const iconSize = isTV ? 24 : isTablet ? 20 : 16;
  const iconContainerSize = isTV ? 44 : isTablet ? 36 : 32;

  const { data, isLoading } = useQuery({
    queryKey: ['libraryPreview', userId, library.Id],
    queryFn: () =>
      getItems<BaseItem>(userId, {
        parentId: library.Id,
        includeItemTypes: itemTypes,
        sortBy: 'DateCreated',
        sortOrder: 'Descending',
        limit: isTablet ? 15 : 10,
        recursive: true,
      }),
    enabled: !!userId,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const items = data?.Items ?? [];
  const totalCount = data?.TotalRecordCount ?? 0;

  if (isLoading && !data) {
    return <SkeletonRow cardWidth={cardWidth} cardHeight={cardHeight} count={4} isSquare={isSquare} />;
  }

  const handleSeeAll = useCallback(() => {
    if (library.CollectionType === 'movies') {
      router.push('/(tabs)/movies');
    } else if (library.CollectionType === 'tvshows') {
      router.push('/(tabs)/shows');
    } else if (library.CollectionType === 'music') {
      router.push('/(tabs)/music');
    } else if (library.CollectionType === 'books' || library.CollectionType === 'audiobooks') {
      router.push('/(tabs)/books');
    } else {
      router.push(`/library/${library.Id}`);
    }
  }, [library.CollectionType, library.Id]);

  const handleItemPress = useCallback((item: BaseItem) => {
    router.push(getDetailRoute(item) as never);
  }, []);

  return (
    <View style={{ marginBottom: isTablet ? 32 : 24 }}>
      <Pressable
        onPress={handleSeeAll}
        style={[styles.sectionHeader, { paddingHorizontal: horizontalPadding, marginBottom: isTablet ? 16 : 12 }]}
      >
        <View style={styles.sectionHeaderLeft}>
          <View
            style={[styles.iconContainer, { width: iconContainerSize, height: iconContainerSize, backgroundColor: accentColor }]}
          >
            <Ionicons name={getIoniconName(iconName)} size={iconSize} color="#fff" />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { fontSize: fontSize.lg }]}>{library.Name}</Text>
            <Text style={[styles.sectionSubtitle, { fontSize: fontSize.xs }]}>{totalCount} items</Text>
          </View>
        </View>
        <View style={styles.seeAllContainer}>
          <Text style={[styles.seeAllText, { fontSize: fontSize.sm }]}>See all</Text>
          <Ionicons name="chevron-forward" size={iconSize} color="rgba(255,255,255,0.5)" />
        </View>
      </Pressable>

      {items.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
        >
          {items.map((item) => (
            <LibraryCard
              key={item.Id}
              item={item}
              isSquare={isSquare}
              onPress={() => handleItemPress(item)}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              fontSize={fontSize.xs}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { fontSize: fontSize.sm }]}>No items yet</Text>
        </View>
      )}
    </View>
  );
});

export default function LibraryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { isTablet, isTV, fontSize } = useResponsive();

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';

  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;

  const { data: libraries, refetch: refetchLibraries, isLoading: isLoadingLibraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const browsableLibraries = useMemo(() => {
    if (!libraries) return [];
    return libraries.filter((lib) => {
      const excludeTypes = ['playlists'];
      if (lib.CollectionType && excludeTypes.includes(lib.CollectionType)) {
        return false;
      }
      return true;
    });
  }, [libraries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchLibraries();
    setRefreshing(false);
  }, [refetchLibraries]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedGradient intensity="subtle" />
      <View style={[styles.header, { paddingHorizontal: horizontalPadding, paddingTop: isTablet ? 20 : 16 }]}>
        <View style={styles.headerLeft}>
          <HomeButton currentScreen="library" />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { fontSize: fontSize['2xl'] }]}>Library</Text>
            <Text style={[styles.headerSubtitle, { fontSize: fontSize.sm }]}>
              {browsableLibraries.length} {browsableLibraries.length === 1 ? 'library' : 'libraries'}
            </Text>
          </View>
        </View>
        <SearchButton />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        <View style={{ paddingTop: 8 }}>
          {isLoadingLibraries && !libraries ? (
            <>
              <SkeletonRow cardWidth={100} cardHeight={150} count={4} />
              <SkeletonRow cardWidth={100} cardHeight={150} count={4} />
              <SkeletonRow cardWidth={100} cardHeight={150} count={4} />
            </>
          ) : (
            browsableLibraries.map((library) => (
              <LibrarySection
                key={library.Id}
                library={library}
                userId={userId}
                accentColor={accentColor}
              />
            ))
          )}
        </View>

        {userId && browsableLibraries.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="library-outline" size={isTablet ? 64 : 48} color="rgba(255,255,255,0.2)" />
            <Text style={[styles.emptyStateTitle, { fontSize: fontSize.lg }]}>No libraries found</Text>
            <Text style={[styles.emptyStateSubtitle, { fontSize: fontSize.sm }]}>
              Add libraries in your Jellyfin server
            </Text>
          </View>
        )}

        <View style={{ height: isTablet ? 100 : 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  cardPressable: {
    marginRight: 12,
  },
  cardContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
  },
  cardTitle: {
    color: '#fff',
    marginTop: 6,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.5)',
  },
  seeAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: 'rgba(255,255,255,0.5)',
    marginRight: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
});
