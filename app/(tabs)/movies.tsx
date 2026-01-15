import { View, Text, SectionList, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from '@/providers';
import { useAuthStore, useSettingsStore } from '@/stores';
import { getLibraries, getImageUrl, getLibraryIdsByType, getItemsFromMultipleLibraries, getGenres } from '@/api';
import { AnimatedGradient, SkeletonGrid } from '@/components/shared/ui';
import { FilterSortModal, DEFAULT_FILTERS, getActiveFilterCount } from '@/components/shared/library';
import type { FilterOptions } from '@/components/shared/library';
import {
  BrowseHeader,
  BrowseInfoRow,
  MediaGridCard,
  MediaListRow,
  AlphabetScroller,
  AlphabetSectionHeader,
  LoadingFooter,
  ListHeader,
  POSTER_WIDTH,
  POSTER_HEIGHT,
  GRID_PADDING,
  GRID_GAP,
  NUM_COLUMNS,
  useMediaBrowse,
} from '@/components/shared/browse';
import { navigateToDetails } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem, Movie } from '@/types/jellyfin';

const ITEMS_PER_PAGE = 100;

export default function MoviesScreen() {
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const sectionListRef = useRef<SectionList>(null);
  const flatListRef = useRef<FlatList>(null);

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

  const {
    refreshing,
    setRefreshing,
    sections,
    availableLetters,
    filteredItems,
    scrollToLetter,
    resetScroll,
    isAlphabetical,
  } = useMediaBrowse({
    items: allMovies,
    sortBy: filters.sortBy,
    onItemPress: (item) => navigateToDetails('movie', item.Id, '/(tabs)/movies'),
  });

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch, setRefreshing]);

  const handleFiltersApply = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    resetScroll(newFilters.sortBy === 'SortName');
  }, [resetScroll]);

  const openFilterModal = useCallback(() => setShowFilterModal(true), []);
  const closeFilterModal = useCallback(() => setShowFilterModal(false), []);

  const handleItemPress = useCallback((item: BaseItem) => {
    navigateToDetails('movie', item.Id, '/(tabs)/movies');
  }, []);

  const renderMovieRow = useCallback(({ item }: { item: BaseItem }) => (
    <MediaListRow
      item={item}
      onPress={() => handleItemPress(item)}
      hideMedia={hideMedia}
      isWatched={item.UserData?.Played}
    />
  ), [handleItemPress, hideMedia]);

  const renderMovieCard = useCallback(({ item }: { item: BaseItem }) => (
    <MediaGridCard
      item={item}
      onPress={() => handleItemPress(item)}
      hideMedia={hideMedia}
      showRating={!isAlphabetical}
      isWatched={item.UserData?.Played}
    />
  ), [handleItemPress, isAlphabetical, hideMedia]);

  const renderSectionHeader = useCallback(({ section }: any) => (
    <AlphabetSectionHeader title={section.title} accentColor={accentColor} />
  ), [accentColor]);

  const renderFooter = useCallback(() => (
    <LoadingFooter isLoading={isFetchingNextPage} accentColor={accentColor} />
  ), [isFetchingNextPage, accentColor]);

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
          sections={sections}
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
            <ListHeader currentCount={filteredItems.length} totalCount={totalCount} itemLabel="movies" />
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
        data={filteredItems}
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
          <ListHeader currentCount={filteredItems.length} totalCount={totalCount} itemLabel="movies" />
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
      <BrowseHeader
        title="Movies"
        searchFilter="Movie"
        onFilterPress={openFilterModal}
        activeFilterCount={activeFilterCount}
        accentColor={accentColor}
      />
      <BrowseInfoRow
        totalCount={totalCount}
        itemLabel="movies"
        sortBy={filters.sortBy}
        activeFilterCount={activeFilterCount}
        accentColor={accentColor}
      />

      {isAlphabetical ? renderAlphabeticalView() : renderGridView()}

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
});
