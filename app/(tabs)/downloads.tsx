import { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useDownloadStore, useSettingsStore } from '@/stores';
import { downloadManager } from '@/services';
import { formatBytes, ticksToMs, formatDuration } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { SearchButton, HomeButton } from '@/components/ui';
import { getImageUrl } from '@/api';
import type { DownloadItem } from '@/types';

function DownloadIcon({ size = 20 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.6, height: size * 0.4, borderWidth: 2, borderColor: '#fff', borderTopWidth: 0, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
      <View style={{ position: 'absolute', top: 0, width: 2, height: size * 0.5, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', top: size * 0.35, width: 0, height: 0, borderLeftWidth: size * 0.15, borderRightWidth: size * 0.15, borderTopWidth: size * 0.15, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff' }} />
    </View>
  );
}

function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: size * 0.8, borderTopWidth: size * 0.5, borderBottomWidth: size * 0.5, borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent', marginLeft: size * 0.1 }} />
    </View>
  );
}

function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
      <View style={{ width: size * 0.25, height: size * 0.6, backgroundColor: '#fff', borderRadius: 1 }} />
      <View style={{ width: size * 0.25, height: size * 0.6, backgroundColor: '#fff', borderRadius: 1 }} />
    </View>
  );
}

function TrashIcon({ size = 18 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ width: size * 0.7, height: 2, backgroundColor: '#ff4444', borderRadius: 1 }} />
      <View style={{ width: size * 0.55, height: size * 0.7, borderWidth: 1.5, borderColor: '#ff4444', borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: 1 }} />
    </View>
  );
}

function CheckIcon({ size = 16, color = '#22c55e' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.35, height: size * 0.6, borderRightWidth: 2, borderBottomWidth: 2, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -size * 0.1 }} />
    </View>
  );
}

interface DownloadCardProps {
  item: DownloadItem;
  accentColor: string;
  onPlay: () => void;
  onDelete: () => void;
  onPauseResume: () => void;
}

