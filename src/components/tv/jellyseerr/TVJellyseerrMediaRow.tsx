import { View, Text, FlatList, StyleSheet } from 'react-native';
import { memo, useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { TVJellyseerrPosterCard } from './TVJellyseerrPosterCard';
import { tvConstants } from '@/utils/platform';
import type { JellyseerrDiscoverItem } from '@/types/jellyseerr';

type IconName = keyof typeof Ionicons.glyphMap;

const TV_ACCENT_GOLD = '#D4A84B';

interface Props {
  title: string;
  items: JellyseerrDiscoverItem[];
  onItemPress: (item: JellyseerrDiscoverItem) => void;
  icon?: IconName;
  rowIndex?: number;
  autoFocusFirstItem?: boolean;
  onRowFocus?: (rowIndex: number) => void;
  isLoading?: boolean;
}

const CARD_WIDTH = 200;
const CARD_HEIGHT = 300;
const CARD_MARGIN = 20;

export const TVJellyseerrMediaRow = memo(function TVJellyseerrMediaRow({
  title,
  items,
  onItemPress,
  icon = 'film-outline',
  rowIndex = 0,
  autoFocusFirstItem = false,
  onRowFocus,
  isLoading = false,
}: Props) {
  const flatListRef = useRef<FlatList<JellyseerrDiscoverItem>>(null);
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

  const renderItem = useCallback(({ item, index }: { item: JellyseerrDiscoverItem; index: number }) => (
    <TVJellyseerrPosterCard
      item={item}
      onPress={() => onItemPress(item)}
      onFocus={() => handleItemFocus(index)}
      autoFocus={autoFocusFirstItem && index === 0}
      cardWidth={CARD_WIDTH}
      cardHeight={CARD_HEIGHT}
    />
  ), [onItemPress, autoFocusFirstItem, handleItemFocus]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: CARD_WIDTH + CARD_MARGIN,
    offset: (CARD_WIDTH + CARD_MARGIN) * index + tvConstants.controlBarPadding,
    index,
  }), []);

  const keyExtractor = useCallback((item: JellyseerrDiscoverItem, index: number) =>
    `${item.mediaType}-${item.id}-${index}`, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name={icon} size={22} color={TV_ACCENT_GOLD} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.loadingContainer}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      </View>
    );
  }

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name={icon} size={22} color={TV_ACCENT_GOLD} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{items.length}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
    marginBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tvConstants.controlBarPadding,
    marginBottom: 20,
    gap: 14,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  count: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: '400',
  },
  listContent: {
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingVertical: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    paddingHorizontal: tvConstants.controlBarPadding,
    gap: 20,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
