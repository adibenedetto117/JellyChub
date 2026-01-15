import { View, Text, FlatList, StyleSheet } from 'react-native';
import { memo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ContinueWatchingCard } from '../cards/ContinueWatchingCard';
import { useResponsive } from '@/hooks';
import { useSettingsStore } from '@/stores';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  onPlayPress?: (item: BaseItem) => void;
}

export const ContinueWatching = memo(function ContinueWatching({
  items,
  onItemPress,
  onPlayPress,
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
  const itemWidth = cardWidth + 16;

  const renderItem = useCallback(({ item }: { item: BaseItem }) => (
    <ContinueWatchingCard
      item={item}
      onPress={() => onItemPress(item)}
      onPlay={onPlayPress ? () => onPlayPress(item) : undefined}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      fontSize={fontSize}
      accentColor={accentColor}
      hideMedia={hideMedia}
    />
  ), [onItemPress, onPlayPress, cardWidth, cardHeight, fontSize, accentColor, hideMedia]);

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
