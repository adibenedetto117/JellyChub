import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl, getDisplayArtist } from '@/utils';
import { useSettingsStore } from '@/stores';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

export const BOOK_WIDTH = 100;
export const BOOK_HEIGHT = 140;

interface BookCardProps {
  item: BaseItem;
  onPress: () => void;
  onLongPress?: () => void;
  width?: number;
  height?: number;
  progress?: number;
  hideMedia: boolean;
}

export const BookCard = memo(function BookCard({
  item,
  onPress,
  onLongPress,
  width = BOOK_WIDTH,
  height = BOOK_HEIGHT,
  progress,
  hideMedia,
}: BookCardProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);

  const rawImageUrl = useMemo(() => item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 400, tag: item.ImageTags.Primary })
    : null, [item.Id, item.ImageTags?.Primary]);
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);
  const rawArtists = useMemo(() => (item as any)?.Artists || [(item as any)?.AlbumArtist || ''], [item]);
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const author = displayArtists[0] || '';

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.imageContainer, { width, height }]}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
        {progress !== undefined && progress > 0 && (
          <View style={styles.progressOverlay}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { width }]} numberOfLines={2}>{displayName}</Text>
      {author ? <Text style={[styles.author, { width }]} numberOfLines={1}>{author}</Text> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  imageContainer: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
    color: 'rgba(255,255,255,0.2)',
    fontSize: 28,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
  author: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  progressTrack: {
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
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});
