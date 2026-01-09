import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { memo, useCallback, useMemo } from 'react';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getImageUrl } from '@/api';
import { formatDuration, getWatchProgress, formatEpisodeNumber, ticksToMs, getDisplayName, getDisplayImageUrl, getDisplaySeriesName, getDisplayYear } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { useResponsive } from '@/hooks';
import { useSettingsStore } from '@/stores';
import type { BaseItem, Episode } from '@/types/jellyfin';

interface Props {
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
}

interface ContinueCardProps {
  item: BaseItem;
  onPress: () => void;
  cardWidth: number;
  cardHeight: number;
  fontSize: { xs: number; sm: number; base: number };
  accentColor: string;
  hideMedia: boolean;
}

const ContinueCard = memo(function ContinueCard({ item, onPress, cardWidth, cardHeight, fontSize, accentColor, hideMedia }: ContinueCardProps) {
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

  // Get the best available image for this item
  const getItemImageUrl = (): { url: string | null; imageType: 'Primary' | 'Backdrop' | 'Thumb' } => {
    // For episodes, try multiple fallback sources
    if (item.Type === 'Episode') {
      const episode = item as Episode;

      // 1. Episode's own Primary image (screenshot/thumbnail) - best for continue watching
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

      // 2. Parent thumb image (often available for episodes)
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

      // 3. Parent backdrop - use ParentBackdropItemId if available, fallback to SeriesId
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

      // 4. Series primary image (poster)
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

      // 5. Series backdrop (if SeriesId exists but no tag, try anyway - API may still return image)
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

    // For movies and other items, use backdrop if available, otherwise primary
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

    // Last resort: try without a tag (API may still return an image)
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

            <View style={styles.playIconContainer}>
              <View style={[styles.playIcon, { backgroundColor: accentColor }]}>
                <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 2 }} />
              </View>
            </View>

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

export const ContinueWatching = memo(function ContinueWatching({
  items,
  onItemPress,
}: Props) {
  const { t } = useTranslation();
  const { isTablet, isTV, fontSize } = useResponsive();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  if (!items.length) return null;

  const cardWidth = isTV ? 400 : isTablet ? 340 : 288;
  const cardHeight = isTV ? 225 : isTablet ? 190 : 160;
  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;
  const marginBottom = isTV ? 40 : isTablet ? 32 : 24;
  const itemWidth = cardWidth + 16; // card width + margin

  const renderItem = useCallback(({ item }: { item: BaseItem }) => (
    <ContinueCard
      item={item}
      onPress={() => onItemPress(item)}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      fontSize={fontSize}
      accentColor={accentColor}
      hideMedia={hideMedia}
    />
  ), [onItemPress, cardWidth, cardHeight, fontSize, accentColor, hideMedia]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: itemWidth,
    offset: itemWidth * index + horizontalPadding,
    index,
  }), [itemWidth, horizontalPadding]);

  const keyExtractor = useCallback((item: BaseItem) => item.Id, []);

  return (
    <View style={{ marginBottom }}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="play-circle" size={22} color={accentColor} />
          <Text style={[styles.title, { fontSize: fontSize.lg }]}>{t('home.continueWatching')}</Text>
        </View>
        <Text style={[styles.itemCount, { fontSize: fontSize.sm }]}>{t('common.itemCount', { count: items.length })}</Text>
      </View>

      <FlatList
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
  },
  itemCount: {
    color: 'rgba(255,255,255,0.5)',
  },
});
