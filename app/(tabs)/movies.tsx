import { View, Text, SectionList, FlatList, Pressable, RefreshControl, ActivityIndicator, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useState, useCallback, useMemo, useRef, memo } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore } from '@/stores';
import { getLibraries, getItems, getImageUrl, getLibraryIdsByType, getItemsFromMultipleLibraries, getGenres } from '@/api';
import { SearchButton, AnimatedGradient, SkeletonGrid } from '@/components/ui';
import { FilterSortModal, DEFAULT_FILTERS, getActiveFilterCount } from '@/components/library';
import type { FilterOptions, SortOption } from '@/components/library';
import { getDisplayName, getDisplayImageUrl, navigateToDetails } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem, Movie } from '@/types/jellyfin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 8;
const POSTER_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - (GRID_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

const ITEMS_PER_PAGE = 100;
const FULL_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

const MovieCard = memo(function MovieCard({ item, onPress, showRating, hideMedia }: { item: BaseItem; onPress: () => void; showRating?: boolean; hideMedia: boolean }) {
  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 300, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  const yearAndRating = [
    item.ProductionYear,
    showRating && item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : null
  ].filter(Boolean).join(' • ');

  return (
    <Pressable onPress={onPress} style={styles.movieCard}>
      <View style={styles.posterContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.poster}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.Id}
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
        {item.UserData?.Played && (
          <View style={styles.watchedBadge}>
            <Text style={styles.watchedBadgeText}>✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.movieTitle} numberOfLines={1}>{displayName}</Text>
      <Text style={styles.movieYear}>{yearAndRating}</Text>
    </Pressable>
  );
});

const MovieRow = memo(function MovieRow({ item, onPress, hideMedia }: { item: BaseItem; onPress: () => void; hideMedia: boolean }) {
  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  return (
    <Pressable onPress={onPress} style={styles.movieRow}>
      <View style={styles.movieRowImageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.movieRowImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.Id}
          />
        ) : (
          <View style={styles.movieRowPlaceholder}>
            <Text style={styles.movieRowPlaceholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.movieRowInfo}>
        <Text style={styles.movieRowName} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.movieRowMeta} numberOfLines={1}>
          {[item.ProductionYear, item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : null].filter(Boolean).join(' • ')}
        </Text>
      </View>
      {item.UserData?.Played && (
        <View style={styles.watchedIndicator}>
          <Text style={styles.watchedIndicatorText}>✓</Text>
        </View>
      )}
    </Pressable>
  );
});

