import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl, getDisplayArtist } from '@/utils';
import { useSettingsStore } from '@/stores';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

interface BookRowProps {
  item: BaseItem;
  onPress: () => void;
  onLongPress?: () => void;
  isAudiobook?: boolean;
  progress?: number;
  hideMedia: boolean;
}

export const BookRow = memo(function BookRow({
  item,
  onPress,
  onLongPress,
  isAudiobook = false,
  progress,
  hideMedia,
}: BookRowProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);

  const rawImageUrl = useMemo(() => item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null, [item.Id, item.ImageTags?.Primary]);
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);
  const rawArtists = useMemo(() => (item as any)?.Artists || [(item as any)?.AlbumArtist || ''], [item]);
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const author = displayArtists[0] || '';
  const duration = useMemo(() => item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null, [item.RunTimeTicks]);

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.row}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        {author ? <Text style={styles.author} numberOfLines={1}>{author}</Text> : null}
        <View style={styles.meta}>
          {isAudiobook && duration ? <Text style={styles.duration}>{duration}h</Text> : null}
          {progress !== undefined && progress > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  imageContainer: {
    width: 48,
    height: 72,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  author: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  duration: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTrack: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
});
