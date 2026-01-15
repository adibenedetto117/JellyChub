import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMovieDetails, useTvDetails, useCreateRequest } from '@/hooks';
import { jellyseerrClient } from '@/api/external/jellyseerr';
import {
  SeasonSelector,
  SeasonRequestBreakdown,
  JellyseerrActionButton,
  RatingsSection,
  CastSection,
  StudiosSection,
  BudgetSection,
  JellyseerrLoadingView,
  JellyseerrErrorView,
  DetailsBackdrop,
  DetailsHeader,
  MediaStatusBanner,
  GenreChips,
  OverviewSection,
  RequestFeedback,
} from '@/components/shared/jellyseerr';
import { AddToArrModal } from '@/components/shared/media';
import { radarrService, sonarrService } from '@/api';
import { colors } from '@/theme';
import { goBack, getDisplayImageUrl } from '@/utils';
import { MEDIA_STATUS } from '@/types/jellyseerr';
import type { JellyseerrMovieDetails, JellyseerrTvDetails } from '@/types/jellyseerr';

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

const PLACEHOLDER_OVERVIEW = 'A captivating story that takes viewers on an unforgettable journey through extraordinary circumstances and compelling characters.';

export default function JellyseerrDetailsScreen() {
  const { type, tmdbId, from } = useLocalSearchParams<{ type: string; tmdbId: string; from?: string }>();
  const [showSeasonSelector, setShowSeasonSelector] = useState(false);
  const [showAddToArr, setShowAddToArr] = useState(false);
  const insets = useSafeAreaInsets();

  const handleGoBack = () => {
    goBack(from, '/(tabs)/requests');
  };

  const hideMedia = useSettingsStore((s) => s.hideMedia);
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

  const rawTitle = useMemo(() => {
    if (!details) return '';
    return (details as JellyseerrMovieDetails).title || (details as JellyseerrTvDetails).name || '';
  }, [details]);

  const titleIndex = Math.abs(numericTmdbId || 0) % PLACEHOLDER_TITLES.length;
  const title = hideMedia ? PLACEHOLDER_TITLES[titleIndex] : rawTitle;

  const releaseDate = useMemo(() => {
    if (!details) return undefined;
    return (details as JellyseerrMovieDetails).releaseDate ||
      (details as JellyseerrTvDetails).firstAirDate;
  }, [details]);

  const rawYear = releaseDate?.split('-')[0] || '';
  const year = hideMedia ? '2024' : rawYear;

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
  const isNotYetReleased = releaseDate ? new Date(releaseDate) > new Date() : false;

  const canRequest = !isAvailable && !isPending && !isProcessing;

  const canAddToArr = type === 'movie'
    ? radarrService.isConfigured() && !isAvailable
    : sonarrService.isConfigured() && !isAvailable;

  const tvdbId = useMemo(() => {
    if (type !== 'tv' || !details) return undefined;
    const tvData = details as JellyseerrTvDetails;
    return (tvData as any).externalIds?.tvdbId ?? undefined;
  }, [type, details]);

  const rawBackdropUrl = jellyseerrClient.getImageUrl(details?.backdropPath, 'w780');
  const rawPosterUrl = jellyseerrClient.getImageUrl(details?.posterPath, 'w500');
  const itemId = String(numericTmdbId || '0');
  const backdropUrl = getDisplayImageUrl(itemId, rawBackdropUrl, hideMedia, 'Backdrop');
  const posterUrl = getDisplayImageUrl(itemId, rawPosterUrl, hideMedia, 'Primary');

  const handleRequest = useCallback(() => {
    if (type === 'tv') {
      setShowSeasonSelector(true);
    } else if (numericTmdbId) {
      Alert.alert(
        'Request Movie',
        `Request "${title}" to be added to your library?`,
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
  }, [type, numericTmdbId, createRequest, title]);

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

  const getRequestLabel = () => {
    if (createRequest.isPending) return 'Requesting...';
    if (isAvailable) return 'Available';
    if (isPartiallyAvailable) return 'Request More';
    if (isPending) return 'Pending';
    if (isProcessing && isNotYetReleased) return 'Requested';
    if (isProcessing) return 'Processing';
    return type === 'tv' ? 'Request Seasons' : 'Request';
  };

  if (isLoading) {
    return <JellyseerrLoadingView />;
  }

  if (!details) {
    return <JellyseerrErrorView onButtonPress={handleGoBack} />;
  }

  const tvData = details as JellyseerrTvDetails;
  const movieData = details as JellyseerrMovieDetails;
  const mediaType = type as 'movie' | 'tv';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <DetailsBackdrop
          backdropUrl={backdropUrl}
          topInset={insets.top}
          onBack={handleGoBack}
          onSearch={() => router.push('/search')}
        />

        <View style={styles.content}>
          <DetailsHeader
            posterUrl={posterUrl}
            title={title}
            mediaType={mediaType}
            year={year}
            runtime={runtime}
            voteAverage={details.voteAverage}
            mediaStatus={mediaStatus}
            releaseDate={releaseDate}
            numberOfSeasons={tvData.numberOfSeasons}
            numberOfEpisodes={tvData.numberOfEpisodes}
          />

          <MediaStatusBanner mediaStatus={mediaStatus} releaseDate={releaseDate} />

          {type === 'tv' && tvData.seasons && tvData.seasons.length > 0 && (
            <Animated.View entering={FadeInDown.delay(125).duration(400)} style={styles.seasonBreakdownSection}>
              <SeasonRequestBreakdown seasons={tvData.seasons} mediaInfo={details.mediaInfo} tmdbId={numericTmdbId!} />
            </Animated.View>
          )}

          <GenreChips genres={details.genres} />

          <OverviewSection overview={hideMedia ? PLACEHOLDER_OVERVIEW : details.overview} />

          <RatingsSection
            criticsScore={details.ratings?.criticsScore}
            criticsRating={details.ratings?.criticsRating}
            audienceScore={details.ratings?.audienceScore}
            audienceRating={details.ratings?.audienceRating}
            voteAverage={details.voteAverage}
            voteCount={details.voteCount}
          />

          {type === 'movie' && !hideMedia && (
            <BudgetSection budget={movieData.budget} revenue={movieData.revenue} />
          )}

          {!hideMedia && (
            <StudiosSection
              title={type === 'tv' ? 'Networks & Studios' : 'Studios'}
              networks={type === 'tv' ? tvData.networks : undefined}
              productionCompanies={details.productionCompanies}
              getImageUrl={(path, size) => jellyseerrClient.getImageUrl(path, size)}
            />
          )}

          {!hideMedia && details.credits?.cast && details.credits.cast.length > 0 && (
            <CastSection
              cast={details.credits.cast}
              getImageUrl={(path, size) => jellyseerrClient.getImageUrl(path, size)}
            />
          )}

          {createRequest.isSuccess && <RequestFeedback type="success" />}

          {createRequest.isError && <RequestFeedback type="error" />}

          {!createRequest.isSuccess && (
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.actionsSection}>
              <View style={styles.actionsRow}>
                <JellyseerrActionButton
                  icon={canRequest ? 'add-circle' : (isAvailable ? 'checkmark-done' : 'time')}
                  label={getRequestLabel()}
                  onPress={handleRequest}
                  disabled={!canRequest && !isPartiallyAvailable}
                  loading={createRequest.isPending}
                />
              </View>

              {canAddToArr && (
                <View style={styles.actionsRow}>
                  <JellyseerrActionButton
                    icon="add"
                    label={`Add to ${type === 'movie' ? 'Radarr' : 'Sonarr'}`}
                    onPress={() => setShowAddToArr(true)}
                    variant="outline"
                  />
                </View>
              )}
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {type === 'tv' && tvData.seasons && (
        <SeasonSelector
          visible={showSeasonSelector}
          onClose={() => setShowSeasonSelector(false)}
          onConfirm={handleSeasonRequest}
          seasons={tvData.seasons}
          mediaInfo={details.mediaInfo}
          isLoading={createRequest.isPending}
        />
      )}

      <AddToArrModal
        visible={showAddToArr}
        onClose={() => setShowAddToArr(false)}
        type={type === 'movie' ? 'movie' : 'tv'}
        tmdbId={numericTmdbId}
        tvdbId={tvdbId}
        title={rawTitle}
        year={rawYear ? parseInt(rawYear, 10) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -100,
  },
  seasonBreakdownSection: {
    marginTop: 16,
  },
  actionsSection: {
    marginTop: 24,
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
