import { View, Text, SectionList, RefreshControl, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore, useReadingProgressStore, useDownloadStore } from '@/stores';
import { getLibraries, getLibraryIdsByType, getItemsFromMultipleLibraries } from '@/api';
import { SkeletonRow } from '@/components/shared/ui';
import {
  BrowseHeader,
  TabsContainer,
  PillTabButton,
  AlphabetScroller,
  AlphabetSectionHeader,
  LoadingFooter,
  SectionHeader,
  groupByFirstLetter,
} from '@/components/shared/browse';
import {
  BookCard,
  BookRow,
  ContinueReadingCard,
  BookmarkItem,
  BOOK_WIDTH,
  BOOK_HEIGHT,
} from '@/components/shared/books';
import { formatPlayerTime, ticksToMs } from '@/utils';
import { colors } from '@/theme';
import { downloadManager } from '@/services/downloadManager';
import type { BaseItem, Book, AudioBook } from '@/types/jellyfin';

const ITEMS_PER_PAGE = 50;

type ViewMode = 'home' | 'ebooks' | 'audiobooks' | 'bookmarks';

export default function BooksScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const sectionListRef = useRef<SectionList>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const userId = currentUser?.Id ?? '';

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
  });

  const bookLibraryIds = useMemo(() => {
    if (!libraries) return [];
    const booksLibIds = getLibraryIdsByType(libraries, 'books');
    const audiobooksLibIds = getLibraryIdsByType(libraries, 'audiobooks');
    return [...new Set([...booksLibIds, ...audiobooksLibIds])];
  }, [libraries]);

  const hasBookLibraries = bookLibraryIds.length > 0;

  const readingProgress = useReadingProgressStore((state) => state.progress);
  const bookmarks = useReadingProgressStore((state) => state.bookmarks);
  const ebookBookmarks = useReadingProgressStore((state) => state.ebookBookmarks);
  const removeBookmark = useReadingProgressStore((state) => state.removeBookmark);
  const removeEbookBookmark = useReadingProgressStore((state) => state.removeEbookBookmark);

  const getDownloadedItem = useDownloadStore((s) => s.getDownloadedItem);
  const activeServerId = useAuthStore((s) => s.activeServerId);

  const handleDownload = useCallback(async (item: BaseItem) => {
    if (activeServerId) {
      await downloadManager.startDownload(item, activeServerId);
      Alert.alert('Download Started', `${item.Name} has been added to downloads`);
    }
  }, [activeServerId]);

  const handleDeleteDownload = useCallback(async (itemId: string) => {
    const download = getDownloadedItem(itemId);
    if (download) {
      await downloadManager.deleteDownload(download.id);
      Alert.alert('Download Removed', 'The download has been removed');
    }
  }, [getDownloadedItem]);

  const handleLongPress = useCallback((item: BaseItem) => {
    const downloaded = getDownloadedItem(item.Id);
    Alert.alert(
      item.Name || 'Book',
      'What would you like to do?',
      [
        downloaded
          ? { text: 'Remove Download', style: 'destructive', onPress: () => handleDeleteDownload(item.Id) }
          : { text: 'Download for Offline', onPress: () => handleDownload(item) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [getDownloadedItem, handleDownload, handleDeleteDownload]);

  const recentlyReading = useMemo(() => {
    return Object.values(readingProgress)
      .filter((p) => p.percent > 0 && p.percent < 100)
      .sort((a, b) => b.lastRead - a.lastRead);
  }, [readingProgress]);

  const getProgressForItem = (itemId: string) => readingProgress[itemId]?.percent ?? 0;

  const { data: booksData, isLoading: latestBooksLoading } = useQuery({
    queryKey: ['libraryPreview', userId, bookLibraryIds.join(',')],
    queryFn: () =>
      getItemsFromMultipleLibraries<BaseItem>(userId, bookLibraryIds, {
        includeItemTypes: ['Book', 'AudioBook'],
        sortBy: 'DateCreated',
        sortOrder: 'Descending',
        limit: 40,
        recursive: true,
      }),
    enabled: !!userId && hasBookLibraries,
    staleTime: Infinity,
  });

  const latestEbooks = booksData?.Items?.filter(item => item.Type === 'Book') as Book[] | undefined;
  const latestAudiobooks = booksData?.Items?.filter(item => item.Type === 'AudioBook') as AudioBook[] | undefined;

  const {
    data: ebooksData,
    fetchNextPage: fetchNextEbooks,
    hasNextPage: hasNextEbooks,
    isFetchingNextPage: isFetchingEbooks,
    isLoading: ebooksLoading,
    refetch: refetchEbooks,
  } = useInfiniteQuery({
    queryKey: ['allEbooks', userId, bookLibraryIds.join(',')],
    queryFn: ({ pageParam = 0 }) =>
      getItemsFromMultipleLibraries<Book>(userId, bookLibraryIds, {
        includeItemTypes: ['Book'],
        sortBy: 'SortName',
        sortOrder: 'Ascending',
        startIndex: pageParam,
        limit: ITEMS_PER_PAGE,
        recursive: true,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId && hasBookLibraries && viewMode === 'ebooks',
    staleTime: Infinity,
  });

  const {
    data: audiobooksData,
    fetchNextPage: fetchNextAudiobooks,
    hasNextPage: hasNextAudiobooks,
    isFetchingNextPage: isFetchingAudiobooks,
    isLoading: audiobooksLoading,
    refetch: refetchAudiobooks,
  } = useInfiniteQuery({
    queryKey: ['allAudiobooks', userId, bookLibraryIds.join(',')],
    queryFn: ({ pageParam = 0 }) =>
      getItemsFromMultipleLibraries<AudioBook>(userId, bookLibraryIds, {
        includeItemTypes: ['AudioBook'],
        sortBy: 'SortName',
        sortOrder: 'Ascending',
        startIndex: pageParam,
        limit: ITEMS_PER_PAGE,
        recursive: true,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId && hasBookLibraries && viewMode === 'audiobooks',
    staleTime: Infinity,
  });

  const allEbooks = ebooksData?.pages.flatMap((p) => p.Items) ?? [];
  const allAudiobooks = audiobooksData?.pages.flatMap((p) => p.Items) ?? [];

  const { sections: ebooksSections, availableLetters: ebooksAvailableLetters } = useMemo(() => groupByFirstLetter(allEbooks), [allEbooks]);
  const { sections: audiobooksSections, availableLetters: audiobooksAvailableLetters } = useMemo(() => groupByFirstLetter(allAudiobooks), [allAudiobooks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (viewMode === 'ebooks') await refetchEbooks();
    else if (viewMode === 'audiobooks') await refetchAudiobooks();
    setRefreshing(false);
  }, [viewMode, refetchEbooks, refetchAudiobooks]);

  const handleItemPress = useCallback((item: BaseItem) => {
    if (item.Type === 'AudioBook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const mediaType = (item as any).MediaType?.toLowerCase() || '';
      const name = item.Name?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf') || mediaType === 'pdf' || name.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    }
  }, []);

  const scrollToLetter = useCallback((letter: string, sections: { title: string }[]) => {
    const sectionIndex = sections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({ sectionIndex, itemIndex: 0, animated: true, viewPosition: 0 });
    }
  }, []);

  const renderSectionHeader = useCallback(({ section }: any) => (
    <AlphabetSectionHeader title={section.title} accentColor={accentColor} />
  ), [accentColor]);

  const renderHomeView = () => (
    <ScrollView style={styles.homeScroll} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
      {recentlyReading.length > 0 && (
        <>
          <SectionHeader title="Continue Reading" accentColor={accentColor} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {recentlyReading.slice(0, 10).map((progress) => (
              <View key={progress.itemId} style={styles.continueItem}>
                <ContinueReadingCard
                  item={{ Id: progress.itemId, Name: progress.itemName, Type: progress.itemType, ImageTags: progress.coverImageTag ? { Primary: progress.coverImageTag } : undefined } as BaseItem}
                  onPress={() => handleItemPress({ Id: progress.itemId, Type: progress.itemType } as BaseItem)}
                  progress={progress.percent}
                  hideMedia={hideMedia}
                />
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <SectionHeader title="Recent eBooks" onSeeAll={() => setViewMode('ebooks')} accentColor={accentColor} />
      {latestBooksLoading ? (
        <SkeletonRow title={false} cardWidth={BOOK_WIDTH} cardHeight={BOOK_HEIGHT} count={4} />
      ) : latestEbooks && latestEbooks.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {latestEbooks.map((item) => (
            <View key={item.Id} style={styles.horizontalItem}>
              <BookCard item={item} onPress={() => handleItemPress(item)} onLongPress={() => handleLongPress(item)} progress={getProgressForItem(item.Id)} hideMedia={hideMedia} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}><Text style={styles.emptyStateText}>No eBooks found</Text></View>
      )}

      <SectionHeader title="Recent Audiobooks" onSeeAll={() => setViewMode('audiobooks')} accentColor={accentColor} />
      {latestBooksLoading ? (
        <SkeletonRow title={false} cardWidth={BOOK_WIDTH} cardHeight={BOOK_HEIGHT} count={4} />
      ) : latestAudiobooks && latestAudiobooks.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {latestAudiobooks.map((item) => (
            <View key={item.Id} style={styles.horizontalItem}>
              <BookCard item={item} onPress={() => handleItemPress(item)} onLongPress={() => handleLongPress(item)} progress={getProgressForItem(item.Id)} hideMedia={hideMedia} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}><Text style={styles.emptyStateText}>No audiobooks found</Text></View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderEbooksView = () => (
    <View style={styles.listContainer}>
      {ebooksLoading ? (
        <View style={styles.fullScreenLoading}>
          <SkeletonRow title={false} cardWidth={60} cardHeight={60} count={6} isSquare />
          <SkeletonRow title={false} cardWidth={60} cardHeight={60} count={6} isSquare />
        </View>
      ) : (
        <>
          <SectionList
            ref={sectionListRef}
            sections={ebooksSections}
            keyExtractor={(item) => item.Id}
            style={styles.sectionList}
            renderItem={({ item }) => <BookRow item={item} onPress={() => handleItemPress(item)} onLongPress={() => handleLongPress(item)} progress={getProgressForItem(item.Id)} hideMedia={hideMedia} />}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.sectionListContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            onEndReached={() => { if (hasNextEbooks && !isFetchingEbooks) fetchNextEbooks(); }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={<Text style={styles.listHeader}>{allEbooks.length} / {ebooksData?.pages[0]?.TotalRecordCount ?? 0} eBooks</Text>}
            ListFooterComponent={<LoadingFooter isLoading={isFetchingEbooks} accentColor={accentColor} />}
            ListEmptyComponent={<View style={styles.emptyStateContainer}><Text style={styles.emptyStateTitle}>No eBooks found</Text></View>}
          />
          <AlphabetScroller availableLetters={ebooksAvailableLetters} onLetterPress={(l) => scrollToLetter(l, ebooksSections)} accentColor={accentColor} />
        </>
      )}
    </View>
  );

  const renderAudiobooksView = () => (
    <View style={styles.listContainer}>
      {audiobooksLoading ? (
        <View style={styles.fullScreenLoading}>
          <SkeletonRow title={false} cardWidth={60} cardHeight={60} count={6} isSquare />
          <SkeletonRow title={false} cardWidth={60} cardHeight={60} count={6} isSquare />
        </View>
      ) : (
        <>
          <SectionList
            ref={sectionListRef}
            sections={audiobooksSections}
            keyExtractor={(item) => item.Id}
            style={styles.sectionList}
            renderItem={({ item }) => <BookRow item={item} onPress={() => handleItemPress(item)} onLongPress={() => handleLongPress(item)} isAudiobook progress={getProgressForItem(item.Id)} hideMedia={hideMedia} />}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.sectionListContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            onEndReached={() => { if (hasNextAudiobooks && !isFetchingAudiobooks) fetchNextAudiobooks(); }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={<Text style={styles.listHeader}>{allAudiobooks.length} / {audiobooksData?.pages[0]?.TotalRecordCount ?? 0} audiobooks</Text>}
            ListFooterComponent={<LoadingFooter isLoading={isFetchingAudiobooks} accentColor={accentColor} />}
            ListEmptyComponent={<View style={styles.emptyStateContainer}><Text style={styles.emptyStateTitle}>No audiobooks found</Text></View>}
          />
          <AlphabetScroller availableLetters={audiobooksAvailableLetters} onLetterPress={(l) => scrollToLetter(l, audiobooksSections)} accentColor={accentColor} />
        </>
      )}
    </View>
  );

  const renderBookmarksView = () => {
    const totalBookmarks = bookmarks.length + ebookBookmarks.length;
    if (totalBookmarks === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={[styles.emptyStateIcon, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="bookmark" size={32} color={accentColor} />
          </View>
          <Text style={styles.emptyStateTitle}>No bookmarks yet</Text>
          <Text style={styles.emptyStateSubtitle}>Add bookmarks while reading</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.bookmarksScroll} contentContainerStyle={styles.bookmarksContent}>
        <Text style={styles.listHeader}>{totalBookmarks} {totalBookmarks === 1 ? 'bookmark' : 'bookmarks'}</Text>
        {ebookBookmarks.map((bookmark) => (
          <BookmarkItem
            key={bookmark.id}
            bookTitle={bookmark.bookTitle || 'Unknown Book'}
            name={bookmark.name || 'Bookmark'}
            timeOrProgress={`${bookmark.progress}% through book`}
            isAudiobook={false}
            accentColor={accentColor}
            onPress={() => router.push(`/reader/epub?itemId=${bookmark.itemId}&cfi=${encodeURIComponent(bookmark.cfi)}`)}
            onDelete={() => removeEbookBookmark(bookmark.id)}
          />
        ))}
        {bookmarks.map((bookmark) => (
          <BookmarkItem
            key={bookmark.id}
            bookTitle={bookmark.bookTitle || 'Unknown Book'}
            name={bookmark.name || 'Bookmark'}
            timeOrProgress={formatPlayerTime(ticksToMs(bookmark.positionTicks))}
            isAudiobook={true}
            accentColor={accentColor}
            onPress={() => router.push(`/player/audiobook?itemId=${bookmark.itemId}&startPosition=${ticksToMs(bookmark.positionTicks)}`)}
            onDelete={() => removeBookmark(bookmark.id)}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrowseHeader title="Books" searchFilter="Book" accentColor={accentColor} showFilterButton={false} />

      <TabsContainer>
        <PillTabButton label="Home" active={viewMode === 'home'} onPress={() => setViewMode('home')} accentColor={accentColor} />
        <PillTabButton label="eBooks" active={viewMode === 'ebooks'} onPress={() => setViewMode('ebooks')} accentColor={accentColor} />
        <PillTabButton label="Audiobooks" active={viewMode === 'audiobooks'} onPress={() => setViewMode('audiobooks')} accentColor={accentColor} />
        <PillTabButton label="Bookmarks" active={viewMode === 'bookmarks'} onPress={() => setViewMode('bookmarks')} accentColor={accentColor} />
      </TabsContainer>

      {viewMode === 'home' && renderHomeView()}
      {viewMode === 'ebooks' && renderEbooksView()}
      {viewMode === 'audiobooks' && renderAudiobooksView()}
      {viewMode === 'bookmarks' && renderBookmarksView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  homeScroll: {
    flex: 1,
  },
  homeContent: {
    paddingBottom: 100,
  },
  listContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sectionList: {
    flex: 1,
  },
  sectionListContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listHeader: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  horizontalItem: {
    marginRight: 14,
  },
  continueItem: {
    marginRight: 14,
  },
  bookmarksScroll: {
    flex: 1,
  },
  bookmarksContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  fullScreenLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  bottomSpacer: {
    height: 100,
  },
});
