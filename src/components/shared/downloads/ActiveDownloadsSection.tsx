import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DownloadCard } from './DownloadCard';
import type { DownloadItem } from '@/types';

interface ActiveDownloadsSectionProps {
  downloads: DownloadItem[];
  accentColor: string;
  onPlay: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  onPauseResume: (item: DownloadItem) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  isPaused: boolean;
  hideMedia: boolean;
}

export const ActiveDownloadsSection = memo(function ActiveDownloadsSection({
  downloads,
  accentColor,
  onPlay,
  onDelete,
  onPauseResume,
  onPauseAll,
  onResumeAll,
  isPaused,
  hideMedia,
}: ActiveDownloadsSectionProps) {
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

const styles = StyleSheet.create({
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
});
