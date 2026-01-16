import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { jellyseerrClient } from '@/api/external/jellyseerr';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { tvConstants } from '@/utils/platform';
import { useSettingsStore } from '@/stores';
import { getDisplayImageUrl } from '@/utils';
import type { JellyseerrDiscoverItem } from '@/types/jellyseerr';
import { MEDIA_STATUS } from '@/types/jellyseerr';

const TV_ACCENT_GOLD = '#D4A84B';

interface Props {
  item: JellyseerrDiscoverItem;
  onPress: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
  cardWidth?: number;
  cardHeight?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const statusConfig: Record<number, { label: string; color: string }> = {
  [MEDIA_STATUS.PENDING]: { label: 'Requested', color: '#fbbf24' },
  [MEDIA_STATUS.PROCESSING]: { label: 'Processing', color: '#8b5cf6' },
  [MEDIA_STATUS.PARTIALLY_AVAILABLE]: { label: 'Partial', color: '#f97316' },
  [MEDIA_STATUS.AVAILABLE]: { label: 'Available', color: '#22c55e' },
};

export function TVJellyseerrPosterCard({
  item,
  onPress,
  onFocus,
  autoFocus = false,
  cardWidth = 200,
  cardHeight = 300,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const rawImageUrl = jellyseerrClient.getImageUrl(item?.posterPath, 'w342');
  const itemId = String(item?.id || '0');
  const imageUrl = getDisplayImageUrl(itemId, rawImageUrl, hideMedia, 'Primary');

  const title = item?.title || item?.name || 'Unknown';
  const releaseDate = item?.releaseDate || item?.firstAirDate;
  const year = releaseDate?.split('-')[0];
  const rating = item?.voteAverage;
  const mediaType = item?.mediaType;
  const mediaStatus = item?.mediaInfo?.status;

  const statusInfo = useMemo(() => {
    if (!mediaStatus || mediaStatus === MEDIA_STATUS.UNKNOWN) return null;
    return statusConfig[mediaStatus] || null;
  }, [mediaStatus]);

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(1.04, { duration: tvConstants.focusDuration });
      borderOpacity.value = withTiming(1, { duration: tvConstants.focusDuration });
    } else {
      scale.value = withTiming(1, { duration: tvConstants.focusDuration });
      borderOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
    }
  }, [isFocused, scale, borderOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[animatedStyle, styles.pressable]}
      hasTVPreferredFocus={autoFocus}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${title}${year ? `, ${year}` : ''}`}
    >
      <View style={[styles.cardContainer, { width: cardWidth, height: cardHeight }]}>
        <CachedImage
          uri={imageUrl}
          style={{ width: cardWidth, height: cardHeight }}
          borderRadius={8}
          fallbackText={title.charAt(0)?.toUpperCase() || '?'}
          priority={isFocused ? 'high' : 'normal'}
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />

        {statusInfo && (
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}22` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        )}

        <View style={styles.mediaTypeBadge}>
          <Ionicons
            name={mediaType === 'movie' ? 'film' : 'tv'}
            size={14}
            color="#fff"
          />
        </View>

        {rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#fbbf24" />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}

        <Animated.View
          style={[styles.focusBorder, { borderColor: TV_ACCENT_GOLD }, borderStyle]}
        />
      </View>

      <View style={[styles.textContainer, { width: cardWidth }]}>
        <Text style={[styles.title, isFocused && styles.titleFocused]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.metaRow}>
          {year && <Text style={styles.year}>{year}</Text>}
          {year && mediaType && <Text style={styles.dot}>-</Text>}
          {mediaType && (
            <Text style={styles.mediaTypeText}>
              {mediaType === 'movie' ? 'Movie' : 'Series'}
            </Text>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginRight: 20,
  },
  cardContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0c0c0c',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
  },
  focusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 3,
  },
  textContainer: {
    marginTop: 12,
  },
  title: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  titleFocused: {
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  year: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  dot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  mediaTypeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
