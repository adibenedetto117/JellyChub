import { View, ScrollView, Text, StyleSheet, RefreshControl } from 'react-native';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores';
import {
  getResumeItems,
  getNextUp,
  getLibraries,
  getSuggestions,
  getFavorites,
  groupLibrariesByType,
  getLatestMediaFromMultipleLibraries,
} from '@/api';
import { TVMediaRow, type TVMediaRowRef } from './TVMediaRow';
import { TVContinueWatchingRow, type TVContinueWatchingRowRef } from './TVContinueWatchingRow';
import { TVTopNavBar } from '../navigation/TVTopNavBar';
import { tvConstants } from '@/utils/platform';
import type { BaseItem } from '@/types/jellyfin';
import type { GroupedLibraries } from '@/api';

const TV_ACCENT_GOLD = '#D4A84B';
const EXCLUDED_COLLECTION_TYPES = ['playlists'];

export function TVHomeScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const userId = currentUser?.Id ?? '';

  const [rowHandles, setRowHandles] = useState<Map<string, number | null>>(new Map());

  const continueWatchingRef = useRef<TVContinueWatchingRowRef>(null);
  const nextUpRef = useRef<TVMediaRowRef>(null);
  const favoriteMoviesRef = useRef<TVMediaRowRef>(null);
  const favoriteSeriesRef = useRef<TVMediaRowRef>(null);
  const suggestionsRef = useRef<TVMediaRowRef>(null);
  const libraryRefs = useRef<Map<string, React.RefObject<TVMediaRowRef | null>>>(new Map());

  const { data: libraries, refetch: refetchLibraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const { data: resumeItems, refetch: refetchResume } = useQuery({
    queryKey: ['resume', userId],
    queryFn: () => getResumeItems(userId, 12),
    enabled: !!userId,
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });

  const { data: nextUp, refetch: refetchNextUp } = useQuery({
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

  const getLibraryRef = useCallback((key: string): React.RefObject<TVMediaRowRef | null> => {
    if (!libraryRefs.current.has(key)) {
      libraryRefs.current.set(key, { current: null });
    }
    return libraryRefs.current.get(key)!;
  }, []);

  const visibleRows = useMemo(() => {
    const rows: { key: string; ref: React.RefObject<any> }[] = [];

    if ((resumeItems?.Items?.length ?? 0) > 0) {
      rows.push({ key: 'continueWatching', ref: continueWatchingRef });
    }
    if ((nextUp?.Items?.length ?? 0) > 0) {
      rows.push({ key: 'nextUp', ref: nextUpRef });
    }
    if (favoriteMovies.length > 0) {
      rows.push({ key: 'favoriteMovies', ref: favoriteMoviesRef });
    }
    if (favoriteSeries.length > 0) {
      rows.push({ key: 'favoriteSeries', ref: favoriteSeriesRef });
    }
    if ((suggestions?.length ?? 0) > 0) {
      rows.push({ key: 'suggestions', ref: suggestionsRef });
    }
    libraryLatestMedia.forEach(({ group, data }) => {
      if (data && data.length > 0) {
        const key = `library-${group.collectionType ?? 'mixed'}`;
        rows.push({ key, ref: getLibraryRef(key) });
      }
    });

    return rows;
  }, [resumeItems, nextUp, favoriteMovies, favoriteSeries, suggestions, libraryLatestMedia, getLibraryRef]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const handles = new Map<string, number | null>();
      visibleRows.forEach(({ key, ref }) => {
        const handle = ref.current?.getFirstItemHandle?.() ?? null;
        handles.set(key, handle);
      });
      setRowHandles(handles);
    }, 200);
    return () => clearTimeout(timer);
  }, [visibleRows, resumeItems, nextUp, favoriteMovies, favoriteSeries, suggestions, libraryLatestMedia]);

  const getRowNavigation = useCallback((rowKey: string) => {
    const rowIndex = visibleRows.findIndex(r => r.key === rowKey);
    const prevRow = rowIndex > 0 ? visibleRows[rowIndex - 1] : null;
    const nextRow = rowIndex < visibleRows.length - 1 ? visibleRows[rowIndex + 1] : null;

    return {
      nextFocusUp: prevRow ? rowHandles.get(prevRow.key) ?? undefined : undefined,
      nextFocusDown: nextRow ? rowHandles.get(nextRow.key) ?? undefined : undefined,
    };
  }, [visibleRows, rowHandles]);

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

  const firstRowRef = visibleRows[0]?.ref;

  return (
    <View style={styles.container}>
      <TVTopNavBar firstContentRef={firstRowRef} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={TV_ACCENT_GOLD}
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
            ref={continueWatchingRef}
            items={resumeItems?.Items ?? []}
            onItemPress={handleItemPress}
            autoFocusFirstItem={visibleRows[0]?.key === 'continueWatching'}
            {...getRowNavigation('continueWatching')}
          />
        )}

        {(nextUp?.Items?.length ?? 0) > 0 && (
          <TVMediaRow
            ref={nextUpRef}
            title={t('home.nextUp')}
            items={nextUp?.Items ?? []}
            onItemPress={handleItemPress}
            variant="backdrop"
            icon="arrow-forward-circle-outline"
            autoFocusFirstItem={visibleRows[0]?.key === 'nextUp'}
            {...getRowNavigation('nextUp')}
          />
        )}

        {favoriteMovies.length > 0 && (
          <TVMediaRow
            ref={favoriteMoviesRef}
            title="Favorite Movies"
            items={favoriteMovies}
            onItemPress={handleItemPress}
            icon="heart"
            {...getRowNavigation('favoriteMovies')}
          />
        )}

        {favoriteSeries.length > 0 && (
          <TVMediaRow
            ref={favoriteSeriesRef}
            title="Favorite Shows"
            items={favoriteSeries}
            onItemPress={handleItemPress}
            icon="heart"
            {...getRowNavigation('favoriteSeries')}
          />
        )}

        {(suggestions?.length ?? 0) > 0 && (
          <TVMediaRow
            ref={suggestionsRef}
            title="Recommended For You"
            items={suggestions ?? []}
            onItemPress={handleItemPress}
            icon="sparkles"
            {...getRowNavigation('suggestions')}
          />
        )}

        {libraryLatestMedia.map(({ group, data }) => {
          if (!data || data.length === 0) return null;

          const useBackdrop = group.collectionType === 'tvshows';
          const key = `library-${group.collectionType ?? 'mixed'}`;

          return (
            <TVMediaRow
              key={key}
              ref={getLibraryRef(key)}
              title={getLatestSectionTitle(group)}
              items={data}
              onItemPress={handleItemPress}
              variant={useBackdrop ? 'backdrop' : 'poster'}
              {...getRowNavigation(key)}
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
    backgroundColor: '#050505',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: tvConstants.controlBarPadding,
    marginBottom: 48,
  },
  greeting: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
});