function DownloadCard({ item, accentColor, onPlay, onDelete, onPauseResume }: DownloadCardProps) {
  const isActive = item.status === 'downloading' || item.status === 'pending' || item.status === 'paused';
  const isCompleted = item.status === 'completed';
  const isFailed = item.status === 'failed';

  const imageUrl = getImageUrl(item.itemId, 'Primary', { maxWidth: 200 });
  const backdropUrl = getImageUrl(item.itemId, 'Backdrop', { maxWidth: 400 });

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
      case 'downloading': return `Downloading ${item.progress}%`;
      case 'pending': return 'Waiting...';
      case 'paused': return 'Paused';
      case 'completed': return 'Ready to play';
      case 'failed': return item.error || 'Failed';
      default: return '';
    }
  };

  const getTypeLabel = () => {
    switch (item.item.Type) {
      case 'Movie': return 'Movie';
      case 'Episode': return `S${item.item.ParentIndexNumber || 1} E${item.item.IndexNumber || 1}`;
      case 'Audio': return 'Song';
      case 'AudioBook': return 'Audiobook';
      default: return item.item.Type;
    }
  };

  const duration = item.item.RunTimeTicks ? formatDuration(ticksToMs(item.item.RunTimeTicks)) : null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      layout={Layout.springify()}
      style={styles.card}
    >
      <Pressable
        onPress={isCompleted ? onPlay : undefined}
        style={styles.cardContent}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <CachedImage
            uri={imageUrl}
            style={styles.thumbnail}
            borderRadius={8}
            fallbackText={item.item.Name.charAt(0).toUpperCase()}
          />
          {isCompleted && (
            <View style={[styles.playOverlay, { backgroundColor: accentColor }]}>
              <PlayIcon size={14} />
            </View>
          )}
          {isActive && (
            <View style={styles.progressOverlay}>
              <View style={[styles.progressBar, { width: `${item.progress}%`, backgroundColor: accentColor }]} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{item.item.Name}</Text>
            {item.item.Type === 'Episode' && item.item.SeriesName && (
              <Text style={styles.seriesName} numberOfLines={1}>{item.item.SeriesName}</Text>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <Text style={[styles.typeText, { color: getStatusColor() }]}>{getTypeLabel()}</Text>
            </View>
            <Text style={styles.sizeText}>{formatBytes(item.totalBytes)}</Text>
            {duration && <Text style={styles.durationText}>{duration}</Text>}
          </View>

          <View style={styles.statusRow}>
            {isCompleted ? (
              <View style={styles.statusBadge}>
                <CheckIcon size={12} />
                <Text style={[styles.statusText, { color: '#22c55e' }]}>Downloaded</Text>
              </View>
            ) : (
              <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {isActive && !isFailed && (
            <Pressable
              onPress={onPauseResume}
              style={[styles.actionButton, { backgroundColor: accentColor + '20' }]}
            >
              {item.status === 'paused' ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
            </Pressable>
          )}
          <Pressable
            onPress={onDelete}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <TrashIcon size={16} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function DownloadsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { downloads, usedStorage, maxStorage, recalculateUsedStorage } = useDownloadStore();
  const accentColor = useSettingsStore((s) => s.accentColor);

  useEffect(() => {
    recalculateUsedStorage();
  }, []);

  const { activeDownloads, completedDownloads } = useMemo(() => {
    const active = downloads.filter(
      (d) => d.status === 'downloading' || d.status === 'pending' || d.status === 'paused' || d.status === 'failed'
    );
    const completed = downloads.filter((d) => d.status === 'completed');
    return { activeDownloads: active, completedDownloads: completed };
  }, [downloads]);

  const onRefresh = async () => {
    setRefreshing(true);
    recalculateUsedStorage();
    setRefreshing(false);
  };

  const handlePlay = (item: DownloadItem) => {
    const type = item.item.Type;
    if (type === 'Movie' || type === 'Episode') {
      router.push(`/player/video?itemId=${item.itemId}`);
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

  const renderItem = ({ item }: { item: DownloadItem }) => (
    <DownloadCard
      item={item}
      accentColor={accentColor}
      onPlay={() => handlePlay(item)}
      onDelete={() => handleDelete(item)}
      onPauseResume={() => handlePauseResume(item)}
    />
  );

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.countBadge, { backgroundColor: accentColor + '30' }]}>
        <Text style={[styles.countText, { color: accentColor }]}>{count}</Text>
      </View>
    </View>
  );

  const allDownloads = [...activeDownloads, ...completedDownloads];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <HomeButton currentScreen="downloads" />
          <Text style={styles.headerTitle}>Downloads</Text>
        </View>
        <View style={styles.headerRight}>
          {downloads.length > 0 && (
            <Pressable onPress={handleClearAll} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear All</Text>
            </Pressable>
          )}
          <SearchButton />
        </View>
      </View>

      {/* Storage Bar */}
      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <View style={styles.storageIcon}>
            <DownloadIcon size={18} />
          </View>
          <View style={styles.storageInfo}>
            <Text style={styles.storageTitle}>Storage</Text>
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

      {/* Downloads List */}
      {downloads.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: accentColor + '20' }]}>
            <DownloadIcon size={40} />
          </View>
          <Text style={styles.emptyTitle}>No Downloads</Text>
          <Text style={styles.emptySubtitle}>
            Download movies, shows, and music to watch offline
          </Text>
        </View>
      ) : (
        <FlatList
          data={allDownloads}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accentColor}
            />
          }
          ListHeaderComponent={
            <>
              {activeDownloads.length > 0 && renderSectionHeader('In Progress', activeDownloads.length)}
              {activeDownloads.length > 0 && completedDownloads.length > 0 && activeDownloads.length === allDownloads.filter(d => d.status !== 'completed').length && (
                <View style={{ height: 16 }} />
              )}
            </>
          }
          stickyHeaderIndices={[]}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
  storageCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#1a1a1a',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#1a1a1a',
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
});
