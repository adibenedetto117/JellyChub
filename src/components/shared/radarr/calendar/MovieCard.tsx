import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { RadarrCalendarMovie } from '@/api/external/radarr';
import { colors, spacing, borderRadius } from '@/theme';
import { RADARR_ORANGE } from './constants';
import { getStatusColor, getReleaseType } from './utils';

interface MovieCardProps {
  movie: RadarrCalendarMovie;
  onPress: () => void;
  compact?: boolean;
}

export function MovieCard({ movie, onPress, compact = false }: MovieCardProps) {
  const poster = movie.images?.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const statusColor = getStatusColor(movie);
  const releaseType = getReleaseType(movie);

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
          {movie.title}
        </Text>
        <Text style={styles.compactRelease}>{releaseType}</Text>
      </Pressable>
    );
  }

  return (
    <Animated.View entering={FadeInUp.springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.movieCard,
          { opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.statusStripe, { backgroundColor: statusColor }]} />

        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.moviePoster} contentFit="cover" />
        ) : (
          <View style={[styles.moviePoster, styles.noPoster]}>
            <Ionicons name="film-outline" size={20} color={colors.text.muted} />
          </View>
        )}

        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={1}>
            {movie.title}
          </Text>
          <View style={styles.movieMetaRow}>
            <View style={styles.movieBadge}>
              <Text style={styles.movieBadgeText}>{movie.year}</Text>
            </View>
            <View style={styles.releaseBadge}>
              <Text style={styles.releaseBadgeText}>{releaseType}</Text>
            </View>
          </View>
          {movie.runtime > 0 && (
            <Text style={styles.movieRuntime}>{movie.runtime} min</Text>
          )}
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
  compactRelease: {
    color: colors.text.tertiary,
    fontSize: 9,
    marginTop: spacing[0.5],
  },
  movieCard: {
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
  moviePoster: {
    width: 50,
    height: 75,
    backgroundColor: colors.surface.elevated,
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieInfo: {
    flex: 1,
    padding: spacing[3],
    justifyContent: 'center',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  movieMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  movieBadge: {
    backgroundColor: RADARR_ORANGE,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  movieBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  releaseBadge: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  releaseBadgeText: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontWeight: '600',
  },
  movieRuntime: {
    color: colors.text.tertiary,
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
