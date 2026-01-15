import { View, Text, SectionList, FlatList, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from '@/providers';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore } from '@/stores';
import {
  getLibraries,
  getItems,
  getLibraryItemTypes,
  shouldUseSquareVariant,
  getLibraryIcon,
  getGenres,
} from '@/api';
import { SkeletonGrid } from '@/components/shared/ui';
import {
  FilterSortModal,
  DEFAULT_FILTERS,
  getActiveFilterCount,
  ItemCard,
  ItemRow,
  AlphabetScroller,
  LibraryDetailHeader,
  SortInfoRow,
  ITEM_CARD_DIMENSIONS,
} from '@/components/shared/library';
import type { FilterOptions } from '@/components/shared/library';
import { goBack, navigateToDetails } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

const { POSTER_WIDTH, POSTER_HEIGHT, GRID_PADDING, GRID_GAP, NUM_COLUMNS } = ITEM_CARD_DIMENSIONS;
const ITEMS_PER_PAGE = 100;

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

export default function LibraryDetailScreen() {
  const { id: libraryId, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const sectionListRef = useRef<SectionList>(null);
  const flatListRef = useRef<FlatList>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const userId = currentUser?.Id ?? '';

  const { data: libraries, isLoading: librariesLoading } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const library = useMemo(() => {
    return libraries?.find((l) => l.Id === libraryId);
  }, [libraries, libraryId]);

  const itemTypes = useMemo(() => {
    if (!library) return [];
    return getLibraryItemTypes(library.CollectionType);
  }, [library]);

  const isSquare = useMemo(() => {
    if (!library) return false;
    return shouldUseSquareVariant(library.CollectionType);
  }, [library]);

  const { data: genresData } = useQuery({
    queryKey: ['genres', 'library', libraryId, userId],
    queryFn: () => getGenres(userId, libraryId, itemTypes),
    enabled: !!userId && !!libraryId && itemTypes.length > 0,
    staleTime: 1000 * 60 * 30,
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
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['libraryDetail', userId, libraryId, filters],
    queryFn: ({ pageParam = 0 }) =>
      getItems<BaseItem>(userId, {
        parentId: libraryId,
        includeItemTypes: itemTypes,
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
      if (!lastPage?.Items) return undefined;
      const totalFetched = pages.reduce((acc, p) => acc + (p.Items?.length ?? 0), 0);
      return totalFetched < (lastPage.TotalRecordCount ?? 0) ? totalFetched : undefined;
    },
    enabled: !!userId && !!libraryId && itemTypes.length > 0,
    staleTime: filters.sortBy === 'Random' ? 0 : 1000 * 60 * 5,
  });

  const allItems = (data?.pages?.flatMap((p) => p?.Items ?? []) ?? []).filter(
    (item): item is BaseItem => item != null && item.Id != null
  );
  const totalCount = data?.pages?.[0]?.TotalRecordCount ?? 0;
  const sortedItems = allItems.filter((item): item is BaseItem => item != null && item.Id != null);

  const { sections: itemSections, availableLetters } = useMemo(() => {
    if (filters.sortBy !== 'SortName') {
      return { sections: [], availableLetters: [] };
    }

    const grouped: Record<string, BaseItem[]> = {};
    sortedItems.forEach((item) => {
      if (!item) return;
      const sortName = item.SortName ?? item.Name ?? '?';
      const firstChar = sortName.length > 0 ? sortName.charAt(0).toUpperCase() : '#';
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(item);
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
  }, [sortedItems, filters.sortBy]);

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const scrollToLetter = useCallback((letter: string) => {
    const sectionIndex = itemSections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  }, [itemSections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleItemPress = useCallback((item: BaseItem) => {
    if (!item?.Id) return;
    const type = item.Type?.toLowerCase();
    const sourceRoute = `/library/${libraryId}`;
    if (type === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (type === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else {
      const detailType = type === 'musicalbum' ? 'album' : type;
      navigateToDetails(detailType || 'item', item.Id, sourceRoute);
    }
  }, [libraryId]);

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
  const handleBack = useCallback(() => goBack(from, '/(tabs)/library'), [from]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return <View style={styles.bottomSpacer} />;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={accentColor} size="small" />
        <Text style={styles.loadingFooterText}>Loading more...</Text>
      </View>
    );
  }, [isFetchingNextPage, accentColor]);

  const showRuntimeSort = useMemo(() => {
    if (!library) return false;
    const runtimeTypes = ['movies', 'tvshows', 'musicvideos'];
    return runtimeTypes.includes(library.CollectionType ?? '');
  }, [library]);

  const iconName = library ? getLibraryIcon(library.CollectionType) : 'library';

  const renderAlphabeticalView = () => (
    <View style={styles.alphabeticalContainer}>
      <SectionList
        key={`section-${libraryId}`}
        ref={sectionListRef}
        style={{ flex: 1 }}
        sections={itemSections}
        contentContainerStyle={styles.sectionListContent}
        renderItem={({ item }) => (
          <ItemRow item={item} onPress={() => handleItemPress(item)} isSquare={isSquare} hideMedia={hideMedia} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionHeaderText, { color: accentColor }]}>{section.title}</Text>
          </View>
        )}
        keyExtractor={(item, index) => `${item.Id}-${index}`}
        stickySectionHeadersEnabled={true}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
        ListHeaderComponent={
          <Text style={styles.listHeader}>{sortedItems.length} of {totalCount} items</Text>
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={null}
      />
      <AlphabetScroller
        availableLetters={availableLetters}
        onLetterPress={scrollToLetter}
        accentColor={accentColor}
      />
    </View>
  );

  const renderGridView = () => (
    <FlatList
      key={`grid-${libraryId}-${filters.sortBy}`}
      ref={flatListRef}
      style={{ flex: 1 }}
      data={sortedItems}
      renderItem={({ item }) => (
        <ItemCard item={item} onPress={() => handleItemPress(item)} showRating={filters.sortBy !== 'SortName'} isSquare={isSquare} hideMedia={hideMedia} />
      )}
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
        <Text style={styles.listHeader}>{sortedItems.length} of {totalCount} items</Text>
      }
      ListFooterComponent={renderFooter}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name={getIoniconName(iconName)} size={48} color={accentColor} />
          </View>
          <Text style={styles.emptyTitle}>No items found</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilterCount > 0
              ? 'Try adjusting your filters'
              : 'Nothing to show here'}
          </Text>
        </View>
      }
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={5}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LibraryDetailHeader
        title={library?.Name ?? 'Library'}
        iconName={iconName}
        accentColor={accentColor}
        activeFilterCount={activeFilterCount}
        onBack={handleBack}
        onFilterPress={openFilterModal}
      />

      <SortInfoRow
        totalCount={totalCount}
        sortBy={filters.sortBy}
        activeFilterCount={activeFilterCount}
        accentColor={accentColor}
      />

      {isError ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          </View>
          <Text style={styles.emptyTitle}>Failed to load library</Text>
          <Text style={styles.emptySubtitle}>
            There was an error loading this library. Please try again.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryButton, { borderColor: accentColor }]}
          >
            <Text style={[styles.retryButtonText, { color: accentColor }]}>Retry</Text>
          </Pressable>
        </View>
      ) : isLoading || librariesLoading || itemTypes.length === 0 ? (
        <View style={styles.gridContent}>
          <SkeletonGrid count={12} itemWidth={POSTER_WIDTH - 8} itemHeight={isSquare ? POSTER_WIDTH - 8 : POSTER_HEIGHT} />
        </View>
      ) : filters.sortBy === 'SortName' ? renderAlphabeticalView() : renderGridView()}

      <FilterSortModal
        visible={showFilterModal}
        onClose={closeFilterModal}
        filters={filters}
        onApply={handleFiltersApply}
        availableGenres={availableGenres}
        accentColor={accentColor}
        showRuntimeSort={showRuntimeSort}
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
    flexGrow: 1,
  },
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 100,
    flexGrow: 1,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
