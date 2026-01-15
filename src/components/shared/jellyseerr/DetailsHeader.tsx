import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { InfoChip } from '@/components/shared/ui';
import { StatusBadge } from './StatusBadge';
import { colors } from '@/theme';
import { MEDIA_STATUS } from '@/types/jellyseerr';
import type { MediaStatus } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';

interface Props {
  posterUrl: string | null;
  title: string;
  mediaType: 'movie' | 'tv';
  year?: string;
  runtime?: string;
  voteAverage?: number;
  mediaStatus?: MediaStatus;
  releaseDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
}

export function DetailsHeader({
  posterUrl,
  title,
  mediaType,
  year,
  runtime,
  voteAverage,
  mediaStatus,
  releaseDate,
  numberOfSeasons,
  numberOfEpisodes,
}: Props) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      <View style={styles.posterContainer}>
        <CachedImage
          uri={posterUrl}
          style={styles.poster}
          borderRadius={16}
          fallbackText={title.charAt(0)?.toUpperCase() || '?'}
          priority="high"
        />
        {mediaStatus !== undefined && mediaStatus !== MEDIA_STATUS.UNKNOWN && (
          <View style={styles.posterBadge}>
            <StatusBadge status={mediaStatus} type="media" size="small" variant="overlay" releaseDate={releaseDate} />
          </View>
        )}
      </View>

      <View style={styles.titleSection}>
        <View style={styles.mediaTypeBadge}>
          <Ionicons name={mediaType === 'movie' ? 'film' : 'tv'} size={12} color={JELLYSEERR_PURPLE} />
          <Text style={styles.mediaTypeText}>{mediaType === 'movie' ? 'Movie' : 'TV Series'}</Text>
        </View>

        <Text style={styles.title} numberOfLines={3}>{title}</Text>

        <View style={styles.metaRow}>
          {year && <InfoChip icon="calendar-outline" label={year} />}
          {runtime && <InfoChip icon="time-outline" label={runtime} />}
          {voteAverage && voteAverage > 0 && (
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={14} color="#fbbf24" />
              <Text style={styles.ratingText}>{voteAverage.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {mediaType === 'tv' && numberOfSeasons && (
          <Text style={styles.tvInfo}>
            {numberOfSeasons} Season{numberOfSeasons > 1 ? 's' : ''} {numberOfEpisodes ? `\u2022 ${numberOfEpisodes} Episodes` : ''}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
