import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SonarrSeries, SonarrRelease } from '@/api/external/sonarr';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';

const SONARR_BLUE = '#35c5f4';

type SortReleaseType = 'seeders' | 'size' | 'age' | 'quality';

const SIZE_RANGES = [
  { label: 'All', min: 0, max: Infinity },
  { label: '<1 GB', min: 0, max: 1024 * 1024 * 1024 },
  { label: '1-5 GB', min: 1024 * 1024 * 1024, max: 5 * 1024 * 1024 * 1024 },
  { label: '5-15 GB', min: 5 * 1024 * 1024 * 1024, max: 15 * 1024 * 1024 * 1024 },
  { label: '15-50 GB', min: 15 * 1024 * 1024 * 1024, max: 50 * 1024 * 1024 * 1024 },
  { label: '>50 GB', min: 50 * 1024 * 1024 * 1024, max: Infinity },
];

function getQualityBadgeColor(quality: string): string {
  const q = quality.toLowerCase();
  if (q.includes('2160') || q.includes('4k') || q.includes('uhd')) return '#a855f7';
  if (q.includes('1080')) return '#3b82f6';
  if (q.includes('720')) return '#22c55e';
  if (q.includes('480') || q.includes('sd')) return '#f59e0b';
  return colors.text.tertiary;
}

export interface ManualSearchModalProps {
  visible: boolean;
  series: SonarrSeries | null;
  seasonNumber?: number;
  releases: SonarrRelease[];
  isLoading: boolean;
  onClose: () => void;
  onDownload: (release: SonarrRelease) => void;
  downloadingGuid: string | null;
}

