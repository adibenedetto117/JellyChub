import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { memo, useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DesktopPosterCard } from './DesktopPosterCard';
import { useSettingsStore } from '@/stores';
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
  poster: { width: 160, height: 240 },
  backdrop: { width: 280, height: 158 },
};

const CARD_MARGIN = 12;
const HORIZONTAL_PADDING = 32;

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

export const DesktopMediaRow = memo(function DesktopMediaRow({
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
  const [isRowHovered, setIsRowHovered] = useState(false);

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

  const handleMouseEnter = useCallback(() => {
    setIsRowHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsRowHovered(false);
  }, []);

  const renderItem = useCallback(({ item, index }: { item: BaseItem; index: number }) => (
    <DesktopPosterCard
      item={item}
      onPress={() => onItemPress(item)}
      onFocus={() => handleItemFocus(index)}
      variant={variant}
      autoFocus={autoFocusFirstItem && index === 0}
      tabIndex={0}
    />
  ), [onItemPress, variant, autoFocusFirstItem, handleItemFocus]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: itemWidth,
    offset: itemWidth * index + HORIZONTAL_PADDING,
    index,
  }), [itemWidth]);

  const keyExtractor = useCallback((item: BaseItem, index: number) => `${item.Id}-${index}`, []);

  if (!items.length) return null;

  return (
    <View
      style={styles.container}
      // @ts-ignore - web props
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={displayIcon} size={20} color={accentColor} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {onSeeAllPress && (
          <Pressable
            onPress={onSeeAllPress}
            style={({ pressed }) => [
              styles.seeAllButton,
              pressed && styles.seeAllButtonPressed,
            ]}
          >
            <Text style={styles.seeAll}>See All</Text>
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
        contentContainerStyle={{
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingVertical: 8,
        }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={9}
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
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  seeAllButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  seeAll: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
});
