import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo, useCallback } from 'react';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '@/api';
import { formatDuration, getWatchProgress, formatEpisodeNumber, ticksToMs, getDisplayName, getDisplayImageUrl, getDisplaySeriesName, getDisplayYear } from '@/utils';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import type { BaseItem, Episode } from '@/types/jellyfin';

interface ContinueWatchingCardProps {
  item: BaseItem;
  onPress: () => void;
  onPlay?: () => void;
  cardWidth: number;
  cardHeight: number;
  fontSize: { xs: number; sm: number; base: number };
  accentColor: string;
  hideMedia: boolean;
}

export const ContinueWatchingCard = memo(function ContinueWatchingCard({
  item,
  onPress,
  onPlay,
  cardWidth,
  cardHeight,
  fontSize,
  accentColor,
  hideMedia,
}: ContinueWatchingCardProps) {
  const progress = getWatchProgress(item);
  const remainingTicks = (item.RunTimeTicks ?? 0) - (item.UserData?.PlaybackPositionTicks ?? 0);
  const remainingTime = formatDuration(ticksToMs(remainingTicks));

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 100 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 100 });
  }, [scale]);

  const getItemImageUrl = (): { url: string | null; imageType: 'Primary' | 'Backdrop' | 'Thumb' } => {
    if (item.Type === 'Episode') {
      const episode = item as Episode;

      if (episode.ImageTags?.Primary) {
        return {
          url: getImageUrl(episode.Id, 'Primary', {
            maxWidth: cardWidth * 2,
            maxHeight: cardHeight * 2,
            tag: episode.ImageTags.Primary,
          }),
          imageType: 'Primary',
        };
      }

      if (episode.ParentThumbImageTag && episode.ParentThumbItemId) {
        return {
          url: getImageUrl(episode.ParentThumbItemId, 'Thumb', {
            maxWidth: cardWidth * 2,
            maxHeight: cardHeight * 2,
            tag: episode.ParentThumbImageTag,
          }),
          imageType: 'Thumb',
        };
      }

      if (episode.ParentBackdropImageTags?.[0]) {
        const backdropItemId = episode.ParentBackdropItemId ?? episode.SeriesId;
        if (backdropItemId) {
          return {
            url: getImageUrl(backdropItemId, 'Backdrop', {
              maxWidth: cardWidth * 2,
              maxHeight: cardHeight * 2,
              tag: episode.ParentBackdropImageTags[0],
            }),
            imageType: 'Backdrop',
          };
        }
      }

      if (episode.SeriesPrimaryImageTag && episode.SeriesId) {
        return {
          url: getImageUrl(episode.SeriesId, 'Primary', {
            maxWidth: cardWidth * 2,
            maxHeight: cardHeight * 2,
            tag: episode.SeriesPrimaryImageTag,
          }),
          imageType: 'Primary',
        };
      }

      if (episode.SeriesId) {
        return {
          url: getImageUrl(episode.SeriesId, 'Backdrop', {
            maxWidth: cardWidth * 2,
            maxHeight: cardHeight * 2,
          }),
          imageType: 'Backdrop',
        };
      }

      return { url: null, imageType: 'Primary' };
    }

    if (item.BackdropImageTags?.[0]) {
      return {
        url: getImageUrl(item.Id, 'Backdrop', {
          maxWidth: cardWidth * 2,
          maxHeight: cardHeight * 2,
          tag: item.BackdropImageTags[0],
        }),
        imageType: 'Backdrop',
      };
    }

    if (item.ImageTags?.Primary) {
      return {
        url: getImageUrl(item.Id, 'Primary', {
          maxWidth: cardWidth * 2,
          maxHeight: cardHeight * 2,
          tag: item.ImageTags.Primary,
        }),
        imageType: 'Primary',
      };
    }

    return {
      url: getImageUrl(item.Id, 'Primary', {
        maxWidth: cardWidth * 2,
        maxHeight: cardHeight * 2,
      }),
      imageType: 'Primary',
    };
  };

  const { url: rawImageUrl, imageType } = getItemImageUrl();
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, imageType);
  const displayName = getDisplayName(item, hideMedia);

  const subtitle = item.Type === 'Episode'
    ? `${getDisplaySeriesName(item as Episode, hideMedia)} ${formatEpisodeNumber(
        (item as { ParentIndexNumber?: number }).ParentIndexNumber,
        (item as { IndexNumber?: number }).IndexNumber
      )}`
    : getDisplayYear(item.ProductionYear, hideMedia)?.toString();

  const typeIcon = item.Type === 'Episode' ? 'tv-outline' : 'film-outline';

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.cardPressable}>
      <Animated.View entering={FadeIn.duration(150)} style={animatedStyle}>
        <View style={[styles.card, { width: cardWidth }]}>
          <View style={[styles.imageContainer, { height: cardHeight }]}>
            <CachedImage
              uri={imageUrl}
              style={StyleSheet.absoluteFill}
              fallbackText={item.Name.charAt(0).toUpperCase()}
              priority="high"
            />

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />

            <Pressable
              style={styles.playIconContainer}
              onPress={(e) => {
                e.stopPropagation();
                onPlay?.();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={[styles.playIcon, { backgroundColor: accentColor }]}>
                <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 2 }} />
              </View>
            </Pressable>

            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Ionicons name={typeIcon} size={14} color="rgba(255,255,255,0.7)" />
                <Text style={[styles.cardTitle, { fontSize: fontSize.base }]} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
              {subtitle && (
                <Text style={[styles.cardSubtitle, { fontSize: fontSize.xs }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={[styles.remainingText, { fontSize: fontSize.xs }]}>
                {remainingTime} left
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cardPressable: {
    marginRight: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  imageContainer: {
    position: 'relative',
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    marginLeft: 20,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingTop: 10,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  remainingText: {
    color: 'rgba(255,255,255,0.5)',
  },
});
