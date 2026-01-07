import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { memo } from 'react';
import { NextUpCard } from './NextUpCard';
import { useResponsive } from '@/hooks';
import type { Episode } from '@/types/jellyfin';

interface Props {
  items: Episode[];
  onItemPress: (item: Episode) => void;
}

export const NextUpRow = memo(function NextUpRow({ items, onItemPress }: Props) {
  const { isTablet, isTV, fontSize } = useResponsive();

  if (!items.length) return null;

  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;
  const marginBottom = isTV ? 40 : isTablet ? 32 : 24;
  const headerMarginBottom = isTV ? 16 : isTablet ? 14 : 12;

  return (
    <View style={{ marginBottom }}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding, marginBottom: headerMarginBottom }]}>
        <Text style={[styles.title, { fontSize: fontSize.lg }]}>Next Up</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
      >
        {items.map((item, index) => (
          <NextUpCard
            key={`${item.Id}-${index}`}
            item={item}
            onPress={() => onItemPress(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontWeight: '600',
  },
});
