import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo, useMemo } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { getImageUrl } from '@/api';
import { formatEpisodeNumber } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { useResponsive } from '@/hooks';
import type { Episode } from '@/types/jellyfin';

interface Props {
  item: Episode;
  onPress: () => void;
}

const baseSizes = {
  width: 280,
  height: 158,
};

function getScaledSizes(isTablet: boolean, isTV: boolean) {
  const scale = isTV ? 1.3 : isTablet ? 1.15 : 1;
  return {
    width: Math.round(baseSizes.width * scale),
    height: Math.round(baseSizes.height * scale),
  };
}

export const NextUpCard = memo(function NextUpCard({ item, onPress }: Props) {
  const { isTablet, isTV, fontSize } = useResponsive();
  const dimensions = useMemo(() => getScaledSizes(isTablet, isTV), [isTablet, isTV]);

  const getBackdropUrl = () => {
    if (item.ImageTags?.Primary) {
      return getImageUrl(item.Id, 'Primary', {
        maxWidth: dimensions.width * 2,
        maxHeight: dimensions.height * 2,
        tag: item.ImageTags.Primary,
      });
    }
    if (item.ParentBackdropImageTags?.[0] && item.SeriesId) {
      return getImageUrl(item.SeriesId, 'Backdrop', {
        maxWidth: dimensions.width * 2,
        maxHeight: dimensions.height * 2,
        tag: item.ParentBackdropImageTags[0],
      });
    }
    if (item.SeriesPrimaryImageTag && item.SeriesId) {
      return getImageUrl(item.SeriesId, 'Primary', {
        maxWidth: dimensions.width * 2,
        maxHeight: dimensions.height * 2,
        tag: item.SeriesPrimaryImageTag,
      });
    }
    return null;
  };

  const imageUrl = getBackdropUrl();
  const episodeLabel = formatEpisodeNumber(item.ParentIndexNumber, item.IndexNumber);

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Animated.View entering={FadeIn.duration(150)}>
        <View style={[styles.card, { width: dimensions.width, height: dimensions.height }]}>
          <CachedImage
            uri={imageUrl}
            style={[styles.image, { width: dimensions.width, height: dimensions.height }]}
            borderRadius={12}
            fallbackText={item.SeriesName?.charAt(0)?.toUpperCase() || '?'}
            priority="normal"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.gradient}
            locations={[0.3, 1]}
          />
          <View style={styles.content}>
            <Text style={[styles.seriesName, { fontSize: fontSize.sm }]} numberOfLines={1}>
              {item.SeriesName}
            </Text>
            <View style={styles.episodeRow}>
              <View style={styles.episodeBadge}>
                <Text style={[styles.episodeLabel, { fontSize: fontSize.xs }]}>{episodeLabel}</Text>
              </View>
              <Text style={[styles.episodeName, { fontSize: fontSize.sm }]} numberOfLines={1}>
                {item.Name}
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
    marginRight: 12,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  image: {
    position: 'absolute',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  seriesName: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  episodeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  episodeLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  episodeName: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
});
