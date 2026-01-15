import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { memo, useMemo, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import { colors } from '@/theme';
import { jellyseerrClient } from '@/api/external/jellyseerr';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import type {
  JellyseerrSeason,
  JellyseerrMedia,
  JellyseerrEpisode,
  RequestStatus,
} from '@/types/jellyseerr';
import { REQUEST_STATUS } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';

interface Props {
  seasons: JellyseerrSeason[];
  mediaInfo?: JellyseerrMedia;
  tmdbId: number;
}

type SeasonStatusType = 'available' | 'requested' | 'processing' | 'not_requested' | 'declined';

interface SeasonStatus {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  status: SeasonStatusType;
  requestStatus?: RequestStatus;
  availableEpisodes?: number;
}

const statusConfig: Record<SeasonStatusType, { label: string; color: string; bgColor: string; icon: string }> = {
  available: {
    label: 'Available',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    icon: 'checkmark-circle',
  },
  requested: {
    label: 'Pending',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    icon: 'time',
  },
  processing: {
    label: 'Processing',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    icon: 'sync',
  },
  not_requested: {
    label: 'Not Requested',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    icon: 'add-circle-outline',
  },
  declined: {
    label: 'Declined',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: 'close-circle',
  },
};

function EpisodeRow({ episode, index }: { episode: JellyseerrEpisode; index: number }) {
  const imageUrl = episode.stillPath
    ? jellyseerrClient.getImageUrl(episode.stillPath, 'w185')
    : null;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(200)}
      style={styles.episodeRow}
    >
      <View style={styles.episodeImageContainer}>
        {imageUrl ? (
          <CachedImage uri={imageUrl} style={styles.episodeImage} borderRadius={6} />
        ) : (
          <View style={styles.episodePlaceholder}>
            <Ionicons name="film-outline" size={16} color={colors.text.tertiary} />
          </View>
        )}
        <View style={styles.episodeNumber}>
          <Text style={styles.episodeNumberText}>{episode.episodeNumber}</Text>
        </View>
      </View>
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeName} numberOfLines={1}>{episode.name}</Text>
        {episode.airDate && (
          <Text style={styles.episodeAirDate}>
            {new Date(episode.airDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

function SeasonStatusRow({
  seasonStatus,
  isExpanded,
  onToggle,
  episodes,
  isLoadingEpisodes,
}: {
  seasonStatus: SeasonStatus;
  isExpanded: boolean;
  onToggle: () => void;
  episodes?: JellyseerrEpisode[];
  isLoadingEpisodes: boolean;
}) {
  const config = statusConfig[seasonStatus.status];
  const hasEpisodeProgress = seasonStatus.availableEpisodes !== undefined &&
    seasonStatus.availableEpisodes > 0 &&
    seasonStatus.availableEpisodes < seasonStatus.episodeCount;

  return (
    <Animated.View layout={Layout.springify()}>
      <Pressable onPress={onToggle} style={styles.seasonRow}>
        <View style={styles.seasonInfo}>
          <View style={styles.seasonNameRow}>
            <Text style={styles.seasonName}>{seasonStatus.name}</Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.text.tertiary}
            />
          </View>
          <View style={styles.episodeCountRow}>
            {hasEpisodeProgress ? (
              <Text style={styles.episodeProgress}>
                <Text style={{ color: config.color }}>{seasonStatus.availableEpisodes}</Text>
                <Text style={{ color: colors.text.tertiary }}>/{seasonStatus.episodeCount} episodes</Text>
              </Text>
            ) : (
              <Text style={styles.episodeCount}>{seasonStatus.episodeCount} episodes</Text>
            )}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon as any} size={12} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
      </Pressable>

      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.episodesContainer}
        >
          {isLoadingEpisodes ? (
            <View style={styles.loadingEpisodes}>
              <ActivityIndicator size="small" color={JELLYSEERR_PURPLE} />
              <Text style={styles.loadingText}>Loading episodes...</Text>
            </View>
          ) : episodes && episodes.length > 0 ? (
            episodes.map((episode, index) => (
              <EpisodeRow key={episode.id} episode={episode} index={index} />
            ))
          ) : (
            <Text style={styles.noEpisodes}>No episode information available</Text>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

export const SeasonRequestBreakdown = memo(function SeasonRequestBreakdown({
  seasons,
  mediaInfo,
  tmdbId,
}: Props) {
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Record<number, JellyseerrEpisode[]>>({});
  const [loadingSeasons, setLoadingSeasons] = useState<Set<number>>(new Set());

  const seasonStatuses = useMemo(() => {
    const validSeasons = seasons.filter((s) => s.seasonNumber > 0);
    const requests = mediaInfo?.requests || [];

    const requestedSeasons = new Map<number, { status: RequestStatus }>();

    requests.forEach((request) => {
      if (request.seasons) {
        request.seasons.forEach((seasonReq) => {
          const existing = requestedSeasons.get(seasonReq.seasonNumber);
          if (!existing || seasonReq.status > existing.status) {
            requestedSeasons.set(seasonReq.seasonNumber, { status: seasonReq.status });
          }
        });
      }
    });

    return validSeasons.map((season): SeasonStatus => {
      const requestInfo = requestedSeasons.get(season.seasonNumber);

      if (!requestInfo) {
        return {
          seasonNumber: season.seasonNumber,
          name: season.name,
          episodeCount: season.episodeCount,
          status: 'not_requested',
        };
      }

      let status: SeasonStatusType = 'not_requested';
      let availableEpisodes: number | undefined;

      if (requestInfo.status === REQUEST_STATUS.AVAILABLE) {
        status = 'available';
        availableEpisodes = season.episodeCount;
      } else if (requestInfo.status === REQUEST_STATUS.APPROVED) {
        status = 'processing';
      } else if (requestInfo.status === REQUEST_STATUS.PENDING) {
        status = 'requested';
      } else if (requestInfo.status === REQUEST_STATUS.PARTIALLY_AVAILABLE) {
        status = 'processing';
      } else if (requestInfo.status === REQUEST_STATUS.DECLINED) {
        status = 'declined';
      }

      return {
        seasonNumber: season.seasonNumber,
        name: season.name,
        episodeCount: season.episodeCount,
        status,
        requestStatus: requestInfo.status,
        availableEpisodes,
      };
    });
  }, [seasons, mediaInfo]);

  const summary = useMemo(() => {
    const available = seasonStatuses.filter((s) => s.status === 'available').length;
    const processing = seasonStatuses.filter((s) => s.status === 'processing').length;
    const requested = seasonStatuses.filter((s) => s.status === 'requested').length;
    const notRequested = seasonStatuses.filter((s) => s.status === 'not_requested').length;
    const declined = seasonStatuses.filter((s) => s.status === 'declined').length;
    return { available, processing, requested, notRequested, declined, total: seasonStatuses.length };
  }, [seasonStatuses]);

  const handleToggleSeason = useCallback(async (seasonNumber: number) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
      return;
    }

    setExpandedSeason(seasonNumber);

    if (!seasonEpisodes[seasonNumber] && !loadingSeasons.has(seasonNumber)) {
      setLoadingSeasons((prev) => new Set(prev).add(seasonNumber));
      try {
        const details = await jellyseerrClient.getSeasonDetails(tmdbId, seasonNumber);
        setSeasonEpisodes((prev) => ({
          ...prev,
          [seasonNumber]: details.episodes,
        }));
      } catch (error) {
        console.error('Failed to load season episodes:', error);
      } finally {
        setLoadingSeasons((prev) => {
          const next = new Set(prev);
          next.delete(seasonNumber);
          return next;
        });
      }
    }
  }, [expandedSeason, seasonEpisodes, loadingSeasons, tmdbId]);

  if (seasonStatuses.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="layers" size={18} color={JELLYSEERR_PURPLE} />
          <Text style={styles.headerTitle}>Season Breakdown</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        {summary.available > 0 && (
          <View style={[styles.summaryItem, { backgroundColor: statusConfig.available.bgColor }]}>
            <Text style={[styles.summaryNumber, { color: statusConfig.available.color }]}>
              {summary.available}
            </Text>
            <Text style={[styles.summaryLabel, { color: statusConfig.available.color }]}>
              Available
            </Text>
          </View>
        )}
        {summary.processing > 0 && (
          <View style={[styles.summaryItem, { backgroundColor: statusConfig.processing.bgColor }]}>
            <Text style={[styles.summaryNumber, { color: statusConfig.processing.color }]}>
              {summary.processing}
            </Text>
            <Text style={[styles.summaryLabel, { color: statusConfig.processing.color }]}>
              Processing
            </Text>
          </View>
        )}
        {summary.requested > 0 && (
          <View style={[styles.summaryItem, { backgroundColor: statusConfig.requested.bgColor }]}>
            <Text style={[styles.summaryNumber, { color: statusConfig.requested.color }]}>
              {summary.requested}
            </Text>
            <Text style={[styles.summaryLabel, { color: statusConfig.requested.color }]}>
              Pending
            </Text>
          </View>
        )}
        {summary.notRequested > 0 && (
          <View style={[styles.summaryItem, { backgroundColor: statusConfig.not_requested.bgColor }]}>
            <Text style={[styles.summaryNumber, { color: statusConfig.not_requested.color }]}>
              {summary.notRequested}
            </Text>
            <Text style={[styles.summaryLabel, { color: statusConfig.not_requested.color }]}>
              Not Requested
            </Text>
          </View>
        )}
        {summary.declined > 0 && (
          <View style={[styles.summaryItem, { backgroundColor: statusConfig.declined.bgColor }]}>
            <Text style={[styles.summaryNumber, { color: statusConfig.declined.color }]}>
              {summary.declined}
            </Text>
            <Text style={[styles.summaryLabel, { color: statusConfig.declined.color }]}>
              Declined
            </Text>
          </View>
        )}
      </View>

      <View style={styles.seasonsList}>
        {seasonStatuses.map((seasonStatus) => (
          <SeasonStatusRow
            key={seasonStatus.seasonNumber}
            seasonStatus={seasonStatus}
            isExpanded={expandedSeason === seasonStatus.seasonNumber}
            onToggle={() => handleToggleSeason(seasonStatus.seasonNumber)}
            episodes={seasonEpisodes[seasonStatus.seasonNumber]}
            isLoadingEpisodes={loadingSeasons.has(seasonStatus.seasonNumber)}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.elevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  summaryItem: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  seasonsList: {
    gap: 8,
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.default,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  seasonInfo: {
    flex: 1,
    marginRight: 12,
  },
  seasonNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seasonName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  episodeCountRow: {
    marginTop: 2,
  },
  episodeCount: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  episodeProgress: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  episodesContainer: {
    backgroundColor: colors.surface.default,
    marginTop: -8,
    marginHorizontal: 0,
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border.subtle,
  },
  loadingEpisodes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    color: colors.text.tertiary,
    fontSize: 13,
  },
  noEpisodes: {
    color: colors.text.tertiary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  episodeImageContainer: {
    position: 'relative',
  },
  episodeImage: {
    width: 60,
    height: 34,
    borderRadius: 6,
  },
  episodePlaceholder: {
    width: 60,
    height: 34,
    borderRadius: 6,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeNumber: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  episodeNumberText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  episodeAirDate: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },
});
