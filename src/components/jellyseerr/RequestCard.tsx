import { View, Text, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { memo, useMemo } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
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

  // Fetch full media details if we don't have title/poster
  const needsDetails = !media?.title && !media?.posterPath && !!tmdbId;

  const { data: movieDetails } = useQuery({
    queryKey: ['jellyseerr', 'movie', tmdbId],
    queryFn: () => jellyseerrClient.getMovieDetails(tmdbId!),
    enabled: needsDetails && mediaType === 'movie',
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const { data: tvDetails } = useQuery({
    queryKey: ['jellyseerr', 'tv', tmdbId],
    queryFn: () => jellyseerrClient.getTvDetails(tmdbId!),
    enabled: needsDetails && mediaType === 'tv',
    staleTime: 60 * 60 * 1000,
  });

  const details: { title?: string; name?: string; posterPath?: string; releaseDate?: string; firstAirDate?: string; voteAverage?: number } | undefined =
    mediaType === 'movie' ? movieDetails : tvDetails;

  // Use fetched details if media object is incomplete
  const rawTitle = media?.title || media?.originalTitle || details?.title || (details as any)?.name || 'Unknown Title';
  const titleIndex = Math.abs(request.id || 0) % PLACEHOLDER_TITLES.length;
  const title = hideMedia ? PLACEHOLDER_TITLES[titleIndex] : rawTitle;

  const posterPath = media?.posterPath || details?.posterPath;
  const rawImageUrl = jellyseerrClient.getImageUrl(posterPath, 'w342');
  const itemId = String(request.id || '0');
  const imageUrl = getDisplayImageUrl(itemId, rawImageUrl, hideMedia, 'Primary');

  const rawYear = getYear(media?.releaseDate || media?.firstAirDate || details?.releaseDate || (details as any)?.firstAirDate);
  const year = hideMedia ? '2024' : rawYear;
  const rating = (media?.voteAverage || details?.voteAverage) ? (media?.voteAverage || details?.voteAverage)?.toFixed(1) : null;

  const requester = request.requestedBy;
  const rawRequesterName = requester?.displayName || requester?.username || requester?.email || 'Unknown';
  const requesterName = hideMedia ? 'User' : rawRequesterName;
  const requesterAvatar = hideMedia ? null : (requester?.avatar
    ? `https://www.gravatar.com/avatar/${requester.avatar}?s=64&d=identicon`
    : null);

  // Seasons info for TV requests
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
      <Animated.View entering={FadeIn.duration(150)} style={styles.card}>
        {/* Poster */}
        <View style={styles.posterContainer}>
          <CachedImage
            uri={imageUrl}
            style={styles.poster}
            borderRadius={8}
            fallbackText={title.charAt(0)?.toUpperCase() || '?'}
          />
          {/* Media type badge */}
          <View style={styles.typeBadge}>
            <Ionicons
              name={mediaType === 'movie' ? 'film-outline' : 'tv-outline'}
              size={10}
              color="#fff"
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {year && <Text style={styles.year}>{year}</Text>}
            {year && rating && <Text style={styles.dot}>·</Text>}
            {rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={10} color="#fbbf24" />
                <Text style={styles.rating}>{rating}</Text>
              </View>
            )}
          </View>

          {/* TV Seasons info */}
          {mediaType === 'tv' && seasonsRequested && (
            <Text style={styles.seasonsText} numberOfLines={1}>
              {seasonsRequested === 1
                ? `Season ${seasonNumbers?.[0]}`
                : `${seasonsRequested} Seasons (${seasonNumbers?.join(', ')})`}
            </Text>
          )}

          {/* Requester info */}
          <View style={styles.requesterRow}>
            {requesterAvatar ? (
              <CachedImage
                uri={requesterAvatar}
                style={styles.avatar}
                borderRadius={10}
                fallbackText={requesterName.charAt(0).toUpperCase()}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={10} color="rgba(255,255,255,0.5)" />
              </View>
            )}
            <Text style={styles.requesterName} numberOfLines={1}>{requesterName}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.date}>{formatDate(request.createdAt)}</Text>
          </View>

          {/* Status and actions */}
          <View style={styles.footer}>
            <View style={styles.statusRow}>
              <StatusBadge status={request.status} type="request" size="small" mediaType={mediaType} />
            </View>

            <View style={styles.actions}>
              {canDelete && onDelete && (
                <Pressable
                  onPress={handleDelete}
                  disabled={isDeleting}
                  style={styles.deleteButton}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#f87171" />
                  ) : (
                    <Ionicons name="trash-outline" size={14} color="#f87171" />
                  )}
                </Pressable>
              )}

              {showAdminActions && (
                <>
                  <Pressable
                    onPress={handleDecline}
                    disabled={isDeclining}
                    style={styles.declineButton}
                  >
                    {isDeclining ? (
                      <ActivityIndicator size="small" color="#f87171" />
                    ) : (
                      <Ionicons name="close" size={16} color="#f87171" />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleApprove}
                    disabled={isApproving}
                    style={[styles.approveButton, { backgroundColor: accentColor }]}
                  >
                    {isApproving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  posterContainer: {
    position: 'relative',
  },
  poster: {
    width: 80,
    height: 120,
  },
  typeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  year: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '500',
  },
  seasonsText: {
    color: colors.text.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  avatar: {
    width: 18,
    height: 18,
  },
  avatarFallback: {
    backgroundColor: colors.surface.elevated,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requesterName: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  dot: {
    color: colors.text.tertiary,
    fontSize: 11,
  },
  date: {
    color: colors.text.tertiary,
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
