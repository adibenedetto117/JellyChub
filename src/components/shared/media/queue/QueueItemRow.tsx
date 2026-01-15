import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes } from '@/utils';
import { SourceBadge, type ArrSource, formatTimeLeft, getStatusColor, getStatusText } from '@/components/shared/arr';
import type { RadarrQueueItem, SonarrQueueItem } from '@/api';

export type QueueItem = (RadarrQueueItem | SonarrQueueItem) & {
  source: ArrSource;
};

interface QueueItemRowProps {
  item: QueueItem;
  accentColor: string;
  onRemove: (item: QueueItem) => void;
}

export const QueueItemRow = memo(function QueueItemRow({ item, accentColor, onRemove }: QueueItemRowProps) {
  const progress = item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0;
  const statusColor = getStatusColor(item.status, item.trackedDownloadState);
  const statusText = getStatusText(item.status, item.trackedDownloadState);

  const title = item.source === 'radarr'
    ? (item as RadarrQueueItem).movie?.title ?? item.title
    : (item as SonarrQueueItem).series?.title ?? item.title;

  const subtitle = item.source === 'sonarr' && (item as SonarrQueueItem).episode
    ? `S${(item as SonarrQueueItem).episode?.seasonNumber}E${(item as SonarrQueueItem).episode?.episodeNumber}`
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SourceBadge source={item.source} />
        <Pressable onPress={() => onRemove(item)} style={styles.removeButton}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.meta}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
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

      <View style={styles.sizeInfo}>
        <Text style={styles.sizeText}>
          {formatBytes(item.size - item.sizeleft)} / {formatBytes(item.size)}
        </Text>
        {item.quality?.quality?.name && (
          <Text style={styles.qualityText}>{item.quality.quality.name}</Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  removeButton: {
    padding: 4,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  timeLeft: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 'auto',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
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
  sizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sizeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  qualityText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
