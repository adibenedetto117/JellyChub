import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { radarrService } from '@/services';
import type {
  RadarrMovie,
  RadarrLookupResult,
  RadarrQueueItem,
  RadarrRootFolder,
  RadarrQualityProfile,
} from '@/services/radarrService';
import { colors } from '@/theme';
import { formatBytes } from '@/utils';

type TabType = 'library' | 'queue' | 'search';

interface MovieCardProps {
  movie: RadarrMovie;
  accentColor: string;
}

function MovieCard({ movie, accentColor }: MovieCardProps) {
  const poster = movie.images.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;

  const getStatusColor = () => {
    if (movie.hasFile) return '#22c55e';
    if (movie.monitored) return '#f59e0b';
    return '#6b7280';
  };

  const getStatusText = () => {
    if (movie.hasFile) return 'Downloaded';
    if (movie.monitored) return 'Missing';
    return 'Unmonitored';
  };

  return (
    <View style={styles.movieCard}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.moviePoster} />
      ) : (
        <View style={[styles.moviePoster, styles.noPoster]}>
          <Ionicons name="film-outline" size={24} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={1}>{movie.title}</Text>
        <Text style={styles.movieYear}>{movie.year}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
        </View>
        {movie.sizeOnDisk > 0 && (
          <Text style={styles.sizeText}>{formatBytes(movie.sizeOnDisk)}</Text>
        )}
      </View>
    </View>
  );
}

interface SearchResultCardProps {
  result: RadarrLookupResult;
  accentColor: string;
  onAdd: (result: RadarrLookupResult) => void;
  existingMovie?: RadarrMovie;
}

