import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore, useSettingsStore } from '@/stores';
import { useResponsive } from '@/hooks';
import {
  getResumeItems,
  getLatestMedia,
  getNextUp,
  getLibraries,
  getSuggestions,
  getFavorites,
  shouldUseSquareVariant,
} from '@/api';
import { MediaRow } from '@/components/media/MediaRow';
import { ContinueWatching } from '@/components/media/ContinueWatching';
import { NextUpRow } from '@/components/media/NextUpRow';
import { SearchButton, HomeButton } from '@/components/ui';
import { SkeletonContinueWatching, SkeletonRow } from '@/components/ui/Skeleton';
import type { BaseItem, Library, Episode } from '@/types/jellyfin';

// Libraries that should show "Latest" sections on home
const DISPLAYABLE_COLLECTION_TYPES = [
  'movies',
  'tvshows',
  'music',
  'books',
  'audiobooks',
  'homevideos',
  'musicvideos',
  null,      // mixed/custom libraries
  undefined, // mixed/custom libraries
];

// Collection types that should NOT show "Latest" sections
const EXCLUDED_COLLECTION_TYPES = ['playlists'];

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { isTablet, isTV, fontSize } = useResponsive();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';
  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;

  const { data: libraries, refetch: refetchLibraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const { data: resumeItems, refetch: refetchResume, isLoading: isLoadingResume } = useQuery({
    queryKey: ['resume', userId],
    queryFn: () => getResumeItems(userId, 12),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds - refetch when returning from player
    refetchOnMount: 'always',
  });

  const { data: nextUp, refetch: refetchNextUp, isLoading: isLoadingNextUp } = useQuery({
    queryKey: ['nextUp', userId],
    queryFn: () => getNextUp(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });

  const { data: suggestions, refetch: refetchSuggestions, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['suggestions', userId],
    queryFn: () => getSuggestions(userId, 12),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: favoriteMovies, refetch: refetchFavoriteMovies } = useQuery({
    queryKey: ['favoriteMovies', userId],
    queryFn: () => getFavorites(userId, ['Movie'], 12),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: favoriteSeries, refetch: refetchFavoriteSeries } = useQuery({
    queryKey: ['favoriteSeries', userId],
    queryFn: () => getFavorites(userId, ['Series'], 12),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // Filter libraries to only include displayable ones
  const displayableLibraries = useMemo(() => {
    if (!libraries) return [];
    return libraries.filter((lib) => {
      // Exclude boxsets, playlists
      if (lib.CollectionType && EXCLUDED_COLLECTION_TYPES.includes(lib.CollectionType)) {
        return false;
      }
      return true;
    });
  }, [libraries]);

  // Dynamically create queries for each library's latest media
  const latestMediaQueries = useQueries({
    queries: displayableLibraries.map((library) => ({
      queryKey: ['latestMedia', userId, library.Id],
      queryFn: () => getLatestMedia(userId, library.Id, 12),
      enabled: !!userId && !!library.Id,
      staleTime: Infinity,
      refetchOnMount: false,
    })),
  });

  // Combine library info with query results for rendering
  const libraryLatestMedia = useMemo(() => {
    return displayableLibraries.map((library, index) => ({
      library,
      data: latestMediaQueries[index]?.data ?? [],
      isLoading: latestMediaQueries[index]?.isLoading ?? false,
      refetch: latestMediaQueries[index]?.refetch,
    }));
  }, [displayableLibraries, latestMediaQueries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchLibraries(),
      refetchResume(),
      refetchNextUp(),
      refetchSuggestions(),
      refetchFavoriteMovies(),
      refetchFavoriteSeries(),
      ...latestMediaQueries.map((query) => query.refetch()),
    ]);
    setRefreshing(false);
  }, [refetchLibraries, refetchResume, refetchNextUp, refetchSuggestions, refetchFavoriteMovies, refetchFavoriteSeries, latestMediaQueries]);

  const handleItemPress = (item: BaseItem) => {
    const type = item.Type?.toLowerCase();
    if (type === 'movie') {
      router.push(`/details/movie/${item.Id}`);
    } else if (type === 'series') {
      router.push(`/details/series/${item.Id}`);
    } else if (type === 'musicalbum') {
      router.push(`/details/album/${item.Id}`);
    } else if (type === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (type === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else {
      router.push(`/details/${type}/${item.Id}`);
    }
  };

  const handleEpisodePress = (item: Episode) => {
    if (item.SeriesId) {
      router.push(`/details/series/${item.SeriesId}`);
    }
  };

  // Generate a display title for a library's "Latest" section
  const getLatestSectionTitle = (library: Library): string => {
    // Use the library's custom name for mixed/unknown types
    if (!library.CollectionType) {
      return `Latest in ${library.Name}`;
    }

    // For known types, create a nicer title
    switch (library.CollectionType) {
      case 'movies':
        return `Latest ${library.Name}`;
      case 'tvshows':
        return `Latest ${library.Name}`;
      case 'music':
        return `Recently Added ${library.Name}`;
      case 'books':
      case 'audiobooks':
        return `New in ${library.Name}`;
      case 'homevideos':
        return `Recent ${library.Name}`;
      case 'musicvideos':
        return `Latest ${library.Name}`;
      default:
        return `Latest in ${library.Name}`;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        <View style={[styles.header, { paddingHorizontal: horizontalPadding, paddingTop: isTablet ? 20 : 16 }]}>
          <View style={styles.headerLeft}>
            <HomeButton currentScreen="home" />
            <Text style={[styles.headerTitle, { fontSize: fontSize['2xl'] }]}>Home</Text>
          </View>
          <SearchButton />
        </View>

        {/* Continue Watching - aggregated from all libraries */}
        {isLoadingResume && !resumeItems ? (
          <SkeletonContinueWatching count={2} />
        ) : (resumeItems?.Items?.length ?? 0) > 0 ? (
          <ContinueWatching
            items={resumeItems?.Items ?? []}
            onItemPress={handleItemPress}
          />
        ) : null}

        {/* Next Up - for TV shows */}
        {isLoadingNextUp && !nextUp ? (
          <SkeletonRow cardWidth={280} cardHeight={158} count={2} />
        ) : (nextUp?.Items?.length ?? 0) > 0 ? (
          <NextUpRow
            items={nextUp?.Items ?? []}
            onItemPress={handleEpisodePress}
          />
        ) : null}

        {/* Favorite Movies */}
        {(favoriteMovies?.Items?.length ?? 0) > 0 && (
          <MediaRow
            title="Favorite Movies"
            items={favoriteMovies?.Items ?? []}
            onItemPress={handleItemPress}
          />
        )}

        {/* Favorite Shows */}
        {(favoriteSeries?.Items?.length ?? 0) > 0 && (
          <MediaRow
            title="Favorite Shows"
            items={favoriteSeries?.Items ?? []}
            onItemPress={handleItemPress}
          />
        )}

        {/* Recommendations */}
        {isLoadingSuggestions && !suggestions ? (
          <SkeletonRow cardWidth={130} cardHeight={195} count={4} />
        ) : (suggestions?.length ?? 0) > 0 ? (
          <MediaRow
            title="Recommended For You"
            items={suggestions ?? []}
            onItemPress={handleItemPress}
          />
        ) : null}

        {/* Dynamic "Latest" sections for each user library */}
        {libraryLatestMedia.length === 0 && latestMediaQueries.some(q => q.isLoading) ? (
          <>
            <SkeletonRow cardWidth={130} cardHeight={195} count={4} />
            <SkeletonRow cardWidth={130} cardHeight={195} count={4} />
          </>
        ) : (
          libraryLatestMedia.map(({ library, data, isLoading }) => {
            if (isLoading && !data?.length) {
              return <SkeletonRow key={library.Id} cardWidth={130} cardHeight={195} count={4} />;
            }
            if (!data || data.length === 0) return null;

            const useSquare = shouldUseSquareVariant(library.CollectionType);

            return (
              <MediaRow
                key={library.Id}
                title={getLatestSectionTitle(library)}
                items={data}
                onItemPress={handleItemPress}
                onSeeAllPress={() => router.push('/(tabs)/library')}
                variant={useSquare ? 'square' : undefined}
              />
            );
          })
        )}

        <View style={{ height: isTablet ? 48 : 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
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
    gap: 12,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
