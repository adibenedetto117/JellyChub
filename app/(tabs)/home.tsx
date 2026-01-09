import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
} from '@/api';
import { MediaRow } from '@/components/media/MediaRow';
import { ContinueWatching } from '@/components/media/ContinueWatching';
import { NextUpRow } from '@/components/media/NextUpRow';
import { HeroSpotlight } from '@/components/media/HeroSpotlight';
import { SearchButton, AnimatedGradient } from '@/components/ui';
import { SkeletonContinueWatching, SkeletonRow } from '@/components/ui/Skeleton';
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
  const { isTablet, isTV: isResponsiveTV, fontSize } = useResponsive();
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
  });

  const { data: resumeItems, refetch: refetchResume, isLoading: isLoadingResume } = useQuery({
    queryKey: ['resume', userId],
    queryFn: () => getResumeItems(userId, 12),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds - continue watching changes frequently
  });

  // Priority 2: Next Up - loads after resume items are fetched or cached
  const { data: nextUp, refetch: refetchNextUp, isLoading: isLoadingNextUp } = useQuery({
    queryKey: ['nextUp', userId],
    queryFn: () => getNextUp(userId),
    enabled: !!userId && resumeItems !== undefined, // Wait for resume to complete
    staleTime: 1000 * 30, // 30 seconds - next up changes as you watch
  });

  // Priority 3: Secondary content - loads after critical data is ready
  const { data: suggestions, refetch: refetchSuggestions, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['suggestions', userId],
    queryFn: () => getSuggestions(userId, 12),
    enabled: !!userId && nextUp !== undefined, // Wait for nextUp
    staleTime: 1000 * 60 * 10, // 10 minutes - suggestions don't change often
  });

  // Priority 4: Favorites - loads last as it's lower in the page
  const { data: allFavorites, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => getFavorites(userId, ['Movie', 'Series'], 24),
    enabled: !!userId && suggestions !== undefined, // Wait for suggestions
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

  // Priority 5: Latest media queries - only start after favorites are loaded
  // This prevents 5+ queries firing simultaneously on mount
  const latestMediaQueriesConfig = useMemo(() =>
    groupedLibraries.map((group) => ({
      queryKey: ['latestMediaGrouped', userId, group.collectionType, group.libraries.map(l => l.Id).join(',')],
      queryFn: () => getLatestMediaFromMultipleLibraries(
        userId,
        group.libraries.map(l => l.Id),
        12
      ),
      enabled: !!userId && group.libraries.length > 0 && allFavorites !== undefined,
      staleTime: 1000 * 60 * 5, // 5 minutes - latest media changes with new additions
      })),
  [groupedLibraries, userId, allFavorites]);

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

  const handleEpisodePress = useCallback((item: Episode) => {
    if (item.SeriesId) {
      navigateToDetails('series', item.SeriesId, '/(tabs)/home');
    }
  }, []);

  const handlePlayPress = useCallback((item: BaseItem) => {
    const type = item.Type?.toLowerCase();
    if (type === 'movie') {
      router.push(`/player/video?itemId=${item.Id}`);
    } else if (type === 'series') {
      navigateToDetails('series', item.Id, '/(tabs)/home');
    }
  }, []);

  // Resume playback for Continue Watching items - goes directly to player
  const handleResumePress = useCallback((item: BaseItem) => {
    const type = item.Type?.toLowerCase();
    if (type === 'movie' || type === 'episode') {
      router.push(`/player/video?itemId=${item.Id}`);
    } else if (type === 'audio') {
      router.push(`/player/music?itemId=${item.Id}`);
    } else if (type === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else {
      // Fallback to details for unknown types
      handleItemPress(item);
    }
  }, [handleItemPress]);

  // Play next episode - goes directly to player
  const handleNextEpisodePlay = useCallback((item: Episode) => {
    router.push(`/player/video?itemId=${item.Id}`);
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

    return [...movieItems, ...tvItems].filter(item => item.BackdropImageTags?.length);
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

  return (
    <SafeAreaView style={styles.container} edges={showHero ? [] : ['top']}>
      <AnimatedGradient intensity="subtle" />
      {showHero && (
        <View style={styles.floatingHeader}>
          <SafeAreaView edges={['top']} style={styles.floatingHeaderInner}>
            <View style={styles.floatingHeaderContent}>
              <View style={{ flex: 1 }} />
              <Pressable
                style={styles.floatingSearchButton}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Ionicons name="search" size={22} color="#fff" />
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
        ) : (
          <View style={[styles.header, { paddingHorizontal: horizontalPadding, paddingTop: isTablet ? 20 : 16 }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { fontSize: fontSize['2xl'] }]}>{t('nav.home')}</Text>
            </View>
            <SearchButton />
          </View>
        )}

        {showHero && (
          <View style={[styles.quickActions, { paddingHorizontal: horizontalPadding }]}>
            <Pressable
              style={[styles.quickActionButton, { backgroundColor: accentColor + '20' }]}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Ionicons name="search" size={18} color={accentColor} />
              <Text style={[styles.quickActionText, { color: accentColor }]}>{t('nav.search')}</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => router.push('/(tabs)/library')}
            >
              <Ionicons name="library-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.quickActionText}>{t('nav.library')}</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => router.push('/(tabs)/favorites')}
            >
              <Ionicons name="heart-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.quickActionText}>{t('nav.favorites')}</Text>
            </Pressable>
          </View>
        )}

        {isLoadingResume && !resumeItems ? (
          <SkeletonContinueWatching count={2} />
        ) : (resumeItems?.Items?.length ?? 0) > 0 ? (
          <ContinueWatching
            items={resumeItems?.Items ?? []}
            onItemPress={handleResumePress}
          />
        ) : null}

        {isLoadingNextUp && !nextUp ? (
          <SkeletonRow cardWidth={300} cardHeight={170} count={2} />
        ) : (nextUp?.Items?.length ?? 0) > 0 ? (
          <NextUpRow
            items={nextUp?.Items ?? []}
            onItemPress={handleNextEpisodePlay}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  floatingSearchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
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
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickActionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
});