function SearchResultCard({ result, accentColor, onAdd, existingMovie }: SearchResultCardProps) {
  const poster = result.images.find((i) => i.coverType === 'poster');
  const posterUrl = result.remotePoster || poster?.remoteUrl || poster?.url;

  return (
    <View style={styles.searchResultCard}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.searchPoster} />
      ) : (
        <View style={[styles.searchPoster, styles.noPoster]}>
          <Ionicons name="film-outline" size={24} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultTitle} numberOfLines={2}>{result.title}</Text>
        <Text style={styles.searchResultYear}>{result.year}</Text>
        {result.overview && (
          <Text style={styles.searchResultOverview} numberOfLines={2}>{result.overview}</Text>
        )}
        {result.genres.length > 0 && (
          <Text style={styles.genreText}>{result.genres.slice(0, 3).join(', ')}</Text>
        )}
      </View>
      {existingMovie ? (
        <View style={[styles.addedBadge, { backgroundColor: '#22c55e20' }]}>
          <Ionicons name="checkmark" size={16} color="#22c55e" />
        </View>
      ) : (
        <Pressable
          style={[styles.addButton, { backgroundColor: accentColor }]}
          onPress={() => onAdd(result)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

interface QueueItemCardProps {
  item: RadarrQueueItem;
  accentColor: string;
  onRemove: (id: number) => void;
}

function QueueItemCard({ item, accentColor, onRemove }: QueueItemCardProps) {
  const progress = item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0;

  const getStatusColor = () => {
    if (item.trackedDownloadState === 'importPending') return '#22c55e';
    if (item.trackedDownloadState === 'downloading') return '#0ea5e9';
    if (item.status === 'warning') return '#f59e0b';
    if (item.status === 'failed') return '#ef4444';
    return '#6b7280';
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

  return (
    <View style={styles.queueCard}>
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle} numberOfLines={1}>{item.movie?.title || item.title}</Text>
        <Pressable onPress={() => onRemove(item.id)} style={styles.removeBtn}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>
      <View style={styles.queueMeta}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
        {item.timeleft && (
          <Text style={styles.timeLeft}>{formatTimeLeft(item.timeleft)} left</Text>
        )}
      </View>
      <View style={styles.progressRow}>
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
          <Text style={styles.qualityBadge}>{item.quality.quality.name}</Text>
        )}
      </View>
    </View>
  );
}

interface AddMovieModalProps {
  visible: boolean;
  movie: RadarrLookupResult | null;
  accentColor: string;
  rootFolders: RadarrRootFolder[];
  qualityProfiles: RadarrQualityProfile[];
  onClose: () => void;
  onAdd: (options: { qualityProfileId: number; rootFolderPath: string; searchForMovie: boolean }) => void;
  isAdding: boolean;
}

function AddMovieModal({
  visible,
  movie,
  accentColor,
  rootFolders,
  qualityProfiles,
  onClose,
  onAdd,
  isAdding,
}: AddMovieModalProps) {
  const [selectedQuality, setSelectedQuality] = useState<number>(qualityProfiles[0]?.id ?? 0);
  const [selectedFolder, setSelectedFolder] = useState<string>(rootFolders[0]?.path ?? '');
  const [searchForMovie, setSearchForMovie] = useState(true);

  useEffect(() => {
    if (qualityProfiles.length > 0 && !selectedQuality) {
      setSelectedQuality(qualityProfiles[0].id);
    }
    if (rootFolders.length > 0 && !selectedFolder) {
      setSelectedFolder(rootFolders[0].path);
    }
  }, [qualityProfiles, rootFolders]);

  if (!movie) return null;

  const poster = movie.images.find((i) => i.coverType === 'poster');
  const posterUrl = movie.remotePoster || poster?.remoteUrl || poster?.url;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Movie</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll}>
            <View style={styles.moviePreview}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.previewPoster} />
              ) : (
                <View style={[styles.previewPoster, styles.noPoster]}>
                  <Ionicons name="film-outline" size={32} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{movie.title}</Text>
                <Text style={styles.previewYear}>{movie.year}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Quality Profile</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
              {qualityProfiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  style={[
                    styles.optionButton,
                    selectedQuality === profile.id && { backgroundColor: accentColor },
                  ]}
                  onPress={() => setSelectedQuality(profile.id)}
                >
                  <Text style={styles.optionText}>{profile.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Root Folder</Text>
            {rootFolders.map((folder) => (
              <Pressable
                key={folder.id}
                style={[
                  styles.folderOption,
                  selectedFolder === folder.path && { borderColor: accentColor },
                ]}
                onPress={() => setSelectedFolder(folder.path)}
              >
                <View style={styles.folderInfo}>
                  <Ionicons
                    name={selectedFolder === folder.path ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedFolder === folder.path ? accentColor : 'rgba(255,255,255,0.5)'}
                  />
                  <Text style={styles.folderPath}>{folder.path}</Text>
                </View>
                <Text style={styles.folderSpace}>{formatBytes(folder.freeSpace)} free</Text>
              </Pressable>
            ))}

            <Pressable
              style={styles.searchToggle}
              onPress={() => setSearchForMovie(!searchForMovie)}
            >
              <Ionicons
                name={searchForMovie ? 'checkbox' : 'square-outline'}
                size={22}
                color={accentColor}
              />
              <Text style={styles.searchToggleText}>Search for movie after adding</Text>
            </Pressable>
          </ScrollView>

          <Pressable
            style={[styles.addMovieButton, { backgroundColor: accentColor }]}
            onPress={() => onAdd({ qualityProfileId: selectedQuality, rootFolderPath: selectedFolder, searchForMovie })}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addMovieButtonText}>Add Movie</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function RadarrManageScreen() {
  const { accentColor, radarrApiKey } = useSettingsStore();
  const isConfigured = radarrService.isConfigured();

  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [movies, setMovies] = useState<RadarrMovie[]>([]);
  const [searchResults, setSearchResults] = useState<RadarrLookupResult[]>([]);
  const [queue, setQueue] = useState<RadarrQueueItem[]>([]);
  const [rootFolders, setRootFolders] = useState<RadarrRootFolder[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<RadarrQualityProfile[]>([]);

  const [selectedMovie, setSelectedMovie] = useState<RadarrLookupResult | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [filter, setFilter] = useState<'all' | 'downloaded' | 'missing' | 'unmonitored'>('all');

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

  const handleAddMovie = useCallback((result: RadarrLookupResult) => {
    setSelectedMovie(result);
    setShowAddModal(true);
  }, []);

  const handleConfirmAdd = useCallback(async (options: {
    qualityProfileId: number;
    rootFolderPath: string;
    searchForMovie: boolean;
  }) => {
    if (!selectedMovie) return;

    setIsAdding(true);
    try {
      await radarrService.addMovie({
        tmdbId: selectedMovie.tmdbId,
        title: selectedMovie.title,
        qualityProfileId: options.qualityProfileId,
        rootFolderPath: options.rootFolderPath,
        searchForMovie: options.searchForMovie,
      });
      Alert.alert('Success', `${selectedMovie.title} has been added to Radarr`);
      setShowAddModal(false);
      setSelectedMovie(null);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add movie');
    } finally {
      setIsAdding(false);
    }
  }, [selectedMovie, loadData]);

  const handleRemoveFromQueue = useCallback(async (id: number) => {
    try {
      await radarrService.removeFromQueue(id);
      setQueue((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to remove from queue');
    }
  }, []);

  const filteredMovies = movies.filter((movie) => {
    if (filter === 'downloaded') return movie.hasFile;
    if (filter === 'missing') return movie.monitored && !movie.hasFile;
    if (filter === 'unmonitored') return !movie.monitored;
    return true;
  });

  const existingTmdbIds = new Set(movies.map((m) => m.tmdbId));

  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Radarr',
            headerStyle: { backgroundColor: colors.background.primary },
            headerTintColor: '#fff',
            headerBackTitle: 'Settings',
          }}
        />
        <View style={styles.notConfigured}>
          <Ionicons name="film-outline" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.notConfiguredText}>Radarr not configured</Text>
          <Pressable
            style={[styles.configureButton, { backgroundColor: accentColor }]}
            onPress={() => router.push('/settings/radarr')}
          >
            <Text style={styles.configureButtonText}>Configure Radarr</Text>
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
          headerTitle: 'Radarr',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerBackTitle: 'Settings',
        }}
      />

      <View style={styles.tabs}>
        {(['library', 'queue', 'search'] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: accentColor }]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'library' ? 'library' : tab === 'queue' ? 'cloud-download' : 'search'}
              size={18}
              color={activeTab === tab ? accentColor : 'rgba(255,255,255,0.5)'}
            />
            <Text style={[styles.tabText, activeTab === tab && { color: accentColor }]}>
              {tab === 'library' ? `Library (${movies.length})` : tab === 'queue' ? `Queue (${queue.length})` : 'Search'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'search' && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for movies..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable
            style={[styles.searchButton, { backgroundColor: accentColor }]}
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      )}

      {activeTab === 'library' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {(['all', 'downloaded', 'missing', 'unmonitored'] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterChip, filter === f && { backgroundColor: accentColor }]}
              onPress={() => setFilter(f)}
            >
              <Text style={styles.filterText}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={accentColor} />
          }
        >
          {activeTab === 'library' && (
            filteredMovies.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="film-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>No movies found</Text>
              </View>
            ) : (
              filteredMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} accentColor={accentColor} />
              ))
            )
          )}

          {activeTab === 'queue' && (
            queue.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Queue is empty</Text>
              </View>
            ) : (
              queue.map((item) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  accentColor={accentColor}
                  onRemove={handleRemoveFromQueue}
                />
              ))
            )
          )}

          {activeTab === 'search' && (
            searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Search for movies to add</Text>
              </View>
            ) : (
              searchResults.map((result) => (
                <SearchResultCard
                  key={result.tmdbId}
                  result={result}
                  accentColor={accentColor}
                  onAdd={handleAddMovie}
                  existingMovie={movies.find((m) => m.tmdbId === result.tmdbId)}
                />
              ))
            )
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <AddMovieModal
        visible={showAddModal}
        movie={selectedMovie}
        accentColor={accentColor}
        rootFolders={rootFolders}
        qualityProfiles={qualityProfiles}
        onClose={() => {
          setShowAddModal(false);
          setSelectedMovie(null);
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  searchButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface.default,
    marginRight: 8,
  },
  filterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  movieCard: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  moviePoster: {
    width: 60,
    height: 90,
    borderRadius: 6,
    backgroundColor: colors.surface.default,
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  movieYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sizeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 4,
  },
  searchResultCard: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  searchPoster: {
    width: 70,
    height: 105,
    borderRadius: 6,
    backgroundColor: colors.surface.default,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  searchResultYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  searchResultOverview: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  genreText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 6,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  addedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  queueCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  queueTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
  queueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeLeft: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 'auto',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  queueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueSize: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  qualityBadge: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notConfigured: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notConfiguredText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  configureButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  configureButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
  },
  moviePreview: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  previewPoster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.surface.default,
  },
  previewInfo: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 4,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    marginTop: 8,
  },
  optionScroll: {
    marginBottom: 16,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surface.default,
    marginRight: 8,
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
  },
  folderOption: {
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  folderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  folderPath: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  folderSpace: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 30,
  },
  searchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  searchToggleText: {
    color: '#fff',
    fontSize: 14,
  },
  addMovieButton: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addMovieButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