const AlphabetScroller = memo(function AlphabetScroller({ availableLetters, onLetterPress, accentColor }: { availableLetters: string[]; onLetterPress: (letter: string) => void; accentColor: string }) {
  return (
    <View style={styles.alphabetContainer}>
      {FULL_ALPHABET.map((letter) => {
        const isAvailable = availableLetters.includes(letter);
        return (
          <Pressable
            key={letter}
            onPress={() => isAvailable && onLetterPress(letter)}
            style={styles.alphabetLetter}
          >
            <Text style={[
              styles.alphabetLetterText,
              { color: isAvailable ? accentColor : 'rgba(255,255,255,0.2)' }
            ]}>
              {letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

export default function MoviesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const sectionListRef = useRef<SectionList>(null);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const userId = currentUser?.Id ?? '';

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const movieLibraryIds = useMemo(() => {
    if (!libraries) return [];
    return getLibraryIdsByType(libraries, 'movies');
  }, [libraries]);

  const { data: genresData } = useQuery({
    queryKey: ['genres', 'movies', userId],
    queryFn: () => getGenres(userId, undefined, ['Movie']),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const availableGenres = useMemo(() => {
    return genresData?.map((g) => g.Name) ?? [];
  }, [genresData]);

  const queryFilters = useMemo(() => {
    const filterList: string[] = [];
    if (filters.unplayedOnly) filterList.push('IsUnplayed');
    return filterList;
  }, [filters.unplayedOnly]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['movies', userId, movieLibraryIds.join(','), filters],
    queryFn: ({ pageParam = 0 }) =>
      getItemsFromMultipleLibraries<Movie>(userId, movieLibraryIds, {
        includeItemTypes: ['Movie'],
        sortBy: filters.sortBy === 'Random' ? 'Random' : filters.sortBy,
        sortOrder: filters.sortOrder,
        startIndex: pageParam,
        limit: ITEMS_PER_PAGE,
        recursive: true,
        fields: ['SortName', 'DateCreated', 'CommunityRating', 'RunTimeTicks'],
        genres: filters.genres.length > 0 ? filters.genres : undefined,
        years: filters.years.length > 0 ? filters.years : undefined,
        filters: queryFilters.length > 0 ? queryFilters : undefined,
        isFavorite: filters.favoritesOnly ? true : undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (filters.sortBy === 'Random') return undefined;
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId && movieLibraryIds.length > 0,
    staleTime: filters.sortBy === 'Random' ? 0 : 1000 * 60 * 5,
  });

  const allMovies = data?.pages.flatMap((p) => p.Items) ?? [];
  const totalCount = data?.pages[0]?.TotalRecordCount ?? 0;
  const sortedMovies = allMovies;

  const { sections: movieSections, availableLetters } = useMemo(() => {
    if (filters.sortBy !== 'SortName') {
      return { sections: [], availableLetters: [] };
    }

    const grouped: Record<string, Movie[]> = {};
    sortedMovies.forEach((movie) => {
      const sortName = movie.SortName ?? movie.Name ?? '?';
      const firstChar = sortName.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(movie);
    });

    const sortedLetters = Object.keys(grouped).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return {
      sections: sortedLetters.map((letter) => ({
        title: letter,
        data: grouped[letter],
      })),
      availableLetters: sortedLetters,
    };
  }, [sortedMovies, filters.sortBy]);

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const scrollToLetter = useCallback((letter: string) => {
    const sectionIndex = movieSections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  }, [movieSections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleItemPress = useCallback((item: BaseItem) => {
    navigateToDetails('movie', item.Id, '/(tabs)/movies');
  }, []);

  const handleFiltersApply = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    if (newFilters.sortBy === 'SortName') {
      setTimeout(() => {
        sectionListRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: false, viewOffset: 0 });
      }, 100);
    } else {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, []);

  const openFilterModal = useCallback(() => setShowFilterModal(true), []);
  const closeFilterModal = useCallback(() => setShowFilterModal(false), []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return <View style={styles.bottomSpacer} />;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={accentColor} size="small" />
        <Text style={styles.loadingFooterText}>Loading more...</Text>
      </View>
    );
  }, [isFetchingNextPage, accentColor]);

  // Memoized renderItem callbacks to prevent re-renders
  const renderMovieRow = useCallback(({ item }: { item: BaseItem }) => (
    <MovieRow item={item} onPress={() => handleItemPress(item)} hideMedia={hideMedia} />
  ), [handleItemPress, hideMedia]);

  const renderMovieCard = useCallback(({ item }: { item: BaseItem }) => (
    <MovieCard item={item} onPress={() => handleItemPress(item)} showRating={filters.sortBy !== 'SortName'} hideMedia={hideMedia} />
  ), [handleItemPress, filters.sortBy, hideMedia]);

  const renderSectionHeader = useCallback(({ section }: any) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={[styles.sectionHeaderText, { color: accentColor }]}>{section.title}</Text>
    </View>
  ), [accentColor]);

  // Filter out null/undefined items for alphabetical view
  const filteredSections = useMemo(() => {
    return movieSections.map(section => ({
      ...section,
      data: section.data.filter((item): item is Movie => item != null),
    })).filter(section => section.data.length > 0);
  }, [movieSections]);

  const renderAlphabeticalView = () => {
    if (isLoading) {
      return (
        <View style={styles.alphabeticalContainer}>
          <View style={styles.sectionListContent}>
            <SkeletonGrid count={12} itemWidth={POSTER_WIDTH - 8} itemHeight={POSTER_HEIGHT} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.alphabeticalContainer}>
        <SectionList
          key={`movies-alphabetical-${userId}-${movieLibraryIds.join(',')}`}
          ref={sectionListRef}
          sections={filteredSections}
          contentContainerStyle={styles.sectionListContent}
          renderItem={renderMovieRow}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item, index) => `${item.Id}-${index}`}
          stickySectionHeadersEnabled={true}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>{sortedMovies.length} of {totalCount} movies</Text>
          }
          ListFooterComponent={renderFooter}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
        />
        <AlphabetScroller
          availableLetters={availableLetters}
          onLetterPress={scrollToLetter}
          accentColor={accentColor}
        />
      </View>
    );
  };

  // Filter out null/undefined items for grid view
  const filteredMovies = useMemo(() => {
    return sortedMovies.filter((item): item is Movie => item != null);
  }, [sortedMovies]);

  const renderGridView = () => {
    if (isLoading) {
      return (
        <View style={styles.gridContent}>
          <SkeletonGrid count={12} itemWidth={POSTER_WIDTH} itemHeight={POSTER_HEIGHT} />
        </View>
      );
    }

    return (
      <FlatList
        key={`movies-grid-${userId}-${movieLibraryIds.join(',')}-${filters.sortBy}`}
        ref={flatListRef}
        data={filteredMovies}
        renderItem={renderMovieCard}
        keyExtractor={(item, index) => `${item.Id}-${index}`}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <Text style={styles.listHeader}>{filteredMovies.length} of {totalCount} movies</Text>
        }
        ListFooterComponent={renderFooter}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedGradient intensity="subtle" />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Movies</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={openFilterModal} style={styles.filterButton}>
            <Ionicons name="options-outline" size={22} color="#fff" />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
          <SearchButton />
        </View>
      </View>

      <View style={styles.sortInfoRow}>
        <Text style={styles.sortInfoText}>
          {totalCount} movies
          {filters.sortBy !== 'SortName' && ` • Sorted by ${filters.sortBy === 'DateCreated' ? 'Date Added' : filters.sortBy === 'PremiereDate' ? 'Year' : filters.sortBy === 'CommunityRating' ? 'Rating' : filters.sortBy === 'Runtime' ? 'Runtime' : filters.sortBy === 'Random' ? 'Random' : 'Name'}`}
        </Text>
        {activeFilterCount > 0 && (
          <Text style={[styles.filterActiveText, { color: accentColor }]}>
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
          </Text>
        )}
      </View>

      {filters.sortBy === 'SortName' ? renderAlphabeticalView() : renderGridView()}

      <FilterSortModal
        visible={showFilterModal}
        onClose={closeFilterModal}
        filters={filters}
        onApply={handleFiltersApply}
        availableGenres={availableGenres}
        accentColor={accentColor}
        showRuntimeSort={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  sortInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sortInfoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  filterActiveText: {
    fontSize: 13,
    fontWeight: '500',
  },
  alphabeticalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sectionListContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: GRID_GAP,
    marginBottom: 16,
  },
  sectionHeaderContainer: {
    backgroundColor: colors.background.primary,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listHeader: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  // Movie Card (Grid)
  movieCard: {
    width: POSTER_WIDTH,
  },
  posterContainer: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  posterPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 32,
    fontWeight: 'bold',
  },
  watchedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  movieYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    height: 14,
  },
  // Movie Row (List)
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  movieRowImageContainer: {
    width: 48,
    height: 72,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  movieRowImage: {
    width: '100%',
    height: '100%',
  },
  movieRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  movieRowPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: 'bold',
  },
  movieRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  movieRowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  movieRowMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  watchedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedIndicatorText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Alphabet Scroller
  alphabetContainer: {
    width: 24,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alphabetLetter: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  alphabetLetterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 14,
  },
  loadingFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingFooterText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 100,
  },
});
