import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { radarrService, sonarrService } from '@/services';
import type { RadarrQueueItem } from '@/services/radarrService';
import type { SonarrQueueItem } from '@/services/sonarrService';
import { colors } from '@/theme';
import { formatBytes } from '@/utils';

type QueueItem = (RadarrQueueItem | SonarrQueueItem) & {
  source: 'radarr' | 'sonarr';
};

function formatTimeLeft(timeLeft?: string): string {
  if (!timeLeft) return '';
  const parts = timeLeft.split(':');
  if (parts.length !== 3) return timeLeft;
  const [hours, minutes] = parts;
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getStatusColor(status: string, trackedState?: string): string {
  if (trackedState === 'importPending') return '#22c55e';
  if (trackedState === 'downloading') return '#0ea5e9';
  if (status === 'warning' || trackedState === 'warning') return '#f59e0b';
  if (status === 'failed' || trackedState === 'failed') return '#ef4444';
  return '#6b7280';
}

function getStatusText(status: string, trackedState?: string): string {
  if (trackedState === 'importPending') return 'Import Pending';
  if (trackedState === 'downloading') return 'Downloading';
  if (status === 'warning') return 'Warning';
  if (status === 'failed') return 'Failed';
  if (status === 'queued') return 'Queued';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface QueueItemRowProps {
  item: QueueItem;
  accentColor: string;
  onRemove: (item: QueueItem) => void;
}

function QueueItemRow({ item, accentColor, onRemove }: QueueItemRowProps) {
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
    <View style={styles.queueItem}>
      <View style={styles.queueItemHeader}>
        <View style={[styles.sourceBadge, { backgroundColor: item.source === 'radarr' ? '#f59e0b20' : '#0ea5e920' }]}>
          <Text style={[styles.sourceBadgeText, { color: item.source === 'radarr' ? '#f59e0b' : '#0ea5e9' }]}>
            {item.source === 'radarr' ? 'Radarr' : 'Sonarr'}
          </Text>
        </View>
        <Pressable onPress={() => onRemove(item)} style={styles.removeButton}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>

      <Text style={styles.queueItemTitle} numberOfLines={1}>{title}</Text>
      {subtitle && <Text style={styles.queueItemSubtitle}>{subtitle}</Text>}

      <View style={styles.queueItemMeta}>
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
}

export function ArrQueueDisplay() {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const radarrConfigured = radarrService.isConfigured();
  const sonarrConfigured = sonarrService.isConfigured();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async (showLoader = true) => {
    if (!radarrConfigured && !sonarrConfigured) {
      setIsLoading(false);
      return;
    }

    if (showLoader) setIsLoading(true);
    setError(null);

    try {
      const results: QueueItem[] = [];

      if (radarrConfigured) {
        try {
          const radarrQueue = await radarrService.getQueue(1, 50);
          results.push(...radarrQueue.records.map((item) => ({
            ...item,
            source: 'radarr' as const,
          })));
        } catch (e) {
          console.warn('Failed to load Radarr queue:', e);
        }
      }

      if (sonarrConfigured) {
        try {
          const sonarrQueue = await sonarrService.getQueue(1, 50);
          results.push(...sonarrQueue.records.map((item) => ({
            ...item,
            source: 'sonarr' as const,
          })));
        } catch (e) {
          console.warn('Failed to load Sonarr queue:', e);
        }
      }

      setQueue(results);
    } catch (e: any) {
      setError(e?.message || 'Failed to load queue');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [radarrConfigured, sonarrConfigured]);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(() => loadQueue(false), 30000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadQueue(false);
  }, [loadQueue]);

  const handleRemove = useCallback(async (item: QueueItem) => {
    try {
      if (item.source === 'radarr') {
        await radarrService.removeFromQueue(item.id);
      } else {
        await sonarrService.removeFromQueue(item.id);
      }
      setQueue((prev) => prev.filter((q) => !(q.id === item.id && q.source === item.source)));
    } catch (e: any) {
      console.error('Failed to remove from queue:', e);
    }
  }, []);

  if (!radarrConfigured && !sonarrConfigured) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="cloud-download-outline" size={20} color="#fff" />
          <Text style={styles.headerTitle}>Download Queue</Text>
        </View>
        <Pressable onPress={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <Ionicons name="refresh" size={20} color={accentColor} />
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={32} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyText}>Queue is empty</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={accentColor}
            />
          }
        >
          {queue.map((item) => (
            <QueueItemRow
              key={`${item.source}-${item.id}`}
              item={item}
              accentColor={accentColor}
              onRemove={handleRemove}
            />
          ))}
        </ScrollView>
      )}
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  queueItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  queueItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  queueItemTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  queueItemSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 8,
  },
  queueItemMeta: {
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
