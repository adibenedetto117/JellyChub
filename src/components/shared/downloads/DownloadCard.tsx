import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes, ticksToMs, formatDuration, getDisplayName, getDisplayImageUrl } from '@/utils';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { getImageUrl } from '@/api';
import { colors } from '@/theme';
import type { DownloadItem } from '@/types';

interface DownloadCardProps {
  item: DownloadItem;
  accentColor: string;
  onPlay: () => void;
  onDelete: () => void;
  onPauseResume: () => void;
  compact?: boolean;
  hideMedia: boolean;
}

export const DownloadCard = memo(function DownloadCard({
  item,
  accentColor,
  onPlay,
  onDelete,
  onPauseResume,
  compact = false,
  hideMedia,
}: DownloadCardProps) {
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

const styles = StyleSheet.create({
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
});
