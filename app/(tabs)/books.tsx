import { View, Text, SectionList, Pressable, RefreshControl, ScrollView, Dimensions, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useState, useCallback, useMemo, useRef, memo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore, useReadingProgressStore } from '@/stores';
import { getItems, getImageUrl, getLibraries } from '@/api';
import { SearchButton, HomeButton } from '@/components/ui';
import { formatPlayerTime, ticksToMs } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem, Book, AudioBook } from '@/types/jellyfin';
import type { AudiobookBookmark, EbookBookmark } from '@/stores/readingProgressStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_BOOK_WIDTH = 100;
const HORIZONTAL_BOOK_HEIGHT = 140;
const ITEMS_PER_PAGE = 50;

type ViewMode = 'home' | 'ebooks' | 'audiobooks' | 'bookmarks';

const FULL_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

interface BookCardProps {
  item: BaseItem;
  onPress: () => void;
  width?: number;
  height?: number;
  progress?: number;
}

function BookCard({ item, onPress, width = HORIZONTAL_BOOK_WIDTH, height = HORIZONTAL_BOOK_HEIGHT, progress }: BookCardProps) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 400, tag: item.ImageTags.Primary })
    : null;
  const author = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0] ?? '';
  const accentColor = useSettingsStore((s) => s.accentColor);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.bookCard, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.bookImageContainer, { width, height }]}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.bookImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.bookPlaceholder}>
            <Text style={styles.bookPlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
        {progress !== undefined && progress > 0 && (
          <View style={styles.progressOverlay}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </View>
      <Text style={[styles.bookTitle, { width }]} numberOfLines={2}>{item.Name}</Text>
      {author ? <Text style={[styles.bookAuthor, { width }]} numberOfLines={1}>{author}</Text> : null}
    </Pressable>
  );
}

function BookRow({ item, onPress, isAudiobook = false, progress }: { item: BaseItem; onPress: () => void; isAudiobook?: boolean; progress?: number }) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;
  const author = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0] ?? '';
  const duration = item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null;
  const accentColor = useSettingsStore((s) => s.accentColor);

  return (
    <Pressable onPress={onPress} style={styles.bookRow}>
      <View style={styles.bookRowImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.bookRowImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.bookRowPlaceholder}>
            <Text style={styles.bookRowPlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.bookRowInfo}>
        <Text style={styles.bookRowName} numberOfLines={1}>{item.Name}</Text>
        {author ? <Text style={styles.bookRowAuthor} numberOfLines={1}>{author}</Text> : null}
        <View style={styles.bookRowMeta}>
          {isAudiobook && duration ? <Text style={styles.bookRowDuration}>{duration}h</Text> : null}
          {progress !== undefined && progress > 0 && (
            <View style={styles.bookRowProgressContainer}>
              <View style={styles.bookRowProgressTrack}>
                <View style={[styles.bookRowProgressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
              </View>
              <Text style={styles.bookRowProgressText}>{progress}%</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ContinueReadingCard({ item, onPress, progress }: { item: BaseItem; onPress: () => void; progress: number }) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 300, tag: item.ImageTags.Primary })
    : null;
  const author = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0] ?? '';
  const accentColor = useSettingsStore((s) => s.accentColor);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.continueCard, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.continueImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.continueImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.continuePlaceholder}>
            <Text style={styles.continuePlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
        <View style={styles.continueProgressOverlay}>
          <View style={styles.continueProgressTrack}>
            <View style={[styles.continueProgressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
          </View>
        </View>
      </View>
      <Text style={styles.continueTitle} numberOfLines={1}>{item.Name}</Text>
      {author ? <Text style={styles.continueAuthor} numberOfLines={1}>{author}</Text> : null}
      <Text style={styles.continueProgressText}>{progress}%</Text>
    </Pressable>
  );
}

function AlphabetScroller({ availableLetters, onLetterPress, accentColor }: { availableLetters: string[]; onLetterPress: (letter: string) => void; accentColor: string }) {
  return (
    <View style={styles.alphabetContainer}>
      {FULL_ALPHABET.map((letter) => (
        <Pressable key={letter} onPress={() => onLetterPress(letter)} style={styles.alphabetLetter}>
          <Text style={[styles.alphabetLetterText, { color: availableLetters.includes(letter) ? accentColor : 'rgba(255,255,255,0.2)' }]}>
            {letter}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && <Pressable onPress={onSeeAll}><Text style={styles.seeAllText}>See all</Text></Pressable>}
    </View>
  );
}

function TabButton({ label, active, onPress, accentColor }: { label: string; active: boolean; onPress: () => void; accentColor: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, { backgroundColor: active ? accentColor : 'rgba(255,255,255,0.1)' }]}>
      <Text style={[styles.tabButtonText, { color: active ? '#fff' : 'rgba(255,255,255,0.6)' }]}>{label}</Text>
    </Pressable>
  );
}

export default function BooksScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const sectionListRef = useRef<SectionList>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
  });

  const bookLibrary = libraries?.find(l => l.CollectionType === 'books');

  const readingProgress = useReadingProgressStore((state) => state.progress);
  const bookmarks = useReadingProgressStore((state) => state.bookmarks);
  const ebookBookmarks = useReadingProgressStore((state) => state.ebookBookmarks);
  const removeBookmark = useReadingProgressStore((state) => state.removeBookmark);
  const removeEbookBookmark = useReadingProgressStore((state) => state.removeEbookBookmark);

  const recentlyReading = useMemo(() => {
    return Object.values(readingProgress)
      .filter((p) => p.percent > 0 && p.percent < 100)
      .sort((a, b) => b.lastRead - a.lastRead);
  }, [readingProgress]);

  const getProgressForItem = (itemId: string) => readingProgress[itemId]?.percent ?? 0;

  const { data: booksData, isLoading: latestBooksLoading } = useQuery({
    queryKey: ['libraryPreview', userId, bookLibrary?.Id],
    queryFn: () =>
      getItems<BaseItem>(userId, {
        parentId: bookLibrary?.Id,
        includeItemTypes: ['Book', 'AudioBook'],
        sortBy: 'DateCreated',
        sortOrder: 'Descending',
        limit: 40,
        recursive: true,
      }),
    enabled: !!userId && !!bookLibrary,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const latestEbooks = booksData?.Items?.filter(item => item.Type === 'Book') as Book[] | undefined;
  const latestAudiobooks = booksData?.Items?.filter(item => item.Type === 'AudioBook') as AudioBook[] | undefined;
  const latestEbooksLoading = latestBooksLoading;
  const latestAudiobooksLoading = latestBooksLoading;

  const {
    data: ebooksData,
    fetchNextPage: fetchNextEbooks,
    hasNextPage: hasNextEbooks,
    isFetchingNextPage: isFetchingEbooks,
    isLoading: ebooksLoading,
    refetch: refetchEbooks,
  } = useInfiniteQuery({
    queryKey: ['allEbooks', userId, bookLibrary?.Id],
    queryFn: ({ pageParam = 0 }) =>
      getItems<Book>(userId, {
        parentId: bookLibrary?.Id,
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
    enabled: !!userId && !!bookLibrary && viewMode === 'ebooks',
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
    queryKey: ['allAudiobooks', userId, bookLibrary?.Id],
    queryFn: ({ pageParam = 0 }) =>
      getItems<AudioBook>(userId, {
        parentId: bookLibrary?.Id,
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
    enabled: !!userId && !!bookLibrary && viewMode === 'audiobooks',
    staleTime: Infinity,
  });

  const allEbooks = ebooksData?.pages.flatMap((p) => p.Items) ?? [];
  const allAudiobooks = audiobooksData?.pages.flatMap((p) => p.Items) ?? [];

  const ebooksSections = useMemo(() => {
    const grouped: { [key: string]: BaseItem[] } = {};
    allEbooks.forEach((item) => {
      const firstChar = (item.SortName || item.Name || '?')[0].toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(item);
    });
    return Object.keys(grouped)
      .sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
      .map((letter) => ({ title: letter, data: grouped[letter] }));
  }, [allEbooks]);

  const audiobooksSections = useMemo(() => {
    const grouped: { [key: string]: BaseItem[] } = {};
    allAudiobooks.forEach((item) => {
      const firstChar = (item.SortName || item.Name || '?')[0].toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(item);
    });
    return Object.keys(grouped)
      .sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
      .map((letter) => ({ title: letter, data: grouped[letter] }));
  }, [allAudiobooks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (viewMode === 'ebooks') await refetchEbooks();
    else if (viewMode === 'audiobooks') await refetchAudiobooks();
    setRefreshing(false);
  }, [viewMode, refetchEbooks, refetchAudiobooks]);

  const handleItemPress = (item: BaseItem) => {
    if (item.Type === 'AudioBook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const mediaType = (item as any).MediaType?.toLowerCase() || '';
      const name = item.Name?.toLowerCase() || '';
      const isPdf = container === 'pdf' ||
                    path.endsWith('.pdf') ||
                    mediaType === 'pdf' ||
                    name.endsWith('.pdf');
      console.log('Book item:', { container, path, mediaType, name, isPdf });
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    }
  };

  const scrollToLetter = (letter: string, sections: { title: string; data: BaseItem[] }[]) => {
    const sectionIndex = sections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({ sectionIndex, itemIndex: 0, animated: true, viewPosition: 0 });
    }
  };

  const renderHomeView = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
      {recentlyReading.length > 0 && (
        <>
          <SectionHeader title="Continue Reading" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {recentlyReading.slice(0, 10).map((progress) => (
              <View key={progress.itemId} style={styles.continueItem}>
                <ContinueReadingCard
                  item={{ Id: progress.itemId, Name: progress.itemName, Type: progress.itemType, ImageTags: progress.coverImageTag ? { Primary: progress.coverImageTag } : undefined } as BaseItem}
                  onPress={() => handleItemPress({ Id: progress.itemId, Type: progress.itemType } as BaseItem)}
                  progress={progress.percent}
                />
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <SectionHeader title="Recent eBooks" onSeeAll={() => setViewMode('ebooks')} />
      {latestEbooksLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator color={accentColor} size="small" /></View>
      ) : latestEbooks && latestEbooks.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {latestEbooks.map((item) => (
            <View key={item.Id} style={styles.horizontalItem}>
              <BookCard item={item} onPress={() => handleItemPress(item)} progress={getProgressForItem(item.Id)} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}><Text style={styles.emptyStateText}>No eBooks found</Text></View>
      )}

      <SectionHeader title="Recent Audiobooks" onSeeAll={() => setViewMode('audiobooks')} />
      {latestAudiobooksLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator color={accentColor} size="small" /></View>
      ) : latestAudiobooks && latestAudiobooks.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {latestAudiobooks.map((item) => (
            <View key={item.Id} style={styles.horizontalItem}>
              <BookCard item={item} onPress={() => handleItemPress(item)} progress={getProgressForItem(item.Id)} />
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
          <ActivityIndicator color={accentColor} size="large" />
          <Text style={styles.loadingText}>Loading eBooks...</Text>
        </View>
      ) : (
        <>
          <SectionList
            ref={sectionListRef}
            sections={ebooksSections}
            keyExtractor={(item) => item.Id}
            style={{ flex: 1 }}
            renderItem={({ item }) => <BookRow item={item} onPress={() => handleItemPress(item)} progress={getProgressForItem(item.Id)} />}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeaderContainer}>
                <Text style={[styles.sectionHeaderText, { color: accentColor }]}>{title}</Text>
              </View>
            )}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.sectionListContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            onEndReached={() => { if (hasNextEbooks && !isFetchingEbooks) fetchNextEbooks(); }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={<Text style={styles.listHeader}>{allEbooks.length} / {ebooksData?.pages[0]?.TotalRecordCount ?? 0} eBooks</Text>}
            ListFooterComponent={isFetchingEbooks ? <View style={styles.loadingFooter}><ActivityIndicator color={accentColor} size="small" /></View> : <View style={styles.bottomSpacer} />}
            ListEmptyComponent={<View style={styles.emptyStateContainer}><Text style={styles.emptyStateTitle}>No eBooks found</Text></View>}
          />
          <AlphabetScroller availableLetters={ebooksSections.map((s) => s.title)} onLetterPress={(letter) => scrollToLetter(letter, ebooksSections)} accentColor={accentColor} />
        </>
      )}
    </View>
  );

  const renderAudiobooksView = () => (
    <View style={styles.listContainer}>
      {audiobooksLoading ? (
        <View style={styles.fullScreenLoading}>
          <ActivityIndicator color={accentColor} size="large" />
          <Text style={styles.loadingText}>Loading audiobooks...</Text>
        </View>
      ) : (
        <>
          <SectionList
            ref={sectionListRef}
            sections={audiobooksSections}
            keyExtractor={(item) => item.Id}
            style={{ flex: 1 }}
            renderItem={({ item }) => <BookRow item={item} onPress={() => handleItemPress(item)} isAudiobook progress={getProgressForItem(item.Id)} />}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeaderContainer}>
                <Text style={[styles.sectionHeaderText, { color: accentColor }]}>{title}</Text>
              </View>
            )}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.sectionListContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            onEndReached={() => { if (hasNextAudiobooks && !isFetchingAudiobooks) fetchNextAudiobooks(); }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={<Text style={styles.listHeader}>{allAudiobooks.length} / {audiobooksData?.pages[0]?.TotalRecordCount ?? 0} audiobooks</Text>}
            ListFooterComponent={isFetchingAudiobooks ? <View style={styles.loadingFooter}><ActivityIndicator color={accentColor} size="small" /></View> : <View style={styles.bottomSpacer} />}
            ListEmptyComponent={<View style={styles.emptyStateContainer}><Text style={styles.emptyStateTitle}>No audiobooks found</Text></View>}
          />
          <AlphabetScroller availableLetters={audiobooksSections.map((s) => s.title)} onLetterPress={(letter) => scrollToLetter(letter, audiobooksSections)} accentColor={accentColor} />
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        <Text style={styles.listHeader}>{totalBookmarks} {totalBookmarks === 1 ? 'bookmark' : 'bookmarks'}</Text>
        {ebookBookmarks.map((bookmark) => (
          <Pressable key={bookmark.id} onPress={() => router.push(`/reader/epub?itemId=${bookmark.itemId}&cfi=${encodeURIComponent(bookmark.cfi)}`)} style={styles.bookmarkItem}>
            <View style={[styles.bookmarkIcon, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name="book" size={16} color={accentColor} />
            </View>
            <View style={styles.bookmarkItemInfo}>
              <Text style={styles.bookmarkBookTitle} numberOfLines={1}>{bookmark.bookTitle || 'Unknown Book'}</Text>
              <Text style={styles.bookmarkItemName} numberOfLines={1}>{bookmark.name || 'Bookmark'}</Text>
              <Text style={styles.bookmarkItemTime}>{bookmark.progress}% through book</Text>
            </View>
            <Pressable onPress={() => removeEbookBookmark(bookmark.id)} style={styles.bookmarkDeleteButton}>
              <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </Pressable>
        ))}
        {bookmarks.map((bookmark) => (
          <Pressable key={bookmark.id} onPress={() => router.push(`/player/audiobook?itemId=${bookmark.itemId}&startPosition=${ticksToMs(bookmark.positionTicks)}`)} style={styles.bookmarkItem}>
            <View style={[styles.bookmarkIcon, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name="headset" size={16} color={accentColor} />
            </View>
            <View style={styles.bookmarkItemInfo}>
              <Text style={styles.bookmarkBookTitle} numberOfLines={1}>{bookmark.bookTitle || 'Unknown Book'}</Text>
              <Text style={styles.bookmarkItemName} numberOfLines={1}>{bookmark.name || 'Bookmark'}</Text>
              <Text style={styles.bookmarkItemTime}>{formatPlayerTime(ticksToMs(bookmark.positionTicks))}</Text>
            </View>
            <Pressable onPress={() => removeBookmark(bookmark.id)} style={styles.bookmarkDeleteButton}>
              <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <HomeButton currentScreen="books" />
          <Text style={styles.headerTitle}>Books</Text>
        </View>
        <SearchButton />
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TabButton label="Home" active={viewMode === 'home'} onPress={() => setViewMode('home')} accentColor={accentColor} />
          <TabButton label="eBooks" active={viewMode === 'ebooks'} onPress={() => setViewMode('ebooks')} accentColor={accentColor} />
          <TabButton label="Audiobooks" active={viewMode === 'audiobooks'} onPress={() => setViewMode('audiobooks')} accentColor={accentColor} />
          <TabButton label="Bookmarks" active={viewMode === 'bookmarks'} onPress={() => setViewMode('bookmarks')} accentColor={accentColor} />
        </ScrollView>
      </View>

      {viewMode === 'home' && renderHomeView()}
      {viewMode === 'ebooks' && renderEbooksView()}
      {viewMode === 'audiobooks' && renderAudiobooksView()}
      {viewMode === 'bookmarks' && renderBookmarksView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  tabContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  tabButton: { marginRight: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  tabButtonText: { fontSize: 14, fontWeight: '500' },
  homeContent: { paddingBottom: 100 },
  bookCard: { marginBottom: 12 },
  bookImageContainer: { borderRadius: 6, overflow: 'hidden', backgroundColor: colors.surface.default, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  bookImage: { width: '100%', height: '100%' },
  bookPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.elevated },
  bookPlaceholderText: { color: 'rgba(255,255,255,0.2)', fontSize: 28, fontWeight: '600' },
  bookTitle: { color: '#fff', fontWeight: '600', fontSize: 12, lineHeight: 16 },
  bookAuthor: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
  progressOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 4 },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  bookRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  bookRowImageContainer: { width: 48, height: 72, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surface.default },
  bookRowImage: { width: '100%', height: '100%' },
  bookRowPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.elevated },
  bookRowPlaceholderText: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' },
  bookRowInfo: { flex: 1, marginLeft: 12 },
  bookRowName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  bookRowAuthor: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 },
  bookRowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 },
  bookRowDuration: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  bookRowProgressContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookRowProgressTrack: { width: 60, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  bookRowProgressFill: { height: '100%', borderRadius: 2 },
  bookRowProgressText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  continueCard: { width: 120 },
  continueImageContainer: { width: 120, height: 170, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface.default, marginBottom: 10 },
  continueImage: { width: '100%', height: '100%' },
  continuePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.elevated },
  continuePlaceholderText: { color: 'rgba(255,255,255,0.2)', fontSize: 32, fontWeight: '600' },
  continueProgressOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 20 },
  continueProgressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 2, overflow: 'hidden' },
  continueProgressFill: { height: '100%', borderRadius: 2 },
  continueTitle: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 16 },
  continueAuthor: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  continueProgressText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3 },
  continueItem: { marginRight: 14 },
  listContainer: { flex: 1, flexDirection: 'row' },
  sectionListContent: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionHeaderContainer: { backgroundColor: colors.background.primary, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  sectionHeaderText: { fontSize: 18, fontWeight: 'bold' },
  alphabetContainer: { width: 24, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  alphabetLetter: { paddingVertical: 2, paddingHorizontal: 4 },
  alphabetLetterText: { fontSize: 11, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12, marginTop: 24 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  seeAllText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  horizontalScroll: { paddingHorizontal: 16 },
  horizontalItem: { marginRight: 14 },
  listHeader: { color: 'rgba(255,255,255,0.5)', fontSize: 13, paddingVertical: 12, paddingHorizontal: 4 },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  fullScreenLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingFooter: { paddingVertical: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyStateText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
  emptyStateContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyStateIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyStateTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 18, marginBottom: 8 },
  emptyStateSubtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  bottomSpacer: { height: 100 },
  bookmarkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: colors.surface.default, borderRadius: 12, marginBottom: 8 },
  bookmarkIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bookmarkItemInfo: { flex: 1, marginLeft: 12 },
  bookmarkBookTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  bookmarkItemName: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  bookmarkItemTime: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  bookmarkDeleteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
