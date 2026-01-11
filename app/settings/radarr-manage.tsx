import { useState, useEffect, useCallback, useMemo, useRef, memo, lazy, Suspense } from 'react';
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
  ScrollView,
  InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/stores/settingsStore';
import { radarrService } from '@/services';
import type {
  RadarrMovie,
  RadarrLookupResult,
  RadarrQueueItem,
  RadarrRootFolder,
  RadarrQualityProfile,
  RadarrRelease,
} from '@/services/radarrService';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';
import { Skeleton } from '@/components/ui';

const RADARR_ORANGE = '#ffc230';
const RADARR_GRADIENT = ['#ffc230', '#f5a623', '#e8941f'] as const;

type TabType = 'library' | 'queue' | 'search';
type FilterType = 'all' | 'downloaded' | 'missing' | 'unmonitored';
type SortType = 'title' | 'added' | 'year' | 'size';

interface Stats {
  total: number;
  downloaded: number;
  missing: number;
  queue: number;
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  const stars = Math.round(rating / 2);
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= stars ? 'star' : 'star-outline'}
          size={size}
          color={star <= stars ? RADARR_ORANGE : colors.text.muted}
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function StatCard({ label, value, icon, color, onPress }: { label: string; value: number; icon: string; color: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.statCard, pressed && onPress && { opacity: 0.8 }]}>
      <View style={[styles.statIconBg, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function getQualityBadgeColor(quality: string): string {
  const q = quality.toLowerCase();
  if (q.includes('2160') || q.includes('4k') || q.includes('uhd')) return '#9333ea';
  if (q.includes('1080')) return '#3b82f6';
  if (q.includes('720')) return '#22c55e';
  if (q.includes('480') || q.includes('sd')) return '#f59e0b';
  return colors.text.tertiary;
}

const MovieCard = memo(function MovieCard({
  movie,
  onPress,
  cardWidth,
}: {
  movie: RadarrMovie;
  onPress: () => void;
  cardWidth: number;
}) {
  const poster = movie.images.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const rating = movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0;

  const getStatusInfo = () => {
    if (movie.hasFile) return { color: colors.status.success, text: 'Done', icon: 'checkmark-circle' };
    if (movie.monitored) return { color: colors.status.warning, text: 'Missing', icon: 'time' };
    return { color: colors.text.muted, text: 'Off', icon: 'eye-off' };
  };

  const status = getStatusInfo();
  const posterHeight = cardWidth * 1.5;

  return (
    <Animated.View entering={FadeInUp.delay(0).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.gridCard, { width: cardWidth, opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={[styles.gridPosterContainer, { height: posterHeight }]}>
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.gridPoster} contentFit="cover" recyclingKey={`poster-${movie.id}`} />
          ) : (
            <LinearGradient colors={[colors.surface.elevated, colors.surface.default]} style={styles.noPosterGrid}>
              <Ionicons name="film-outline" size={32} color={colors.text.muted} />
            </LinearGradient>
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gridOverlay} />
          <View style={[styles.gridStatusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.gridStatusText}>{status.text}</Text>
          </View>
          {!movie.monitored && (
            <View style={styles.unmonitoredBadge}>
              <Ionicons name="eye-off" size={12} color="#fff" />
            </View>
          )}
          <View style={styles.gridProgressContainer}>
            <View style={[styles.gridProgressFill, { width: movie.hasFile ? '100%' : '0%', backgroundColor: status.color }]} />
          </View>
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>{movie.title}</Text>
        <View style={styles.gridMeta}>
          <Text style={styles.gridYear}>{movie.year}</Text>
          {rating > 0 && (
            <>
              <View style={styles.gridDot} />
              <Ionicons name="star" size={10} color={RADARR_ORANGE} />
              <Text style={styles.gridRating}>{rating.toFixed(1)}</Text>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

const QueueCard = memo(function QueueCard({
  item,
  onRemove,
}: {
  item: RadarrQueueItem;
  onRemove: () => void;
}) {
  const progress = item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0;
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    progressAnim.value = withSpring(progress, { damping: 15 });
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  const getStatusInfo = () => {
    if (item.trackedDownloadState === 'importPending') return { color: colors.status.success, label: 'Import Pending' };
    if (item.trackedDownloadState === 'downloading') return { color: colors.status.info, label: 'Downloading' };
    if (item.status === 'warning') return { color: colors.status.warning, label: 'Warning' };
    if (item.status === 'failed') return { color: colors.status.error, label: 'Failed' };
    return { color: colors.text.tertiary, label: item.status };
  };

  const status = getStatusInfo();
  const qualityColor = getQualityBadgeColor(item.quality?.quality?.name || '');

  return (
    <View style={styles.queueCard}>
      <View style={styles.queueHeader}>
        <View style={styles.queueTitleRow}>
          <Text style={styles.queueTitle} numberOfLines={1}>{item.movie?.title || item.title}</Text>
          <Pressable onPress={onRemove} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={colors.text.muted} />
          </Pressable>
        </View>
        <View style={styles.queueMeta}>
          {item.quality?.quality?.name && (
            <View style={[styles.qualityBadge, { borderColor: qualityColor }]}>
              <Text style={[styles.qualityText, { color: qualityColor }]}>{item.quality.quality.name}</Text>
            </View>
          )}
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.queueStatusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { backgroundColor: status.color }, progressStyle]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      <View style={styles.queueFooter}>
        <Text style={styles.queueSize}>{formatBytes(item.size - item.sizeleft)} / {formatBytes(item.size)}</Text>
        {item.timeleft && <Text style={styles.queueTime}>{item.timeleft}</Text>}
      </View>
    </View>
  );
});

const SearchResultCard = memo(function SearchResultCard({
  result,
  onAdd,
  existingMovie,
}: {
  result: RadarrLookupResult;
  onAdd: () => void;
  existingMovie?: RadarrMovie;
}) {
  const poster = result.images.find((i) => i.coverType === 'poster');
  const posterUrl = result.remotePoster || poster?.remoteUrl || poster?.url;
  const rating = result.ratings?.tmdb?.value || result.ratings?.imdb?.value || 0;

  return (
    <View style={styles.searchCard}>
      <View style={styles.searchPosterContainer}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.searchPoster} contentFit="cover" />
        ) : (
          <View style={[styles.searchPoster, styles.noPoster]}>
            <Ionicons name="film-outline" size={24} color={colors.text.muted} />
          </View>
        )}
      </View>
      <View style={styles.searchInfo}>
        <Text style={styles.searchTitle} numberOfLines={2}>{result.title}</Text>
        <View style={styles.searchMeta}>
          <Text style={styles.searchYear}>{result.year}</Text>
          {result.runtime > 0 && <Text style={styles.searchRuntime}>{result.runtime} min</Text>}
          {rating > 0 && (
            <View style={styles.searchRating}>
              <Ionicons name="star" size={10} color={RADARR_ORANGE} />
              <Text style={styles.searchRatingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {result.overview && (
          <Text style={styles.searchOverview} numberOfLines={2}>{result.overview}</Text>
        )}
        {result.genres.length > 0 && (
          <View style={styles.genreRow}>
            {result.genres.slice(0, 2).map((g) => (
              <View key={g} style={styles.genreChip}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {existingMovie ? (
        <View style={styles.inLibraryIcon}>
          <Ionicons name="checkmark-circle" size={28} color={colors.status.success} />
        </View>
      ) : (
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Ionicons name="add" size={24} color="#000" />
        </Pressable>
      )}
    </View>
  );
});

function MovieDetailModal({
  visible,
  movie,
  onClose,
  onToggleMonitored,
  onDelete,
  onRefresh,
  onSearch,
  onManualSearch,
}: {
  visible: boolean;
  movie: RadarrMovie | null;
  onClose: () => void;
  onToggleMonitored: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onSearch: () => void;
  onManualSearch: () => void;
}) {
  if (!movie) return null;

  const poster = movie.images.find((i) => i.coverType === 'poster');
  const fanart = movie.images.find((i) => i.coverType === 'fanart');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;
  const rating = movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0;

  const getStatusInfo = () => {
    if (movie.hasFile) return { color: colors.status.success, label: 'Downloaded', icon: 'checkmark-circle' };
    if (movie.monitored) return { color: colors.status.warning, label: 'Missing', icon: 'time' };
    return { color: colors.text.muted, label: 'Unmonitored', icon: 'eye-off' };
  };

  const status = getStatusInfo();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <Animated.View entering={FadeInUp.springify()} style={styles.detailModal}>
          <View style={styles.detailHeader}>
            {fanartUrl && (
              <Image source={{ uri: fanartUrl }} style={styles.detailFanart} contentFit="cover" />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)', colors.background.secondary]}
              style={styles.detailGradient}
            />
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <BlurView intensity={60} style={styles.closeBtnBlur}>
                <Ionicons name="close" size={22} color="#fff" />
              </BlurView>
            </Pressable>
            <View style={styles.detailHeaderContent}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.detailPoster} contentFit="cover" />
              ) : (
                <View style={[styles.detailPoster, styles.noPoster]}>
                  <Ionicons name="film-outline" size={32} color={colors.text.muted} />
                </View>
              )}
              <View style={styles.detailHeaderInfo}>
                <Text style={styles.detailTitle} numberOfLines={2}>{movie.title}</Text>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailYear}>{movie.year}</Text>
                  {movie.runtime > 0 && <Text style={styles.detailRuntime}>{movie.runtime} min</Text>}
                </View>
                {rating > 0 && <StarRating rating={rating} size={12} />}
                <View style={[styles.detailStatus, { backgroundColor: `${status.color}20` }]}>
                  <Ionicons name={status.icon as any} size={12} color={status.color} />
                  <Text style={[styles.detailStatusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            {movie.overview && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.overview}>{movie.overview}</Text>
              </View>
            )}

            {movie.genres.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Genres</Text>
                <View style={styles.genreContainer}>
                  {movie.genres.map((g) => (
                    <View key={g} style={styles.genreChipLg}>
                      <Text style={styles.genreTextLg}>{g}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {movie.hasFile && movie.sizeOnDisk > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>File</Text>
                <View style={styles.fileInfoCard}>
                  <Ionicons name="folder" size={16} color={RADARR_ORANGE} />
                  <Text style={styles.fileSize}>{formatBytes(movie.sizeOnDisk)}</Text>
                </View>
              </View>
            )}

            <View style={styles.actionGrid}>
              <Pressable style={[styles.actionBtn, movie.monitored && styles.actionBtnActive]} onPress={onToggleMonitored}>
                <Ionicons name={movie.monitored ? 'eye' : 'eye-off'} size={18} color={movie.monitored ? RADARR_ORANGE : colors.text.tertiary} />
                <Text style={[styles.actionBtnText, movie.monitored && { color: RADARR_ORANGE }]}>{movie.monitored ? 'Monitored' : 'Unmonitored'}</Text>
              </Pressable>
              {!movie.hasFile && movie.monitored && (
                <Pressable style={styles.actionBtn} onPress={onSearch}>
                  <Ionicons name="flash" size={18} color={RADARR_ORANGE} />
                  <Text style={[styles.actionBtnText, { color: RADARR_ORANGE }]}>Auto Search</Text>
                </Pressable>
              )}
              <Pressable style={styles.actionBtn} onPress={onManualSearch}>
                <Ionicons name="albums-outline" size={18} color={colors.text.secondary} />
                <Text style={styles.actionBtnText}>Browse Releases</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={onRefresh}>
                <Ionicons name="sync-outline" size={18} color={colors.text.secondary} />
                <Text style={styles.actionBtnText}>Refresh Metadata</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
                <Ionicons name="trash" size={18} color={colors.status.error} />
                <Text style={[styles.actionBtnText, { color: colors.status.error }]}>Delete</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

type SortReleaseType = 'seeders' | 'size' | 'age' | 'quality';

const SIZE_RANGES = [
  { label: 'All', min: 0, max: Infinity },
  { label: '<1 GB', min: 0, max: 1024 * 1024 * 1024 },
  { label: '1-5 GB', min: 1024 * 1024 * 1024, max: 5 * 1024 * 1024 * 1024 },
  { label: '5-15 GB', min: 5 * 1024 * 1024 * 1024, max: 15 * 1024 * 1024 * 1024 },
  { label: '15-50 GB', min: 15 * 1024 * 1024 * 1024, max: 50 * 1024 * 1024 * 1024 },
  { label: '>50 GB', min: 50 * 1024 * 1024 * 1024, max: Infinity },
];

const ManualSearchModal = memo(function ManualSearchModal({
  visible,
  movie,
  releases,
  isLoading,
  onClose,
  onDownload,
  indexerFilter,
  setIndexerFilter,
  qualityFilter,
  setQualityFilter,
}: {
  visible: boolean;
  movie: RadarrMovie | null;
  releases: RadarrRelease[];
  isLoading: boolean;
  onClose: () => void;
  onDownload: (release: RadarrRelease) => void;
  indexerFilter: string;
  setIndexerFilter: (v: string) => void;
  qualityFilter: string;
  setQualityFilter: (v: string) => void;
}) {
  const [sortBy, setSortBy] = useState<SortReleaseType>('seeders');
  const [hideRejected, setHideRejected] = useState(false);
  const [minSeeders, setMinSeeders] = useState(0);
  const [sizeFilter, setSizeFilter] = useState('All');

  if (!movie) return null;

  const indexers = useMemo(() => {
    const counts = new Map<string, number>();
    releases.forEach((r) => {
      counts.set(r.indexer, (counts.get(r.indexer) || 0) + 1);
    });
    return [{ name: 'All', count: releases.length }, ...Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)];
  }, [releases]);

  const qualities = useMemo(() => {
    const counts = new Map<string, number>();
    releases.forEach((r) => {
      const q = r.quality?.quality?.name;
      if (q) counts.set(q, (counts.get(q) || 0) + 1);
    });
    const qualityOrder = ['2160p', '1080p', '720p', '480p'];
    return [
      { name: 'All', count: releases.length },
      ...Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          const aIdx = qualityOrder.findIndex((q) => a.name.includes(q));
          const bIdx = qualityOrder.findIndex((q) => b.name.includes(q));
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return b.count - a.count;
        }),
    ];
  }, [releases]);

  const sizeRangeCounts = useMemo(() => {
    return SIZE_RANGES.map((range) => {
      const count = releases.filter((r) => r.size >= range.min && r.size < range.max).length;
      return { ...range, count };
    });
  }, [releases]);

  const filteredAndSortedReleases = useMemo(() => {
    const selectedSizeRange = SIZE_RANGES.find((r) => r.label === sizeFilter) || SIZE_RANGES[0];

    let result = releases.filter((r) => {
      if (indexerFilter !== 'All' && r.indexer !== indexerFilter) return false;
      if (qualityFilter !== 'All' && r.quality?.quality?.name !== qualityFilter) return false;
      if (hideRejected && r.rejected) return false;
      if (minSeeders > 0 && (r.seeders ?? 0) < minSeeders) return false;
      if (sizeFilter !== 'All' && (r.size < selectedSizeRange.min || r.size >= selectedSizeRange.max)) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'seeders':
          return (b.seeders ?? 0) - (a.seeders ?? 0);
        case 'size':
          return b.size - a.size;
        case 'age':
          return a.age - b.age;
        case 'quality': {
          const order = ['2160p', '1080p', '720p', '480p'];
          const aQ = a.quality?.quality?.name || '';
          const bQ = b.quality?.quality?.name || '';
          const aIdx = order.findIndex((q) => aQ.includes(q));
          const bIdx = order.findIndex((q) => bQ.includes(q));
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [releases, indexerFilter, qualityFilter, sortBy, hideRejected, minSeeders, sizeFilter]);

  const totalResults = releases.length;
  const filteredCount = filteredAndSortedReleases.length;
  const rejectedCount = releases.filter((r) => r.rejected).length;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.manualModal}>
          <View style={styles.manualHeader}>
            <View style={styles.manualHeaderLeft}>
              <Text style={styles.manualTitle}>Browse Releases</Text>
              <Text style={styles.manualSubtitle} numberOfLines={1}>{movie.title}</Text>
            </View>
            <View style={styles.manualHeaderRight}>
              {!isLoading && totalResults > 0 && (
                <View style={styles.resultCountBadge}>
                  <Text style={styles.resultCountText}>{filteredCount}/{totalResults}</Text>
                </View>
              )}
              <Pressable onPress={onClose} hitSlop={8} style={styles.manualCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          {!isLoading && releases.length > 0 && (
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterSectionTitle}>Filters</Text>
                <View style={styles.filterActions}>
                  <Pressable
                    style={[styles.filterToggle, hideRejected && styles.filterToggleActive]}
                    onPress={() => setHideRejected(!hideRejected)}
                  >
                    <Ionicons name={hideRejected ? 'eye-off' : 'eye'} size={14} color={hideRejected ? '#000' : colors.text.tertiary} />
                    <Text style={[styles.filterToggleText, hideRejected && styles.filterToggleTextActive]}>
                      Hide Rejected ({rejectedCount})
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Indexer</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {indexers.map((idx) => (
                    <Pressable
                      key={idx.name}
                      style={[styles.filterChip, indexerFilter === idx.name && styles.filterChipActive]}
                      onPress={() => setIndexerFilter(idx.name)}
                    >
                      <Text style={[styles.filterChipText, indexerFilter === idx.name && styles.filterChipTextActive]}>
                        {idx.name}
                      </Text>
                      <View style={[styles.filterChipCount, indexerFilter === idx.name && styles.filterChipCountActive]}>
                        <Text style={[styles.filterChipCountText, indexerFilter === idx.name && styles.filterChipCountTextActive]}>
                          {idx.count}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Quality</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {qualities.map((q) => (
                    <Pressable
                      key={q.name}
                      style={[styles.filterChip, qualityFilter === q.name && styles.filterChipActive]}
                      onPress={() => setQualityFilter(q.name)}
                    >
                      <Text style={[styles.filterChipText, qualityFilter === q.name && styles.filterChipTextActive]}>
                        {q.name}
                      </Text>
                      <View style={[styles.filterChipCount, qualityFilter === q.name && styles.filterChipCountActive]}>
                        <Text style={[styles.filterChipCountText, qualityFilter === q.name && styles.filterChipCountTextActive]}>
                          {q.count}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.sortSection}>
                <Text style={styles.filterLabel}>Sort By</Text>
                <View style={styles.sortOptions}>
                  {([
                    { key: 'seeders', label: 'Seeders', icon: 'arrow-up' },
                    { key: 'size', label: 'Size', icon: 'server' },
                    { key: 'age', label: 'Age', icon: 'time' },
                    { key: 'quality', label: 'Quality', icon: 'film' },
                  ] as const).map((opt) => (
                    <Pressable
                      key={opt.key}
                      style={[styles.sortOption, sortBy === opt.key && styles.sortOptionActive]}
                      onPress={() => setSortBy(opt.key)}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={12}
                        color={sortBy === opt.key ? '#000' : colors.text.tertiary}
                      />
                      <Text style={[styles.sortOptionText, sortBy === opt.key && styles.sortOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {isLoading ? (
            <View style={styles.manualLoading}>
              <View style={styles.loadingSpinner}>
                <ActivityIndicator size="large" color={RADARR_ORANGE} />
              </View>
              <Text style={styles.manualLoadingText}>Searching indexers...</Text>
              <Text style={styles.manualLoadingSubtext}>This may take a moment</Text>
            </View>
          ) : filteredAndSortedReleases.length === 0 ? (
            <View style={styles.manualEmpty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search-outline" size={48} color={colors.text.muted} />
              </View>
              <Text style={styles.manualEmptyText}>
                {releases.length > 0 ? 'No results match your filters' : 'No releases found'}
              </Text>
              {releases.length > 0 && (
                <Pressable
                  style={styles.clearFiltersBtn}
                  onPress={() => {
                    setIndexerFilter('All');
                    setQualityFilter('All');
                    setHideRejected(false);
                    setMinSeeders(0);
                  }}
                >
                  <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredAndSortedReleases}
              keyExtractor={(item) => item.guid}
              contentContainerStyle={styles.releaseList}
              renderItem={({ item, index }) => {
                const qColor = getQualityBadgeColor(item.quality?.quality?.name || '');
                const isTopResult = index < 3 && !item.rejected;
                return (
                  <Pressable
                    style={[
                      styles.releaseCard,
                      item.rejected && styles.releaseRejected,
                      isTopResult && styles.releaseTopResult,
                    ]}
                    onPress={() => onDownload(item)}
                  >
                    <View style={styles.releaseTop}>
                      <View style={styles.releaseTopLeft}>
                        <View style={[styles.releaseBadge, { borderColor: qColor, backgroundColor: `${qColor}15` }]}>
                          <Text style={[styles.releaseBadgeText, { color: qColor }]}>{item.quality?.quality?.name}</Text>
                        </View>
                        {isTopResult && (
                          <View style={styles.topResultBadge}>
                            <Ionicons name="star" size={10} color="#000" />
                          </View>
                        )}
                      </View>
                      <View style={styles.releaseStats}>
                        {item.seeders !== undefined && (
                          <View style={styles.statItem}>
                            <Ionicons name="arrow-up" size={10} color={colors.status.success} />
                            <Text style={styles.statText}>{item.seeders}</Text>
                          </View>
                        )}
                        <Text style={styles.releaseSize}>{formatBytes(item.size)}</Text>
                      </View>
                    </View>
                    <Text style={styles.releaseTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.releaseMeta}>
                      <View style={styles.indexerBadge}>
                        <Ionicons name="server-outline" size={10} color={RADARR_ORANGE} />
                        <Text style={styles.releaseIndexer}>{item.indexer}</Text>
                      </View>
                      <Text style={styles.releaseAge}>{item.age}d old</Text>
                    </View>
                    {item.rejected && item.rejections?.[0] && (
                      <View style={styles.rejectionBanner}>
                        <Ionicons name="warning" size={12} color={colors.status.error} />
                        <Text style={styles.rejectionText} numberOfLines={1}>{item.rejections[0]}</Text>
                        <Text style={styles.forceDownloadHint}>Tap to force</Text>
                      </View>
                    )}
                  </Pressable>
                );
              }}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews
              getItemLayout={(_, index) => ({ length: 120, offset: 120 * index, index })}
            />
          )}
        </View>
      </View>
    </Modal>
  );
});

type AddMovieStep = 'preview' | 'settings' | 'confirm';

const AddMovieModal = memo(function AddMovieModal({
  visible,
  movie,
  rootFolders,
  qualityProfiles,
  onClose,
  onAdd,
  isAdding,
}: {
  visible: boolean;
  movie: RadarrLookupResult | null;
  rootFolders: RadarrRootFolder[];
  qualityProfiles: RadarrQualityProfile[];
  onClose: () => void;
  onAdd: (opts: { qualityProfileId: number; rootFolderPath: string; searchForMovie: boolean }) => void;
  isAdding: boolean;
}) {
  const [step, setStep] = useState<AddMovieStep>('preview');
  const [quality, setQuality] = useState<number>(0);
  const [folder, setFolder] = useState<string>('');
  const [autoSearch, setAutoSearch] = useState(true);

  useEffect(() => {
    if (qualityProfiles.length > 0 && !quality) setQuality(qualityProfiles[0].id);
    if (rootFolders.length > 0 && !folder) setFolder(rootFolders[0].path);
  }, [qualityProfiles, rootFolders]);

  useEffect(() => {
    if (visible) {
      setStep('preview');
    }
  }, [visible]);

  if (!movie) return null;

  const poster = movie.images.find((i) => i.coverType === 'poster');
  const fanart = movie.images.find((i) => i.coverType === 'fanart');
  const posterUrl = movie.remotePoster || poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;
  const rating = movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0;
  const selectedProfile = qualityProfiles.find((p) => p.id === quality);
  const selectedFolder = rootFolders.find((f) => f.path === folder);

  const stepIndex = step === 'preview' ? 0 : step === 'settings' ? 1 : 2;

  const handleNext = () => {
    if (step === 'preview') setStep('settings');
    else if (step === 'settings') setStep('confirm');
    else onAdd({ qualityProfileId: quality, rootFolderPath: folder, searchForMovie: autoSearch });
  };

  const handleBack = () => {
    if (step === 'settings') setStep('preview');
    else if (step === 'confirm') setStep('settings');
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <Animated.View entering={FadeInUp.springify()} style={styles.addModal}>
          <View style={styles.addModalHeaderContainer}>
            {fanartUrl && (
              <Image source={{ uri: fanartUrl }} style={styles.addModalBg} contentFit="cover" />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', colors.background.secondary]}
              style={styles.addModalBgGradient}
            />
            <View style={styles.addModalHeader}>
              <Pressable onPress={handleBack} style={styles.addModalBackBtn}>
                <Ionicons name={step === 'preview' ? 'close' : 'arrow-back'} size={22} color="#fff" />
              </Pressable>
              <View style={styles.stepIndicator}>
                {(['preview', 'settings', 'confirm'] as const).map((s, i) => (
                  <View
                    key={s}
                    style={[
                      styles.stepDot,
                      i <= stepIndex && styles.stepDotActive,
                      i === stepIndex && styles.stepDotCurrent,
                    ]}
                  />
                ))}
              </View>
              <View style={styles.addModalHeaderSpacer} />
            </View>
          </View>

          <ScrollView style={styles.addModalContent} showsVerticalScrollIndicator={false}>
            {step === 'preview' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.stepContent}>
                <View style={styles.addPreviewLarge}>
                  {posterUrl ? (
                    <Image source={{ uri: posterUrl }} style={styles.addPosterLarge} contentFit="cover" />
                  ) : (
                    <View style={[styles.addPosterLarge, styles.noPoster]}>
                      <Ionicons name="film-outline" size={48} color={colors.text.muted} />
                    </View>
                  )}
                </View>
                <Text style={styles.addPreviewTitleLarge}>{movie.title}</Text>
                <View style={styles.addPreviewMeta}>
                  <View style={styles.yearBadgeLarge}>
                    <Text style={styles.yearBadgeLargeText}>{movie.year}</Text>
                  </View>
                  {movie.runtime > 0 && (
                    <Text style={styles.runtimeText}>{movie.runtime} min</Text>
                  )}
                  {rating > 0 && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color={RADARR_ORANGE} />
                      <Text style={styles.ratingBadgeText}>{rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                {movie.genres.length > 0 && (
                  <View style={styles.genreRowLarge}>
                    {movie.genres.slice(0, 3).map((g) => (
                      <View key={g} style={styles.genreChipLarge}>
                        <Text style={styles.genreChipTextLarge}>{g}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {movie.overview && (
                  <Text style={styles.overviewText} numberOfLines={4}>{movie.overview}</Text>
                )}
              </Animated.View>
            )}

            {step === 'settings' && (
              <Animated.View entering={SlideInRight.duration(200)} style={styles.stepContent}>
                <Text style={styles.stepTitle}>Configure Settings</Text>
                <Text style={styles.stepSubtitle}>Choose how to add this movie</Text>

                <View style={styles.settingSection}>
                  <View style={styles.settingSectionHeader}>
                    <Ionicons name="speedometer-outline" size={18} color={RADARR_ORANGE} />
                    <Text style={styles.settingSectionTitle}>Quality Profile</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                    {qualityProfiles.map((p) => (
                      <Pressable
                        key={p.id}
                        style={[styles.optionChip, quality === p.id && styles.optionChipActive]}
                        onPress={() => setQuality(p.id)}
                      >
                        <Text style={[styles.optionChipText, quality === p.id && styles.optionChipTextActive]}>{p.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.settingSection}>
                  <View style={styles.settingSectionHeader}>
                    <Ionicons name="folder-outline" size={18} color={RADARR_ORANGE} />
                    <Text style={styles.settingSectionTitle}>Root Folder</Text>
                  </View>
                  {rootFolders.map((f) => (
                    <Pressable
                      key={f.id}
                      style={[styles.folderOption, folder === f.path && styles.folderOptionActive]}
                      onPress={() => setFolder(f.path)}
                    >
                      <View style={styles.folderRadio}>
                        <View style={[styles.radioOuter, folder === f.path && styles.radioOuterActive]}>
                          {folder === f.path && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.folderInfo}>
                          <Text style={styles.folderPath} numberOfLines={1}>{f.path}</Text>
                          <View style={styles.folderFreeRow}>
                            <View style={styles.freeSpaceBar}>
                              <View
                                style={[
                                  styles.freeSpaceFill,
                                  { width: `${Math.min(100, Math.max(10, (f.freeSpace / (f.freeSpace + 1000000000000)) * 100))}%` },
                                ]}
                              />
                            </View>
                            <Text style={styles.folderFree}>{formatBytes(f.freeSpace)} free</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.settingSection}>
                  <Pressable style={styles.toggleRow} onPress={() => setAutoSearch(!autoSearch)}>
                    <View style={styles.toggleInfo}>
                      <Ionicons name="search-outline" size={18} color={autoSearch ? RADARR_ORANGE : colors.text.muted} />
                      <View>
                        <Text style={styles.toggleLabel}>Search After Adding</Text>
                        <Text style={styles.toggleHint}>Automatically search for this movie</Text>
                      </View>
                    </View>
                    <View style={[styles.toggleSwitch, autoSearch && styles.toggleSwitchActive]}>
                      <View style={[styles.toggleKnob, autoSearch && styles.toggleKnobActive]} />
                    </View>
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {step === 'confirm' && (
              <Animated.View entering={SlideInRight.duration(200)} style={styles.stepContent}>
                <Text style={styles.stepTitle}>Confirm Addition</Text>
                <Text style={styles.stepSubtitle}>Review your settings</Text>

                <View style={styles.confirmCard}>
                  <View style={styles.confirmRow}>
                    {posterUrl && (
                      <Image source={{ uri: posterUrl }} style={styles.confirmPoster} contentFit="cover" />
                    )}
                    <View style={styles.confirmInfo}>
                      <Text style={styles.confirmTitle}>{movie.title}</Text>
                      <Text style={styles.confirmYear}>{movie.year}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.confirmSummary}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="speedometer-outline" size={16} color={colors.text.muted} />
                    <Text style={styles.summaryLabel}>Quality</Text>
                    <Text style={styles.summaryValue}>{selectedProfile?.name || 'Not selected'}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="folder-outline" size={16} color={colors.text.muted} />
                    <Text style={styles.summaryLabel}>Folder</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {selectedFolder?.path || 'Not selected'}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="search-outline" size={16} color={colors.text.muted} />
                    <Text style={styles.summaryLabel}>Auto Search</Text>
                    <Text style={[styles.summaryValue, { color: autoSearch ? colors.status.success : colors.text.muted }]}>
                      {autoSearch ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          <View style={styles.addModalFooter}>
            <Pressable
              style={styles.addSubmitBtn}
              onPress={handleNext}
              disabled={isAdding || (step === 'settings' && (!quality || !folder))}
            >
              <LinearGradient
                colors={RADARR_GRADIENT}
                style={[
                  styles.addSubmitGradient,
                  (step === 'settings' && (!quality || !folder)) && styles.addSubmitDisabled,
                ]}
              >
                {isAdding ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.addSubmitText}>
                      {step === 'preview' ? 'Continue' : step === 'settings' ? 'Review' : 'Add to Radarr'}
                    </Text>
                    <Ionicons
                      name={step === 'confirm' ? 'add-circle' : 'arrow-forward'}
                      size={18}
                      color="#000"
                    />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon as any} size={48} color={RADARR_ORANGE} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

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
    <QueueCard item={item} onRemove={() => handleRemoveFromQueue(item.id)} />
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
        <View style={styles.notConfigured}>
          <View style={styles.notConfiguredIcon}>
            <LinearGradient colors={RADARR_GRADIENT} style={styles.notConfiguredIconGradient}>
              <Ionicons name="film" size={48} color="#000" />
            </LinearGradient>
          </View>
          <Text style={styles.notConfiguredTitle}>Radarr Not Configured</Text>
          <Text style={styles.notConfiguredSubtitle}>Connect to manage movies</Text>
          <Pressable style={styles.configureBtn} onPress={() => router.push('/settings/radarr')}>
            <LinearGradient colors={RADARR_GRADIENT} style={styles.configureBtnGradient}>
              <Text style={styles.configureBtnText}>Configure</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerTitleRow}>
          <View style={styles.radarrIcon}>
            <LinearGradient colors={RADARR_GRADIENT} style={styles.radarrIconGradient}>
              <Ionicons name="film" size={16} color="#000" />
            </LinearGradient>
          </View>
          <Text style={styles.headerTitle}>Radarr</Text>
        </View>
        <Pressable onPress={() => router.push('/settings/radarr-calendar')} style={styles.calendarBtn}>
          <Ionicons name="calendar-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Total" value={stats.total} icon="film" color={RADARR_ORANGE} onPress={() => setFilter('all')} />
        <StatCard label="Have" value={stats.downloaded} icon="checkmark-circle" color={colors.status.success} onPress={() => setFilter('downloaded')} />
        <StatCard label="Missing" value={stats.missing} icon="time" color={colors.status.warning} onPress={() => setFilter('missing')} />
        <StatCard label="Queue" value={stats.queue} icon="cloud-download" color={colors.status.info} onPress={() => setActiveTab('queue')} />
      </View>

      <View style={styles.tabRow}>
        {(['library', 'queue', 'search'] as TabType[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => setActiveTab(t)}
          >
            <Ionicons
              name={t === 'library' ? 'library' : t === 'queue' ? 'cloud-download' : 'search'}
              size={16}
              color={activeTab === t ? RADARR_ORANGE : colors.text.muted}
            />
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'search' && (
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={colors.text.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search movies..."
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.text.muted} />
              </Pressable>
            )}
          </View>
          <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <LinearGradient colors={RADARR_GRADIENT} style={styles.searchBtnGradient}>
                <Ionicons name="search" size={18} color="#000" />
              </LinearGradient>
            )}
          </Pressable>
        </View>
      )}

      {activeTab === 'library' && (
        <View style={styles.libraryControls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(['all', 'downloaded', 'missing', 'unmonitored'] as FilterType[]).map((f) => (
              <Pressable
                key={f}
                style={[styles.filterPill, filter === f && styles.filterPillActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.sortRow}>
            <Pressable style={styles.sortBtn} onPress={() => {
              const sorts: SortType[] = ['title', 'added', 'year', 'size'];
              const idx = sorts.indexOf(sortBy);
              setSortBy(sorts[(idx + 1) % sorts.length]);
            }}>
              <Ionicons name="swap-vertical" size={14} color={colors.text.secondary} />
              <Text style={styles.sortText}>{sortBy}</Text>
            </Pressable>
            <Pressable onPress={() => setSortAsc(!sortAsc)} hitSlop={8}>
              <Ionicons name={sortAsc ? 'arrow-up' : 'arrow-down'} size={14} color={colors.text.secondary} />
            </Pressable>
          </View>
        </View>
      )}

      {activeTab === 'library' && (
        isLoading ? (
          <View style={styles.skeletonGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={{ width: cardWidth, marginRight: i % numColumns < numColumns - 1 ? spacing[2] : 0, marginBottom: spacing[3] }}>
                <Skeleton width={cardWidth} height={cardWidth * 1.5} borderRadius={12} />
                <Skeleton width="80%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
              </View>
            ))}
          </View>
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
            getItemLayout={(_, index) => ({
              length: cardWidth * 1.5 + spacing[3] + 40,
              offset: (cardWidth * 1.5 + spacing[3] + 40) * Math.floor(index / numColumns),
              index,
            })}
          />
        )
      )}

      {activeTab === 'queue' && (
        isLoading ? (
          <View style={styles.skeletonList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.skeletonQueueCard}>
                <Skeleton width="70%" height={16} borderRadius={4} />
                <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
                <Skeleton width="100%" height={6} borderRadius={3} style={{ marginTop: 12 }} />
              </View>
            ))}
          </View>
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
          <View style={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.skeletonSearchCard}>
                <Skeleton width={70} height={105} borderRadius={8} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Skeleton width="80%" height={14} borderRadius={4} />
                  <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                  <Skeleton width="100%" height={10} borderRadius={4} style={{ marginTop: 8 }} />
                </View>
              </View>
            ))}
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  radarrIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
  },
  radarrIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    marginBottom: spacing[3],
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2.5],
    gap: spacing[1.5],
    borderRadius: borderRadius.md,
  },
  tabBtnActive: {
    backgroundColor: colors.surface.elevated,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.muted,
  },
  tabTextActive: {
    color: RADARR_ORANGE,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  searchInputWrap: {
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
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  searchBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryControls: {
    marginBottom: spacing[2],
  },
  filterRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    paddingBottom: spacing[2],
  },
  filterPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: `${RADARR_ORANGE}20`,
    borderColor: RADARR_ORANGE,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: RADARR_ORANGE,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  sortText: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  movieGrid: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[20],
  },
  movieGridRow: {
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  gridCard: {
    padding: spacing[1],
  },
  gridPosterContainer: {
    borderRadius: borderRadius.xl,
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
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  gridStatusBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  gridStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  unmonitoredBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing[1],
    borderRadius: borderRadius.sm,
  },
  gridProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gridProgressFill: {
    height: '100%',
  },
  gridTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing[2],
  },
  gridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  gridYear: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  gridDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.muted,
    marginHorizontal: spacing[1.5],
  },
  gridRating: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginLeft: 2,
  },
  noPoster: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueList: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[20],
    gap: spacing[3],
  },
  queueCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  queueHeader: {
    marginBottom: spacing[2],
  },
  queueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  queueTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginRight: spacing[2],
  },
  queueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  qualityBadge: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  qualityText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  queueStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface.elevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    width: 36,
    textAlign: 'right',
  },
  queueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueSize: {
    fontSize: 11,
    color: colors.text.muted,
  },
  queueTime: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  searchList: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[20],
    gap: spacing[2],
  },
  searchCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  searchPosterContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  searchPoster: {
    width: 70,
    height: 105,
    borderRadius: borderRadius.md,
  },
  searchInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  searchTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  searchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  searchYear: {
    fontSize: 13,
    fontWeight: '600',
    color: RADARR_ORANGE,
  },
  searchRuntime: {
    fontSize: 12,
    color: colors.text.muted,
  },
  searchRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  searchRatingText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  searchOverview: {
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 16,
    marginTop: spacing[1.5],
  },
  genreRow: {
    flexDirection: 'row',
    gap: spacing[1],
    marginTop: spacing[1.5],
  },
  genreChip: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: 4,
  },
  genreText: {
    fontSize: 9,
    color: colors.text.muted,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: RADARR_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  inLibraryIcon: {
    alignSelf: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${RADARR_ORANGE}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
  },
  skeletonList: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  skeletonQueueCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  skeletonSearchCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
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
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },
  notConfiguredIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConfiguredTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing[1],
  },
  notConfiguredSubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: spacing[6],
  },
  configureBtn: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  configureBtnGradient: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
  configureBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailModal: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
  },
  detailHeader: {
    height: 240,
    overflow: 'hidden',
  },
  detailFanart: {
    ...StyleSheet.absoluteFillObject,
  },
  detailGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    zIndex: 10,
  },
  closeBtnBlur: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  detailHeaderContent: {
    position: 'absolute',
    bottom: spacing[4],
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    gap: spacing[3],
  },
  detailPoster: {
    width: 85,
    height: 127,
    borderRadius: borderRadius.md,
  },
  detailHeaderInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  detailYear: {
    fontSize: 14,
    fontWeight: '600',
    color: RADARR_ORANGE,
  },
  detailRuntime: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  detailStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginTop: spacing[2],
  },
  detailStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailContent: {
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  overview: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  genreChipLg: {
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  genreTextLg: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  fileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface.default,
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  fileSize: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingBottom: spacing[8],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.md,
  },
  actionBtnActive: {
    backgroundColor: `${RADARR_ORANGE}20`,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  deleteBtn: {
    backgroundColor: `${colors.status.error}15`,
  },
  manualModal: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '80%',
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  manualTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  manualSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  filterSection: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  filterScroll: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[1],
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.muted,
    marginRight: spacing[2],
    alignSelf: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
    marginRight: spacing[1.5],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: `${RADARR_ORANGE}20`,
    borderColor: RADARR_ORANGE,
  },
  filterChipText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: RADARR_ORANGE,
  },
  manualLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    gap: spacing[3],
  },
  manualLoadingText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  manualEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    gap: spacing[2],
  },
  manualEmptyText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  releaseList: {
    padding: spacing[4],
    gap: spacing[2],
  },
  releaseCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  releaseRejected: {
    opacity: 0.5,
  },
  releaseTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1.5],
  },
  releaseBadge: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  releaseBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  releaseSize: {
    fontSize: 11,
    color: colors.text.muted,
  },
  releaseTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    marginBottom: spacing[1.5],
  },
  releaseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  releaseIndexer: {
    fontSize: 11,
    fontWeight: '500',
    color: RADARR_ORANGE,
  },
  seeders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seedersText: {
    fontSize: 11,
    color: colors.status.success,
  },
  releaseAge: {
    fontSize: 10,
    color: colors.text.muted,
  },
  rejectionText: {
    fontSize: 10,
    color: colors.status.error,
    marginTop: spacing[1.5],
  },
  addModal: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '85%',
  },
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  addModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  addModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addModalContent: {
    padding: spacing[4],
  },
  addPreview: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  addPoster: {
    width: 70,
    height: 105,
    borderRadius: borderRadius.md,
  },
  addPreviewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  addPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  addPreviewYear: {
    fontSize: 14,
    color: RADARR_ORANGE,
    marginTop: 2,
  },
  addLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  optionScroll: {
    marginBottom: spacing[2],
  },
  optionChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
    marginRight: spacing[2],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionChipActive: {
    backgroundColor: `${RADARR_ORANGE}20`,
    borderColor: RADARR_ORANGE,
  },
  optionChipText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  optionChipTextActive: {
    color: RADARR_ORANGE,
  },
  folderOption: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  folderOptionActive: {
    borderColor: RADARR_ORANGE,
    backgroundColor: `${RADARR_ORANGE}10`,
  },
  folderRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  folderPath: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
  },
  folderFree: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: spacing[1],
    marginLeft: spacing[7],
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.text.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: RADARR_ORANGE,
    borderColor: RADARR_ORANGE,
  },
  checkboxLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  addSubmitBtn: {
    margin: spacing[4],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  addSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3.5],
  },
  addSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: colors.text.secondary,
    marginLeft: spacing[1],
  },
  manualHeaderLeft: {
    flex: 1,
  },
  manualHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  resultCountBadge: {
    backgroundColor: `${RADARR_ORANGE}20`,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  resultCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: RADARR_ORANGE,
  },
  manualCloseBtn: {
    padding: spacing[1],
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
  },
  filterToggleActive: {
    backgroundColor: RADARR_ORANGE,
  },
  filterToggleText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  filterToggleTextActive: {
    color: '#000',
  },
  filterGroup: {
    marginBottom: spacing[2],
  },
  filterChipCount: {
    marginLeft: spacing[1],
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  filterChipCountActive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  filterChipCountText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.text.muted,
  },
  filterChipCountTextActive: {
    color: '#000',
  },
  sortSection: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
  },
  sortOptions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1.5],
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
  },
  sortOptionActive: {
    backgroundColor: RADARR_ORANGE,
  },
  sortOptionText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  sortOptionTextActive: {
    color: '#000',
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${RADARR_ORANGE}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  manualLoadingSubtext: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  clearFiltersBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
  },
  clearFiltersBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: RADARR_ORANGE,
  },
  releaseTopResult: {
    borderWidth: 1,
    borderColor: `${RADARR_ORANGE}40`,
  },
  releaseTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  topResultBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: RADARR_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.status.success,
  },
  indexerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: `${RADARR_ORANGE}15`,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    marginTop: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    backgroundColor: `${colors.status.error}15`,
    borderRadius: borderRadius.sm,
  },
  forceDownloadHint: {
    fontSize: 10,
    color: colors.text.muted,
    marginLeft: 'auto',
  },
  addModalHeaderContainer: {
    height: 120,
    overflow: 'hidden',
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  addModalBg: {
    ...StyleSheet.absoluteFillObject,
  },
  addModalBgGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  addModalBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  stepDotCurrent: {
    width: 24,
    borderRadius: 4,
    backgroundColor: RADARR_ORANGE,
  },
  addModalHeaderSpacer: {
    width: 36,
  },
  stepContent: {
    paddingBottom: spacing[4],
  },
  addPreviewLarge: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  addPosterLarge: {
    width: 140,
    height: 210,
    borderRadius: borderRadius.lg,
  },
  addPreviewTitleLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  addPreviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  yearBadgeLarge: {
    backgroundColor: RADARR_ORANGE,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  yearBadgeLargeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  runtimeText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  ratingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: RADARR_ORANGE,
  },
  genreRowLarge: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  genreChipLarge: {
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
  },
  genreChipTextLarge: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  overviewText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing[1],
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: spacing[4],
  },
  settingSection: {
    marginBottom: spacing[4],
  },
  settingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  settingSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: RADARR_ORANGE,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RADARR_ORANGE,
  },
  folderInfo: {
    flex: 1,
    marginLeft: spacing[2],
  },
  folderFreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  freeSpaceBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  freeSpaceFill: {
    height: '100%',
    backgroundColor: colors.status.success,
    borderRadius: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.default,
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  toggleHint: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.elevated,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: RADARR_ORANGE,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  confirmCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  confirmPoster: {
    width: 60,
    height: 90,
    borderRadius: borderRadius.md,
  },
  confirmInfo: {
    flex: 1,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  confirmYear: {
    fontSize: 14,
    color: RADARR_ORANGE,
    marginTop: 2,
  },
  confirmSummary: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.text.muted,
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
    flex: 2,
    textAlign: 'right',
  },
  addModalFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingBottom: spacing[2],
  },
  addSubmitDisabled: {
    opacity: 0.5,
  },
});
