import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet, RefreshControl, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDownloadStore, useSettingsStore } from '@/stores';
import { downloadManager } from '@/services';
import { formatBytes, ticksToMs, formatDuration, getDisplayName, getDisplayImageUrl } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { getImageUrl } from '@/api';
import { colors } from '@/theme';
import type { DownloadItem } from '@/types';

// Content type tabs
type ContentTab = 'movies' | 'tvshows' | 'music' | 'books';

// Grouped data structures
interface SeriesGroup {
  seriesId: string;
  seriesName: string;
  seasons: SeasonGroup[];
  totalSize: number;
  episodeCount: number;
}

interface SeasonGroup {
  seasonNumber: number;
  episodes: DownloadItem[];
  totalSize: number;
}

interface ArtistGroup {
  artistName: string;
  albums: AlbumGroup[];
  totalSize: number;
  trackCount: number;
}

interface AlbumGroup {
  albumId: string;
  albumName: string;
  tracks: DownloadItem[];
  totalSize: number;
}

// Tab Button Component
const TabButton = memo(function TabButton({
  label,
  icon,
  active,
  count,
  onPress,
  accentColor,
}: {
  label: string;
  icon: string;
  active: boolean;
  count: number;
  onPress: () => void;
  accentColor: string;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.tabButton,
          { backgroundColor: active ? accentColor : 'rgba(255,255,255,0.08)' },
          animatedStyle,
        ]}
      >
        <Ionicons name={icon as any} size={16} color={active ? '#fff' : 'rgba(255,255,255,0.6)'} />
        <Text style={[styles.tabButtonText, { color: active ? '#fff' : 'rgba(255,255,255,0.6)' }]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : accentColor + '40' }]}>
            <Text style={[styles.tabBadgeText, { color: active ? '#fff' : accentColor }]}>{count}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

