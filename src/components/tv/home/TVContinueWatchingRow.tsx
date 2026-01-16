import { View, Text, FlatList, Pressable, StyleSheet, findNodeHandle } from 'react-native';
import { memo, useCallback, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { getImageUrl } from '@/api';
import { useSettingsStore } from '@/stores';
import { tvConstants } from '@/utils/platform';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { getWatchProgress, formatPlayerTime, ticksToMs, getDisplayName } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

const TV_ACCENT_GOLD = '#D4A84B';

export interface TVContinueWatchingRowRef {
  getFirstItemHandle: () => number | null;
  getItemHandle: (index: number) => number | null;
}

interface Props {
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  autoFocusFirstItem?: boolean;
  onRowFocus?: () => void;
  nextFocusUp?: number;
  nextFocusDown?: number;
}

const CARD_WIDTH = 420;
const CARD_HEIGHT = 236;
const CARD_MARGIN = 20;

interface ContinueWatchingCardProps {
  item: BaseItem;
  onPress: () => void;
  onFocus: () => void;
  autoFocus?: boolean;
  nextFocusUp?: number;
  nextFocusDown?: number;
  nextFocusLeft?: number;
  nextFocusRight?: number;
}

const ContinueWatchingCard = forwardRef<any, ContinueWatchingCardProps>(function ContinueWatchingCard({
  item,
  onPress,
  onFocus,
  autoFocus = false,
  nextFocusUp,
  nextFocusDown,
  nextFocusLeft,
  nextFocusRight,
}, ref) {
  const [isFocused, setIsFocused] = useState(false);
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
    <Animated.View style={animatedStyle}>
      <Pressable
        ref={ref}
        onPress={onPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={styles.cardPressable}
        hasTVPreferredFocus={autoFocus}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Continue ${displayName}, ${Math.round(progress)}% watched`}
        nextFocusUp={nextFocusUp}
        nextFocusDown={nextFocusDown}
        nextFocusLeft={nextFocusLeft}
        nextFocusRight={nextFocusRight}
      >
      <View style={styles.cardContainer}>
        <CachedImage
          uri={imageUrl}
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
          borderRadius={8}
          fallbackText={item.Name?.charAt(0)?.toUpperCase() || '?'}
          priority="high"
        />

        <View style={styles.cardOverlay}>
          <View style={styles.cardContent}>
            <View style={styles.playIconContainer}>
              <Ionicons name="play" size={28} color="#fff" />
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
                { width: `${progress}%`, backgroundColor: TV_ACCENT_GOLD },
              ]}
            />
          </View>
        </View>

        <Animated.View
          style={[
            styles.focusBorder,
            { borderColor: TV_ACCENT_GOLD },
            borderStyle,
          ]}
        />
      </View>
      </Pressable>
    </Animated.View>
  );
});

export const TVContinueWatchingRow = memo(forwardRef<TVContinueWatchingRowRef, Props>(function TVContinueWatchingRow({
  items,
  onItemPress,
  autoFocusFirstItem = false,
  onRowFocus,
  nextFocusUp,
  nextFocusDown,
}, ref) {
  const flatListRef = useRef<FlatList<BaseItem>>(null);
  const itemRefs = useRef<Map<number, any>>(new Map());
  const [itemHandles, setItemHandles] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    const timer = setTimeout(() => {
      const handles = new Map<number, number>();
      itemRefs.current.forEach((itemRef, index) => {
        if (itemRef) {
          const handle = findNodeHandle(itemRef);
          if (handle) {
            handles.set(index, handle);
          }
        }
      });
      setItemHandles(handles);
    }, 100);
    return () => clearTimeout(timer);
  }, [items]);

  useImperativeHandle(ref, () => ({
    getFirstItemHandle: () => itemHandles.get(0) ?? null,
    getItemHandle: (index: number) => itemHandles.get(index) ?? null,
  }), [itemHandles]);

  const handleItemFocus = useCallback((index: number) => {
    onRowFocus?.();

    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.3,
      });
    }
  }, [onRowFocus]);

  const renderItem = useCallback(({ item, index }: { item: BaseItem; index: number }) => {
    const leftHandle = index > 0 ? itemHandles.get(index - 1) : undefined;
    const rightHandle = index < items.length - 1 ? itemHandles.get(index + 1) : undefined;

    return (
      <ContinueWatchingCard
        ref={(r) => {
          if (r) {
            itemRefs.current.set(index, r);
          }
        }}
        item={item}
        onPress={() => onItemPress(item)}
        onFocus={() => handleItemFocus(index)}
        autoFocus={autoFocusFirstItem && index === 0}
        nextFocusUp={nextFocusUp}
        nextFocusDown={nextFocusDown}
        nextFocusLeft={leftHandle}
        nextFocusRight={rightHandle}
      />
    );
  }, [onItemPress, autoFocusFirstItem, handleItemFocus, itemHandles, items.length, nextFocusUp, nextFocusDown]);

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
          <Ionicons name="play-circle-outline" size={22} color={TV_ACCENT_GOLD} />
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
          paddingVertical: 12,
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
}));

const styles = StyleSheet.create({
  container: {
    marginBottom: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tvConstants.controlBarPadding,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  cardPressable: {
    marginRight: CARD_MARGIN,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0c0c0c',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 3,
    fontWeight: '400',
  },
  timeInfo: {
    marginTop: 4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    borderRadius: 8,
    borderWidth: 3,
  },
});
