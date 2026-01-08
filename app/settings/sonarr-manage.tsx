import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { sonarrService } from '@/services';
import type {
  SonarrSeries,
  SonarrLookupResult,
  SonarrQueueItem,
  SonarrRootFolder,
  SonarrQualityProfile,
} from '@/services/sonarrService';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';
import { Skeleton } from '@/components/ui';

type TabType = 'library' | 'queue' | 'search';
type ViewMode = 'list' | 'grid';
type FilterType = 'all' | 'complete' | 'partial' | 'missing' | 'unmonitored';

interface SeriesCardProps {
  series: SonarrSeries;
  accentColor: string;
  viewMode: ViewMode;
  gridItemWidth: number;
}

function SeriesCard({ series, accentColor, viewMode, gridItemWidth }: SeriesCardProps) {
  const poster = series.images.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;

  const episodeCount = series.statistics?.episodeFileCount ?? 0;
  const totalEpisodes = series.statistics?.episodeCount ?? 0;
  const percentComplete = series.statistics?.percentOfEpisodes ?? 0;

  const getStatusColor = () => {
    if (percentComplete >= 100) return colors.status.success;
    if (series.monitored && percentComplete > 0) return colors.status.info;
    if (series.monitored) return colors.status.warning;
    return colors.text.tertiary;
  };

  const getStatusText = () => {
    if (percentComplete >= 100) return 'Complete';
    if (series.monitored && percentComplete > 0) return 'Partial';
    if (series.monitored) return 'Missing';
    return 'Unmonitored';
  };

  if (viewMode === 'grid') {
    const posterHeight = gridItemWidth * 1.5;
    return (
      <View style={[styles.gridCard, { width: gridItemWidth }]}>
        <View style={[styles.gridPosterContainer, { height: posterHeight }]}>
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.gridPoster} contentFit="cover" />
          ) : (
            <View style={styles.noPosterGrid}>
              <Ionicons name="tv-outline" size={32} color={colors.text.muted} />
            </View>
          )}
          <View style={[styles.gridStatusBadge, { backgroundColor: getStatusColor() }]} />
          {percentComplete > 0 && percentComplete < 100 && (
            <View style={styles.gridProgressContainer}>
              <View style={[styles.gridProgressFill, { width: `${percentComplete}%`, backgroundColor: accentColor }]} />
            </View>
          )}
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>{series.title}</Text>
        <Text style={styles.gridYear}>{series.year}</Text>
      </View>
    );
  }

  return (
    <View style={styles.listCard}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.listPoster} contentFit="cover" />
      ) : (
        <View style={[styles.listPoster, styles.noPoster]}>
          <Ionicons name="tv-outline" size={24} color={colors.text.muted} />
        </View>
      )}
      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={1}>{series.title}</Text>
        <Text style={styles.listSubtitle}>
          {series.year} - {series.statistics?.seasonCount ?? 0} Seasons
        </Text>
        <View style={styles.episodeProgress}>
          <View style={styles.miniProgressBar}>
            <View
              style={[
                styles.miniProgressFill,
                { width: `${percentComplete}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
          <Text style={styles.episodeCount}>{episodeCount}/{totalEpisodes}</Text>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
        </View>
        {series.statistics?.sizeOnDisk > 0 && (
          <Text style={styles.sizeText}>{formatBytes(series.statistics.sizeOnDisk)}</Text>
        )}
      </View>
    </View>
  );
}

interface SearchResultCardProps {
  result: SonarrLookupResult;
  accentColor: string;
  onAdd: (result: SonarrLookupResult) => void;
  existingSeries?: SonarrSeries;
}

function SearchResultCard({ result, accentColor, onAdd, existingSeries }: SearchResultCardProps) {
  const poster = result.images.find((i) => i.coverType === 'poster');
  const posterUrl = result.remotePoster || poster?.remoteUrl || poster?.url;

  return (
    <View style={styles.searchCard}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.searchPoster} contentFit="cover" />
      ) : (
        <View style={[styles.searchPoster, styles.noPoster]}>
          <Ionicons name="tv-outline" size={24} color={colors.text.muted} />
        </View>
      )}
      <View style={styles.searchInfo}>
        <Text style={styles.searchTitle} numberOfLines={2}>{result.title}</Text>
        <Text style={styles.searchSubtitle}>
          {result.year} - {result.seasons?.length ?? 0} Seasons
        </Text>
        {result.network && (
          <Text style={styles.networkText}>{result.network}</Text>
        )}
        {result.overview && (
          <Text style={styles.searchOverview} numberOfLines={2}>{result.overview}</Text>
        )}
        {result.genres.length > 0 && (
          <Text style={styles.genreText}>{result.genres.slice(0, 3).join(', ')}</Text>
        )}
      </View>
      {existingSeries ? (
        <View style={styles.addedBadge}>
          <Ionicons name="checkmark" size={16} color={colors.status.success} />
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => onAdd(result)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

interface QueueItemCardProps {
  item: SonarrQueueItem;
  accentColor: string;
  onRemove: (id: number) => void;
}

function QueueItemCard({ item, accentColor, onRemove }: QueueItemCardProps) {
  const progress = item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0;

  const getStatusColor = () => {
    if (item.trackedDownloadState === 'importPending') return colors.status.success;
    if (item.trackedDownloadState === 'downloading') return colors.status.info;
    if (item.status === 'warning') return colors.status.warning;
    if (item.status === 'failed') return colors.status.error;
    return colors.text.tertiary;
  };

  const getStatusText = () => {
    if (item.trackedDownloadState === 'importPending') return 'Import Pending';
    if (item.trackedDownloadState === 'downloading') return 'Downloading';
    if (item.status === 'warning') return 'Warning';
    if (item.status === 'failed') return 'Failed';
    return item.status;
  };

  const formatTimeLeft = (timeLeft?: string) => {
    if (!timeLeft) return '';
    const parts = timeLeft.split(':');
    if (parts.length !== 3) return timeLeft;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const episodeInfo = item.episode
    ? `S${String(item.episode.seasonNumber).padStart(2, '0')}E${String(item.episode.episodeNumber).padStart(2, '0')}`
    : '';

  return (
    <View style={styles.queueCard}>
      <View style={styles.queueHeader}>
        <View style={styles.queueTitleRow}>
          <Text style={styles.queueTitle} numberOfLines={1}>{item.series?.title || item.title}</Text>
          {episodeInfo && (
            <View style={styles.episodeBadge}>
              <Text style={styles.episodeBadgeText}>{episodeInfo}</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => onRemove(item.id)}
          style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Ionicons name="close-circle" size={22} color={colors.text.tertiary} />
        </Pressable>
      </View>
      {item.episode?.title && (
        <Text style={styles.episodeTitle} numberOfLines={1}>{item.episode.title}</Text>
      )}
      <View style={styles.queueMeta}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
        {item.timeleft && (
          <Text style={styles.timeLeft}>{formatTimeLeft(item.timeleft)} left</Text>
        )}
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
      <View style={styles.queueFooter}>
        <Text style={styles.queueSize}>
          {formatBytes(item.size - item.sizeleft)} / {formatBytes(item.size)}
        </Text>
        {item.quality?.quality?.name && (
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityText}>{item.quality.quality.name}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SkeletonListCard() {
  return (
    <View style={styles.listCard}>
      <Skeleton width={60} height={90} borderRadius={8} />
      <View style={[styles.listInfo, { gap: 8 }]}>
        <Skeleton width="70%" height={16} borderRadius={4} />
        <Skeleton width="40%" height={14} borderRadius={4} />
        <Skeleton width="100%" height={4} borderRadius={2} />
        <Skeleton width="35%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

function SkeletonGridCard({ width }: { width: number }) {
  const height = width * 1.5;
  return (
    <View style={[styles.gridCard, { width }]}>
      <Skeleton width={width - 16} height={height} borderRadius={12} />
      <View style={{ marginTop: 8, gap: 4 }}>
        <Skeleton width="80%" height={14} borderRadius={4} />
        <Skeleton width="40%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

function SkeletonQueueCard() {
  return (
    <View style={styles.queueCard}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton width="50%" height={18} borderRadius={4} />
          <Skeleton width={50} height={20} borderRadius={4} />
        </View>
        <Skeleton width="40%" height={14} borderRadius={4} />
        <Skeleton width="100%" height={6} borderRadius={3} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width="30%" height={12} borderRadius={4} />
          <Skeleton width={60} height={20} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

interface AddSeriesModalProps {
  visible: boolean;
  series: SonarrLookupResult | null;
  accentColor: string;
  rootFolders: SonarrRootFolder[];
  qualityProfiles: SonarrQualityProfile[];
  onClose: () => void;
  onAdd: (options: {
    qualityProfileId: number;
    rootFolderPath: string;
    searchForMissingEpisodes: boolean;
    seriesType: 'standard' | 'daily' | 'anime';
  }) => void;
  isAdding: boolean;
}

function AddSeriesModal({
  visible,
  series,
  accentColor,
  rootFolders,
  qualityProfiles,
  onClose,
  onAdd,
  isAdding,
}: AddSeriesModalProps) {
  const [selectedQuality, setSelectedQuality] = useState<number>(qualityProfiles[0]?.id ?? 0);
  const [selectedFolder, setSelectedFolder] = useState<string>(rootFolders[0]?.path ?? '');
  const [searchForMissing, setSearchForMissing] = useState(true);
  const [seriesType, setSeriesType] = useState<'standard' | 'daily' | 'anime'>('standard');

  useEffect(() => {
    if (qualityProfiles.length > 0 && !selectedQuality) {
      setSelectedQuality(qualityProfiles[0].id);
    }
    if (rootFolders.length > 0 && !selectedFolder) {
      setSelectedFolder(rootFolders[0].path);
    }
    if (series) {
      setSeriesType(series.seriesType || 'standard');
    }
  }, [qualityProfiles, rootFolders, series]);

  if (!series) return null;

  const poster = series.images.find((i) => i.coverType === 'poster');
  const posterUrl = series.remotePoster || poster?.remoteUrl || poster?.url;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Series</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <FlatList
            data={[{ key: 'content' }]}
            renderItem={() => (
              <View style={styles.modalScroll}>
                <View style={styles.seriesPreview}>
                  {posterUrl ? (
                    <Image source={{ uri: posterUrl }} style={styles.previewPoster} contentFit="cover" />
                  ) : (
                    <View style={[styles.previewPoster, styles.noPoster]}>
                      <Ionicons name="tv-outline" size={32} color={colors.text.muted} />
                    </View>
                  )}
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewTitle}>{series.title}</Text>
                    <Text style={styles.previewYear}>{series.year}</Text>
                    {series.network && (
                      <Text style={styles.previewNetwork}>{series.network}</Text>
                    )}
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Quality Profile</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={qualityProfiles}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.optionScroll}
                  renderItem={({ item: profile }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.optionButton,
                        selectedQuality === profile.id && { backgroundColor: accentColor },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => setSelectedQuality(profile.id)}
                    >
                      <Text style={styles.optionText}>{profile.name}</Text>
                    </Pressable>
                  )}
                />

                <Text style={styles.sectionLabel}>Series Type</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={['standard', 'daily', 'anime'] as const}
                  keyExtractor={(item) => item}
                  contentContainerStyle={styles.optionScroll}
                  renderItem={({ item: type }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.optionButton,
                        seriesType === type && { backgroundColor: accentColor },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => setSeriesType(type)}
                    >
                      <Text style={styles.optionText}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </Pressable>
                  )}
                />

                <Text style={styles.sectionLabel}>Root Folder</Text>
                {rootFolders.map((folder) => (
                  <Pressable
                    key={folder.id}
                    style={({ pressed }) => [
                      styles.folderOption,
                      selectedFolder === folder.path && { borderColor: accentColor },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setSelectedFolder(folder.path)}
                  >
                    <View style={styles.folderInfo}>
                      <Ionicons
                        name={selectedFolder === folder.path ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selectedFolder === folder.path ? accentColor : colors.text.tertiary}
                      />
                      <Text style={styles.folderPath} numberOfLines={1}>{folder.path}</Text>
                    </View>
                    <Text style={styles.folderSpace}>{formatBytes(folder.freeSpace)} free</Text>
                  </Pressable>
                ))}

                <Pressable
                  style={({ pressed }) => [styles.searchToggle, pressed && { opacity: 0.8 }]}
                  onPress={() => setSearchForMissing(!searchForMissing)}
                >
                  <Ionicons
                    name={searchForMissing ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={accentColor}
                  />
                  <Text style={styles.searchToggleText}>Search for missing episodes</Text>
                </Pressable>
              </View>
            )}
          />

          <Pressable
            style={({ pressed }) => [
              styles.addSeriesButton,
              { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => onAdd({
              qualityProfileId: selectedQuality,
              rootFolderPath: selectedFolder,
              searchForMissingEpisodes: searchForMissing,
              seriesType,
            })}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addSeriesButtonText}>Add Series</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function SonarrManageScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { accentColor } = useSettingsStore();
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

  const [filter, setFilter] = useState<FilterType>('all');

  const numColumns = screenWidth > 600 ? 4 : 3;
  const gridItemWidth = (screenWidth - spacing[4] * 2 - spacing[2] * (numColumns - 1)) / numColumns;

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

  const filteredSeries = useMemo(() => {
    return seriesList.filter((series) => {
      const percent = series.statistics?.percentOfEpisodes ?? 0;
      if (filter === 'complete') return percent >= 100;
      if (filter === 'partial') return series.monitored && percent > 0 && percent < 100;
      if (filter === 'missing') return series.monitored && percent === 0;
      if (filter === 'unmonitored') return !series.monitored;
      return true;
    });
  }, [seriesList, filter]);

  const renderLibraryItem = useCallback(({ item }: { item: SonarrSeries }) => (
    <SeriesCard
      series={item}
      accentColor={accentColor}
      viewMode={viewMode}
      gridItemWidth={gridItemWidth}
    />
  ), [accentColor, viewMode, gridItemWidth]);

  const renderSearchItem = useCallback(({ item }: { item: SonarrLookupResult }) => (
    <SearchResultCard
      result={item}
      accentColor={accentColor}
      onAdd={handleAddSeries}
      existingSeries={seriesList.find((s) => s.tvdbId === item.tvdbId)}
    />
  ), [accentColor, handleAddSeries, seriesList]);

  const renderQueueItem = useCallback(({ item }: { item: SonarrQueueItem }) => (
    <QueueItemCard
      item={item}
      accentColor={accentColor}
      onRemove={handleRemoveFromQueue}
    />
  ), [accentColor, handleRemoveFromQueue]);

  const renderSkeletonList = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 8 }).map((_, i) => (
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
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Sonarr',
            headerStyle: { backgroundColor: colors.background.primary },
            headerTintColor: '#fff',
            headerBackTitle: 'Settings',
          }}
        />
        <View style={styles.notConfigured}>
          <View style={styles.notConfiguredIcon}>
            <Ionicons name="tv-outline" size={48} color={colors.text.muted} />
          </View>
          <Text style={styles.notConfiguredTitle}>Sonarr not configured</Text>
          <Text style={styles.notConfiguredSubtitle}>Set up Sonarr to manage your TV shows</Text>
          <Pressable
            style={({ pressed }) => [
              styles.configureButton,
              { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => router.push('/settings/sonarr')}
          >
            <Text style={styles.configureButtonText}>Configure Sonarr</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Sonarr',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerBackTitle: 'Settings',
        }}
      />

      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          {(['library', 'queue', 'search'] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              style={({ pressed }) => [
                styles.tab,
                activeTab === tab && [styles.tabActive, { borderBottomColor: accentColor }],
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={tab === 'library' ? 'library' : tab === 'queue' ? 'cloud-download' : 'search'}
                size={18}
                color={activeTab === tab ? accentColor : colors.text.tertiary}
              />
              <Text style={[styles.tabText, activeTab === tab && { color: accentColor }]}>
                {tab === 'library' ? `Library` : tab === 'queue' ? `Queue` : 'Search'}
              </Text>
              {tab === 'library' && seriesList.length > 0 && (
                <View style={[styles.countBadge, activeTab === tab && { backgroundColor: accentColor }]}>
                  <Text style={styles.countText}>{seriesList.length}</Text>
                </View>
              )}
              {tab === 'queue' && queue.length > 0 && (
                <View style={[styles.countBadge, activeTab === tab && { backgroundColor: accentColor }]}>
                  <Text style={styles.countText}>{queue.length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === 'search' && (
        <View style={styles.searchBar}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for TV shows..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </Pressable>
        </View>
      )}

      {activeTab === 'library' && (
        <View style={styles.toolbar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['all', 'complete', 'partial', 'missing', 'unmonitored'] as FilterType[]}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterContainer}
            renderItem={({ item: f }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.filterChip,
                  filter === f && { backgroundColor: accentColor },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            )}
          />
          <View style={styles.viewToggle}>
            <Pressable
              style={[styles.viewButton, viewMode === 'list' && { backgroundColor: colors.surface.elevated }]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list" size={18} color={viewMode === 'list' ? '#fff' : colors.text.tertiary} />
            </Pressable>
            <Pressable
              style={[styles.viewButton, viewMode === 'grid' && { backgroundColor: colors.surface.elevated }]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons name="grid" size={18} color={viewMode === 'grid' ? '#fff' : colors.text.tertiary} />
            </Pressable>
          </View>
        </View>
      )}

      {activeTab === 'library' && (
        isLoading ? (
          viewMode === 'grid' ? renderSkeletonGrid() : renderSkeletonList()
        ) : filteredSeries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="tv-outline" size={56} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>No series found</Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'all' ? 'Try changing your filter' : 'Add series from the search tab'}
            </Text>
          </View>
        ) : viewMode === 'grid' ? (
          <FlatList
            data={filteredSeries}
            keyExtractor={(item) => item.id.toString()}
            numColumns={numColumns}
            key={`grid-${numColumns}`}
            renderItem={renderLibraryItem}
            contentContainerStyle={styles.gridContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={accentColor} />
            }
          />
        ) : (
          <FlatList
            data={filteredSeries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLibraryItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={accentColor} />
            }
          />
        )
      )}

      {activeTab === 'queue' && (
        isLoading ? (
          renderSkeletonQueue()
        ) : queue.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={56} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>Queue is empty</Text>
            <Text style={styles.emptySubtitle}>No downloads in progress</Text>
          </View>
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderQueueItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={accentColor} />
            }
          />
        )
      )}

      {activeTab === 'search' && (
        isSearching ? (
          renderSkeletonList()
        ) : searchResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={56} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>Search for TV shows</Text>
            <Text style={styles.emptySubtitle}>Find shows to add to your library</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.tvdbId.toString()}
            renderItem={renderSearchItem}
            contentContainerStyle={styles.listContent}
          />
        )
      )}

      <AddSeriesModal
        visible={showAddModal}
        series={selectedSeries}
        accentColor={accentColor}
        rootFolders={rootFolders}
        qualityProfiles={qualityProfiles}
        onClose={() => {
          setShowAddModal(false);
          setSelectedSeries(null);
        }}
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
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing[2],
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[1.5],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    padding: spacing[3],
    gap: spacing[2],
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    color: '#fff',
    fontSize: 15,
  },
  searchButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    minWidth: 80,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingRight: spacing[3],
    gap: spacing[2],
  },
  filterContainer: {
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.default,
  },
  filterText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
    padding: spacing[0.5],
  },
  viewButton: {
    padding: spacing[2],
    borderRadius: borderRadius.sm,
  },
  listContent: {
    paddingBottom: spacing[20],
  },
  gridContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  skeletonContainer: {
    paddingTop: spacing[2],
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    gap: spacing[2],
  },
  listCard: {
    flexDirection: 'row',
    padding: spacing[3],
    marginHorizontal: spacing[3],
    marginVertical: spacing[1.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  listPoster: {
    width: 60,
    height: 90,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface.elevated,
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  listSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: spacing[0.5],
  },
  episodeProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[2],
  },
  miniProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  episodeCount: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  gridCard: {
    padding: spacing[2],
  },
  gridPosterContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  gridPoster: {
    width: '100%',
    height: '100%',
  },
  noPosterGrid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  gridStatusBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  gridProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gridProgressFill: {
    height: '100%',
  },
  gridTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginTop: spacing[2],
  },
  gridYear: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: spacing[0.5],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1.5],
    gap: spacing[1.5],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sizeText: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: spacing[1],
  },
  searchCard: {
    flexDirection: 'row',
    padding: spacing[3],
    marginHorizontal: spacing[3],
    marginVertical: spacing[1.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  searchPoster: {
    width: 70,
    height: 105,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface.elevated,
  },
  searchInfo: {
    flex: 1,
  },
  searchTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  searchSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: spacing[0.5],
  },
  networkText: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: spacing[0.5],
  },
  searchOverview: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: spacing[2],
    lineHeight: 18,
  },
  genreText: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: spacing[2],
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  addedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  queueCard: {
    padding: spacing[4],
    marginHorizontal: spacing[3],
    marginVertical: spacing[1.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  queueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[2],
  },
  queueTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  episodeBadge: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  episodeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  episodeTitle: {
    color: colors.text.secondary,
    fontSize: 13,
    marginBottom: spacing[2],
  },
  removeBtn: {
    padding: spacing[1],
  },
  queueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    marginBottom: spacing[3],
  },
  timeLeft: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginLeft: 'auto',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface.elevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
    width: 40,
    textAlign: 'right',
  },
  queueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueSize: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  qualityBadge: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  qualityText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  emptyTitle: {
    color: colors.text.secondary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing[4],
  },
  emptySubtitle: {
    color: colors.text.muted,
    fontSize: 14,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  notConfigured: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  notConfiguredIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  notConfiguredTitle: {
    color: colors.text.secondary,
    fontSize: 20,
    fontWeight: '600',
  },
  notConfiguredSubtitle: {
    color: colors.text.muted,
    fontSize: 14,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  configureButton: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    marginTop: spacing[6],
  },
  configureButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing[1],
  },
  modalScroll: {
    padding: spacing[4],
  },
  seriesPreview: {
    flexDirection: 'row',
    marginBottom: spacing[6],
    gap: spacing[4],
  },
  previewPoster: {
    width: 80,
    height: 120,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface.default,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewYear: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: spacing[1],
  },
  previewNetwork: {
    color: colors.text.muted,
    fontSize: 13,
    marginTop: spacing[1],
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing[3],
    marginTop: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionScroll: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  optionButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface.default,
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  folderOption: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  folderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  folderPath: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  folderSpace: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: spacing[2],
    marginLeft: spacing[8],
  },
  searchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  searchToggleText: {
    color: '#fff',
    fontSize: 14,
  },
  addSeriesButton: {
    margin: spacing[4],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  addSeriesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
