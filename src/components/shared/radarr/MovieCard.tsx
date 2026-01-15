import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { RadarrMovie } from '@/api/external/radarr';
import { colors, spacing, borderRadius } from '@/theme';

const RADARR_ORANGE = '#ffc230';

export const MovieCard = memo(function MovieCard({
  movie,
  onPress,
  cardWidth,
}: {
  movie: RadarrMovie;
  onPress: () => void;
  cardWidth: number;
}) {
  const poster = movie.images.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const rating = movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0;

  const getStatusInfo = () => {
    if (movie.hasFile) return { color: colors.status.success, text: 'Done', icon: 'checkmark-circle' };
    if (movie.monitored) return { color: colors.status.warning, text: 'Missing', icon: 'time' };
    return { color: colors.text.muted, text: 'Off', icon: 'eye-off' };
  };

  const status = getStatusInfo();
  const posterHeight = cardWidth * 1.5;
  const textAreaHeight = 52;
  const cardHeight = posterHeight + textAreaHeight;

  return (
    <Animated.View entering={FadeInUp.delay(0).springify()} style={{ width: cardWidth, height: cardHeight }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.gridCard, { width: cardWidth, height: cardHeight, opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={[styles.gridPosterContainer, { width: cardWidth, height: posterHeight }]}>
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.gridPoster} contentFit="cover" recyclingKey={`poster-${movie.id}`} />
          ) : (
            <LinearGradient colors={[colors.surface.elevated, colors.surface.default]} style={styles.noPosterGrid}>
              <Ionicons name="film-outline" size={32} color={colors.text.muted} />
            </LinearGradient>
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gridOverlay} />
          <View style={[styles.gridStatusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.gridStatusText}>{status.text}</Text>
          </View>
          {!movie.monitored && (
            <View style={styles.unmonitoredBadge}>
              <Ionicons name="eye-off" size={12} color="#fff" />
            </View>
          )}
          <View style={styles.gridProgressContainer}>
            <View style={[styles.gridProgressFill, { width: movie.hasFile ? '100%' : '0%', backgroundColor: status.color }]} />
          </View>
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>{movie.title}</Text>
        <View style={styles.gridMeta}>
          <Text style={styles.gridYear}>{movie.year}</Text>
          {rating > 0 && (
            <>
              <View style={styles.gridDot} />
              <Ionicons name="star" size={10} color={RADARR_ORANGE} />
              <Text style={styles.gridRating}>{rating.toFixed(1)}</Text>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  gridCard: {
    overflow: 'hidden',
  },
  gridPosterContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  gridPoster: {
    width: '100%',
    height: '100%',
  },
  noPosterGrid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  gridStatusBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  gridStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  unmonitoredBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing[1],
    borderRadius: borderRadius.sm,
  },
  gridProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gridProgressFill: {
    height: '100%',
  },
  gridTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing[2],
    width: '100%',
  },
  gridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
    width: '100%',
  },
  gridYear: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  gridDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.muted,
    marginHorizontal: spacing[1.5],
  },
  gridRating: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginLeft: 2,
  },
});
