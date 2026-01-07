import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore, useSettingsStore } from '@/stores';
import { useResponsive } from '@/hooks';
import {
  getResumeItems,
  getNextUp,
  getLibraries,
  getSuggestions,
  getFavorites,
  shouldUseSquareVariant,
  groupLibrariesByType,
  getLatestMediaFromMultipleLibraries,
  COLLECTION_TYPE_CONFIG,
} from '@/api';
import { MediaRow } from '@/components/media/MediaRow';
import { ContinueWatching } from '@/components/media/ContinueWatching';
import { NextUpRow } from '@/components/media/NextUpRow';
import { SearchButton, AnimatedGradient } from '@/components/ui';
import { SkeletonContinueWatching, SkeletonRow } from '@/components/ui/Skeleton';
import type { BaseItem, Library, Episode, CollectionType } from '@/types/jellyfin';
import type { GroupedLibraries } from '@/api';

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

  // Combined favorites query - fetches both movies and series in a single API call
  // We request 24 items total to ensure we have enough of each type after splitting
  const { data: allFavorites, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => getFavorites(userId, ['Movie', 'Series'], 24),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // Split the combined favorites into movies and series for display
  const { favoriteMovies, favoriteSeries } = useMemo(() => {
    const items = allFavorites?.Items ?? [];
    return {
      favoriteMovies: items.filter((item) => item.Type === 'Movie').slice(0, 12),
      favoriteSeries: items.filter((item) => item.Type === 'Series').slice(0, 12),
    };
  }, [allFavorites]);

  // Group libraries by collection type for consolidated display
  const groupedLibraries = useMemo(() => {
    if (!libraries) return [];
    const filteredLibraries = libraries.filter((lib) => {
      if (lib.CollectionType && EXCLUDED_COLLECTION_TYPES.includes(lib.CollectionType)) {
        return false;
      }
      return true;
    });
    return groupLibrariesByType(filteredLibraries);
  }, [libraries]);

  // Create queries for each grouped collection type
  const latestMediaQueries = useQueries({
    queries: groupedLibraries.map((group) => ({
      queryKey: ['latestMediaGrouped', userId, group.collectionType, group.libraries.map(l => l.Id).join(',')],
      queryFn: () => getLatestMediaFromMultipleLibraries(
        userId,
        group.libraries.map(l => l.Id),
        12
      ),
      enabled: !!userId && group.libraries.length > 0,
      staleTime: Infinity,
      refetchOnMount: false,
    })),
  });

  // Combine grouped library info with query results for rendering
  const libraryLatestMedia = useMemo(() => {
    return groupedLibraries.map((group, index) => ({
      group,
      data: latestMediaQueries[index]?.data ?? [],
      isLoading: latestMediaQueries[index]?.isLoading ?? false,
      refetch: latestMediaQueries[index]?.refetch,
    }));
  }, [groupedLibraries, latestMediaQueries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchLibraries(),
      refetchResume(),
      refetchNextUp(),
      refetchSuggestions(),
      refetchFavorites(),
      ...latestMediaQueries.map((query) => query.refetch()),
    ]);
    setRefreshing(false);
  }, [refetchLibraries, refetchResume, refetchNextUp, refetchSuggestions, refetchFavorites, latestMediaQueries]);

  const handleItemPress = useCallback((item: BaseItem) => {
    const type = item.Type?.toLowerCase();
    if (type === 'movie') {
      router.push(`/(tabs)/details/movie/${item.Id}`);
    } else if (type === 'series') {
      router.push(`/(tabs)/details/series/${item.Id}`);
    } else if (type === 'musicalbum') {
      router.push(`/(tabs)/details/album/${item.Id}`);
    } else if (type === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (type === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else {
      router.push(`/(tabs)/details/${type}/${item.Id}`);
    }
  }, []);

  const handleEpisodePress = useCallback((item: Episode) => {
    if (item.SeriesId) {
      router.push(`/(tabs)/details/series/${item.SeriesId}`);
    }
  }, []);

  const getLatestSectionTitle = useCallback((group: GroupedLibraries): string => {
    const { collectionType, libraries: libs, label } = group;

    if (!collectionType || collectionType === 'mixed') {
      if (libs.length === 1) {
        return `Latest in ${libs[0].Name}`;
      }
      return 'Latest';
    }

    switch (collectionType) {
      case 'movies':
        return 'Latest Movies';
      case 'tvshows':
        return 'Latest TV Shows';
      case 'music':
        return 'Recently Added Music';
      case 'books':
        return 'New Books';
      case 'audiobooks':
        return 'New Audiobooks';
      case 'homevideos':
        return 'Recent Home Videos';
      case 'musicvideos':
        return 'Latest Music Videos';
      default:
        return `Latest ${label}`;
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedGradient intensity="subtle" />
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
        {favoriteMovies.length > 0 && (
          <MediaRow
            title="Favorite Movies"
            items={favoriteMovies}
            onItemPress={handleItemPress}
          />
        )}

        {/* Favorite Shows */}
        {favoriteSeries.length > 0 && (
          <MediaRow
            title="Favorite Shows"
            items={favoriteSeries}
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

        {/* Dynamic "Latest" sections for each collection type (consolidated) */}
        {libraryLatestMedia.length === 0 && latestMediaQueries.some(q => q.isLoading) ? (
          <>
            <SkeletonRow cardWidth={130} cardHeight={195} count={4} />
            <SkeletonRow cardWidth={130} cardHeight={195} count={4} />
          </>
        ) : (
          libraryLatestMedia.map(({ group, data, isLoading }) => {
            if (isLoading && !data?.length) {
              return <SkeletonRow key={group.collectionType ?? 'mixed'} cardWidth={130} cardHeight={195} count={4} />;
            }
            if (!data || data.length === 0) return null;

            const useSquare = shouldUseSquareVariant(group.collectionType);

            return (
              <MediaRow
                key={group.collectionType ?? 'mixed'}
                title={getLatestSectionTitle(group)}
                items={data}
                onItemPress={handleItemPress}
                onSeeAllPress={() => router.push('/(tabs)/library')}
                variant={useSquare ? 'square' : undefined}
              />
            );
          })
        )}

        <View style={{ height: isTablet ? 100 : 100 }} />
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
