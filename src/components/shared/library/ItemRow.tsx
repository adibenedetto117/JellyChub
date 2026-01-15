import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import { Image } from 'expo-image';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

interface ItemRowProps {
  item: BaseItem;
  onPress: () => void;
  isSquare?: boolean;
  hideMedia: boolean;
}

export const ItemRow = memo(function ItemRow({
  item,
  onPress,
  isSquare,
  hideMedia,
}: ItemRowProps) {
  if (!item?.Id) return null;

  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  const imgWidth = 48;
  const imgHeight = isSquare ? 48 : 72;

  return (
    <Pressable onPress={onPress} style={styles.itemRow}>
      <View style={[styles.itemRowImageContainer, { width: imgWidth, height: imgHeight }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.itemRowImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.Id}
          />
        ) : (
          <View style={styles.itemRowPlaceholder}>
            <Text style={styles.itemRowPlaceholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.itemRowInfo}>
        <Text style={styles.itemRowName} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.itemRowMeta} numberOfLines={1}>
          {[item.ProductionYear, item.CommunityRating ? `${item.CommunityRating.toFixed(1)}` : null].filter(Boolean).join(' - ')}
        </Text>
      </View>
      {item.UserData?.Played && (
        <View style={styles.watchedIndicator}>
          <Text style={styles.watchedIndicatorText}>✓</Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  itemRowImageContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  itemRowImage: {
    width: '100%',
    height: '100%',
  },
  itemRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  itemRowPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemRowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  itemRowMeta: {
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
