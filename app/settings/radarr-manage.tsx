import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack } from 'expo-router';
import {
  radarrService,
  type RadarrMovie,
  type RadarrLookupResult,
  type RadarrQueueItem,
  type RadarrRootFolder,
  type RadarrQualityProfile,
  type RadarrRelease,
} from '@/api';
import { colors, spacing } from '@/theme';
import {
  RADARR_ORANGE,
  MovieCard,
  MovieDetailModal,
  AddMovieModal,
  ManualSearchModal,
  SearchResultCard,
  QueueItemCard,
  EmptyState,
  MovieGridSkeleton,
  QueueListSkeleton,
  SearchListSkeleton,
  type TabType,
  type FilterType,
  type SortType,
  type Stats,
  ManageHeader,
  StatsRow,
  TabBar,
  SearchBar,
  LibraryControls,
  NotConfiguredView,
} from '@/components/shared/radarr';

export default function RadarrManageScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isConfigured = radarrService.isConfigured();
  const listRef = useRef<FlatList>(null);

  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('title');
  const [sortAsc, setSortAsc] = useState(true);

  const [movies, setMovies] = useState<RadarrMovie[]>([]);
  const [searchResults, setSearchResults] = useState<RadarrLookupResult[]>([]);
  const [queue, setQueue] = useState<RadarrQueueItem[]>([]);
  const [rootFolders, setRootFolders] = useState<RadarrRootFolder[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<RadarrQualityProfile[]>([]);

  const [selectedMovie, setSelectedMovie] = useState<RadarrMovie | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<RadarrLookupResult | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualReleases, setManualReleases] = useState<RadarrRelease[]>([]);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [indexerFilter, setIndexerFilter] = useState('All');
  const [qualityFilter, setQualityFilter] = useState('All');

  const numColumns = screenWidth > 600 ? 4 : 3;
  const cardWidth = (screenWidth - spacing[4] * 2 - spacing[2] * (numColumns - 1)) / numColumns;

  const stats: Stats = useMemo(() => ({
    total: movies.length,
    downloaded: movies.filter((m) => m.hasFile).length,
    missing: movies.filter((m) => m.monitored && !m.hasFile).length,
    queue: queue.length,
  }), [movies, queue]);

  const filteredMovies = useMemo(() => {
    let result = movies.filter((m) => {
      if (filter === 'downloaded') return m.hasFile;
      if (filter === 'missing') return m.monitored && !m.hasFile;
      if (filter === 'unmonitored') return !m.monitored;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'added': cmp = new Date(b.added).getTime() - new Date(a.added).getTime(); break;
        case 'year': cmp = b.year - a.year; break;
        case 'size': cmp = b.sizeOnDisk - a.sizeOnDisk; break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [movies, filter, sortBy, sortAsc]);

  const loadData = useCallback(async (showLoader = true) => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }
    if (showLoader) setIsLoading(true);

    try {
      const [moviesData, queueData, foldersData, profilesData] = await Promise.all([
        radarrService.getMovies(),
        radarrService.getQueue(1, 50),
        radarrService.getRootFolders(),
        radarrService.getQualityProfiles(),
      ]);
      setMovies(moviesData);
      setQueue(queueData.records);
      setRootFolders(foldersData);
      setQualityProfiles(profilesData);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(false);
  }, [loadData]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await radarrService.searchMovies(searchQuery.trim());
      setSearchResults(results);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleMoviePress = useCallback((movie: RadarrMovie) => {
    setSelectedMovie(movie);
    setShowDetailModal(true);
  }, []);

  const handleToggleMonitored = useCallback(async () => {
    if (!selectedMovie) return;
    try {
      const updated = await radarrService.toggleMonitored(selectedMovie.id, !selectedMovie.monitored);
      setMovies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelectedMovie(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update');
    }
  }, [selectedMovie]);

  const handleDeleteMovie = useCallback(async () => {
    if (!selectedMovie) return;
    Alert.alert('Delete Movie', `Delete "${selectedMovie.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await radarrService.deleteMovie(selectedMovie.id, false);
            setMovies((prev) => prev.filter((m) => m.id !== selectedMovie.id));
            setShowDetailModal(false);
            setSelectedMovie(null);
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete');
          }
        },
      },
    ]);
  }, [selectedMovie]);

  const handleRefreshMovie = useCallback(async () => {
    if (!selectedMovie) return;
    try {
      await radarrService.refreshMovie(selectedMovie.id);
      Alert.alert('Success', 'Refresh started');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to refresh');
    }
  }, [selectedMovie]);

  const handleAutoSearch = useCallback(async () => {
    if (!selectedMovie) return;
    try {
      await radarrService.triggerMovieSearch(selectedMovie.id);
      Alert.alert('Success', 'Search started');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search');
    }
  }, [selectedMovie]);

  const handleManualSearch = useCallback(async () => {
    if (!selectedMovie) return;
    setShowManualSearch(true);
    setIsManualLoading(true);
    setIndexerFilter('All');
    setQualityFilter('All');
    try {
      const releases = await radarrService.manualSearchMovie(selectedMovie.id);
      setManualReleases(releases);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Search failed');
    } finally {
      setIsManualLoading(false);
    }
  }, [selectedMovie]);

  const handleDownloadRelease = useCallback(async (release: RadarrRelease) => {
    try {
      await radarrService.downloadRelease(release.guid, release.indexerId);
      Alert.alert('Success', 'Download started');
      setShowManualSearch(false);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Download failed');
    }
  }, [loadData]);

  const handleAddMovie = useCallback((result: RadarrLookupResult) => {
    setSelectedSearchResult(result);
    setShowAddModal(true);
  }, []);

  const handleConfirmAdd = useCallback(async (opts: { qualityProfileId: number; rootFolderPath: string; searchForMovie: boolean }) => {
    if (!selectedSearchResult) return;
    setIsAdding(true);
    try {
      await radarrService.addMovie({
        tmdbId: selectedSearchResult.tmdbId,
        title: selectedSearchResult.title,
        qualityProfileId: opts.qualityProfileId,
        rootFolderPath: opts.rootFolderPath,
        searchForMovie: opts.searchForMovie,
      });
      Alert.alert('Success', `${selectedSearchResult.title} added`);
      setShowAddModal(false);
      setSelectedSearchResult(null);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add');
    } finally {
      setIsAdding(false);
    }
  }, [selectedSearchResult, loadData]);

  const handleRemoveFromQueue = useCallback(async (id: number) => {
    try {
      await radarrService.removeFromQueue(id);
      setQueue((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to remove');
    }
  }, []);

  const renderMovieItem = useCallback(({ item }: { item: RadarrMovie }) => (
    <MovieCard movie={item} onPress={() => handleMoviePress(item)} cardWidth={cardWidth} />
  ), [cardWidth, handleMoviePress]);

  const renderQueueItem = useCallback(({ item }: { item: RadarrQueueItem }) => (
    <QueueItemCard item={item} onRemove={() => handleRemoveFromQueue(item.id)} />
  ), [handleRemoveFromQueue]);

  const renderSearchItem = useCallback(({ item }: { item: RadarrLookupResult }) => (
    <SearchResultCard
      result={item}
      onAdd={() => handleAddMovie(item)}
      existingMovie={movies.find((m) => m.tmdbId === item.tmdbId)}
    />
  ), [movies, handleAddMovie]);

  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <NotConfiguredView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ManageHeader />

      <StatsRow
        stats={stats}
        onFilterPress={setFilter}
        onQueuePress={() => setActiveTab('queue')}
      />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'search' && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSearch={handleSearch}
          isSearching={isSearching}
        />
      )}

      {activeTab === 'library' && (
        <LibraryControls
          filter={filter}
          sortBy={sortBy}
          sortAsc={sortAsc}
          onFilterChange={setFilter}
          onSortChange={setSortBy}
          onSortDirectionToggle={() => setSortAsc(!sortAsc)}
        />
      )}

      {activeTab === 'library' && (
        isLoading ? (
          <MovieGridSkeleton cardWidth={cardWidth} numColumns={numColumns} />
        ) : filteredMovies.length === 0 ? (
          <EmptyState icon="film-outline" title="No movies" subtitle={filter !== 'all' ? 'Change filter' : 'Add movies'} />
        ) : (
          <FlatList
            ref={listRef}
            key={`movies-${numColumns}`}
            data={filteredMovies}
            keyExtractor={(item) => String(item.id)}
            numColumns={numColumns}
            contentContainerStyle={styles.movieGrid}
            columnWrapperStyle={styles.movieGridRow}
            renderItem={renderMovieItem}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={7}
            removeClippedSubviews
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={RADARR_ORANGE} />}
            getItemLayout={(_, index) => {
              const textAreaHeight = 52;
              const rowH = cardWidth * 1.5 + textAreaHeight + spacing[3];
              return { length: rowH, offset: rowH * Math.floor(index / numColumns), index };
            }}
          />
        )
      )}

      {activeTab === 'queue' && (
        isLoading ? (
          <QueueListSkeleton />
        ) : queue.length === 0 ? (
          <EmptyState icon="checkmark-circle-outline" title="Queue empty" subtitle="No downloads" />
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.queueList}
            renderItem={renderQueueItem}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={RADARR_ORANGE} />}
          />
        )
      )}

      {activeTab === 'search' && (
        isSearching ? (
          <SearchListSkeleton />
        ) : searchResults.length === 0 ? (
          <EmptyState icon="search-outline" title="Search movies" subtitle="Find and add to library" />
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.tmdbId)}
            contentContainerStyle={styles.searchList}
            renderItem={renderSearchItem}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
          />
        )
      )}

      <MovieDetailModal
        visible={showDetailModal}
        movie={selectedMovie}
        onClose={() => { setShowDetailModal(false); setSelectedMovie(null); }}
        onToggleMonitored={handleToggleMonitored}
        onDelete={handleDeleteMovie}
        onRefresh={handleRefreshMovie}
        onSearch={handleAutoSearch}
        onManualSearch={handleManualSearch}
      />

      <ManualSearchModal
        visible={showManualSearch}
        movie={selectedMovie}
        releases={manualReleases}
        isLoading={isManualLoading}
        onClose={() => setShowManualSearch(false)}
        onDownload={handleDownloadRelease}
        indexerFilter={indexerFilter}
        setIndexerFilter={setIndexerFilter}
        qualityFilter={qualityFilter}
        setQualityFilter={setQualityFilter}
      />

      <AddMovieModal
        visible={showAddModal}
        movie={selectedSearchResult}
        rootFolders={rootFolders}
        qualityProfiles={qualityProfiles}
        onClose={() => { setShowAddModal(false); setSelectedSearchResult(null); }}
        onAdd={handleConfirmAdd}
        isAdding={isAdding}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  movieGrid: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[20],
  },
  movieGridRow: {
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  queueList: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[20],
    gap: spacing[3],
  },
  searchList: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[20],
    gap: spacing[2],
  },
});
