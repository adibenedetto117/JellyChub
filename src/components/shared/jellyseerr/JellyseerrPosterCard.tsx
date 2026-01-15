import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { jellyseerrClient } from '@/api/external/jellyseerr';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { StatusBadge } from './StatusBadge';
import { useSettingsStore } from '@/stores';
import { getDisplayImageUrl } from '@/utils';
import { colors } from '@/theme';
import type { JellyseerrDiscoverItem } from '@/types/jellyseerr';
import { MEDIA_STATUS } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';

const PLACEHOLDER_TITLES = [
  'The Adventure',
  'Space Journey',
  'Mystery Files',
  'Drama Chronicles',
  'Action Hero',
  'Comedy Night',
  'Sci-Fi Station',
  'Romance Story',
];

interface Props {
  item: JellyseerrDiscoverItem;
  onPress: () => void;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const sizes = {
  small: { width: 100, height: 150 },
  medium: { width: 130, height: 195 },
  large: { width: 160, height: 240 },
};

export const JellyseerrPosterCard = memo(function JellyseerrPosterCard({
  item,
  onPress,
  showTitle = true,
  size = 'medium',
}: Props) {
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const dimensions = sizes[size];

  const rawImageUrl = jellyseerrClient.getImageUrl(item?.posterPath, 'w342');
  const itemId = String(item?.id || '0');
  const imageUrl = getDisplayImageUrl(itemId, rawImageUrl, hideMedia, 'Primary');

  const rawTitle = item?.title || item?.name || 'Unknown';
  const titleIndex = Math.abs(item?.id || 0) % PLACEHOLDER_TITLES.length;
  const title = hideMedia ? PLACEHOLDER_TITLES[titleIndex] : rawTitle;

  const releaseDate = item?.releaseDate || item?.firstAirDate;
  const rawYear = releaseDate?.split('-')[0];
  const year = hideMedia ? '2024' : rawYear;

  const mediaStatus = item?.mediaInfo?.status;
  const hasStatus = mediaStatus && mediaStatus !== MEDIA_STATUS.UNKNOWN;
  const mediaType = item?.mediaType;
  const rating = item?.voteAverage;

  return (
    <Pressable onPress={onPress} style={[styles.container, { width: dimensions.width }]}>
      <Animated.View entering={FadeIn.duration(200)}>
        <View style={[styles.posterContainer, { width: dimensions.width, height: dimensions.height }]}>
          <CachedImage
            uri={imageUrl}
            style={{ width: dimensions.width, height: dimensions.height }}
            borderRadius={14}
            fallbackText={title.charAt(0)?.toUpperCase() || '?'}
            priority={size === 'large' ? 'high' : 'normal'}
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          />

          {hasStatus && (
            <View style={styles.statusBadge}>
              <StatusBadge status={mediaStatus} type="media" size="small" variant="overlay" mediaType={mediaType} releaseDate={releaseDate} />
            </View>
          )}

          <View style={styles.mediaTypeBadge}>
            <Ionicons
              name={mediaType === 'movie' ? 'film' : 'tv'}
              size={10}
              color="#fff"
            />
          </View>

          {rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={10} color="#fbbf24" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {showTitle && (
          <View style={[styles.infoContainer, { width: dimensions.width }]}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <View style={styles.metaRow}>
              {year && <Text style={styles.year}>{year}</Text>}
              {year && mediaType && <Text style={styles.dot}>•</Text>}
              {mediaType && (
                <Text style={styles.mediaTypeText}>
                  {mediaType === 'movie' ? 'Movie' : 'Series'}
                </Text>
              )}
            </View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  posterContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  infoContainer: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  year: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  dot: {
    color: colors.text.muted,
    fontSize: 8,
  },
  mediaTypeText: {
    color: colors.text.muted,
    fontSize: 11,
  },
});
