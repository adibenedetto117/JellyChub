import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { memo } from 'react';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

interface PlaylistRowProps {
  item: BaseItem;
  onPress: () => void;
  hideMedia: boolean;
}

export const PlaylistRow = memo(function PlaylistRow({ item, onPress, hideMedia }: PlaylistRowProps) {
  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  return (
    <Pressable onPress={onPress} style={styles.playlistRow}>
      <View style={styles.playlistRowImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.playlistRowImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.playlistRowPlaceholder}>
            <Text style={styles.playlistRowPlaceholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <Text style={styles.playlistRowName} numberOfLines={1}>
        {displayName}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  playlistRowImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 14,
  },
  playlistRowImage: {
    width: '100%',
    height: '100%',
  },
  playlistRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  playlistRowPlaceholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: '600',
  },
  playlistRowName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
