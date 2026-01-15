import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { memo } from 'react';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl, getDisplayArtist } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const ALBUM_SIZE = (SCREEN_WIDTH - 48) / 2;
export const HORIZONTAL_ALBUM_SIZE = 140;

interface AlbumCardProps {
  item: BaseItem;
  onPress: () => void;
  size?: number;
  hideMedia: boolean;
}

export const AlbumCard = memo(function AlbumCard({ item, onPress, size = ALBUM_SIZE, hideMedia }: AlbumCardProps) {
  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 400, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  const rawArtists = (item as any)?.Artists || [(item as any)?.AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const artist = displayArtists[0] || '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.albumCard, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.albumImageContainer, { width: size, height: size }]}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.albumImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.albumPlaceholder}>
            <Text style={styles.albumPlaceholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.albumTitle, { width: size }]} numberOfLines={1}>
        {displayName}
      </Text>
      {artist ? (
        <Text style={[styles.albumArtist, { width: size }]} numberOfLines={1}>
          {artist}
        </Text>
      ) : null}
    </Pressable>
  );
});

interface CompactAlbumCardProps {
  item: BaseItem;
  onPress: () => void;
  hideMedia: boolean;
}

export const CompactAlbumCard = memo(function CompactAlbumCard({ item, onPress, hideMedia }: CompactAlbumCardProps) {
  const getItemImageUrl = () => {
    if (item.ImageTags?.Primary) {
      return getImageUrl(item.Id, 'Primary', { maxWidth: 200, tag: item.ImageTags.Primary });
    }
    const albumId = (item as any)?.AlbumId;
    const albumTag = (item as any)?.AlbumPrimaryImageTag;
    if (albumId && albumTag) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 200, tag: albumTag });
    }
    if (albumId) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 200 });
    }
    return null;
  };

  const rawImageUrl = getItemImageUrl();
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);
  const rawArtists = (item as any)?.Artists || [(item as any)?.AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const artist = displayArtists[0] || '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.compactCard, { backgroundColor: pressed ? colors.surface.default : 'rgba(255,255,255,0.05)' }]}>
      <View style={styles.compactImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.compactImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.compactPlaceholder}>
            <Text style={styles.compactPlaceholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.compactInfo}>
        <Text style={styles.compactTitle} numberOfLines={1}>{displayName}</Text>
        {artist ? <Text style={styles.compactArtist} numberOfLines={1}>{artist}</Text> : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  albumCard: {
    marginBottom: 16,
  },
  albumImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginBottom: 8,
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.default,
  },
  albumPlaceholderText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 32,
  },
  albumTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  compactImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 12,
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 20,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  },
  compactArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
});
