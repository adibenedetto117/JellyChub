import { View, Text, SectionList, FlatList, Pressable, RefreshControl, ActivityIndicator, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useState, useCallback, useMemo, useRef, memo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore, useSettingsStore } from '@/stores';
import { getLibraries, getItems, getImageUrl } from '@/api';
import { SearchButton, HomeButton, AnimatedGradient } from '@/components/ui';
import { colors } from '@/theme';
import type { BaseItem, Series } from '@/types/jellyfin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 8;
const POSTER_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - (GRID_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

type SortOption = 'DateCreated' | 'SortName' | 'PremiereDate' | 'CommunityRating';

const ITEMS_PER_PAGE = 100;
const FULL_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

const ShowCard = memo(function ShowCard({ item, onPress, showRating }: { item: BaseItem; onPress: () => void; showRating?: boolean }) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 300, tag: item.ImageTags.Primary })
    : null;

  const yearAndRating = [
    item.ProductionYear,
    showRating && item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : null
  ].filter(Boolean).join(' • ');

  return (
    <Pressable onPress={onPress} style={styles.showCard}>
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
            <Text style={styles.posterPlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
        {item.UserData?.UnplayedItemCount === 0 && (
          <View style={styles.watchedBadge}>
            <Text style={styles.watchedBadgeText}>✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.showTitle} numberOfLines={1}>{item.Name}</Text>
      <Text style={styles.showYear}>{yearAndRating}</Text>
    </Pressable>
  );
});

const ShowRow = memo(function ShowRow({ item, onPress }: { item: BaseItem; onPress: () => void }) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;

  return (
    <Pressable onPress={onPress} style={styles.showRow}>
      <View style={styles.showRowImageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.showRowImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.Id}
          />
        ) : (
          <View style={styles.showRowPlaceholder}>
            <Text style={styles.showRowPlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.showRowInfo}>
        <Text style={styles.showRowName} numberOfLines={1}>{item.Name}</Text>
        <Text style={styles.showRowMeta} numberOfLines={1}>
          {[item.ProductionYear, item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : null].filter(Boolean).join(' • ')}
        </Text>
      </View>
      {item.UserData?.UnplayedItemCount === 0 && (
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

export default function ShowsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('SortName');
  const sectionListRef = useRef<SectionList>(null);
  const flatListRef = useRef<FlatList>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const showLibrary = libraries?.find((l) => l.CollectionType === 'tvshows');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['shows', userId, showLibrary?.Id],
    queryFn: ({ pageParam = 0 }) =>
      getItems<Series>(userId, {
        parentId: showLibrary?.Id,
        includeItemTypes: ['Series'],
        sortBy: 'SortName',
        sortOrder: 'Ascending',
        startIndex: pageParam,
        limit: ITEMS_PER_PAGE,
        recursive: true,
        fields: ['SortName'],
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId && !!showLibrary,
    staleTime: 1000 * 60 * 5,
  });

  const allShows = data?.pages.flatMap((p) => p.Items) ?? [];
  const totalCount = data?.pages[0]?.TotalRecordCount ?? 0;

  const sortedShows = useMemo(() => {
    if (allShows.length === 0) return [];

    const showsCopy = [...allShows];

    switch (sortBy) {
      case 'SortName':
        return showsCopy.sort((a, b) =>
          (a.SortName ?? a.Name ?? '').localeCompare(b.SortName ?? b.Name ?? '')
        );
      case 'DateCreated':
        return showsCopy.sort((a, b) => {
          const dateA = (a as any).DateCreated ?? '';
          const dateB = (b as any).DateCreated ?? '';
          return dateB.localeCompare(dateA);
        });
      case 'PremiereDate':
        return showsCopy.sort((a, b) =>
          (b.ProductionYear ?? 0) - (a.ProductionYear ?? 0)
        );
      case 'CommunityRating':
        return showsCopy.sort((a, b) =>
          (b.CommunityRating ?? 0) - (a.CommunityRating ?? 0)
        );
      default:
        return showsCopy;
    }
  }, [allShows, sortBy]);

  const { sections: showSections, availableLetters } = useMemo(() => {
    if (sortBy !== 'SortName') {
      return { sections: [], availableLetters: [] };
    }

    const grouped: Record<string, Series[]> = {};
    sortedShows.forEach((show) => {
      const sortName = show.SortName ?? show.Name ?? '?';
      const firstChar = sortName.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(show);
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
  }, [sortedShows, sortBy]);

  const scrollToLetter = useCallback((letter: string) => {
    const sectionIndex = showSections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  }, [showSections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleItemPress = (item: BaseItem) => {
    router.push(`/details/series/${item.Id}`);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    if (newSort === 'SortName') {
      sectionListRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: false, viewOffset: 0 });
    } else {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return <View style={styles.bottomSpacer} />;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={accentColor} size="small" />
        <Text style={styles.loadingFooterText}>Loading more...</Text>
      </View>
    );
  };

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: 'A-Z', value: 'SortName' },
    { label: 'Recent', value: 'DateCreated' },
    { label: 'Year', value: 'PremiereDate' },
    { label: 'Rating', value: 'CommunityRating' },
  ];

  const renderAlphabeticalView = () => (
    <View style={styles.alphabeticalContainer}>
      <SectionList
        ref={sectionListRef}
        sections={showSections}
        contentContainerStyle={styles.sectionListContent}
        renderItem={({ item }) => (
          <ShowRow item={item} onPress={() => handleItemPress(item)} />
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
          <Text style={styles.listHeader}>{sortedShows.length} of {totalCount} shows</Text>
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={accentColor} size="large" />
              <Text style={styles.loadingText}>Loading shows...</Text>
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
      data={sortedShows}
      renderItem={({ item }) => (
        <ShowCard item={item} onPress={() => handleItemPress(item)} showRating={sortBy !== 'SortName'} />
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
        <Text style={styles.listHeader}>{sortedShows.length} of {totalCount} shows</Text>
      }
      ListFooterComponent={renderFooter}
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={accentColor} size="large" />
            <Text style={styles.loadingText}>Loading shows...</Text>
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
      <AnimatedGradient intensity="subtle" />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <HomeButton currentScreen="shows" />
          <Text style={styles.headerTitle}>TV Shows</Text>
        </View>
        <SearchButton />
      </View>

      <View style={styles.sortContainer}>
        {sortOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => handleSortChange(option.value)}
            style={[
              styles.sortOption,
              sortBy === option.value && { backgroundColor: accentColor }
            ]}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === option.value && styles.sortOptionTextActive
            ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {sortBy === 'SortName' ? renderAlphabeticalView() : renderGridView()}
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
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sortOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface.default,
  },
  sortOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#fff',
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
  // Show Card (Grid)
  showCard: {
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
  showTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  showYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    height: 14,
  },
  // Show Row (List)
  showRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  showRowImageContainer: {
    width: 48,
    height: 72,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  showRowImage: {
    width: '100%',
    height: '100%',
  },
  showRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  showRowPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: 'bold',
  },
  showRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  showRowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  showRowMeta: {
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
