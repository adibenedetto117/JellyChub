import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { memo, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PosterCard } from '../cards/PosterCard';
import { BASE_CARD_WIDTHS, CARD_MARGIN } from '../cards/cardSizes';
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
  autoFocusIndex?: number;
  onItemFocus?: (index: number, item: BaseItem) => void;
}

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
  const { t } = useTranslation();
  const { isTablet, isTV: isResponsiveTV, fontSize } = useResponsive();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const flatListRef = useRef<FlatList<BaseItem>>(null);

  const displayIcon = icon || getDefaultIcon(title);
  const horizontalPadding = isResponsiveTV ? 48 : isTablet ? 24 : 16;
  const marginBottom = isResponsiveTV ? 40 : isTablet ? 32 : 24;
  const headerMarginBottom = isResponsiveTV ? 16 : isTablet ? 14 : 12;

  const scale = isResponsiveTV ? 1.4 : isTablet ? 1.2 : 1;
  const cardWidth = Math.round(BASE_CARD_WIDTHS[variant] * scale);
  const itemWidth = cardWidth + CARD_MARGIN;

  const handleItemFocus = useCallback((index: number, item: BaseItem) => {
    if (isTV && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.3,
      });
    }
    onItemFocus?.(index, item);
  }, [onItemFocus]);

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

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: itemWidth,
    offset: itemWidth * index + horizontalPadding,
    index,
  }), [itemWidth, horizontalPadding]);

  const keyExtractor = useCallback((item: BaseItem, index: number) => `${item.Id}-${index}`, []);

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
            <Text style={[styles.seeAll, { fontSize: fontSize.sm }]}>{t('common.seeAll')}</Text>
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
        initialNumToRender={isTV ? 6 : 4}
        maxToRenderPerBatch={isTV ? 6 : 4}
        windowSize={isTV ? 7 : 5}
        removeClippedSubviews
        scrollEventThrottle={16}
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
