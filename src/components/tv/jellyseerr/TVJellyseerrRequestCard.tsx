import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { jellyseerrClient } from '@/api/external/jellyseerr';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { tvConstants } from '@/utils/platform';
import { useSettingsStore } from '@/stores';
import { getDisplayImageUrl } from '@/utils';
import type { JellyseerrMediaRequest } from '@/types/jellyseerr';
import { REQUEST_STATUS } from '@/types/jellyseerr';

const TV_ACCENT_GOLD = '#D4A84B';

interface Props {
  request: JellyseerrMediaRequest;
  onPress: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const statusConfig: Record<number, { label: string; color: string; icon: string }> = {
  [REQUEST_STATUS.PENDING]: { label: 'Pending', color: '#fbbf24', icon: 'time-outline' },
  [REQUEST_STATUS.APPROVED]: { label: 'Approved', color: '#3b82f6', icon: 'checkmark-circle-outline' },
  [REQUEST_STATUS.DECLINED]: { label: 'Declined', color: '#ef4444', icon: 'close-circle-outline' },
  [REQUEST_STATUS.AVAILABLE]: { label: 'Available', color: '#22c55e', icon: 'checkmark-done-outline' },
  [REQUEST_STATUS.PARTIALLY_AVAILABLE]: { label: 'Partial', color: '#f97316', icon: 'pie-chart-outline' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function TVJellyseerrRequestCard({
  request,
  onPress,
  onFocus,
  autoFocus = false,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const media = request.media;
  const tmdbId = media?.tmdbId;
  const mediaType = request.type;

  const needsDetails = !media?.title && !media?.posterPath && !!tmdbId;

  const { data: movieDetails } = useQuery({
    queryKey: ['jellyseerr', 'movie', tmdbId],
    queryFn: () => jellyseerrClient.getMovieDetails(tmdbId!),
    enabled: needsDetails && mediaType === 'movie',
    staleTime: 60 * 60 * 1000,
  });

  const { data: tvDetails } = useQuery({
    queryKey: ['jellyseerr', 'tv', tmdbId],
    queryFn: () => jellyseerrClient.getTvDetails(tmdbId!),
    enabled: needsDetails && mediaType === 'tv',
    staleTime: 60 * 60 * 1000,
  });

  const movieTitle = movieDetails?.title;
  const tvTitle = tvDetails?.name;
  const detailsTitle = mediaType === 'movie' ? movieTitle : tvTitle;
  const detailsPoster = mediaType === 'movie' ? movieDetails?.posterPath : tvDetails?.posterPath;

  const title = media?.title || media?.originalTitle || detailsTitle || 'Unknown';
  const posterPath = media?.posterPath || detailsPoster;
  const rawPosterUrl = jellyseerrClient.getImageUrl(posterPath, 'w342');
  const itemId = String(request.id || '0');
  const posterUrl = getDisplayImageUrl(itemId, rawPosterUrl, hideMedia, 'Primary');

  const statusInfo = statusConfig[request.status] || statusConfig[REQUEST_STATUS.PENDING];
  const requester = request.requestedBy;
  const requesterName = requester?.displayName || requester?.username || 'Unknown';
  const seasonsCount = request.seasons?.length;

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(1.03, { duration: tvConstants.focusDuration });
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
      accessibilityLabel={`${title}, ${statusInfo.label}`}
    >
      <View style={styles.cardContainer}>
        <View style={styles.posterSection}>
          <CachedImage
            uri={posterUrl}
            style={styles.poster}
            borderRadius={8}
            fallbackText={title.charAt(0)?.toUpperCase() || '?'}
            priority={isFocused ? 'high' : 'normal'}
          />
          <View style={styles.mediaTypeBadge}>
            <Ionicons
              name={mediaType === 'movie' ? 'film' : 'tv'}
              size={12}
              color="#fff"
            />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, isFocused && styles.titleFocused]} numberOfLines={2}>
            {title}
          </Text>

          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}22` }]}>
            <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>

          {mediaType === 'tv' && seasonsCount && (
            <View style={styles.seasonsInfo}>
              <Ionicons name="layers-outline" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={styles.seasonsText}>
                {seasonsCount} {seasonsCount === 1 ? 'Season' : 'Seasons'}
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <View style={styles.requesterInfo}>
              <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.requesterName} numberOfLines={1}>{requesterName}</Text>
            </View>
            <Text style={styles.date}>{formatDate(request.createdAt)}</Text>
          </View>
        </View>

        <Animated.View
          style={[styles.focusBorder, { borderColor: TV_ACCENT_GOLD }, borderStyle]}
        />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginRight: 20,
  },
  cardContainer: {
    width: 360,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  posterSection: {
    position: 'relative',
    width: 100,
    height: 150,
  },
  poster: {
    width: 100,
    height: 150,
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  title: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  titleFocused: {
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  seasonsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seasonsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  requesterName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    maxWidth: 100,
  },
  date: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  focusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 3,
  },
});
