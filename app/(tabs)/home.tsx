import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore } from '@/stores';
import { useResponsive } from '@/hooks';
import { isTV } from '@/utils/platform';
import { navigateToDetails } from '@/utils';
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
  jellyfinClient,
} from '@/api';
import { MediaRow } from '@/components/media/MediaRow';
import { ContinueWatching } from '@/components/media/ContinueWatching';
import { NextUpRow } from '@/components/media/NextUpRow';
import { HeroSpotlight } from '@/components/media/HeroSpotlight';
import { AnimatedGradient } from '@/components/ui';
import { SkeletonContinueWatching, SkeletonRow, SkeletonHero } from '@/components/ui/Skeleton';
import { TVHomeScreen } from '@/components/tv';
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
const EXCLUDED_COLLECTION_TYPES = ['playlists', 'livetv'];

export default function HomeScreen() {
  if (isTV) {
    return <TVHomeScreen />;
  }

  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const { isTablet, isTV: isResponsiveTV } = useResponsive();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';
  const horizontalPadding = isResponsiveTV ? 48 : isTablet ? 24 : 16;

  // Priority 1: Libraries (needed for other queries) and Resume items (most visible)
  const { data: libraries, refetch: refetchLibraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // 1 hour - libraries rarely change
    refetchOnMount: 'always', // Always fetch on mount to ensure fresh data
  });

  const { data: resumeItems, refetch: refetchResume, isLoading: isLoadingResume } = useQuery({
    queryKey: ['resume', userId],
    queryFn: () => getResumeItems(userId, 12),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds - continue watching changes frequently
    refetchOnMount: 'always', // Always fetch on mount to show latest continue watching
  });

  // Priority 2: Next Up - critical for TV show users
  const { data: nextUp, refetch: refetchNextUp, isLoading: isLoadingNextUp } = useQuery({
    queryKey: ['nextUp', userId],
    queryFn: () => getNextUp(userId),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds - next up changes as you watch
  });

  // Priority 3: Suggestions - personalized recommendations
  const { data: suggestions, refetch: refetchSuggestions, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['suggestions', userId],
    queryFn: () => getSuggestions(userId, 12),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes - suggestions don't change often
  });

  // Priority 4: Favorites - user's favorite content
  const { data: allFavorites, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => getFavorites(userId, ['Movie', 'Series'], 24),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes - favorites change occasionally
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

  // Priority 5: Latest media queries - fetch latest items from each library group
  // Depends on libraries being loaded first (groupedLibraries derived from libraries query)
  const latestMediaQueriesConfig = useMemo(() =>
    groupedLibraries.map((group) => ({
      queryKey: ['latestMediaGrouped', userId, group.collectionType, group.libraries.map(l => l.Id).join(',')],
      queryFn: () => getLatestMediaFromMultipleLibraries(
        userId,
        group.libraries.map(l => l.Id),
        12
      ),
      enabled: !!userId && group.libraries.length > 0,
      staleTime: 1000 * 60 * 5, // 5 minutes - latest media changes with new additions
      })),
  [groupedLibraries, userId]);

  // Create queries for each grouped collection type
  const latestMediaQueries = useQueries({
    queries: latestMediaQueriesConfig,
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

  // Store refetch functions in refs to avoid dependency instability in useFocusEffect
  // This prevents the effect from re-running due to function reference changes
  const refetchResumeRef = useRef(refetchResume);
  const refetchNextUpRef = useRef(refetchNextUp);
  useEffect(() => {
    refetchResumeRef.current = refetchResume;
    refetchNextUpRef.current = refetchNextUp;
  }, [refetchResume, refetchNextUp]);

  // Refetch critical data when screen comes into focus (e.g., navigating back from other tabs)
  // This ensures continue watching and next up are always current
  useFocusEffect(
    useCallback(() => {
      // Only refetch if we have a userId - data might be stale after viewing content
      if (userId) {
        refetchResumeRef.current();
        refetchNextUpRef.current();
      }
    }, [userId])
  );

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
    // Guard: validate item has required fields before navigation
    if (!item?.Id || !item?.Type) {
      console.warn('[Home] handleItemPress called with invalid item:', {
        id: item?.Id,
        type: item?.Type,
        name: item?.Name,
      });
      return;
    }

    const type = item.Type.toLowerCase();
    console.log('[Home] Navigating to details:', { type, id: item.Id, name: item.Name });

    if (type === 'movie') {
      navigateToDetails('movie', item.Id, '/(tabs)/home');
    } else if (type === 'series') {
      navigateToDetails('series', item.Id, '/(tabs)/home');
    } else if (type === 'musicalbum') {
      navigateToDetails('album', item.Id, '/(tabs)/home');
    } else if (type === 'audio') {
      router.push(`/player/music?itemId=${item.Id}`);
    } else if (type === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (type === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else {
      navigateToDetails(type || 'item', item.Id, '/(tabs)/home');
    }
  }, []);

  const handleContinueWatchingPress = useCallback((item: BaseItem) => {
    const type = item.Type?.toLowerCase();
    if (type === 'episode') {
      const episode = item as Episode;
      if (episode.SeriesId) {
        navigateToDetails('series', episode.SeriesId, '/(tabs)/home');
      }
    } else if (type === 'movie') {
      navigateToDetails('movie', item.Id, '/(tabs)/home');
    }
  }, []);

  const handleNextUpPress = useCallback((item: Episode) => {
    if (item.SeriesId) {
      navigateToDetails('series', item.SeriesId, '/(tabs)/home');
    }
  }, []);

  // Play content from HeroSpotlight - for movies go directly to player, for series use autoplay
  const handlePlayPress = useCallback((item: BaseItem) => {
    const type = item.Type?.toLowerCase();
    if (type === 'movie') {
      router.push(`/player/video?itemId=${item.Id}&from=${encodeURIComponent('/(tabs)/home')}`);
    } else if (type === 'series') {
      // Navigate to series details with autoplay flag to start playback
      router.push(`/(tabs)/details/series/${item.Id}?from=/(tabs)/home&autoplay=true`);
    }
  }, []);


  const heroItems = useMemo(() => {
    const movieItems = libraryLatestMedia
      .filter(({ group }) => group.collectionType === 'movies')
      .flatMap(({ data }) => data)
      .slice(0, 3);

    const tvItems = libraryLatestMedia
      .filter(({ group }) => group.collectionType === 'tvshows')
      .flatMap(({ data }) => data)
      .slice(0, 2);

    // Filter to ensure all items have valid Id, Type, and backdrop images
    // This prevents navigation failures when clicking carousel items
    return [...movieItems, ...tvItems].filter(item =>
      item?.Id && item?.Type && item.BackdropImageTags?.length
    );
  }, [libraryLatestMedia]);

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
        return t('home.latestMovies');
      case 'tvshows':
        return t('home.latestShows');
      case 'music':
        return t('home.recentlyAddedMusic');
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
  }, [t]);

  const showHero = heroItems.length > 0 && !isLoadingResume;
  // Show skeleton while hero data is loading (movie/TV queries still in progress)
  const isHeroLoading = heroItems.length === 0 && latestMediaQueries.some(q => q.isLoading);
  const showHeroOrSkeleton = showHero || isHeroLoading;

  return (
    // Always use edges={[]} to prevent layout shift when showHero changes
    // Safe area is handled internally by each header variant
    <SafeAreaView style={styles.container} edges={[]}>
      <AnimatedGradient intensity="subtle" />
      {showHeroOrSkeleton && (
        <View style={styles.floatingHeader}>
          <SafeAreaView edges={['top']} style={styles.floatingHeaderInner}>
            <View style={styles.floatingHeaderContent}>
              <Pressable
                style={styles.floatingSearchButton}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Ionicons name="search" size={22} color="rgba(255,255,255,0.9)" />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      )}
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
        {showHero ? (
          <HeroSpotlight
            items={heroItems}
            onItemPress={handleItemPress}
            onPlayPress={handlePlayPress}
          />
        ) : isHeroLoading ? (
          <SkeletonHero />
        ) : (
          // Wrap non-hero header in SafeAreaView to handle top inset consistently
          <SafeAreaView edges={['top']}>
            <View style={[styles.header, { paddingHorizontal: horizontalPadding, paddingTop: isTablet ? 20 : 16 }]}>
              <Pressable
                style={styles.searchButton}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Ionicons name="search" size={24} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </View>
          </SafeAreaView>
        )}

        {isLoadingResume && !resumeItems ? (
          <SkeletonContinueWatching count={2} />
        ) : (resumeItems?.Items?.length ?? 0) > 0 ? (
          <ContinueWatching
            items={resumeItems?.Items ?? []}
            onItemPress={handleContinueWatchingPress}
          />
        ) : null}

        {isLoadingNextUp && !nextUp ? (
          <SkeletonRow cardWidth={300} cardHeight={170} count={2} />
        ) : (nextUp?.Items?.length ?? 0) > 0 ? (
          <NextUpRow
            items={nextUp?.Items ?? []}
            onItemPress={handleNextUpPress}
          />
        ) : null}

        {favoriteMovies.length > 0 && (
          <MediaRow
            title={t('home.favoriteMovies')}
            items={favoriteMovies}
            onItemPress={handleItemPress}
            icon="heart"
          />
        )}

        {favoriteSeries.length > 0 && (
          <MediaRow
            title={t('home.favoriteShows')}
            items={favoriteSeries}
            onItemPress={handleItemPress}
            icon="heart"
          />
        )}

        {isLoadingSuggestions && !suggestions ? (
          <SkeletonRow cardWidth={130} cardHeight={195} count={4} />
        ) : (suggestions?.length ?? 0) > 0 ? (
          <MediaRow
            title={t('home.recommendedForYou')}
            items={suggestions ?? []}
            onItemPress={handleItemPress}
            icon="sparkles"
          />
        ) : null}

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
            const primaryLibraryId = group.libraries[0]?.Id;

            return (
              <MediaRow
                key={group.collectionType ?? 'mixed'}
                title={getLatestSectionTitle(group)}
                items={data}
                onItemPress={handleItemPress}
                onSeeAllPress={primaryLibraryId ? () => router.push(`/(tabs)/library/${primaryLibraryId}`) : undefined}
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
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  floatingHeaderInner: {
    backgroundColor: 'transparent',
  },
  floatingHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  floatingSearchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  searchButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
