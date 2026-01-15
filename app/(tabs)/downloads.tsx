import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, Pressable, Alert, StyleSheet, RefreshControl, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDownloadStore, useSettingsStore } from '@/stores';
import { downloadManager } from '@/services';
import { colors } from '@/theme';
import type { DownloadItem } from '@/types';
import {
  TabButton,
  ActiveDownloadsSection,
  MoviesSection,
  TVShowsSection,
  MusicSection,
  BooksSection,
  StorageCard,
  EmptyState,
  type ContentTab,
  type SeriesGroup,
  type ArtistGroup,
} from '@/components/shared/downloads';

export default function DownloadsScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('movies');
  const [isPaused, setIsPaused] = useState(downloadManager.getIsPaused());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const { downloads, usedStorage, maxStorage, recalculateUsedStorage } = useDownloadStore();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  const filterDownloadsBySearch = useCallback((items: DownloadItem[], query: string): DownloadItem[] => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter((item) => {
      const name = item.item.Name?.toLowerCase() || '';
      const seriesName = item.item.SeriesName?.toLowerCase() || '';
      const albumArtist = (item.item as any).AlbumArtist?.toLowerCase() || '';
      const album = (item.item as any).Album?.toLowerCase() || '';
      const artists = ((item.item as any).Artists || []).join(' ').toLowerCase();
      return (
        name.includes(lowerQuery) ||
        seriesName.includes(lowerQuery) ||
        albumArtist.includes(lowerQuery) ||
        album.includes(lowerQuery) ||
        artists.includes(lowerQuery)
      );
    });
  }, []);

  useEffect(() => {
    recalculateUsedStorage();
  }, []);

  const { activeDownloads, completedDownloads } = useMemo(() => {
    const active = downloads.filter(
      (d) => d.status === 'downloading' || d.status === 'pending' || d.status === 'paused' || d.status === 'failed'
    );
    const completed = downloads.filter((d) => d.status === 'completed');
    return { activeDownloads: active, completedDownloads: completed };
  }, [downloads]);

  const filteredCompletedDownloads = useMemo(() => {
    return filterDownloadsBySearch(completedDownloads, searchQuery);
  }, [completedDownloads, searchQuery, filterDownloadsBySearch]);

  const { movies, tvShows, music, books } = useMemo(() => {
    const movieItems: DownloadItem[] = [];
    const tvItems: DownloadItem[] = [];
    const musicItems: DownloadItem[] = [];
    const bookItems: DownloadItem[] = [];

    filteredCompletedDownloads.forEach((item) => {
      const type = item.item.Type;
      if (type === 'Movie') {
        movieItems.push(item);
      } else if (type === 'Episode') {
        tvItems.push(item);
      } else if (type === 'Audio') {
        musicItems.push(item);
      } else if (type === 'Book' || type === 'AudioBook') {
        bookItems.push(item);
      }
    });

    return {
      movies: movieItems,
      tvShows: tvItems,
      music: musicItems,
      books: bookItems,
    };
  }, [filteredCompletedDownloads]);

  const seriesGroups = useMemo((): SeriesGroup[] => {
    const seriesMap = new Map<string, SeriesGroup>();

    tvShows.forEach((item) => {
      const seriesId = item.item.SeriesId || 'unknown';
      const seriesName = item.item.SeriesName || 'Unknown Series';
      const seasonNumber = item.item.ParentIndexNumber ?? 1;

      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          seriesId,
          seriesName,
          seasons: [],
          totalSize: 0,
          episodeCount: 0,
        });
      }

      const series = seriesMap.get(seriesId)!;
      let season = series.seasons.find((s) => s.seasonNumber === seasonNumber);
      if (!season) {
        season = { seasonNumber, episodes: [], totalSize: 0 };
        series.seasons.push(season);
      }

      season.episodes.push(item);
      season.totalSize += item.totalBytes;
      series.totalSize += item.totalBytes;
      series.episodeCount++;
    });

    seriesMap.forEach((series) => {
      series.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
      series.seasons.forEach((season) => {
        season.episodes.sort((a, b) => (a.item.IndexNumber ?? 0) - (b.item.IndexNumber ?? 0));
      });
    });

    return Array.from(seriesMap.values()).sort((a, b) => a.seriesName.localeCompare(b.seriesName));
  }, [tvShows]);

  const artistGroups = useMemo((): ArtistGroup[] => {
    const artistMap = new Map<string, ArtistGroup>();

    music.forEach((item) => {
      const artistName = (item.item as any).AlbumArtist || (item.item as any).Artists?.[0] || 'Unknown Artist';
      const albumId = (item.item as any).AlbumId || 'unknown';
      const albumName = (item.item as any).Album || 'Unknown Album';

      if (!artistMap.has(artistName)) {
        artistMap.set(artistName, {
          artistName,
          albums: [],
          totalSize: 0,
          trackCount: 0,
        });
      }

      const artist = artistMap.get(artistName)!;
      let album = artist.albums.find((a) => a.albumId === albumId);
      if (!album) {
        album = { albumId, albumName, tracks: [], totalSize: 0 };
        artist.albums.push(album);
      }

      album.tracks.push(item);
      album.totalSize += item.totalBytes;
      artist.totalSize += item.totalBytes;
      artist.trackCount++;
    });

    artistMap.forEach((artist) => {
      artist.albums.sort((a, b) => a.albumName.localeCompare(b.albumName));
      artist.albums.forEach((album) => {
        album.tracks.sort((a, b) => (a.item.IndexNumber ?? 0) - (b.item.IndexNumber ?? 0));
      });
    });

    return Array.from(artistMap.values()).sort((a, b) => a.artistName.localeCompare(b.artistName));
  }, [music]);

  const onRefresh = async () => {
    setRefreshing(true);
    recalculateUsedStorage();
    setRefreshing(false);
  };

  const handlePlay = (item: DownloadItem) => {
    const type = item.item.Type;
    if (type === 'Movie' || type === 'Episode') {
      router.push(`/player/video?itemId=${item.itemId}&from=${encodeURIComponent('/(tabs)/downloads')}`);
    } else if (type === 'Audio') {
      router.push(`/player/music?itemId=${item.itemId}`);
    } else if (type === 'AudioBook') {
      router.push(`/player/audiobook?itemId=${item.itemId}`);
    } else if (type === 'Book') {
      const container = (item.item as any).Container?.toLowerCase() || '';
      const path = (item.item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.itemId}` : `/reader/epub?itemId=${item.itemId}`);
    }
  };

  const handleDelete = (item: DownloadItem) => {
    Alert.alert(
      'Delete Download',
      `Are you sure you want to delete "${item.item.Name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => downloadManager.deleteDownload(item.id),
        },
      ]
    );
  };

  const handlePauseResume = (item: DownloadItem) => {
    if (item.status === 'downloading' || item.status === 'pending') {
      downloadManager.pauseDownload(item.id);
    } else if (item.status === 'paused') {
      downloadManager.resumeDownload(item.id);
    }
  };

  const handlePauseAll = async () => {
    await downloadManager.pauseAllDownloads();
    setIsPaused(true);
  };

  const handleResumeAll = async () => {
    await downloadManager.resumeAllDownloads();
    setIsPaused(false);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Downloads',
      'This will delete all downloaded content. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => downloadManager.clearAllDownloads(),
        },
      ]
    );
  };

  const tabCounts = {
    movies: movies.length,
    tvshows: tvShows.length,
    music: music.length,
    books: books.length,
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'movies':
        return <MoviesSection movies={movies} accentColor={accentColor} onPlay={handlePlay} onDelete={handleDelete} hideMedia={hideMedia} />;
      case 'tvshows':
        return <TVShowsSection seriesGroups={seriesGroups} accentColor={accentColor} onPlay={handlePlay} onDelete={handleDelete} hideMedia={hideMedia} />;
      case 'music':
        return <MusicSection artistGroups={artistGroups} accentColor={accentColor} onPlay={handlePlay} onDelete={handleDelete} hideMedia={hideMedia} />;
      case 'books':
        return <BooksSection books={books} accentColor={accentColor} onPlay={handlePlay} onDelete={handleDelete} hideMedia={hideMedia} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {isSearching ? (
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { borderColor: accentColor }]}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder={t('downloads.searchPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={accentColor}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => {
                setIsSearching(false);
                setSearchQuery('');
              }}
              style={styles.cancelButton}
            >
              <Text style={[styles.cancelText, { color: accentColor }]}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{t('downloads.title')}</Text>
            </View>
            <View style={styles.headerRight}>
              {downloads.length > 0 && (
                <Pressable onPress={handleClearAll} style={styles.clearButton}>
                  <Text style={styles.clearText}>{t('downloads.clearAll')}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  setIsSearching(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                style={styles.searchButton}
              >
                <Ionicons name="search" size={20} color={accentColor} />
              </Pressable>
            </View>
          </>
        )}
      </View>

      <StorageCard
        usedStorage={usedStorage}
        maxStorage={maxStorage}
        accentColor={accentColor}
        label={t('downloads.storage')}
      />

      {downloads.length === 0 ? (
        <EmptyState
          title={t('downloads.noDownloads')}
          subtitle={t('downloads.noDownloadsDesc')}
          accentColor={accentColor}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          showsVerticalScrollIndicator={false}
        >
          <ActiveDownloadsSection
            downloads={activeDownloads}
            accentColor={accentColor}
            onPlay={handlePlay}
            onDelete={handleDelete}
            onPauseResume={handlePauseResume}
            onPauseAll={handlePauseAll}
            onResumeAll={handleResumeAll}
            isPaused={isPaused}
            hideMedia={hideMedia}
          />

          {filteredCompletedDownloads.length > 0 ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContainer}
              >
                <TabButton
                  label={t('nav.movies')}
                  icon="film-outline"
                  active={activeTab === 'movies'}
                  count={tabCounts.movies}
                  onPress={() => setActiveTab('movies')}
                  accentColor={accentColor}
                />
                <TabButton
                  label={t('nav.shows')}
                  icon="tv-outline"
                  active={activeTab === 'tvshows'}
                  count={tabCounts.tvshows}
                  onPress={() => setActiveTab('tvshows')}
                  accentColor={accentColor}
                />
                <TabButton
                  label={t('nav.music')}
                  icon="musical-notes-outline"
                  active={activeTab === 'music'}
                  count={tabCounts.music}
                  onPress={() => setActiveTab('music')}
                  accentColor={accentColor}
                />
                <TabButton
                  label={t('mediaTypes.book')}
                  icon="book-outline"
                  active={activeTab === 'books'}
                  count={tabCounts.books}
                  onPress={() => setActiveTab('books')}
                  accentColor={accentColor}
                />
              </ScrollView>

              {renderContent()}
            </>
          ) : searchQuery.trim() && completedDownloads.length > 0 ? (
            <View style={styles.noSearchResults}>
              <Ionicons name="search-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.noSearchResultsText}>{t('common.noResults')}</Text>
              <Text style={styles.noSearchResultsSubtext}>"{searchQuery}"</Text>
            </View>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  clearText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.default,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 10,
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  noSearchResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noSearchResultsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    marginTop: 12,
  },
  noSearchResultsSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    marginTop: 4,
  },
  tabsContainer: {
    paddingVertical: 12,
    gap: 8,
  },
  bottomSpacer: {
    height: 100,
  },
});
