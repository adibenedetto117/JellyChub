import { View, Text, SectionList, FlatList, Pressable, RefreshControl, ActivityIndicator, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore } from '@/stores';
import {
  getLibraries,
  getItems,
  getImageUrl,
  getLibraryItemTypes,
  shouldUseSquareVariant,
  getLibraryIcon,
  getGenres,
} from '@/api';
import { SearchButton } from '@/components/ui';
import { FilterSortModal, DEFAULT_FILTERS, getActiveFilterCount } from '@/components/library';
import type { FilterOptions, SortOption } from '@/components/library';
import { getDisplayName, getDisplayImageUrl, goBack } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 8;
const POSTER_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - (GRID_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const SQUARE_SIZE = POSTER_WIDTH;

const ITEMS_PER_PAGE = 100;
const FULL_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

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

function ItemCard({ item, onPress, showRating, isSquare, hideMedia }: { item: BaseItem; onPress: () => void; showRating?: boolean; isSquare?: boolean; hideMedia: boolean }) {
  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 300, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  const yearAndRating = [
    item.ProductionYear,
    showRating && item.CommunityRating ? `${item.CommunityRating.toFixed(1)}` : null
  ].filter(Boolean).join(' - ');

  const cardWidth = isSquare ? SQUARE_SIZE : POSTER_WIDTH;
  const cardHeight = isSquare ? SQUARE_SIZE : POSTER_HEIGHT;

  return (
    <Pressable onPress={onPress} style={[styles.itemCard, { width: cardWidth }]}>
      <View style={[styles.posterContainer, { width: cardWidth, height: cardHeight }]}>
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
      <Text style={styles.itemTitle} numberOfLines={1}>{displayName}</Text>
      {yearAndRating ? <Text style={styles.itemYear}>{yearAndRating}</Text> : null}
    </Pressable>
  );
}

function ItemRow({ item, onPress, isSquare, hideMedia }: { item: BaseItem; onPress: () => void; isSquare?: boolean; hideMedia: boolean }) {
  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  const imgWidth = isSquare ? 48 : 48;
  const imgHeight = isSquare ? 48 : 72;

  return (
    <Pressable onPress={onPress} style={styles.itemRow}>
      <View style={[styles.itemRowImageContainer, { width: imgWidth, height: imgHeight }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.itemRowImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.Id}
          />
        ) : (
          <View style={styles.itemRowPlaceholder}>
            <Text style={styles.itemRowPlaceholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.itemRowInfo}>
        <Text style={styles.itemRowName} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.itemRowMeta} numberOfLines={1}>
          {[item.ProductionYear, item.CommunityRating ? `${item.CommunityRating.toFixed(1)}` : null].filter(Boolean).join(' - ')}
        </Text>
      </View>
      {item.UserData?.Played && (
        <View style={styles.watchedIndicator}>
          <Text style={styles.watchedIndicatorText}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

function AlphabetScroller({ availableLetters, onLetterPress, accentColor }: { availableLetters: string[]; onLetterPress: (letter: string) => void; accentColor: string }) {
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
}

export default function LibraryDetailScreen() {
  const { id: libraryId } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);
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
    staleTime: 1000 * 60 * 5,
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
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId && !!libraryId && itemTypes.length > 0,
    staleTime: filters.sortBy === 'Random' ? 0 : 1000 * 60 * 5,
  });

  const allItems = data?.pages.flatMap((p) => p.Items) ?? [];
  const totalCount = data?.pages[0]?.TotalRecordCount ?? 0;
  const sortedItems = allItems;

  const { sections: itemSections, availableLetters } = useMemo(() => {
    if (filters.sortBy !== 'SortName') {
      return { sections: [], availableLetters: [] };
    }

    const grouped: Record<string, BaseItem[]> = {};
    sortedItems.forEach((item) => {
      const sortName = item.SortName ?? item.Name ?? '?';
      const firstChar = sortName.charAt(0).toUpperCase();
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

  const handleItemPress = (item: BaseItem) => {
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
    } else if (type === 'boxset') {
      router.push(`/(tabs)/library/${item.Id}`);
    } else {
      router.push(`/(tabs)/details/${type}/${item.Id}`);
    }
  };

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

  const renderFooter = () => {
    if (!isFetchingNextPage) return <View style={styles.bottomSpacer} />;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={accentColor} size="small" />
        <Text style={styles.loadingFooterText}>Loading more...</Text>
      </View>
    );
  };

  const showRatingSort = useMemo(() => {
    if (!library) return false;
    const noRatingTypes = ['homevideos', 'boxsets', null, undefined];
    return !noRatingTypes.includes(library.CollectionType);
  }, [library]);

  const showRuntimeSort = useMemo(() => {
    if (!library) return false;
    const runtimeTypes = ['movies', 'tvshows', 'musicvideos'];
    return runtimeTypes.includes(library.CollectionType ?? '');
  }, [library]);

  const iconName = library ? getLibraryIcon(library.CollectionType) : 'library';

  const renderAlphabeticalView = () => (
    <View style={styles.alphabeticalContainer}>
      <SectionList
        ref={sectionListRef}
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
        keyExtractor={(item) => item.Id}
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
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={accentColor} size="large" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : null
        }
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
      ref={flatListRef}
      data={sortedItems}
      renderItem={({ item }) => (
        <ItemCard item={item} onPress={() => handleItemPress(item)} showRating={filters.sortBy !== 'SortName'} isSquare={isSquare} hideMedia={hideMedia} />
      )}
      keyExtractor={(item) => item.Id}
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
        isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={accentColor} size="large" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : null
      }
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={5}
      removeClippedSubviews={true}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => goBack('/(tabs)/library')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={[styles.libraryIcon, { backgroundColor: accentColor }]}>
            <Ionicons name={getIoniconName(iconName)} size={18} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>{library?.Name ?? 'Library'}</Text>
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
          {totalCount} items
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  libraryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  itemCard: {
    width: POSTER_WIDTH,
  },
  posterContainer: {
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
  itemTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  itemYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    height: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  itemRowImageContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  itemRowImage: {
    width: '100%',
    height: '100%',
  },
  itemRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  itemRowPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemRowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  itemRowMeta: {
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
