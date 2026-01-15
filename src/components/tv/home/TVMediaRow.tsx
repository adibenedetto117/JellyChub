import { View, Text, FlatList, StyleSheet } from 'react-native';
import { memo, useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FocusableCard } from './FocusableCard';
import { useSettingsStore } from '@/stores';
import { tvConstants } from '@/utils/platform';
import type { BaseItem } from '@/types/jellyfin';

type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  title: string;
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  onSeeAllPress?: () => void;
  variant?: 'poster' | 'backdrop';
  icon?: IconName;
  rowIndex?: number;
  autoFocusFirstItem?: boolean;
  onRowFocus?: (rowIndex: number) => void;
}

const CARD_DIMENSIONS = {
  poster: { width: 180, height: 270 },
  backdrop: { width: 320, height: 180 },
};

const CARD_MARGIN = 16;

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

export const TVMediaRow = memo(function TVMediaRow({
  title,
  items,
  onItemPress,
  onSeeAllPress,
  variant = 'poster',
  icon,
  rowIndex = 0,
  autoFocusFirstItem = false,
  onRowFocus,
}: Props) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const flatListRef = useRef<FlatList<BaseItem>>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const displayIcon = icon || getDefaultIcon(title);
  const dimensions = CARD_DIMENSIONS[variant];
  const itemWidth = dimensions.width + CARD_MARGIN;

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
    <FocusableCard
      item={item}
      onPress={() => onItemPress(item)}
      onFocus={() => handleItemFocus(index)}
      variant={variant}
      autoFocus={autoFocusFirstItem && index === 0}
    />
  ), [onItemPress, variant, autoFocusFirstItem, handleItemFocus]);

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
          <Ionicons name={displayIcon} size={24} color={accentColor} />
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
          paddingVertical: 8,
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
  seeAll: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
});
