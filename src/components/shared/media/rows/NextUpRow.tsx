import { View, Text, FlatList, StyleSheet } from 'react-native';
import { memo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NextUpCard } from '../cards/NextUpCard';
import { useResponsive } from '@/hooks';
import { useSettingsStore } from '@/stores';
import type { Episode } from '@/types/jellyfin';

interface Props {
  items: Episode[];
  onItemPress: (item: Episode) => void;
}

const ITEM_WIDTH = 314;

export const NextUpRow = memo(function NextUpRow({ items, onItemPress }: Props) {
  const { t } = useTranslation();
  const { isTablet, isTV, fontSize } = useResponsive();
  const accentColor = useSettingsStore((s) => s.accentColor);

  if (!items.length) return null;

  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;
  const marginBottom = isTV ? 40 : isTablet ? 32 : 24;
  const headerMarginBottom = isTV ? 16 : isTablet ? 14 : 12;
  const scale = isTV ? 1.4 : isTablet ? 1.2 : 1;
  const itemWidth = Math.round(ITEM_WIDTH * scale);

  const renderItem = useCallback(({ item }: { item: Episode }) => (
    <NextUpCard item={item} onPress={() => onItemPress(item)} />
  ), [onItemPress]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: itemWidth,
    offset: itemWidth * index + horizontalPadding,
    index,
  }), [itemWidth, horizontalPadding]);

  const keyExtractor = useCallback((item: Episode, index: number) => `${item.Id}-${index}`, []);

  return (
    <View style={{ marginBottom }}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding, marginBottom: headerMarginBottom }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="arrow-forward-circle" size={22} color={accentColor} />
          <Text style={[styles.title, { fontSize: fontSize.lg }]}>{t('home.nextUp')}</Text>
        </View>
        <Text style={[styles.itemCount, { fontSize: fontSize.sm }]}>{t('common.episodeCount', { count: items.length })}</Text>
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
