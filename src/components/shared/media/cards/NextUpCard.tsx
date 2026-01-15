import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo, useMemo, useCallback } from 'react';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '@/api';
import { formatEpisodeNumber, getDisplayName, getDisplayImageUrl, getDisplaySeriesName } from '@/utils';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { useResponsive } from '@/hooks';
import { useSettingsStore } from '@/stores';
import type { Episode } from '@/types/jellyfin';

interface Props {
  item: Episode;
  onPress: () => void;
}

const baseSizes = {
  width: 300,
  height: 170,
};

const SPRING_CONFIG = { damping: 15, stiffness: 400 };

function getScaledSizes(isTablet: boolean, isTV: boolean) {
  const scale = isTV ? 1.3 : isTablet ? 1.15 : 1;
  return {
    width: Math.round(baseSizes.width * scale),
    height: Math.round(baseSizes.height * scale),
  };
}

export const NextUpCard = memo(function NextUpCard({ item, onPress }: Props) {
  const { isTablet, isTV, fontSize } = useResponsive();
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const dimensions = useMemo(() => getScaledSizes(isTablet, isTV), [isTablet, isTV]);

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const getBackdropUrl = () => {
    if (item.ParentBackdropImageTags?.[0]) {
      const backdropItemId = item.ParentBackdropItemId ?? item.SeriesId;
      if (backdropItemId) {
        return getImageUrl(backdropItemId, 'Backdrop', {
          maxWidth: dimensions.width * 2,
          maxHeight: dimensions.height * 2,
          tag: item.ParentBackdropImageTags[0],
        });
      }
    }

    if (item.ParentThumbImageTag && item.ParentThumbItemId) {
      return getImageUrl(item.ParentThumbItemId, 'Thumb', {
        maxWidth: dimensions.width * 2,
        maxHeight: dimensions.height * 2,
        tag: item.ParentThumbImageTag,
      });
    }

    if (item.SeriesPrimaryImageTag && item.SeriesId) {
      return getImageUrl(item.SeriesId, 'Primary', {
        maxWidth: dimensions.width * 2,
        maxHeight: dimensions.height * 2,
        tag: item.SeriesPrimaryImageTag,
      });
    }

    if (item.ImageTags?.Primary) {
      return getImageUrl(item.Id, 'Primary', {
        maxWidth: dimensions.width * 2,
        maxHeight: dimensions.height * 2,
        tag: item.ImageTags.Primary,
      });
    }

    if (item.SeriesId) {
      return getImageUrl(item.SeriesId, 'Backdrop', {
        maxWidth: dimensions.width * 2,
        maxHeight: dimensions.height * 2,
      });
    }

    return null;
  };

  const rawImageUrl = getBackdropUrl();
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Backdrop');
  const episodeLabel = formatEpisodeNumber(item.ParentIndexNumber, item.IndexNumber);
  const displaySeriesName = getDisplaySeriesName(item, hideMedia);
  const displayEpisodeName = getDisplayName(item, hideMedia);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.container}>
      <Animated.View entering={FadeIn.duration(150)} style={animatedStyle}>
        <View style={[styles.card, { width: dimensions.width, height: dimensions.height }]}>
          <CachedImage
            uri={imageUrl}
            style={[styles.image, { width: dimensions.width, height: dimensions.height }]}
            borderRadius={14}
            fallbackText={item.SeriesName?.charAt(0)?.toUpperCase() || '?'}
            priority="normal"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
            style={styles.gradient}
            locations={[0, 0.5, 1]}
          />
          <View style={styles.playIconContainer}>
            <View style={[styles.playIcon, { backgroundColor: accentColor }]}>
              <Ionicons name="play" size={22} color="#fff" style={{ marginLeft: 2 }} />
            </View>
          </View>
          <View style={styles.content}>
            <View style={styles.seriesRow}>
              <Ionicons name="tv-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.seriesName, { fontSize: fontSize.sm }]} numberOfLines={1}>
                {displaySeriesName}
              </Text>
            </View>
            <View style={styles.episodeRow}>
              <View style={[styles.episodeBadge, { backgroundColor: accentColor + '40' }]}>
                <Text style={[styles.episodeLabel, { fontSize: fontSize.xs, color: accentColor }]}>{episodeLabel}</Text>
              </View>
              <Text style={[styles.episodeName, { fontSize: fontSize.sm }]} numberOfLines={1}>
                {displayEpisodeName}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: 14,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  image: {
    position: 'absolute',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  seriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  seriesName: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    flex: 1,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  episodeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  episodeLabel: {
    fontWeight: '700',
  },
  episodeName: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
});
