import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  RefreshControl,
  StyleSheet,
  Alert,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack } from 'expo-router';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  sonarrService,
  type SonarrSeries,
  type SonarrLookupResult,
  type SonarrQueueItem,
  type SonarrRootFolder,
  type SonarrQualityProfile,
  type SonarrRelease,
  type SonarrEpisode,
} from '@/api';
import { colors, spacing } from '@/theme';
import {
  SONARR_BLUE,
  SeriesCard,
  SeriesDetailModal,
  AddSeriesModal,
  ManualSearchModal,
  SearchResultCard,
  QueueItemCard,
  SkeletonListCard,
  SkeletonGridCard,
  SkeletonQueueCard,
  EmptyState,
  ManageNotConfiguredScreen,
  ManageHeader,
  StatsRow,
  TabNavigation,
  SearchRow,
  LibraryControls,
  type SeriesViewMode as ViewMode,
  type TabType,
  type FilterType,
  type SortType,
  type Stats,
} from '@/components/shared/sonarr';

export default function SonarrManageScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isConfigured = sonarrService.isConfigured();

  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [seriesList, setSeriesList] = useState<SonarrSeries[]>([]);
  const [searchResults, setSearchResults] = useState<SonarrLookupResult[]>([]);
  const [queue, setQueue] = useState<SonarrQueueItem[]>([]);
  const [rootFolders, setRootFolders] = useState<SonarrRootFolder[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<SonarrQualityProfile[]>([]);

  const [selectedSeries, setSelectedSeries] = useState<SonarrLookupResult | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [detailSeries, setDetailSeries] = useState<SonarrSeries | null>(null);
  const [detailEpisodes, setDetailEpisodes] = useState<SonarrEpisode[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualSearchReleases, setManualSearchReleases] = useState<SonarrRelease[]>([]);
  const [isManualSearchLoading, setIsManualSearchLoading] = useState(false);
  const [manualSearchSeasonNumber, setManualSearchSeasonNumber] = useState<number | undefined>(undefined);
  const [downloadingReleaseGuid, setDownloadingReleaseGuid] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('title');

  const numColumns = screenWidth > 600 ? 4 : 3;
  const gridItemWidth = (screenWidth - spacing[4] * 2 - spacing[2] * (numColumns - 1)) / numColumns;

  const stats: Stats = useMemo(() => ({
    totalSeries: seriesList.length,
    episodesDownloaded: seriesList.reduce((acc, s) => acc + (s.statistics?.episodeFileCount ?? 0), 0),
    missingEpisodes: seriesList.reduce((acc, s) => {
      const total = s.statistics?.episodeCount ?? 0;
      const downloaded = s.statistics?.episodeFileCount ?? 0;
      return acc + (s.monitored ? total - downloaded : 0);
    }, 0),
    queueCount: queue.length,
  }), [seriesList, queue]);

  const loadData = useCallback(async (showLoader = true) => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    if (showLoader) setIsLoading(true);

    try {
      const [seriesData, queueData, foldersData, profilesData] = await Promise.all([
        sonarrService.getSeries(),
        sonarrService.getQueue(1, 50),
        sonarrService.getRootFolders(),
        sonarrService.getQualityProfiles(),
      ]);

      setSeriesList(seriesData);
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
      const results = await sonarrService.searchSeries(searchQuery.trim());
      setSearchResults(results);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleAddSeries = useCallback((result: SonarrLookupResult) => {
    setSelectedSeries(result);
    setShowAddModal(true);
  }, []);

  const handleConfirmAdd = useCallback(async (options: {
    qualityProfileId: number;
    rootFolderPath: string;
    searchForMissingEpisodes: boolean;
    seriesType: 'standard' | 'daily' | 'anime';
  }) => {
    if (!selectedSeries) return;

    setIsAdding(true);
    try {
      await sonarrService.addSeries({
        tvdbId: selectedSeries.tvdbId,
        title: selectedSeries.title,
        qualityProfileId: options.qualityProfileId,
        rootFolderPath: options.rootFolderPath,
        searchForMissingEpisodes: options.searchForMissingEpisodes,
        seriesType: options.seriesType,
      });
      Alert.alert('Success', `${selectedSeries.title} has been added to Sonarr`);
      setShowAddModal(false);
      setSelectedSeries(null);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add series');
    } finally {
      setIsAdding(false);
    }
  }, [selectedSeries, loadData]);

  const handleRemoveFromQueue = useCallback(async (id: number) => {
    try {
      await sonarrService.removeFromQueue(id);
      setQueue((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to remove from queue');
    }
  }, []);

  const handleTriggerSeriesSearch = useCallback(async (series: SonarrSeries) => {
    try {
      await sonarrService.triggerSeriesSearch(series.id);
      Alert.alert('Search Started', `Searching for missing episodes of ${series.title}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to trigger search');
    }
  }, []);

  const handleToggleMonitored = useCallback(async (series: SonarrSeries) => {
    setIsDetailLoading(true);
    try {
      const response = await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/series/${series.id}`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...series, monitored: !series.monitored }),
        }
      );
      if (!response.ok) throw new Error('Failed to update series');

      const updatedSeries = await response.json();
      setSeriesList(prev => prev.map(s => s.id === series.id ? updatedSeries : s));
      setDetailSeries(updatedSeries);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to toggle monitored status');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleDeleteSeries = useCallback(async (series: SonarrSeries) => {
    setIsDetailLoading(true);
    try {
      const response = await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/series/${series.id}?deleteFiles=false`,
        {
          method: 'DELETE',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
          },
        }
      );
      if (!response.ok) throw new Error('Failed to delete series');

      setSeriesList(prev => prev.filter(s => s.id !== series.id));
      setShowDetailModal(false);
      setDetailSeries(null);
      Alert.alert('Success', `${series.title} has been removed from Sonarr`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete series');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleRefreshSeries = useCallback(async (series: SonarrSeries) => {
    setIsDetailLoading(true);
    try {
      await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/command`,
        {
          method: 'POST',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'RefreshSeries', seriesId: series.id }),
        }
      );
      Alert.alert('Refresh Started', `Refreshing metadata for ${series.title}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to refresh series');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleSearchSeason = useCallback(async (series: SonarrSeries, seasonNumber: number) => {
    try {
      await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/command`,
        {
          method: 'POST',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'SeasonSearch',
            seriesId: series.id,
            seasonNumber,
          }),
        }
      );
      Alert.alert('Search Started', `Searching for Season ${seasonNumber} of ${series.title}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search season');
    }
  }, []);

  const handleToggleSeasonMonitored = useCallback(async (
    series: SonarrSeries,
    seasonNumber: number,
    monitored: boolean
  ) => {
    setIsDetailLoading(true);
    try {
      const updatedSeasons = series.seasons.map(s =>
        s.seasonNumber === seasonNumber ? { ...s, monitored } : s
      );

      const response = await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/series/${series.id}`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...series, seasons: updatedSeasons }),
        }
      );
      if (!response.ok) throw new Error('Failed to update season');

      const updatedSeries = await response.json();
      setSeriesList(prev => prev.map(s => s.id === series.id ? updatedSeries : s));
      setDetailSeries(updatedSeries);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to toggle season monitoring');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleManualSearch = useCallback(async (series: SonarrSeries, seasonNumber?: number) => {
    setManualSearchSeasonNumber(seasonNumber);
    setShowManualSearch(true);
    setIsManualSearchLoading(true);
    setManualSearchReleases([]);
    try {
      const releases = seasonNumber !== undefined
        ? await sonarrService.manualSearchSeason(series.id, seasonNumber)
        : await sonarrService.manualSearchSeries(series.id);
      setManualSearchReleases(releases);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search indexers');
      setShowManualSearch(false);
    } finally {
      setIsManualSearchLoading(false);
    }
  }, []);

  const handleDownloadRelease = useCallback(async (release: SonarrRelease) => {
    if (downloadingReleaseGuid) return;
    setDownloadingReleaseGuid(release.guid);
    try {
      await sonarrService.downloadRelease(release.guid, release.indexerId);
      Alert.alert('Success', 'Download started');
      setShowManualSearch(false);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to start download');
    } finally {
      setDownloadingReleaseGuid(null);
    }
  }, [loadData, downloadingReleaseGuid]);

  const handleOpenSeriesDetail = useCallback(async (series: SonarrSeries) => {
    setDetailSeries(series);
    setDetailEpisodes([]);
    setShowDetailModal(true);
    try {
      const episodes = await sonarrService.getEpisodes(series.id);
      setDetailEpisodes(episodes);
    } catch (e) {
    }
  }, []);

  const handleSearchEpisode = useCallback(async (episodeId: number) => {
    try {
      await sonarrService.searchEpisode(episodeId);
      Alert.alert('Success', 'Episode search started');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search episode');
    }
  }, []);

  const filteredAndSortedSeries = useMemo(() => {
    let filtered = seriesList.filter((series) => {
      const percent = series.statistics?.percentOfEpisodes ?? 0;
      if (filter === 'continuing') return !series.ended && series.monitored;
      if (filter === 'ended') return series.ended && series.monitored;
      if (filter === 'missing') return series.monitored && percent < 100;
      if (filter === 'unmonitored') return !series.monitored;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'title') return a.sortTitle.localeCompare(b.sortTitle);
      if (sortBy === 'year') return b.year - a.year;
      if (sortBy === 'dateAdded') return new Date(b.added).getTime() - new Date(a.added).getTime();
      return 0;
    });
  }, [seriesList, filter, sortBy]);

  const renderSkeletonList = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonListCard key={i} />
      ))}
    </View>
  );

  const renderSkeletonGrid = () => (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 9 }).map((_, i) => (
        <SkeletonGridCard key={i} width={gridItemWidth} />
      ))}
    </View>
  );

  const renderSkeletonQueue = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonQueueCard key={i} />
      ))}
    </View>
  );

  if (!isConfigured) {
    return <ManageNotConfiguredScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ManageHeader />

      <StatsRow
        stats={stats}
        onTotalPress={() => setFilter('all')}
        onMissingPress={() => setFilter('missing')}
        onQueuePress={() => setActiveTab('queue')}
      />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={SONARR_BLUE} />
        }
      >
        {activeTab === 'search' && (
          <SearchRow
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
            onFilterChange={setFilter}
            onSortChange={setSortBy}
          />
        )}

        {activeTab === 'library' && (
          isLoading ? (
            viewMode === 'grid' ? renderSkeletonGrid() : renderSkeletonList()
          ) : filteredAndSortedSeries.length === 0 ? (
            <EmptyState
              icon="tv-outline"
              title="No Series Found"
              message={filter === 'all' ? 'Add some TV shows to get started' : 'No series match this filter'}
            />
          ) : viewMode === 'grid' ? (
            <View style={styles.movieGrid}>
              {filteredAndSortedSeries.map((item, index) => (
                <SeriesCard
                  key={item.id}
                  series={item}
                  viewMode={viewMode}
                  gridItemWidth={gridItemWidth}
                  onPress={handleOpenSeriesDetail}
                  index={index}
                />
              ))}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredAndSortedSeries.map((item, index) => (
                <SeriesCard
                  key={item.id}
                  series={item}
                  viewMode={viewMode}
                  gridItemWidth={gridItemWidth}
                  onPress={handleOpenSeriesDetail}
                  index={index}
                />
              ))}
            </View>
          )
        )}

        {activeTab === 'queue' && (
          isLoading ? (
            renderSkeletonQueue()
          ) : queue.length === 0 ? (
            <EmptyState
              icon="cloud-download-outline"
              title="Queue Empty"
              message="Nothing is currently downloading"
            />
          ) : (
            <View style={styles.listContainer}>
              {queue.map((item, index) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveFromQueue}
                  index={index}
                />
              ))}
            </View>
          )
        )}

        {activeTab === 'search' && (
          searchResults.length > 0 ? (
            <View style={styles.listContainer}>
              {searchResults.map((item, index) => (
                <SearchResultCard
                  key={item.tvdbId}
                  result={item}
                  onAdd={handleAddSeries}
                  existingSeries={seriesList.find((s) => s.tvdbId === item.tvdbId)}
                  index={index}
                />
              ))}
            </View>
          ) : searchQuery.length > 0 && !isSearching ? (
            <EmptyState
              icon="search-outline"
              title="No Results"
              message="Try a different search term"
            />
          ) : null
        )}
      </ScrollView>

      <AddSeriesModal
        visible={showAddModal}
        series={selectedSeries}
        rootFolders={rootFolders}
        qualityProfiles={qualityProfiles}
        onClose={() => {
          setShowAddModal(false);
          setSelectedSeries(null);
        }}
        onAdd={handleConfirmAdd}
        isAdding={isAdding}
      />

      <SeriesDetailModal
        visible={showDetailModal}
        series={detailSeries}
        episodes={detailEpisodes}
        onClose={() => {
          setShowDetailModal(false);
          setDetailSeries(null);
          setDetailEpisodes([]);
        }}
        onToggleMonitored={handleToggleMonitored}
        onDelete={handleDeleteSeries}
        onRefresh={handleRefreshSeries}
        onSearchSeries={handleTriggerSeriesSearch}
        onSearchSeason={handleSearchSeason}
        onSearchEpisode={handleSearchEpisode}
        onManualSearch={handleManualSearch}
        onToggleSeasonMonitored={handleToggleSeasonMonitored}
        isLoading={isDetailLoading}
      />

      <ManualSearchModal
        visible={showManualSearch}
        series={detailSeries}
        seasonNumber={manualSearchSeasonNumber}
        releases={manualSearchReleases}
        isLoading={isManualSearchLoading}
        onClose={() => setShowManualSearch(false)}
        onDownload={handleDownloadRelease}
        downloadingGuid={downloadingReleaseGuid}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[20],
  },
  movieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[2],
  },
  listContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  skeletonContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    gap: spacing[2],
  },
});
