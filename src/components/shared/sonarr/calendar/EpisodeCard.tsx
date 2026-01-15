import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { SonarrCalendarEpisode } from '@/api/external/sonarr';
import { colors, spacing, borderRadius } from '@/theme';
import { SONARR_BLUE } from './constants';
import { getStatusColor } from './utils';

interface EpisodeCardProps {
  episode: SonarrCalendarEpisode;
  onPress: () => void;
  compact?: boolean;
}

export function EpisodeCard({ episode, onPress, compact = false }: EpisodeCardProps) {
  const poster = episode.series?.images?.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const statusColor = getStatusColor(episode);

  const airTime = episode.airDateUtc
    ? new Date(episode.airDateUtc).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.compactCard,
          { borderLeftColor: statusColor, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={styles.compactTitle} numberOfLines={1}>
          {episode.series?.title}
        </Text>
        <Text style={styles.compactEpisode}>
          S{String(episode.seasonNumber).padStart(2, '0')}E
          {String(episode.episodeNumber).padStart(2, '0')}
        </Text>
      </Pressable>
    );
  }

  return (
    <Animated.View entering={FadeInUp.springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.episodeCard,
          { opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.statusStripe, { backgroundColor: statusColor }]} />

        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.episodePoster} contentFit="cover" />
        ) : (
          <View style={[styles.episodePoster, styles.noPoster]}>
            <Ionicons name="tv-outline" size={20} color={colors.text.muted} />
          </View>
        )}

        <View style={styles.episodeInfo}>
          <Text style={styles.episodeSeriesTitle} numberOfLines={1}>
            {episode.series?.title}
          </Text>
          <View style={styles.episodeMetaRow}>
            <View style={styles.episodeBadge}>
              <Text style={styles.episodeBadgeText}>
                S{String(episode.seasonNumber).padStart(2, '0')}E
                {String(episode.episodeNumber).padStart(2, '0')}
              </Text>
            </View>
            {airTime && (
              <Text style={styles.episodeTime}>{airTime}</Text>
            )}
          </View>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {episode.title}
          </Text>
        </View>

        <View style={[styles.statusIndicator, { backgroundColor: `${statusColor}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    backgroundColor: colors.surface.default,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    padding: spacing[2],
    marginHorizontal: spacing[1],
    marginBottom: spacing[2],
  },
  compactTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  compactEpisode: {
    color: colors.text.tertiary,
    fontSize: 9,
    marginTop: spacing[0.5],
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  statusStripe: {
    width: 4,
  },
  episodePoster: {
    width: 50,
    height: 75,
    backgroundColor: colors.surface.elevated,
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeInfo: {
    flex: 1,
    padding: spacing[3],
    justifyContent: 'center',
  },
  episodeSeriesTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  episodeBadge: {
    backgroundColor: SONARR_BLUE,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  episodeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  episodeTime: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  episodeTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: spacing[1],
  },
  statusIndicator: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