export function ManualSearchModal({
  visible,
  series,
  seasonNumber,
  releases,
  isLoading,
  onClose,
  onDownload,
  downloadingGuid,
}: ManualSearchModalProps) {
  const [sortBy, setSortBy] = useState<SortReleaseType>('seeders');
  const [hideRejected, setHideRejected] = useState(false);
  const [indexerFilter, setIndexerFilter] = useState('All');
  const [qualityFilter, setQualityFilter] = useState('All');
  const [sizeFilter, setSizeFilter] = useState('All');

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
  }, [releases, indexerFilter, qualityFilter, sortBy, hideRejected, sizeFilter]);

  if (!series) return null;

  const title = seasonNumber !== undefined
    ? `${series.title} - Season ${seasonNumber}`
    : series.title;

  const totalResults = releases.length;
  const filteredCount = filteredAndSortedReleases.length;
  const rejectedCount = releases.filter((r) => r.rejected).length;

  const clearFilters = () => {
    setIndexerFilter('All');
    setQualityFilter('All');
    setSizeFilter('All');
    setHideRejected(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.manualSearchOverlay}>
        <Pressable style={styles.manualSearchBackdrop} onPress={onClose} />
        <View style={styles.manualSearchModal}>
          <View style={styles.manualSearchHeader}>
            <View style={styles.manualSearchHeaderLeft}>
              <Text style={styles.manualSearchTitle}>Manual Search</Text>
              <Text style={styles.manualSearchSubtitle} numberOfLines={1}>{title}</Text>
            </View>
            <View style={styles.manualSearchHeaderRight}>
              {!isLoading && totalResults > 0 && (
                <View style={styles.resultCountBadge}>
                  <Text style={styles.resultCountText}>{filteredCount}/{totalResults}</Text>
                </View>
              )}
              <Pressable style={styles.manualSearchClose} onPress={onClose} hitSlop={8}>
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

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Size</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {sizeRangeCounts.map((range) => (
                    <Pressable
                      key={range.label}
                      style={[styles.filterChip, sizeFilter === range.label && styles.filterChipActive]}
                      onPress={() => setSizeFilter(range.label)}
                    >
                      <Text style={[styles.filterChipText, sizeFilter === range.label && styles.filterChipTextActive]}>
                        {range.label}
                      </Text>
                      <View style={[styles.filterChipCount, sizeFilter === range.label && styles.filterChipCountActive]}>
                        <Text style={[styles.filterChipCountText, sizeFilter === range.label && styles.filterChipCountTextActive]}>
                          {range.count}
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
            <View style={styles.manualSearchLoading}>
              <View style={styles.loadingSpinner}>
                <ActivityIndicator size="large" color={SONARR_BLUE} />
              </View>
              <Text style={styles.manualSearchLoadingText}>Searching indexers...</Text>
              <Text style={styles.manualSearchLoadingSubtext}>This may take a moment</Text>
            </View>
          ) : filteredAndSortedReleases.length === 0 ? (
            <View style={styles.manualSearchEmpty}>
              <View style={styles.emptySearchIconContainer}>
                <Ionicons name="search-outline" size={48} color={colors.text.muted} />
              </View>
              <Text style={styles.manualSearchEmptyText}>
                {releases.length > 0 ? 'No results match your filters' : 'No releases found'}
              </Text>
              {releases.length > 0 && (
                <Pressable style={styles.clearFiltersBtn} onPress={clearFilters}>
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
                const qualityColor = getQualityBadgeColor(item.quality?.quality?.name || '');
                const isDownloading = downloadingGuid === item.guid;
                const isDisabled = downloadingGuid !== null;
                const isTopResult = index < 3 && !item.rejected;
                return (
                  <Pressable
                    style={[
                      styles.releaseCard,
                      item.rejected && styles.releaseCardRejected,
                      isDownloading && styles.releaseCardDownloading,
                      isTopResult && styles.releaseTopResult,
                    ]}
                    onPress={() => !isDisabled && onDownload(item)}
                    disabled={isDisabled}
                  >
                    <View style={styles.releaseTop}>
                      <View style={styles.releaseTopLeft}>
                        <View style={[styles.releaseBadge, { borderColor: qualityColor, backgroundColor: `${qualityColor}15` }]}>
                          <Text style={[styles.releaseBadgeText, { color: qualityColor }]}>{item.quality?.quality?.name}</Text>
                        </View>
                        {item.fullSeason && (
                          <View style={styles.fullSeasonBadge}>
                            <Text style={styles.fullSeasonText}>Full Season</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.releaseStats}>
                        {item.seeders !== undefined && (
                          <View style={styles.seedersContainer}>
                            <Ionicons name="arrow-up" size={12} color={colors.status.success} />
                            <Text style={styles.seedersText}>{item.seeders}</Text>
                          </View>
                        )}
                        <Text style={styles.releaseSize}>{formatBytes(item.size)}</Text>
                        {isDownloading && (
                          <ActivityIndicator size="small" color={SONARR_BLUE} style={styles.releaseDownloadingIndicator} />
                        )}
                      </View>
                    </View>
                    <Text style={styles.releaseTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.releaseMeta}>
                      <View style={styles.indexerBadge}>
                        <Text style={styles.releaseIndexer}>{item.indexer}</Text>
                      </View>
                      <Text style={styles.releaseAge}>{item.age}d ago</Text>
                    </View>
                    {item.rejected && item.rejections && (
                      <View style={styles.rejectionRow}>
                        <Text style={styles.rejectionText} numberOfLines={1}>
                          {item.rejections[0]}
                        </Text>
                        <Text style={styles.forceDownloadHint}>Tap to force</Text>
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  manualSearchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  manualSearchBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  manualSearchModal: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '80%',
    minHeight: '50%',
  },
  manualSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  manualSearchHeaderLeft: {
    flex: 1,
  },
  manualSearchHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  manualSearchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  manualSearchSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing[1],
    maxWidth: 280,
  },
  manualSearchClose: {
    padding: spacing[2],
  },
  resultCountBadge: {
    backgroundColor: `${SONARR_BLUE}20`,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  resultCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: SONARR_BLUE,
  },
  filterSection: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
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
    backgroundColor: SONARR_BLUE,
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
  filterLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.muted,
    marginLeft: spacing[4],
    marginBottom: spacing[1],
  },
  filterScroll: {
    paddingHorizontal: spacing[4],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
    marginRight: spacing[1.5],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: `${SONARR_BLUE}20`,
    borderColor: SONARR_BLUE,
  },
  filterChipText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: SONARR_BLUE,
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
    backgroundColor: SONARR_BLUE,
  },
  sortOptionText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  sortOptionTextActive: {
    color: '#000',
  },
  manualSearchLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    gap: spacing[4],
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${SONARR_BLUE}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  manualSearchLoadingText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  manualSearchLoadingSubtext: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  manualSearchEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    gap: spacing[3],
  },
  emptySearchIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  manualSearchEmptyText: {
    color: colors.text.muted,
    fontSize: 14,
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
    color: SONARR_BLUE,
  },
  releaseList: {
    padding: spacing[4],
    gap: spacing[3],
  },
  releaseCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  releaseCardRejected: {
    opacity: 0.5,
  },
  releaseCardDownloading: {
    borderColor: SONARR_BLUE,
    borderWidth: 1,
  },
  releaseTopResult: {
    borderWidth: 1,
    borderColor: `${SONARR_BLUE}40`,
  },
  releaseTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1.5],
  },
  releaseTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  releaseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
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
  fullSeasonBadge: {
    backgroundColor: `${SONARR_BLUE}20`,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  fullSeasonText: {
    color: SONARR_BLUE,
    fontSize: 10,
    fontWeight: '600',
  },
  seedersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  seedersText: {
    color: colors.status.success,
    fontSize: 11,
    fontWeight: '600',
  },
  releaseSize: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  releaseDownloadingIndicator: {
    marginLeft: 8,
  },
  releaseTitle: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing[2],
  },
  releaseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  indexerBadge: {
    backgroundColor: `${SONARR_BLUE}15`,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: 4,
  },
  releaseIndexer: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  releaseAge: {
    color: colors.text.tertiary,
    fontSize: 11,
  },
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  rejectionText: {
    color: colors.status.error,
    fontSize: 11,
    flex: 1,
  },
  forceDownloadHint: {
    fontSize: 10,
    color: colors.text.muted,
    marginLeft: spacing[2],
  },
});
