import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { memo } from 'react';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl, getDisplayArtist } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

interface AlbumRowProps {
  item: BaseItem;
  onPress: () => void;
  hideMedia: boolean;
}

export const AlbumRow = memo(function AlbumRow({ item, onPress, hideMedia }: AlbumRowProps) {
  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  const rawArtists = (item as any)?.Artists || [(item as any)?.AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const artist = displayArtists[0] || '';

  return (
    <Pressable onPress={onPress} style={styles.albumRow}>
      <View style={styles.albumRowImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.albumRowImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.albumRowPlaceholder}>
            <Text style={styles.albumRowPlaceholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.albumRowInfo}>
        <Text style={styles.albumRowName} numberOfLines={1}>
          {displayName}
        </Text>
        {artist ? (
          <Text style={styles.albumRowArtist} numberOfLines={1}>
            {artist}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  albumRowImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 14,
  },
  albumRowImage: {
    width: '100%',
    height: '100%',
  },
  albumRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  albumRowPlaceholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: '600',
  },
  albumRowInfo: {
    flex: 1,
  },
  albumRowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  albumRowArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
});
