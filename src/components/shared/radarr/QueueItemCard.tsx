import { memo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { RadarrQueueItem } from '@/api/external/radarr';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';

const RADARR_ORANGE = '#ffc230';

function getQualityBadgeColor(quality: string): string {
  const q = quality.toLowerCase();
  if (q.includes('2160') || q.includes('4k') || q.includes('uhd')) return '#9333ea';
  if (q.includes('1080')) return '#3b82f6';
  if (q.includes('720')) return '#22c55e';
  if (q.includes('480') || q.includes('sd')) return '#f59e0b';
  return colors.text.tertiary;
}

interface QueueItemCardProps {
  item: RadarrQueueItem;
  onRemove: () => void;
}

export const QueueItemCard = memo(function QueueItemCard({
  item,
  onRemove,
}: QueueItemCardProps) {
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

const styles = StyleSheet.create({
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
});
