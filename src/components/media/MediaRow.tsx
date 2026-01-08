import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { memo, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { PosterCard } from './PosterCard';
import { useResponsive } from '@/hooks';
import { useSettingsStore } from '@/stores';
import { isTV } from '@/utils/platform';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  title: string;
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  onSeeAllPress?: () => void;
  variant?: 'poster' | 'square' | 'backdrop';
  showProgress?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  // TV focus props
  autoFocusIndex?: number; // Which item should have initial focus (-1 or undefined = none)
  onItemFocus?: (index: number, item: BaseItem) => void;
}

// Base card widths for getItemLayout calculation
const BASE_CARD_WIDTHS = {
  poster: 130,
  square: 130,
  backdrop: 240,
};

// Card margin
const CARD_MARGIN = 12;

const getDefaultIcon = (title: string): keyof typeof Ionicons.glyphMap => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('movie')) return 'film-outline';
  if (lowerTitle.includes('tv') || lowerTitle.includes('show')) return 'tv-outline';
  if (lowerTitle.includes('music') || lowerTitle.includes('album')) return 'musical-notes-outline';
  if (lowerTitle.includes('book')) return 'book-outline';
  if (lowerTitle.includes('audiobook')) return 'headset-outline';
  if (lowerTitle.includes('recommend')) return 'sparkles';
  if (lowerTitle.includes('favorite')) return 'heart';
  if (lowerTitle.includes('latest') || lowerTitle.includes('recent') || lowerTitle.includes('new')) return 'time-outline';
  return 'grid-outline';
};

export const MediaRow = memo(function MediaRow({
  title,
  items,
  onItemPress,
  onSeeAllPress,
  variant = 'poster',
  showProgress = true,
  icon,
  autoFocusIndex,
  onItemFocus,
}: Props) {
  const { isTablet, isTV: isResponsiveTV, fontSize } = useResponsive();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const flatListRef = useRef<FlatList<BaseItem>>(null);

  const displayIcon = icon || getDefaultIcon(title);
  const horizontalPadding = isResponsiveTV ? 48 : isTablet ? 24 : 16;
  const marginBottom = isResponsiveTV ? 40 : isTablet ? 32 : 24;
  const headerMarginBottom = isResponsiveTV ? 16 : isTablet ? 14 : 12;

  // Calculate scaled card width for getItemLayout
  const scale = isResponsiveTV ? 1.4 : isTablet ? 1.2 : 1;
  const cardWidth = Math.round(BASE_CARD_WIDTHS[variant] * scale);
  const itemWidth = cardWidth + CARD_MARGIN;

  // Handle item focus - scroll to make focused item visible
  const handleItemFocus = useCallback((index: number, item: BaseItem) => {
    // Auto-scroll to focused item on TV
    if (isTV && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.3, // Keep focused item slightly left of center
      });
    }
    onItemFocus?.(index, item);
  }, [onItemFocus]);

  // Memoized renderItem callback with TV focus support
  const renderItem = useCallback(({ item, index }: { item: BaseItem; index: number }) => (
    <PosterCard
      item={item}
      onPress={() => onItemPress(item)}
      variant={variant}
      showProgress={showProgress}
      autoFocus={isTV && autoFocusIndex === index}
      onFocus={() => handleItemFocus(index, item)}
    />
  ), [onItemPress, variant, showProgress, autoFocusIndex, handleItemFocus]);

  // Optimized getItemLayout for better scroll performance
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: itemWidth,
    offset: itemWidth * index + horizontalPadding,
    index,
  }), [itemWidth, horizontalPadding]);

  // Stable key extractor
  const keyExtractor = useCallback((item: BaseItem, index: number) => `${item.Id}-${index}`, []);

  // Early return after hooks
  if (!items.length) return null;

  return (
    <View style={{ marginBottom }}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding, marginBottom: headerMarginBottom }]}>
        <View style={styles.headerLeft}>
          <Ionicons name={displayIcon} size={20} color={accentColor} />
          <Text style={[styles.title, { fontSize: fontSize.lg }]}>{title}</Text>
        </View>
        {onSeeAllPress && (
          <Pressable onPress={onSeeAllPress} style={styles.seeAllButton}>
            <Text style={[styles.seeAll, { fontSize: fontSize.sm }]}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </Pressable>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
        // Performance optimizations
        initialNumToRender={isTV ? 6 : 4}
        maxToRenderPerBatch={isTV ? 6 : 4}
        windowSize={isTV ? 7 : 5}
        removeClippedSubviews
        // Disable scrollEventThrottle for smoother scrolling
        scrollEventThrottle={16}
        // Handle scroll errors gracefully
        onScrollToIndexFailed={(info) => {
          // Scroll to approximate position if exact index fails
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    color: 'rgba(255,255,255,0.6)',
  },
});
