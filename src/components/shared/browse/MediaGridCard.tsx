import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { memo } from 'react';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 8;

export const POSTER_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - (GRID_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;
export const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
export { GRID_PADDING, GRID_GAP, NUM_COLUMNS };

interface MediaGridCardProps {
  item: BaseItem;
  onPress: () => void;
  hideMedia: boolean;
  showRating?: boolean;
  isWatched?: boolean;
}

export const MediaGridCard = memo(function MediaGridCard({
  item,
  onPress,
  hideMedia,
  showRating = false,
  isWatched = false,
}: MediaGridCardProps) {
  const rawImageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 300, tag: item.ImageTags.Primary })
    : null;
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  const yearAndRating = [
    item.ProductionYear,
    showRating && item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : null
  ].filter(Boolean).join(' • ');

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.posterContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.poster}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.Id}
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>{displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
        {isWatched && (
          <View style={styles.watchedBadge}>
            <Text style={styles.watchedBadgeText}>✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{displayName}</Text>
      <Text style={styles.subtitle}>{yearAndRating}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: POSTER_WIDTH,
  },
  posterContainer: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  posterPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 32,
    fontWeight: 'bold',
  },
  watchedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    height: 14,
  },
});
