import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { memo, useState, useRef, useCallback, useEffect } from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '@/api';
import { formatDuration, ticksToMs, getDisplayName, getDisplayImageUrl, getDisplayYear } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { useResponsive } from '@/hooks';
import { useSettingsStore } from '@/stores';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  onPlayPress?: (item: BaseItem) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AUTO_SCROLL_INTERVAL = 8000;

export const HeroSpotlight = memo(function HeroSpotlight({ items, onItemPress, onPlayPress }: Props) {
  const { isTablet, isTV, fontSize } = useResponsive();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const heroHeight = isTV ? 500 : isTablet ? 420 : 340;
  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;

  const displayItems = items.slice(0, 5);

  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
    autoScrollTimer.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % displayItems.length);
    }, AUTO_SCROLL_INTERVAL);
  }, [displayItems.length]);

  useEffect(() => {
    if (displayItems.length > 1) {
      startAutoScroll();
    }
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [displayItems.length, startAutoScroll]);

  const handleDotPress = useCallback((index: number) => {
    setActiveIndex(index);
    startAutoScroll();
  }, [startAutoScroll]);

  if (!displayItems.length) return null;

  const currentItem = displayItems[activeIndex];
  const backdropTag = currentItem.BackdropImageTags?.[0];
  const rawImageUrl = backdropTag
    ? getImageUrl(currentItem.Id, 'Backdrop', {
        maxWidth: SCREEN_WIDTH * 2,
        maxHeight: heroHeight * 2,
        tag: backdropTag,
      })
    : null;
  const imageUrl = getDisplayImageUrl(currentItem.Id, rawImageUrl, hideMedia, 'Backdrop');
  const displayName = getDisplayName(currentItem, hideMedia);
  const year = getDisplayYear(currentItem.ProductionYear, hideMedia);
  const runtime = currentItem.RunTimeTicks
    ? formatDuration(ticksToMs(currentItem.RunTimeTicks))
    : null;
  const rating = currentItem.CommunityRating?.toFixed(1);
  const genres = currentItem.Genres?.slice(0, 3).join(' • ');
  const overview = currentItem.Overview?.slice(0, 150);

  return (
    <View style={[styles.container, { height: heroHeight }]}>
      <Animated.View
        key={currentItem.Id}
        entering={FadeIn.duration(500)}
        exiting={FadeOut.duration(300)}
        style={StyleSheet.absoluteFill}
      >
        <CachedImage
          uri={imageUrl}
          style={StyleSheet.absoluteFill}
          fallbackText={currentItem.Name?.charAt(0).toUpperCase() || '?'}
          priority="high"
        />
      </Animated.View>

      <LinearGradient
        colors={['transparent', 'rgba(10,10,10,0.6)', 'rgba(10,10,10,0.95)', '#0a0a0a']}
        locations={[0, 0.4, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.metaRow}>
          {currentItem.Type === 'Movie' && (
            <View style={styles.typeBadge}>
              <Ionicons name="film-outline" size={12} color="#fff" />
              <Text style={styles.typeBadgeText}>Movie</Text>
            </View>
          )}
          {currentItem.Type === 'Series' && (
            <View style={styles.typeBadge}>
              <Ionicons name="tv-outline" size={12} color="#fff" />
              <Text style={styles.typeBadgeText}>Series</Text>
            </View>
          )}
          {rating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#fbbf24" />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          )}
          {year && <Text style={styles.metaText}>{year}</Text>}
          {runtime && <Text style={styles.metaText}>{runtime}</Text>}
        </View>

        <Text style={[styles.title, { fontSize: fontSize['3xl'] }]} numberOfLines={2}>
          {displayName}
        </Text>

        {genres && (
          <Text style={[styles.genres, { fontSize: fontSize.sm }]} numberOfLines={1}>
            {genres}
          </Text>
        )}

        {overview && (
          <Text style={[styles.overview, { fontSize: fontSize.sm }]} numberOfLines={2}>
            {overview}...
          </Text>
        )}

        <View style={styles.buttonRow}>
          {onPlayPress && (
            <Pressable
              style={[styles.playButton, { backgroundColor: accentColor }]}
              onPress={() => onPlayPress(currentItem)}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={[styles.playButtonText, { fontSize: fontSize.base }]}>Play</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.infoButton}
            onPress={() => onItemPress(currentItem)}
          >
            <Ionicons name="information-circle-outline" size={20} color="#fff" />
            <Text style={[styles.infoButtonText, { fontSize: fontSize.base }]}>More Info</Text>
          </Pressable>
        </View>

        {displayItems.length > 1 && (
          <View style={styles.dotsContainer}>
            {displayItems.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => handleDotPress(index)}
                style={styles.dotPressable}
              >
                <View
                  style={[
                    styles.dot,
                    index === activeIndex && { backgroundColor: accentColor, width: 24 },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 8,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
  },
  metaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  genres: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  overview: {
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dotPressable: {
    padding: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
