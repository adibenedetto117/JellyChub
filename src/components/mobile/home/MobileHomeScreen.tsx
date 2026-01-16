import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore } from '@/stores';
import { useMiniPlayerPadding } from '@/hooks';
import {
  getResumeItems,
  getNextUp,
  getLibraries,
  getSuggestions,
  getFavorites,
  groupLibrariesByType,
  getLatestMediaFromMultipleLibraries,
} from '@/api';
import { MobileMediaRow } from './MobileMediaRow';
import { MobileContinueWatchingRow } from './MobileContinueWatchingRow';
import { HeroSpotlight } from '@/components/shared/media/hero/HeroSpotlight';
import type { BaseItem, Episode } from '@/types/jellyfin';
import type { GroupedLibraries } from '@/api';

const EXCLUDED_COLLECTION_TYPES = ['playlists'];

export function MobileHomeScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const miniPlayerPadding = useMiniPlayerPadding();
  const userId = currentUser?.Id ?? '';

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
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });

  const { data: nextUp, refetch: refetchNextUp, isLoading: isLoadingNextUp } = useQuery({
    queryKey: ['nextUp', userId],
    queryFn: () => getNextUp(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });

  const { data: suggestions, refetch: refetchSuggestions } = useQuery({
    queryKey: ['suggestions', userId],
    queryFn: () => getSuggestions(userId, 12),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: allFavorites, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => getFavorites(userId, ['Movie', 'Series'], 24),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { favoriteMovies, favoriteSeries } = useMemo(() => {
    const items = allFavorites?.Items ?? [];
    return {
      favoriteMovies: items.filter((item) => item.Type === 'Movie').slice(0, 12),
      favoriteSeries: items.filter((item) => item.Type === 'Series').slice(0, 12),
    };
  }, [allFavorites]);

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
  }, []);

  const handlePlayPress = useCallback((item: BaseItem) => {
    const type = item.Type?.toLowerCase();
    if (type === 'movie' || type === 'episode') {
      router.push(`/player/video?itemId=${item.Id}`);
    } else if (type === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    }
  }, []);

  const handleEpisodePress = useCallback((item: Episode) => {
    if (item.SeriesId) {
      router.push(`/details/series/${item.SeriesId}`);
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: miniPlayerPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >

        {(suggestions?.length ?? 0) > 0 && (
          <HeroSpotlight
            items={suggestions ?? []}
            onItemPress={handleItemPress}
            onPlayPress={handlePlayPress}
          />
        )}

        {(resumeItems?.Items?.length ?? 0) > 0 && (
          <MobileContinueWatchingRow
            items={resumeItems?.Items ?? []}
            onItemPress={handleItemPress}
            onPlayPress={handlePlayPress}
          />
        )}

        {(nextUp?.Items?.length ?? 0) > 0 && (
          <MobileMediaRow
            title={t('home.nextUp')}
            items={nextUp?.Items ?? []}
            onItemPress={handleItemPress}
            variant="backdrop"
            icon="arrow-forward-circle-outline"
          />
        )}

        {favoriteMovies.length > 0 && (
          <MobileMediaRow
            title="Favorite Movies"
            items={favoriteMovies}
            onItemPress={handleItemPress}
            icon="heart"
          />
        )}

        {favoriteSeries.length > 0 && (
          <MobileMediaRow
            title="Favorite Shows"
            items={favoriteSeries}
            onItemPress={handleItemPress}
            icon="heart"
          />
        )}

        {libraryLatestMedia.map(({ group, data }) => {
          if (!data || data.length === 0) return null;

          const useBackdrop = group.collectionType === 'tvshows';

          return (
            <MobileMediaRow
              key={group.collectionType ?? 'mixed'}
              title={getLatestSectionTitle(group)}
              items={data}
              onItemPress={handleItemPress}
              variant={useBackdrop ? 'backdrop' : 'poster'}
            />
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
  contentContainer: {
    paddingTop: 16,
  },
});
