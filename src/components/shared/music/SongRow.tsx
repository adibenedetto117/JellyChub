import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl, getDisplayArtist, formatPlayerTime, ticksToMs } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

interface SongRowProps {
  item: BaseItem;
  onPress: () => void;
  hideMedia: boolean;
  showPlayCount?: boolean;
}

export const SongRow = memo(function SongRow({ item, onPress, hideMedia, showPlayCount }: SongRowProps) {
  const getItemImageUrl = () => {
    if (item.ImageTags?.Primary) {
      return getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary });
    }
    const albumId = (item as any)?.AlbumId;
    const albumTag = (item as any)?.AlbumPrimaryImageTag;
    if (albumId && albumTag) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 120, tag: albumTag });
    }
    if (albumId) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 120 });
    }
    return null;
  };

  const rawImageUrl = getItemImageUrl();
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);
  const rawArtists = (item as any)?.Artists || [(item as any)?.AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const artist = displayArtists[0] || '';
  const duration = item.RunTimeTicks ? formatPlayerTime(ticksToMs(item.RunTimeTicks)) : '';
  const playCount = (item.UserData as any)?.PlayCount ?? 0;

  return (
    <Pressable onPress={onPress} style={styles.songRow}>
      <View style={styles.songRowImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.songRowImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.songRowPlaceholder}>
            <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </View>
      <View style={styles.songRowInfo}>
        <Text style={styles.songRowName} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.songRowArtist} numberOfLines={1}>
          {artist}{showPlayCount && playCount > 0 ? ` • ${playCount} plays` : ''}
        </Text>
      </View>
      <Text style={styles.songRowDuration}>{duration}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  songRowImageContainer: {
    width: 44,
    height: 44,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 12,
  },
  songRowImage: {
    width: '100%',
    height: '100%',
  },
  songRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  songRowInfo: {
    flex: 1,
  },
  songRowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  songRowArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  songRowDuration: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginLeft: 12,
  },
});
