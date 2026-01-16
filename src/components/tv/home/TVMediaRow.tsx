import { View, Text, FlatList, StyleSheet, findNodeHandle } from 'react-native';
import { memo, useCallback, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FocusableCard } from './FocusableCard';
import { tvConstants } from '@/utils/platform';
import type { BaseItem } from '@/types/jellyfin';

type IconName = keyof typeof Ionicons.glyphMap;

const TV_ACCENT_GOLD = '#D4A84B';

export interface TVMediaRowRef {
  getFirstItemHandle: () => number | null;
  getItemHandle: (index: number) => number | null;
}

interface Props {
  title: string;
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  onSeeAllPress?: () => void;
  variant?: 'poster' | 'backdrop';
  icon?: IconName;
  autoFocusFirstItem?: boolean;
  onRowFocus?: () => void;
  nextFocusUp?: number;
  nextFocusDown?: number;
}

const CARD_DIMENSIONS = {
  poster: { width: 200, height: 300 },
  backdrop: { width: 380, height: 214 },
};

const CARD_MARGIN = 20;

const getDefaultIcon = (title: string): IconName => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('movie')) return 'film-outline';
  if (lowerTitle.includes('tv') || lowerTitle.includes('show')) return 'tv-outline';
  if (lowerTitle.includes('music') || lowerTitle.includes('album')) return 'musical-notes-outline';
  if (lowerTitle.includes('book')) return 'book-outline';
  if (lowerTitle.includes('audiobook')) return 'headset-outline';
  if (lowerTitle.includes('recommend')) return 'sparkles';
  if (lowerTitle.includes('favorite')) return 'heart';
  if (lowerTitle.includes('continue') || lowerTitle.includes('resume')) return 'play-circle-outline';
  if (lowerTitle.includes('next')) return 'arrow-forward-circle-outline';
  if (lowerTitle.includes('latest') || lowerTitle.includes('recent') || lowerTitle.includes('new')) return 'time-outline';
  return 'grid-outline';
};

export const TVMediaRow = memo(forwardRef<TVMediaRowRef, Props>(function TVMediaRow({
  title,
  items,
  onItemPress,
  onSeeAllPress,
  variant = 'poster',
  icon,
  autoFocusFirstItem = false,
  onRowFocus,
  nextFocusUp,
  nextFocusDown,
}, ref) {
  const flatListRef = useRef<FlatList<BaseItem>>(null);
  const itemRefs = useRef<Map<number, any>>(new Map());
  const [itemHandles, setItemHandles] = useState<Map<number, number>>(new Map());

  const displayIcon = icon || getDefaultIcon(title);
  const dimensions = CARD_DIMENSIONS[variant];
  const itemWidth = dimensions.width + CARD_MARGIN;

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
      <FocusableCard
        ref={(r) => {
          if (r) {
            itemRefs.current.set(index, r);
          }
        }}
        item={item}
        onPress={() => onItemPress(item)}
        onFocus={() => handleItemFocus(index)}
        variant={variant}
        autoFocus={autoFocusFirstItem && index === 0}
        cardWidth={dimensions.width}
        cardHeight={dimensions.height}
        nextFocusUp={nextFocusUp}
        nextFocusDown={nextFocusDown}
        nextFocusLeft={leftHandle}
        nextFocusRight={rightHandle}
      />
    );
  }, [onItemPress, variant, autoFocusFirstItem, handleItemFocus, dimensions, itemHandles, items.length, nextFocusUp, nextFocusDown]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: itemWidth,
    offset: itemWidth * index + tvConstants.controlBarPadding,
    index,
  }), [itemWidth]);

  const keyExtractor = useCallback((item: BaseItem, index: number) => `${item.Id}-${index}`, []);

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={displayIcon} size={22} color={TV_ACCENT_GOLD} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {onSeeAllPress && (
          <Text style={styles.seeAll}>See All</Text>
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
        contentContainerStyle={{
          paddingHorizontal: tvConstants.controlBarPadding,
          paddingVertical: 12,
        }}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
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
  seeAll: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '400',
  },
});
