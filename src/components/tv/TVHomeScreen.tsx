import { View, ScrollView, Text, StyleSheet, RefreshControl } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore, useSettingsStore } from '@/stores';
import {
  getResumeItems,
  getNextUp,
  getLibraries,
  getSuggestions,
  getFavorites,
  shouldUseSquareVariant,
  groupLibrariesByType,
  getLatestMediaFromMultipleLibraries,
} from '@/api';
import { TVMediaRow } from './TVMediaRow';
import { TVContinueWatchingRow } from './TVContinueWatchingRow';
import { tvConstants } from '@/utils/platform';
import type { BaseItem, Episode } from '@/types/jellyfin';
import type { GroupedLibraries } from '@/api';

const EXCLUDED_COLLECTION_TYPES = ['playlists'];

export function TVHomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
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

  const handleEpisodePress = useCallback((item: Episode) => {
    if (item.SeriesId) {
      router.push(`/details/series/${item.SeriesId}`);
    }
  }, []);

  const handleRowFocus = useCallback((rowIndex: number) => {
    setFocusedRowIndex(rowIndex);
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

  let rowIndex = 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()}, {currentUser?.Name ?? 'User'}
          </Text>
        </View>

        {(resumeItems?.Items?.length ?? 0) > 0 && (
          <TVContinueWatchingRow
            items={resumeItems?.Items ?? []}
            onItemPress={handleItemPress}
            rowIndex={rowIndex++}
            autoFocusFirstItem={rowIndex === 1}
            onRowFocus={handleRowFocus}
          />
        )}

        {(nextUp?.Items?.length ?? 0) > 0 && (
          <TVMediaRow
            title="Next Up"
            items={nextUp?.Items ?? []}
            onItemPress={handleItemPress}
            variant="backdrop"
            icon="arrow-forward-circle-outline"
            rowIndex={rowIndex++}
            autoFocusFirstItem={rowIndex === 1}
            onRowFocus={handleRowFocus}
          />
        )}

        {favoriteMovies.length > 0 && (
          <TVMediaRow
            title="Favorite Movies"
            items={favoriteMovies}
            onItemPress={handleItemPress}
            icon="heart"
            rowIndex={rowIndex++}
            onRowFocus={handleRowFocus}
          />
        )}

        {favoriteSeries.length > 0 && (
          <TVMediaRow
            title="Favorite Shows"
            items={favoriteSeries}
            onItemPress={handleItemPress}
            icon="heart"
            rowIndex={rowIndex++}
            onRowFocus={handleRowFocus}
          />
        )}

        {(suggestions?.length ?? 0) > 0 && (
          <TVMediaRow
            title="Recommended For You"
            items={suggestions ?? []}
            onItemPress={handleItemPress}
            icon="sparkles"
            rowIndex={rowIndex++}
            onRowFocus={handleRowFocus}
          />
        )}

        {libraryLatestMedia.map(({ group, data }) => {
          if (!data || data.length === 0) return null;

          const useBackdrop = group.collectionType === 'tvshows';

          return (
            <TVMediaRow
              key={group.collectionType ?? 'mixed'}
              title={getLatestSectionTitle(group)}
              items={data}
              onItemPress={handleItemPress}
              variant={useBackdrop ? 'backdrop' : 'poster'}
              rowIndex={rowIndex++}
              onRowFocus={handleRowFocus}
            />
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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
    paddingTop: tvConstants.controlBarPadding,
  },
  header: {
    paddingHorizontal: tvConstants.controlBarPadding,
    marginBottom: 32,
  },
  greeting: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
});
