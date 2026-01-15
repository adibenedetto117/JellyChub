import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { SonarrQueueItem } from '@/api/external/sonarr';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';

const SONARR_BLUE = '#35c5f4';

export interface QueueItemCardProps {
  item: SonarrQueueItem;
  onRemove: (id: number) => void;
  index: number;
}

export function QueueItemCard({ item, onRemove, index }: QueueItemCardProps) {
  const progress = item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0;
  const poster = item.series?.images?.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;

  const getStatusColor = () => {
    if (item.trackedDownloadState === 'importPending') return colors.status.success;
    if (item.trackedDownloadState === 'downloading') return SONARR_BLUE;
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
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <View style={styles.queueCard}>
        <View style={styles.queueCardInner}>
          {posterUrl && (
            <Image source={{ uri: posterUrl }} style={styles.queuePoster} contentFit="cover" />
          )}
          <View style={styles.queueContent}>
            <View style={styles.queueHeader}>
              <View style={styles.queueTitleRow}>
                <Text style={styles.queueTitle} numberOfLines={1}>
                  {item.series?.title || item.title}
                </Text>
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
              <View style={[styles.queueStatusPill, { backgroundColor: `${getStatusColor()}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.queueStatusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
              {item.timeleft && (
                <Text style={styles.timeLeft}>{formatTimeLeft(item.timeleft)} left</Text>
              )}
            </View>

            <View style={styles.queueProgressContainer}>
              <View style={styles.queueProgressBar}>
                <Animated.View
                  style={[
                    styles.queueProgressFill,
                    { width: `${progress}%`, backgroundColor: getStatusColor() }
                  ]}
                />
              </View>
              <Text style={styles.queueProgressText}>{Math.round(progress)}%</Text>
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
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  queueCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  queueCardInner: {
    flexDirection: 'row',
  },
  queuePoster: {
    width: 70,
    height: '100%',
    minHeight: 105,
  },
  queueContent: {
    flex: 1,
    padding: spacing[4],
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  queueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  queueTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  episodeBadge: {
    backgroundColor: SONARR_BLUE,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  episodeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  episodeTitle: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: spacing[1],
  },
  removeBtn: {
    padding: spacing[1],
  },
  queueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  queueStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    gap: spacing[1.5],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  queueStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeLeft: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  queueProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  queueProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface.elevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  queueProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  queueProgressText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  queueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
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
});