// Collapsible Header Component
const CollapsibleHeader = memo(function CollapsibleHeader({
  title,
  subtitle,
  count,
  size,
  expanded,
  onToggle,
  accentColor,
  level = 0,
}: {
  title: string;
  subtitle?: string;
  count: number;
  size: number;
  expanded: boolean;
  onToggle: () => void;
  accentColor: string;
  level?: number;
}) {
  return (
    <Pressable onPress={onToggle} style={[styles.collapsibleHeader, { paddingLeft: 16 + level * 16 }]}>
      <Ionicons
        name={expanded ? 'chevron-down' : 'chevron-forward'}
        size={18}
        color={accentColor}
        style={styles.chevronIcon}
      />
      <View style={styles.headerInfo}>
        <Text style={styles.collapsibleTitle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={styles.headerMeta}>
        <Text style={styles.headerCount}>{count} {count === 1 ? 'item' : 'items'}</Text>
        <Text style={styles.headerSize}>{formatBytes(size)}</Text>
      </View>
    </Pressable>
  );
});

// Download Card for individual items
const DownloadCard = memo(function DownloadCard({
  item,
  accentColor,
  onPlay,
  onDelete,
  onPauseResume,
  compact = false,
  hideMedia,
}: {
  item: DownloadItem;
  accentColor: string;
  onPlay: () => void;
  onDelete: () => void;
  onPauseResume: () => void;
  compact?: boolean;
  hideMedia: boolean;
}) {
  const isActive = item.status === 'downloading' || item.status === 'pending' || item.status === 'paused';
  const isCompleted = item.status === 'completed';
  const isFailed = item.status === 'failed';

  const rawImageUrl = getImageUrl(item.itemId, 'Primary', { maxWidth: 200 });
  const imageUrl = getDisplayImageUrl(item.itemId, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item.item, hideMedia);

  const getStatusColor = () => {
    switch (item.status) {
      case 'downloading': return accentColor;
      case 'pending': return '#888';
      case 'paused': return '#f59e0b';
      case 'completed': return '#22c55e';
      case 'failed': return '#ef4444';
      default: return '#888';
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case 'downloading': return `${item.progress}%`;
      case 'pending': return 'Waiting';
      case 'paused': return 'Paused';
      case 'completed': return 'Ready';
      case 'failed': return item.error || 'Failed';
      default: return '';
    }
  };

  const getDisplayInfo = () => {
    const type = item.item.Type;
    if (type === 'Episode') {
      const season = item.item.ParentIndexNumber ?? 1;
      const episode = item.item.IndexNumber ?? 1;
      return `S${season}E${episode}`;
    }
    if (type === 'Audio') {
      const track = item.item.IndexNumber;
      return track ? `Track ${track}` : 'Track';
    }
    return null;
  };

  const displayInfo = getDisplayInfo();
  const duration = item.item.RunTimeTicks ? formatDuration(ticksToMs(item.item.RunTimeTicks)) : null;

  if (compact) {
    return (
      <Animated.View entering={FadeIn.duration(200)} layout={Layout.springify()} style={styles.compactCard}>
        <Pressable onPress={isCompleted ? onPlay : undefined} style={styles.compactCardContent}>
          <View style={styles.compactThumbnail}>
            <CachedImage uri={imageUrl} style={styles.compactImage} borderRadius={6} fallbackText={displayName.charAt(0)} />
            {isActive && (
              <View style={styles.compactProgress}>
                <View style={[styles.compactProgressBar, { width: `${item.progress}%`, backgroundColor: accentColor }]} />
              </View>
            )}
          </View>
          <View style={styles.compactInfo}>
            <View style={styles.compactTitleRow}>
              {displayInfo && (
                <Text style={[styles.compactBadge, { color: accentColor }]}>{displayInfo}</Text>
              )}
              <Text style={styles.compactTitle} numberOfLines={1}>{displayName}</Text>
            </View>
            <View style={styles.compactMetaRow}>
              <Text style={styles.compactMeta}>{formatBytes(item.totalBytes)}</Text>
              {duration && <Text style={styles.compactMeta}>{duration}</Text>}
              {!isCompleted && (
                <Text style={[styles.compactStatus, { color: getStatusColor() }]}>{getStatusText()}</Text>
              )}
            </View>
          </View>
          <View style={styles.compactActions}>
            {isActive && !isFailed && (
              <Pressable onPress={onPauseResume} style={[styles.compactAction, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name={item.status === 'paused' ? 'play' : 'pause'} size={14} color={accentColor} />
              </Pressable>
            )}
            <Pressable onPress={onDelete} style={[styles.compactAction, styles.deleteAction]}>
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} layout={Layout.springify()} style={styles.card}>
      <Pressable onPress={isCompleted ? onPlay : undefined} style={styles.cardContent}>
        <View style={styles.thumbnailContainer}>
          <CachedImage uri={imageUrl} style={styles.thumbnail} borderRadius={8} fallbackText={displayName.charAt(0).toUpperCase()} />
          {isCompleted && (
            <View style={[styles.playOverlay, { backgroundColor: accentColor }]}>
              <Ionicons name="play" size={14} color="#fff" />
            </View>
          )}
          {isActive && (
            <View style={styles.progressOverlay}>
              <View style={[styles.progressBar, { width: `${item.progress}%`, backgroundColor: accentColor }]} />
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{displayName}</Text>
            {item.item.Type === 'Episode' && item.item.SeriesName && !hideMedia && (
              <Text style={styles.seriesName} numberOfLines={1}>{item.item.SeriesName}</Text>
            )}
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <Text style={[styles.typeText, { color: getStatusColor() }]}>
                {displayInfo || item.item.Type}
              </Text>
            </View>
            <Text style={styles.sizeText}>{formatBytes(item.totalBytes)}</Text>
            {duration && <Text style={styles.durationText}>{duration}</Text>}
          </View>
          <View style={styles.statusRow}>
            {isCompleted ? (
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                <Text style={[styles.statusText, { color: '#22c55e' }]}>Downloaded</Text>
              </View>
            ) : (
              <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
            )}
          </View>
        </View>
        <View style={styles.actionsContainer}>
          {isActive && !isFailed && (
            <Pressable onPress={onPauseResume} style={[styles.actionButton, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name={item.status === 'paused' ? 'play' : 'pause'} size={16} color="#fff" />
            </Pressable>
          )}
          <Pressable onPress={onDelete} style={[styles.actionButton, styles.deleteButton]}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// Active Downloads Section
const ActiveDownloadsSection = memo(function ActiveDownloadsSection({
  downloads,
  accentColor,
  onPlay,
  onDelete,
  onPauseResume,
  onPauseAll,
  onResumeAll,
  isPaused,
  hideMedia,
}: {
  downloads: DownloadItem[];
  accentColor: string;
  onPlay: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  onPauseResume: (item: DownloadItem) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  isPaused: boolean;
  hideMedia: boolean;
}) {
  if (downloads.length === 0) return null;

  return (
    <View style={styles.activeSection}>
      <View style={styles.activeSectionHeader}>
        <Ionicons name="cloud-download-outline" size={18} color={accentColor} />
        <Text style={styles.activeSectionTitle}>Downloading</Text>
        <View style={[styles.activeBadge, { backgroundColor: accentColor + '30' }]}>
          <Text style={[styles.activeBadgeText, { color: accentColor }]}>{downloads.length}</Text>
        </View>
        <View style={styles.queueControls}>
          {isPaused ? (
            <Pressable
              onPress={onResumeAll}
              style={[styles.queueButton, { backgroundColor: accentColor + '20' }]}
            >
              <Ionicons name="play" size={14} color={accentColor} />
              <Text style={[styles.queueButtonText, { color: accentColor }]}>Resume All</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onPauseAll}
              style={[styles.queueButton, { backgroundColor: '#f59e0b20' }]}
            >
              <Ionicons name="pause" size={14} color="#f59e0b" />
              <Text style={[styles.queueButtonText, { color: '#f59e0b' }]}>Pause All</Text>
            </Pressable>
          )}
        </View>
      </View>
      {downloads.map((item) => (
        <DownloadCard
          key={item.id}
          item={item}
          accentColor={accentColor}
          onPlay={() => onPlay(item)}
          onDelete={() => onDelete(item)}
          onPauseResume={() => onPauseResume(item)}
          hideMedia={hideMedia}
        />
      ))}
    </View>
  );
});

// Movies Section
const MoviesSection = memo(function MoviesSection({
  movies,
  accentColor,
  onPlay,
  onDelete,
  hideMedia,
}: {
  movies: DownloadItem[];
  accentColor: string;
  onPlay: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  hideMedia: boolean;
}) {
  if (movies.length === 0) {
    return (
      <View style={styles.emptySection}>
        <Ionicons name="film-outline" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptySectionText}>No downloaded movies</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionContent}>
      {movies.map((item) => (
        <DownloadCard
          key={item.id}
          item={item}
          accentColor={accentColor}
          onPlay={() => onPlay(item)}
          onDelete={() => onDelete(item)}
          onPauseResume={() => {}}
          hideMedia={hideMedia}
        />
      ))}
    </View>
  );
});

const PLACEHOLDER_SERIES = ['Drama Series', 'Comedy Show', 'Action Series', 'Mystery Show', 'Sci-Fi Series'];
const PLACEHOLDER_ARTISTS = ['Artist One', 'Artist Two', 'Artist Three', 'Artist Four', 'Artist Five'];
const PLACEHOLDER_ALBUMS = ['Album One', 'Album Two', 'Album Three', 'Album Four', 'Album Five'];

// TV Shows Section with hierarchical grouping
const TVShowsSection = memo(function TVShowsSection({
  seriesGroups,
  accentColor,
  onPlay,
  onDelete,
  hideMedia,
}: {
  seriesGroups: SeriesGroup[];
  accentColor: string;
  onPlay: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  hideMedia: boolean;
}) {
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  const toggleSeries = useCallback((seriesId: string) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  }, []);

  const toggleSeason = useCallback((key: string) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (seriesGroups.length === 0) {
    return (
      <View style={styles.emptySection}>
        <Ionicons name="tv-outline" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptySectionText}>No downloaded TV shows</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionContent}>
      {seriesGroups.map((series, index) => {
        const isSeriesExpanded = expandedSeries.has(series.seriesId);
        const displaySeriesName = hideMedia
          ? PLACEHOLDER_SERIES[index % PLACEHOLDER_SERIES.length]
          : series.seriesName;
        return (
          <View key={series.seriesId} style={styles.groupContainer}>
            <CollapsibleHeader
              title={displaySeriesName}
              count={series.episodeCount}
              size={series.totalSize}
              expanded={isSeriesExpanded}
              onToggle={() => toggleSeries(series.seriesId)}
              accentColor={accentColor}
            />
            {isSeriesExpanded && (
              <Animated.View entering={FadeIn.duration(200)}>
                {series.seasons.map((season) => {
                  const seasonKey = `${series.seriesId}-${season.seasonNumber}`;
                  const isSeasonExpanded = expandedSeasons.has(seasonKey);
                  return (
                    <View key={seasonKey}>
                      <CollapsibleHeader
                        title={`Season ${season.seasonNumber}`}
                        count={season.episodes.length}
                        size={season.totalSize}
                        expanded={isSeasonExpanded}
                        onToggle={() => toggleSeason(seasonKey)}
                        accentColor={accentColor}
                        level={1}
                      />
                      {isSeasonExpanded && (
                        <Animated.View entering={FadeIn.duration(200)} style={styles.episodesList}>
                          {season.episodes.map((episode) => (
                            <DownloadCard
                              key={episode.id}
                              item={episode}
                              accentColor={accentColor}
                              onPlay={() => onPlay(episode)}
                              onDelete={() => onDelete(episode)}
                              onPauseResume={() => {}}
                              compact
                              hideMedia={hideMedia}
                            />
                          ))}
                        </Animated.View>
                      )}
                    </View>
                  );
                })}
              </Animated.View>
            )}
          </View>
        );
      })}
    </View>
  );
});

// Music Section with hierarchical grouping
const MusicSection = memo(function MusicSection({
  artistGroups,
  accentColor,
  onPlay,
  onDelete,
  hideMedia,
}: {
  artistGroups: ArtistGroup[];
  accentColor: string;
  onPlay: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  hideMedia: boolean;
}) {
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  const toggleArtist = useCallback((artistName: string) => {
    setExpandedArtists((prev) => {
      const next = new Set(prev);
      if (next.has(artistName)) {
        next.delete(artistName);
      } else {
        next.add(artistName);
      }
      return next;
    });
  }, []);

  const toggleAlbum = useCallback((key: string) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (artistGroups.length === 0) {
    return (
      <View style={styles.emptySection}>
        <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptySectionText}>No downloaded music</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionContent}>
      {artistGroups.map((artist, artistIndex) => {
        const isArtistExpanded = expandedArtists.has(artist.artistName);
        const displayArtistName = hideMedia
          ? PLACEHOLDER_ARTISTS[artistIndex % PLACEHOLDER_ARTISTS.length]
          : artist.artistName;
        return (
          <View key={artist.artistName} style={styles.groupContainer}>
            <CollapsibleHeader
              title={displayArtistName}
              count={artist.trackCount}
              size={artist.totalSize}
              expanded={isArtistExpanded}
              onToggle={() => toggleArtist(artist.artistName)}
              accentColor={accentColor}
            />
            {isArtistExpanded && (
              <Animated.View entering={FadeIn.duration(200)}>
                {artist.albums.map((album, albumIndex) => {
                  const albumKey = `${artist.artistName}-${album.albumId}`;
                  const isAlbumExpanded = expandedAlbums.has(albumKey);
                  const displayAlbumName = hideMedia
                    ? PLACEHOLDER_ALBUMS[albumIndex % PLACEHOLDER_ALBUMS.length]
                    : album.albumName;
                  return (
                    <View key={albumKey}>
                      <CollapsibleHeader
                        title={displayAlbumName}
                        count={album.tracks.length}
                        size={album.totalSize}
                        expanded={isAlbumExpanded}
                        onToggle={() => toggleAlbum(albumKey)}
                        accentColor={accentColor}
                        level={1}
                      />
                      {isAlbumExpanded && (
                        <Animated.View entering={FadeIn.duration(200)} style={styles.tracksList}>
                          {album.tracks.map((track) => (
                            <DownloadCard
                              key={track.id}
                              item={track}
                              accentColor={accentColor}
                              onPlay={() => onPlay(track)}
                              onDelete={() => onDelete(track)}
                              onPauseResume={() => {}}
                              compact
                              hideMedia={hideMedia}
                            />
                          ))}
                        </Animated.View>
                      )}
                    </View>
                  );
                })}
              </Animated.View>
            )}
          </View>
        );
      })}
    </View>
  );
});

// Books Section
const BooksSection = memo(function BooksSection({
  books,
  accentColor,
  onPlay,
  onDelete,
  hideMedia,
}: {
  books: DownloadItem[];
  accentColor: string;
  onPlay: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  hideMedia: boolean;
}) {
  if (books.length === 0) {
    return (
      <View style={styles.emptySection}>
        <Ionicons name="book-outline" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptySectionText}>No downloaded books</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionContent}>
      {books.map((item) => (
        <DownloadCard
          key={item.id}
          item={item}
          accentColor={accentColor}
          onPlay={() => onPlay(item)}
          onDelete={() => onDelete(item)}
          onPauseResume={() => {}}
          hideMedia={hideMedia}
        />
      ))}
    </View>
  );
});

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

  // Separate active downloads from completed
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

  // Group TV shows by series and season
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

    // Sort episodes within each season by episode number
    seriesMap.forEach((series) => {
      series.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
      series.seasons.forEach((season) => {
        season.episodes.sort((a, b) => (a.item.IndexNumber ?? 0) - (b.item.IndexNumber ?? 0));
      });
    });

    return Array.from(seriesMap.values()).sort((a, b) => a.seriesName.localeCompare(b.seriesName));
  }, [tvShows]);

  // Group music by artist and album
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

    // Sort tracks within each album by track number
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

  const storagePercent = maxStorage > 0 ? (usedStorage / maxStorage) * 100 : 0;

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
      {/* Header */}
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

      {/* Storage Bar */}
      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <View style={[styles.storageIcon, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="cloud-download-outline" size={18} color={accentColor} />
          </View>
          <View style={styles.storageInfo}>
            <Text style={styles.storageTitle}>{t('downloads.storage')}</Text>
            <Text style={styles.storageSubtitle}>
              {formatBytes(usedStorage)} of {formatBytes(maxStorage)} used
            </Text>
          </View>
          <Text style={styles.storagePercent}>{Math.round(storagePercent)}%</Text>
        </View>
        <View style={styles.storageBarBg}>
          <View
            style={[
              styles.storageBarFill,
              {
                width: `${Math.min(100, storagePercent)}%`,
                backgroundColor: storagePercent > 90 ? '#ef4444' : accentColor,
              },
            ]}
          />
        </View>
      </View>

      {downloads.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="cloud-download-outline" size={40} color={accentColor} />
          </View>
          <Text style={styles.emptyTitle}>{t('downloads.noDownloads')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('downloads.noDownloadsDesc')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Active Downloads Section */}
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

          {/* Content Type Tabs */}
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

              {/* Content Section */}
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
  storageCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.surface.default,
    borderRadius: 16,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storageInfo: {
    flex: 1,
  },
  storageTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  storageSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  storagePercent: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  storageBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  // Active Downloads Section
  activeSection: {
    marginBottom: 20,
  },
  activeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  activeSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  queueControls: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  queueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  queueButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
  // Tabs
  tabsContainer: {
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Section Content
  sectionContent: {
    marginTop: 8,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptySectionText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 12,
  },
  // Collapsible Groups
  groupContainer: {
    marginBottom: 4,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    marginBottom: 4,
  },
  chevronIcon: {
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  collapsibleTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  headerCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  headerSize: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  episodesList: {
    paddingLeft: 16,
    marginBottom: 8,
  },
  tracksList: {
    paddingLeft: 16,
    marginBottom: 8,
  },
  // Download Card Styles
  card: {
    marginBottom: 12,
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  thumbnailContainer: {
    width: 80,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressBar: {
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleRow: {
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  seriesName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sizeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  durationText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  // Compact Card Styles
  compactCard: {
    marginBottom: 6,
    backgroundColor: colors.surface.elevated,
    borderRadius: 10,
    overflow: 'hidden',
  },
  compactCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  compactThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  compactProgressBar: {
    height: '100%',
  },
  compactInfo: {
    flex: 1,
    marginLeft: 10,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  compactMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  compactStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  compactActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  compactAction: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
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
  bottomSpacer: {
    height: 100,
  },
});
