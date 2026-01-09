import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet, Dimensions } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMovieDetails, useTvDetails, useCreateRequest } from '@/hooks';
import { jellyseerrClient } from '@/api/jellyseerr';
import { StatusBadge, SeasonSelector } from '@/components/jellyseerr';
import { CachedImage } from '@/components/ui/CachedImage';
import { AddToArrModal } from '@/components/media/AddToArrModal';
import { radarrService, sonarrService } from '@/services';
import { colors } from '@/theme';
import { goBack } from '@/utils';
import { getDisplayImageUrl } from '@/utils';
import { MEDIA_STATUS } from '@/types/jellyseerr';
import type { JellyseerrMovieDetails, JellyseerrTvDetails } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

function InfoChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.infoChip}>
      <Ionicons name={icon as any} size={14} color={colors.text.secondary} />
      <Text style={styles.infoChipText}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}) {
  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={{ flex: 1 }}>
        <LinearGradient
          colors={disabled ? ['#4b5563', '#374151'] : [JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
          style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name={icon as any} size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.actionButton,
        variant === 'outline' ? styles.actionButtonOutline : styles.actionButtonSecondary,
        { flex: 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? JELLYSEERR_PURPLE : '#fff'} />
      ) : (
        <>
          <Ionicons name={icon as any} size={20} color={variant === 'outline' ? JELLYSEERR_PURPLE : '#fff'} />
          <Text style={[styles.actionButtonText, variant === 'outline' && styles.actionButtonTextOutline]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function CastMember({ name, character, image }: { name: string; character?: string; image?: string }) {
  return (
    <View style={styles.castMember}>
      <View style={styles.castImage}>
        {image ? (
          <CachedImage uri={image} style={styles.castImageInner} borderRadius={24} />
        ) : (
          <View style={styles.castImagePlaceholder}>
            <Ionicons name="person" size={20} color={colors.text.tertiary} />
          </View>
        )}
      </View>
      <Text style={styles.castName} numberOfLines={1}>{name}</Text>
      {character && <Text style={styles.castCharacter} numberOfLines={1}>{character}</Text>}
    </View>
  );
}

export default function JellyseerrDetailsScreen() {
  const { type, tmdbId, from } = useLocalSearchParams<{ type: string; tmdbId: string; from?: string }>();
  const [showSeasonSelector, setShowSeasonSelector] = useState(false);
  const [showAddToArr, setShowAddToArr] = useState(false);
  const insets = useSafeAreaInsets();

  const handleGoBack = () => {
    goBack(from, '/(tabs)/requests');
  };

  const accentColor = useSettingsStore((s) => s.accentColor);
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

  const rawYear = useMemo(() => {
    if (!details) return '';
    const date = (details as JellyseerrMovieDetails).releaseDate ||
      (details as JellyseerrTvDetails).firstAirDate;
    return date?.split('-')[0] || '';
  }, [details]);

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

  const getStatusInfo = () => {
    if (isAvailable) return { icon: 'checkmark-done-circle', label: 'Available in Library', color: '#22c55e' };
    if (isPartiallyAvailable) return { icon: 'pie-chart', label: 'Partially Available', color: '#f97316' };
    if (isPending) return { icon: 'time', label: 'Request Pending', color: '#fbbf24' };
    if (isProcessing) return { icon: 'sync', label: 'Processing', color: '#8b5cf6' };
    return null;
  };

  const statusInfo = getStatusInfo();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContent}>
          <LinearGradient
            colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
            style={styles.loadingIcon}
          >
            <ActivityIndicator size="large" color="#fff" />
          </LinearGradient>
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle" size={64} color={colors.text.tertiary} />
        <Text style={styles.errorText}>Details not found</Text>
        <Pressable onPress={handleGoBack}>
          <LinearGradient
            colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  const tvData = details as JellyseerrTvDetails;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.backdropContainer}>
          {backdropUrl ? (
            <CachedImage
              uri={backdropUrl}
              style={styles.backdrop}
              priority="high"
            />
          ) : (
            <LinearGradient
              colors={[JELLYSEERR_PURPLE_DARK, colors.background.primary]}
              style={styles.backdrop}
            />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(10,10,10,0.4)', 'rgba(10,10,10,0.9)', colors.background.primary]}
            locations={[0, 0.4, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />

          <Pressable
            style={[styles.backButton, { top: insets.top + 8 }]}
            onPress={handleGoBack}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </View>
          </Pressable>

          <Pressable
            style={[styles.backButton, { top: insets.top + 8, left: undefined, right: 16 }]}
            onPress={() => router.push('/search')}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="search" size={20} color="#fff" />
            </View>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.headerSection}>
            <View style={styles.posterContainer}>
              <CachedImage
                uri={posterUrl}
                style={styles.poster}
                borderRadius={16}
                fallbackText={title.charAt(0)?.toUpperCase() || '?'}
                priority="high"
              />
              {mediaStatus !== MEDIA_STATUS.UNKNOWN && (
                <View style={styles.posterBadge}>
                  <StatusBadge status={mediaStatus} type="media" size="small" variant="overlay" />
                </View>
              )}
            </View>

            <View style={styles.titleSection}>
              <View style={styles.mediaTypeBadge}>
                <Ionicons
                  name={type === 'movie' ? 'film' : 'tv'}
                  size={12}
                  color={JELLYSEERR_PURPLE}
                />
                <Text style={styles.mediaTypeText}>
                  {type === 'movie' ? 'Movie' : 'TV Series'}
                </Text>
              </View>

              <Text style={styles.title} numberOfLines={3}>{title}</Text>

              <View style={styles.metaRow}>
                {year && <InfoChip icon="calendar-outline" label={year} />}
                {runtime && <InfoChip icon="time-outline" label={runtime} />}
                {details.voteAverage > 0 && (
                  <View style={styles.ratingChip}>
                    <Ionicons name="star" size={14} color="#fbbf24" />
                    <Text style={styles.ratingText}>{details.voteAverage.toFixed(1)}</Text>
                  </View>
                )}
              </View>

              {type === 'tv' && tvData.numberOfSeasons && (
                <Text style={styles.tvInfo}>
                  {tvData.numberOfSeasons} Season{tvData.numberOfSeasons > 1 ? 's' : ''} • {tvData.numberOfEpisodes} Episodes
                </Text>
              )}
            </View>
          </Animated.View>

          {statusInfo && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statusBanner}>
              <LinearGradient
                colors={[`${statusInfo.color}20`, `${statusInfo.color}08`]}
                style={styles.statusBannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
                <Text style={[styles.statusBannerText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </LinearGradient>
            </Animated.View>
          )}

          {details.genres && details.genres.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.genresContainer}>
              {details.genres.slice(0, 4).map((genre) => (
                <View key={genre.id} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre.name}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {(details.overview || hideMedia) && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.overview}>
                {hideMedia
                  ? 'A captivating story that takes viewers on an unforgettable journey through extraordinary circumstances and compelling characters.'
                  : details.overview}
              </Text>
            </Animated.View>
          )}

          {createRequest.isSuccess && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.successBox}>
              <LinearGradient
                colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)']}
                style={styles.successBoxGradient}
              >
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
                </View>
                <View style={styles.successContent}>
                  <Text style={styles.successTitle}>Request Submitted!</Text>
                  <Text style={styles.successSubtitle}>Your request is being processed</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {createRequest.isError && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorBox}>
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']}
                style={styles.errorBoxGradient}
              >
                <View style={styles.errorIcon}>
                  <Ionicons name="alert-circle" size={28} color="#ef4444" />
                </View>
                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>Request Failed</Text>
                  <Text style={styles.errorSubtitle}>Please try again later</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {!createRequest.isSuccess && (
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.actionsSection}>
              <View style={styles.actionsRow}>
                <ActionButton
                  icon={canRequest ? 'add-circle' : (isAvailable ? 'checkmark-done' : 'time')}
                  label={
                    createRequest.isPending
                      ? 'Requesting...'
                      : isAvailable
                      ? 'Available'
                      : isPartiallyAvailable
                      ? 'Request More'
                      : isPending
                      ? 'Pending'
                      : isProcessing
                      ? 'Processing'
                      : type === 'tv'
                      ? 'Request Seasons'
                      : 'Request'
                  }
                  onPress={handleRequest}
                  disabled={!canRequest && !isPartiallyAvailable}
                  loading={createRequest.isPending}
                />
              </View>

              {canAddToArr && (
                <View style={styles.actionsRow}>
                  <ActionButton
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 15,
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
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backdropContainer: {
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -100,
  },
  headerSection: {
    flexDirection: 'row',
    gap: 16,
  },
  posterContainer: {
    width: 130,
    height: 195,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  poster: {
    width: 130,
    height: 195,
  },
  posterBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  titleSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  mediaTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${JELLYSEERR_PURPLE}20`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  mediaTypeText: {
    color: JELLYSEERR_PURPLE,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface.default,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  infoChipText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  tvInfo: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 8,
  },
  statusBanner: {
    marginTop: 20,
  },
  statusBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  statusBannerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  genreChip: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  genreText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  overviewSection: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  overview: {
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 24,
  },
  castSection: {
    marginTop: 24,
  },
  castScroll: {
    marginTop: 12,
  },
  castMember: {
    width: 80,
    marginRight: 16,
    alignItems: 'center',
  },
  castImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 8,
  },
  castImageInner: {
    width: 64,
    height: 64,
  },
  castImagePlaceholder: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  castName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  castCharacter: {
    color: colors.text.tertiary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  actionsSection: {
    marginTop: 24,
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surface.elevated,
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: JELLYSEERR_PURPLE,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonTextOutline: {
    color: JELLYSEERR_PURPLE,
  },
  successBox: {
    marginTop: 20,
  },
  successBoxGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    marginLeft: 14,
    flex: 1,
  },
  successTitle: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '700',
  },
  successSubtitle: {
    color: 'rgba(34, 197, 94, 0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  errorBox: {
    marginTop: 20,
  },
  errorBoxGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContent: {
    marginLeft: 14,
    flex: 1,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  errorSubtitle: {
    color: 'rgba(239, 68, 68, 0.7)',
    fontSize: 13,
    marginTop: 2,
  },
});
