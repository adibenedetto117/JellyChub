import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { radarrService, sonarrService } from '@/api';
import { colors } from '@/theme';
import { QueueItemRow, type QueueItem } from './QueueItemRow';

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
});
