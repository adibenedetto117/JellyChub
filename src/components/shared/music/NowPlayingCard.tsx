import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { getImageUrl } from '@/api';
import { formatPlayerTime, getDisplayName, getDisplayImageUrl, getDisplayArtist } from '@/utils';
import { colors } from '@/theme';
import type { QueueItem } from '@/types/player';

interface NowPlayingCardProps {
  item: QueueItem;
  accentColor: string;
  hideMedia: boolean;
  progress: { position: number; duration: number };
  isPlaying: boolean;
  onPress: () => void;
  onPlayPause: () => void;
}

export const NowPlayingCard = memo(function NowPlayingCard({
  item,
  accentColor,
  hideMedia,
  progress,
  isPlaying,
  onPress,
  onPlayPause,
}: NowPlayingCardProps) {
  const baseItem = item.item;

  const getItemImageUrl = () => {
    if (baseItem.ImageTags?.Primary) {
      return getImageUrl(baseItem.Id, 'Primary', { maxWidth: 400, tag: baseItem.ImageTags.Primary });
    }
    const albumId = (baseItem as any)?.AlbumId;
    const albumTag = (baseItem as any)?.AlbumPrimaryImageTag;
    if (albumId && albumTag) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 400, tag: albumTag });
    }
    if (albumId) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 400 });
    }
    return null;
  };

  const rawImageUrl = getItemImageUrl();
  const imageUrl = getDisplayImageUrl(baseItem.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(baseItem, hideMedia);
  const rawArtists = (baseItem as any)?.Artists || [(baseItem as any)?.AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const artist = displayArtists[0] || '';

  const progressPercent = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <CachedImage uri={imageUrl} style={styles.art} borderRadius={12} fallbackText={displayName?.charAt(0)} />
      <View style={styles.info}>
        <Text style={styles.label}>Now Playing</Text>
        <Text style={[styles.title, { color: accentColor }]} numberOfLines={1}>{displayName}</Text>
        {artist ? <Text style={styles.artist} numberOfLines={1}>{artist}</Text> : null}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
          </View>
          <View style={styles.progressTimes}>
            <Text style={styles.progressTime}>{formatPlayerTime(progress.position)}</Text>
            <Text style={styles.progressTime}>{formatPlayerTime(progress.duration)}</Text>
          </View>
        </View>
      </View>
      <Pressable onPress={onPlayPause} style={[styles.playPauseButton, { backgroundColor: accentColor }]}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" style={{ marginLeft: isPlaying ? 0 : 2 }} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  art: { width: 80, height: 80 },
  info: { flex: 1, marginLeft: 16, marginRight: 12 },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  artist: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 8 },
  progressContainer: { marginTop: 4 },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 1.5 },
  progressTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressTime: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
