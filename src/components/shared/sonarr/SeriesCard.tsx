import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import type { SonarrSeries } from '@/api/external/sonarr';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';

const SONARR_BLUE = '#35c5f4';
const SONARR_DARK = '#1a3a4a';

export type ViewMode = 'list' | 'grid';

export interface SeriesCardProps {
  series: SonarrSeries;
  viewMode: ViewMode;
  gridItemWidth: number;
  onPress: (series: SonarrSeries) => void;
  index: number;
}

export function SeriesCard({ series, viewMode, gridItemWidth, onPress, index }: SeriesCardProps) {
  const poster = series.images.find((i) => i.coverType === 'poster');
  const fanart = series.images.find((i) => i.coverType === 'fanart');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;

  const episodeCount = series.statistics?.episodeFileCount ?? 0;
  const totalEpisodes = series.statistics?.episodeCount ?? 0;
  const percentComplete = series.statistics?.percentOfEpisodes ?? 0;

  const getStatusColor = () => {
    if (percentComplete >= 100) return colors.status.success;
    if (series.monitored && percentComplete > 0) return SONARR_BLUE;
    if (series.monitored) return colors.status.warning;
    return colors.text.tertiary;
  };

  const getStatusText = () => {
    if (!series.monitored) return 'Unmonitored';
    if (percentComplete >= 100) return 'Complete';
    if (percentComplete > 0) return 'In Progress';
    return 'Missing';
  };

  const renderRating = () => {
    if (!series.ratings?.value) return null;
    const rating = series.ratings.value;
    const stars = Math.round(rating / 2);
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= stars ? 'star' : 'star-outline'}
            size={10}
            color="#fbbf24"
          />
        ))}
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  if (viewMode === 'grid') {
    const posterHeight = gridItemWidth * 1.5;
    return (
      <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
        <Pressable
          onPress={() => onPress(series)}
          style={({ pressed }) => [
            styles.gridCard,
            { width: gridItemWidth, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <View style={[styles.gridPosterContainer, { height: posterHeight }]}>
            {posterUrl ? (
              <Image source={{ uri: posterUrl }} style={styles.gridPoster} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={[SONARR_DARK, colors.surface.default]}
                style={styles.noPosterGrid}
              >
                <Ionicons name="tv-outline" size={32} color={colors.text.muted} />
              </LinearGradient>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gridOverlay}
            />
            <View style={[styles.gridStatusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.gridStatusText}>{Math.round(percentComplete)}%</Text>
            </View>
            {!series.monitored && (
              <View style={styles.unmonitoredBadge}>
                <Ionicons name="eye-off" size={12} color="#fff" />
              </View>
            )}
            <View style={styles.gridProgressContainer}>
              <View
                style={[
                  styles.gridProgressFill,
                  { width: `${percentComplete}%`, backgroundColor: getStatusColor() }
                ]}
              />
            </View>
          </View>
          <Text style={styles.gridTitle} numberOfLines={2}>{series.title}</Text>
          <View style={styles.gridMeta}>
            <Text style={styles.gridYear}>{series.year}</Text>
            {series.network && (
              <>
                <View style={styles.gridDot} />
                <Text style={styles.gridNetwork} numberOfLines={1}>{series.network}</Text>
              </>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={SlideInRight.delay(index * 30).springify()}>
      <Pressable
        onPress={() => onPress(series)}
        style={({ pressed }) => [styles.listCard, { opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.listCardInner}>
          {fanartUrl && (
            <Image
              source={{ uri: fanartUrl }}
              style={styles.listBackdrop}
              contentFit="cover"
              blurRadius={2}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.listGradientOverlay}
          />

          <View style={styles.listCardContent}>
            {posterUrl ? (
              <View style={styles.listPosterWrapper}>
                <Image source={{ uri: posterUrl }} style={styles.listPoster} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.5)']}
                  style={styles.posterShadow}
                />
              </View>
            ) : (
              <View style={[styles.listPoster, styles.noPoster]}>
                <Ionicons name="tv-outline" size={24} color={colors.text.muted} />
              </View>
            )}

            <View style={styles.listInfo}>
              <View style={styles.listTitleRow}>
                <Text style={styles.listTitle} numberOfLines={1}>{series.title}</Text>
                {series.ended && (
                  <View style={styles.endedBadge}>
                    <Text style={styles.endedText}>ENDED</Text>
                  </View>
                )}
              </View>

              <View style={styles.listMetaRow}>
                <Text style={styles.listSubtitle}>{series.year}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.listSubtitle}>{series.statistics?.seasonCount ?? 0} Seasons</Text>
                {series.network && (
                  <>
                    <View style={styles.metaDot} />
                    <Text style={styles.listSubtitle} numberOfLines={1}>{series.network}</Text>
                  </>
                )}
              </View>

              {renderRating()}

              <View style={styles.episodeProgress}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        { width: `${percentComplete}%`, backgroundColor: getStatusColor() },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.episodeCount}>
                  {episodeCount}/{totalEpisodes} Episodes
                </Text>
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.statusPill, { backgroundColor: `${getStatusColor()}20` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                  <Text style={[styles.statusText, { color: getStatusColor() }]}>
                    {getStatusText()}
                  </Text>
                </View>
                {series.statistics?.sizeOnDisk > 0 && (
                  <Text style={styles.sizeText}>{formatBytes(series.statistics.sizeOnDisk)}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    padding: spacing[1],
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
  },
  gridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
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
  gridNetwork: {
    color: colors.text.tertiary,
    fontSize: 11,
    flex: 1,
  },
  listCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  listCardInner: {
    position: 'relative',
    minHeight: 130,
  },
  listBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  listGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  listCardContent: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[20],
  },
  listPosterWrapper: {
    position: 'relative',
  },
  listPoster: {
    width: 70,
    height: 105,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface.elevated,
  },
  posterShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  listInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  listTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  endedBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  endedText: {
    color: colors.text.tertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
    flexWrap: 'wrap',
  },
  listSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.muted,
    marginHorizontal: spacing[2],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    marginTop: spacing[2],
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: spacing[1],
  },
  episodeProgress: {
    marginTop: spacing[3],
  },
  progressBarContainer: {
    marginBottom: spacing[1],
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  episodeCount: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[3],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    gap: spacing[1.5],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sizeText: {
    color: colors.text.muted,
    fontSize: 11,
  },
});
