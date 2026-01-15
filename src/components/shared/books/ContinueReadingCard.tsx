import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl, getDisplayArtist } from '@/utils';
import { useSettingsStore } from '@/stores';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

interface ContinueReadingCardProps {
  item: BaseItem;
  onPress: () => void;
  progress: number;
  hideMedia: boolean;
}

export const ContinueReadingCard = memo(function ContinueReadingCard({
  item,
  onPress,
  progress,
  hideMedia,
}: ContinueReadingCardProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);

  const rawImageUrl = useMemo(() => item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 300, tag: item.ImageTags.Primary })
    : null, [item.Id, item.ImageTags?.Primary]);
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);
  const rawArtists = useMemo(() => (item as any)?.Artists || [(item as any)?.AlbumArtist || ''], [item]);
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const author = displayArtists[0] || '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
        <View style={styles.progressOverlay}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
          </View>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>{displayName}</Text>
      {author ? <Text style={styles.author} numberOfLines={1}>{author}</Text> : null}
      <Text style={styles.progressText}>{progress}%</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 120,
  },
  imageContainer: {
    width: 120,
    height: 170,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginBottom: 10,
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
    fontSize: 32,
    fontWeight: '600',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 20,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  author: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  progressText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 3,
  },
});
