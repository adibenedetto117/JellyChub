import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { memo } from 'react';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

interface MediaListRowProps {
  item: BaseItem;
  onPress: () => void;
  hideMedia: boolean;
  isWatched?: boolean;
}

export const MediaListRow = memo(function MediaListRow({
  item,
  onPress,
  hideMedia,
  isWatched = false,
}: MediaListRowProps) {
  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  const meta = [
    item.ProductionYear,
    item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : null
  ].filter(Boolean).join(' • ');

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.Id}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
      </View>
      {isWatched && (
        <View style={styles.watchedIndicator}>
          <Text style={styles.watchedIndicatorText}>✓</Text>
        </View>
      )}
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
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: 'bold',
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
  meta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  watchedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedIndicatorText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
