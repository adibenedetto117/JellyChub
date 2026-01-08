import { View, Text, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { memo, useMemo } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { jellyseerrClient } from '@/api/jellyseerr';
import { CachedImage } from '@/components/ui/CachedImage';
import { StatusBadge } from './StatusBadge';
import { colors } from '@/theme';
import { useSettingsStore } from '@/stores';
import { getDisplayImageUrl } from '@/utils';
import type { JellyseerrMediaRequest } from '@/types/jellyseerr';
import { REQUEST_STATUS, hasPermission, JELLYSEERR_PERMISSIONS } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

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
  request: JellyseerrMediaRequest;
  onPress?: () => void;
  onApprove?: () => void;
  onDecline?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  userPermissions?: number;
  isApproving?: boolean;
  isDeclining?: boolean;
  isDeleting?: boolean;
  isOwnRequest?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getYear(dateString?: string): string | null {
  if (!dateString) return null;
  return dateString.split('-')[0];
}

export const RequestCard = memo(function RequestCard({
  request,
  onPress,
  onApprove,
  onDecline,
  onDelete,
  showActions = false,
  userPermissions = 0,
  isApproving = false,
  isDeclining = false,
  isDeleting = false,
  isOwnRequest = false,
}: Props) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);

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

  const details: { title?: string; name?: string; posterPath?: string; backdropPath?: string; releaseDate?: string; firstAirDate?: string; voteAverage?: number } | undefined =
    mediaType === 'movie' ? movieDetails : tvDetails;

  const rawTitle = media?.title || media?.originalTitle || details?.title || (details as any)?.name || 'Unknown Title';
  const titleIndex = Math.abs(request.id || 0) % PLACEHOLDER_TITLES.length;
  const title = hideMedia ? PLACEHOLDER_TITLES[titleIndex] : rawTitle;

  const posterPath = media?.posterPath || details?.posterPath;
  const backdropPath = media?.backdropPath || details?.backdropPath;
  const rawPosterUrl = jellyseerrClient.getImageUrl(posterPath, 'w342');
  const rawBackdropUrl = jellyseerrClient.getImageUrl(backdropPath, 'w780');
  const itemId = String(request.id || '0');
  const posterUrl = getDisplayImageUrl(itemId, rawPosterUrl, hideMedia, 'Primary');
  const backdropUrl = getDisplayImageUrl(itemId, rawBackdropUrl, hideMedia, 'Backdrop');

  const rawYear = getYear(media?.releaseDate || media?.firstAirDate || details?.releaseDate || (details as any)?.firstAirDate);
  const year = hideMedia ? '2024' : rawYear;
  const rating = (media?.voteAverage || details?.voteAverage) ? (media?.voteAverage || details?.voteAverage)?.toFixed(1) : null;

  const requester = request.requestedBy;
  const rawRequesterName = requester?.displayName || requester?.username || requester?.email || 'Unknown';
  const requesterName = hideMedia ? 'User' : rawRequesterName;
  const requesterAvatar = hideMedia ? null : (requester?.avatar
    ? `https://www.gravatar.com/avatar/${requester.avatar}?s=64&d=identicon`
    : null);

  const seasonsRequested = request.seasons?.length;
  const seasonNumbers = request.seasons?.map(s => s.seasonNumber).sort((a, b) => a - b);

  const canManageRequests = hasPermission(userPermissions, JELLYSEERR_PERMISSIONS.MANAGE_REQUESTS);
  const isPending = request.status === REQUEST_STATUS.PENDING;
  const showAdminActions = showActions && canManageRequests && isPending;
  const canDelete = isOwnRequest && isPending;

  const handleApprove = () => {
    Alert.alert(
      'Approve Request',
      `Approve request for "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: onApprove },
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Request',
      `Decline request for "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: onDecline },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Request',
      `Delete your request for "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.card}>
        <View style={styles.posterSection}>
          <CachedImage
            uri={posterUrl}
            style={styles.poster}
            borderRadius={12}
            fallbackText={title.charAt(0)?.toUpperCase() || '?'}
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.posterGradient}
          />

          <View style={styles.mediaTypeBadge}>
            <Ionicons
              name={mediaType === 'movie' ? 'film' : 'tv'}
              size={10}
              color="#fff"
            />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              <View style={styles.metaRow}>
                {year && <Text style={styles.year}>{year}</Text>}
                {year && rating && <Text style={styles.dot}>•</Text>}
                {rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={10} color="#fbbf24" />
                    <Text style={styles.rating}>{rating}</Text>
                  </View>
                )}
              </View>
            </View>
            <StatusBadge status={request.status} type="request" size="small" mediaType={mediaType} />
          </View>

          {mediaType === 'tv' && seasonsRequested && (
            <View style={styles.seasonsRow}>
              <Ionicons name="layers-outline" size={12} color={colors.text.tertiary} />
              <Text style={styles.seasonsText} numberOfLines={1}>
                {seasonsRequested === 1
                  ? `Season ${seasonNumbers?.[0]}`
                  : `${seasonsRequested} Seasons`}
              </Text>
            </View>
          )}

          <View style={styles.bottomRow}>
            <View style={styles.requesterRow}>
              {requesterAvatar ? (
                <CachedImage
                  uri={requesterAvatar}
                  style={styles.avatar}
                  borderRadius={12}
                  fallbackText={requesterName.charAt(0).toUpperCase()}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={10} color="rgba(255,255,255,0.5)" />
                </View>
              )}
              <Text style={styles.requesterName} numberOfLines={1}>{requesterName}</Text>
              <Text style={styles.dateText}>{formatDate(request.createdAt)}</Text>
            </View>

            <View style={styles.actions}>
              {canDelete && onDelete && (
                <Pressable
                  onPress={handleDelete}
                  disabled={isDeleting}
                  style={styles.deleteButton}
                  hitSlop={8}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#f87171" />
                  ) : (
                    <Ionicons name="trash-outline" size={16} color="#f87171" />
                  )}
                </Pressable>
              )}

              {showAdminActions && (
                <>
                  <Pressable
                    onPress={handleDecline}
                    disabled={isDeclining}
                    style={styles.declineButton}
                    hitSlop={8}
                  >
                    {isDeclining ? (
                      <ActivityIndicator size="small" color="#f87171" />
                    ) : (
                      <Ionicons name="close" size={18} color="#f87171" />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleApprove}
                    disabled={isApproving}
                    hitSlop={8}
                  >
                    <LinearGradient
                      colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                      style={styles.approveButton}
                    >
                      {isApproving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  posterSection: {
    position: 'relative',
    width: 90,
    height: 135,
  },
  poster: {
    width: 90,
    height: 135,
  },
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  year: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    color: colors.text.muted,
    fontSize: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
  },
  seasonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  seasonsText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  avatarFallback: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requesterName: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 80,
  },
  dateText: {
    color: colors.text.muted,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
