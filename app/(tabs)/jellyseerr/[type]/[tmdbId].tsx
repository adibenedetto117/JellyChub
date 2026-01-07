import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMovieDetails, useTvDetails, useCreateRequest } from '@/hooks';
import { jellyseerrClient } from '@/api/jellyseerr';
import { StatusBadge, SeasonSelector } from '@/components/jellyseerr';
import { CachedImage } from '@/components/ui/CachedImage';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme';
import { MEDIA_STATUS } from '@/types/jellyseerr';
import type { JellyseerrMovieDetails, JellyseerrTvDetails } from '@/types/jellyseerr';

export default function JellyseerrDetailsScreen() {
  const { type, tmdbId } = useLocalSearchParams<{ type: string; tmdbId: string }>();
  const [showSeasonSelector, setShowSeasonSelector] = useState(false);
  const insets = useSafeAreaInsets();

  const accentColor = useSettingsStore((s) => s.accentColor);
  const numericTmdbId = tmdbId ? parseInt(tmdbId, 10) : undefined;

  const { data: movieDetails, isLoading: isLoadingMovie } = useMovieDetails(
    type === 'movie' ? numericTmdbId : undefined
  );
  const { data: tvDetails, isLoading: isLoadingTv } = useTvDetails(
    type === 'tv' ? numericTmdbId : undefined
  );

  const createRequest = useCreateRequest();

  const details: (JellyseerrMovieDetails | JellyseerrTvDetails) | undefined =
    type === 'movie' ? movieDetails : tvDetails;

  const isLoading = type === 'movie' ? isLoadingMovie : isLoadingTv;

  const title = useMemo(() => {
    if (!details) return '';
    return (details as JellyseerrMovieDetails).title || (details as JellyseerrTvDetails).name || '';
  }, [details]);

  const year = useMemo(() => {
    if (!details) return '';
    const date = (details as JellyseerrMovieDetails).releaseDate ||
      (details as JellyseerrTvDetails).firstAirDate;
    return date?.split('-')[0] || '';
  }, [details]);

  const runtime = useMemo(() => {
    if (!details) return '';
    const mins = (details as JellyseerrMovieDetails).runtime;
    if (!mins) return '';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }, [details]);

  const mediaStatus = details?.mediaInfo?.status ?? MEDIA_STATUS.UNKNOWN;
  const isAvailable = mediaStatus === MEDIA_STATUS.AVAILABLE;
  const isPartiallyAvailable = mediaStatus === MEDIA_STATUS.PARTIALLY_AVAILABLE;
  const isPending = mediaStatus === MEDIA_STATUS.PENDING;
  const isProcessing = mediaStatus === MEDIA_STATUS.PROCESSING;

  const canRequest = !isAvailable && !isPending && !isProcessing;

  const backdropUrl = jellyseerrClient.getImageUrl(details?.backdropPath, 'w780');
  const posterUrl = jellyseerrClient.getImageUrl(details?.posterPath, 'w342');

  const handleRequest = useCallback(() => {
    if (type === 'tv') {
      setShowSeasonSelector(true);
    } else if (numericTmdbId) {
      Alert.alert(
        'Request Movie',
        `Request "${title}" (${year})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request',
            onPress: () => {
              createRequest.mutate({
                mediaType: 'movie',
                mediaId: numericTmdbId,
              });
            },
          },
        ]
      );
    }
  }, [type, numericTmdbId, createRequest, title, year]);

  const handleSeasonRequest = useCallback((seasonNumbers: number[]) => {
    if (numericTmdbId && seasonNumbers.length > 0) {
      createRequest.mutate(
        {
          mediaType: 'tv',
          mediaId: numericTmdbId,
          seasons: seasonNumbers,
        },
        {
          onSuccess: () => setShowSeasonSelector(false),
        }
      );
    }
  }, [numericTmdbId, createRequest]);

  const getButtonText = () => {
    if (createRequest.isPending) return 'Requesting...';
    if (isAvailable) return 'Available';
    if (isPartiallyAvailable) return 'Partially Available';
    if (isPending) return 'Pending';
    if (isProcessing) return 'Processing';
    return type === 'tv' ? 'Request Seasons' : 'Request';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Details not found</Text>
        <Button title="Go Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const tvData = details as JellyseerrTvDetails;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Backdrop */}
        <View style={styles.backdropContainer}>
          {backdropUrl ? (
            <CachedImage
              uri={backdropUrl}
              style={styles.backdrop}
              priority="high"
            />
          ) : (
            <View style={[styles.backdrop, styles.backdropPlaceholder]} />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(10,10,10,0.8)', colors.background.primary]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Back Button */}
        <Pressable
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            {/* Poster */}
            <View style={styles.posterContainer}>
              <CachedImage
                uri={posterUrl}
                style={styles.poster}
                borderRadius={12}
                fallbackText={title.charAt(0)?.toUpperCase() || '?'}
                priority="high"
              />
            </View>

            {/* Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              <View style={styles.metaRow}>
                {year && <Text style={styles.year}>{year}</Text>}
                {runtime && <Text style={styles.runtime}>{runtime}</Text>}
              </View>
              <View style={styles.ratingRow}>
                {details.voteAverage > 0 && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color="#fbbf24" />
                    <Text style={styles.ratingText}>{details.voteAverage.toFixed(1)}</Text>
                  </View>
                )}
                {mediaStatus !== MEDIA_STATUS.UNKNOWN && (
                  <StatusBadge status={mediaStatus} type="media" />
                )}
              </View>
            </View>
          </View>

          {/* Genres */}
          {details.genres && details.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {details.genres.map((genre) => (
                <View key={genre.id} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Overview */}
          {details.overview && (
            <Text style={styles.overview}>{details.overview}</Text>
          )}

          {/* TV Info */}
          {type === 'tv' && tvData.numberOfSeasons && (
            <Text style={styles.tvInfo}>
              {tvData.numberOfSeasons} Season{tvData.numberOfSeasons > 1 ? 's' : ''} • {tvData.numberOfEpisodes} Episodes
            </Text>
          )}

          {/* Success Message */}
          {createRequest.isSuccess && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
              <View style={styles.messageContent}>
                <Text style={styles.successTitle}>Request Submitted</Text>
                <Text style={styles.successSubtitle}>Your request is being processed</Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {createRequest.isError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={24} color="#ef4444" />
              <View style={styles.messageContent}>
                <Text style={styles.errorTitle}>Request Failed</Text>
                <Text style={styles.errorSubtitle}>Please try again later</Text>
              </View>
            </View>
          )}

          {/* Request Button */}
          {!createRequest.isSuccess && (
            <Button
              title={getButtonText()}
              variant={canRequest ? 'primary' : 'secondary'}
              onPress={handleRequest}
              disabled={!canRequest || createRequest.isPending}
              loading={createRequest.isPending}
              fullWidth
            />
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {type === 'tv' && tvData.seasons && (
        <SeasonSelector
          visible={showSeasonSelector}
          onClose={() => setShowSeasonSelector(false)}
          onConfirm={handleSeasonRequest}
          seasons={tvData.seasons}
          isLoading={createRequest.isPending}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  backdropContainer: {
    height: 256,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backdropPlaceholder: {
    backgroundColor: colors.surface.default,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -80,
  },
  headerRow: {
    flexDirection: 'row',
  },
  posterContainer: {
    width: 110,
    height: 165,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  poster: {
    width: 110,
    height: 165,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  year: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  runtime: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  genreChip: {
    backgroundColor: colors.surface.default,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  genreText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  overview: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
  },
  tvInfo: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: 12,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  messageContent: {
    marginLeft: 12,
    flex: 1,
  },
  successTitle: {
    color: '#22c55e',
    fontWeight: '600',
  },
  successSubtitle: {
    color: 'rgba(34, 197, 94, 0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#ef4444',
    fontWeight: '600',
  },
  errorSubtitle: {
    color: 'rgba(239, 68, 68, 0.7)',
    fontSize: 13,
    marginTop: 2,
  },
});
