import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { getImageUrl } from '@/api';
import { useSettingsStore } from '@/stores';
import { tvConstants } from '@/utils/platform';
import { CachedImage } from '@/components/ui/CachedImage';
import { getWatchProgress, formatPlayerTime, ticksToMs, getDisplayName } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  rowIndex?: number;
  autoFocusFirstItem?: boolean;
  onRowFocus?: (rowIndex: number) => void;
}

const CARD_WIDTH = 360;
const CARD_HEIGHT = 200;
const CARD_MARGIN = 16;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ContinueWatchingCardProps {
  item: BaseItem;
  onPress: () => void;
  onFocus: () => void;
  autoFocus?: boolean;
}

function ContinueWatchingCard({
  item,
  onPress,
  onFocus,
  autoFocus = false,
}: ContinueWatchingCardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const progress = getWatchProgress(item);
  const playbackPosition = item.UserData?.PlaybackPositionTicks
    ? ticksToMs(item.UserData.PlaybackPositionTicks)
    : 0;
  const duration = item.RunTimeTicks ? ticksToMs(item.RunTimeTicks) : 0;

  const imageTag = item.BackdropImageTags?.[0] || item.ImageTags?.Primary;
  const imageType = item.BackdropImageTags?.[0] ? 'Backdrop' : 'Primary';

  const imageUrl = imageTag
    ? getImageUrl(item.Id, imageType, {
        maxWidth: CARD_WIDTH * 2,
        maxHeight: CARD_HEIGHT * 2,
        tag: imageTag,
      })
    : null;

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(tvConstants.focusScale, {
        duration: tvConstants.focusDuration,
      });
      borderOpacity.value = withTiming(1, {
        duration: tvConstants.focusDuration,
      });
    } else {
      scale.value = withTiming(1, {
        duration: tvConstants.focusDuration,
      });
      borderOpacity.value = withTiming(0, {
        duration: tvConstants.focusDuration,
      });
    }
  }, [isFocused, scale, borderOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const displayName = getDisplayName(item, hideMedia);
  const isEpisode = item.Type === 'Episode';
  const subtitle = isEpisode
    ? `${item.SeriesName} - S${(item as any).ParentIndexNumber || '?'}E${(item as any).IndexNumber || '?'}`
    : item.ProductionYear?.toString();

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[styles.cardPressable, animatedStyle]}
      hasTVPreferredFocus={autoFocus}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Continue ${displayName}, ${Math.round(progress)}% watched`}
    >
      <View style={styles.cardContainer}>
        <CachedImage
          uri={imageUrl}
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
          borderRadius={12}
          fallbackText={item.Name?.charAt(0)?.toUpperCase() || '?'}
          priority="high"
        />

        <View style={styles.cardOverlay}>
          <View style={styles.cardContent}>
            <View style={styles.playIconContainer}>
              <Ionicons name="play" size={32} color="#fff" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {displayName}
              </Text>
              {subtitle && (
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
              <View style={styles.timeInfo}>
                <Text style={styles.timeText}>
                  {formatPlayerTime(playbackPosition)} / {formatPlayerTime(duration)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
        </View>

        <Animated.View
          style={[
            styles.focusBorder,
            { borderColor: accentColor },
            borderStyle,
          ]}
        />
      </View>
    </AnimatedPressable>
  );
}

export const TVContinueWatchingRow = memo(function TVContinueWatchingRow({
  items,
  onItemPress,
  rowIndex = 0,
  autoFocusFirstItem = false,
  onRowFocus,
}: Props) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const flatListRef = useRef<FlatList<BaseItem>>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleItemFocus = useCallback((index: number) => {
    setFocusedIndex(index);
    onRowFocus?.(rowIndex);

    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.3,
      });
    }
  }, [onRowFocus, rowIndex]);

  const renderItem = useCallback(({ item, index }: { item: BaseItem; index: number }) => (
    <ContinueWatchingCard
      item={item}
      onPress={() => onItemPress(item)}
      onFocus={() => handleItemFocus(index)}
      autoFocus={autoFocusFirstItem && index === 0}
    />
  ), [onItemPress, autoFocusFirstItem, handleItemFocus]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: CARD_WIDTH + CARD_MARGIN,
    offset: (CARD_WIDTH + CARD_MARGIN) * index + tvConstants.controlBarPadding,
    index,
  }), []);

  const keyExtractor = useCallback((item: BaseItem, index: number) => `${item.Id}-${index}`, []);

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="play-circle-outline" size={24} color={accentColor} />
          <Text style={styles.title}>Continue Watching</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: tvConstants.controlBarPadding,
          paddingVertical: 8,
        }}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tvConstants.controlBarPadding,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  cardPressable: {
    marginRight: CARD_MARGIN,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  timeInfo: {
    marginTop: 4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  focusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: tvConstants.focusRingWidth,
  },
});
