import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { memo, useCallback } from 'react';
import { PosterCard } from './PosterCard';
import { useResponsive } from '@/hooks';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  title: string;
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  onSeeAllPress?: () => void;
  variant?: 'poster' | 'square' | 'backdrop';
  showProgress?: boolean;
}

export const MediaRow = memo(function MediaRow({
  title,
  items,
  onItemPress,
  onSeeAllPress,
  variant = 'poster',
  showProgress = true,
}: Props) {
  const { isTablet, isTV, fontSize, spacing } = useResponsive();

  const handleItemPress = useCallback((item: BaseItem) => {
    onItemPress(item);
  }, [onItemPress]);

  if (!items.length) return null;

  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;
  const marginBottom = isTV ? 40 : isTablet ? 32 : 24;
  const headerMarginBottom = isTV ? 16 : isTablet ? 14 : 12;

  return (
    <View style={{ marginBottom }}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding, marginBottom: headerMarginBottom }]}>
        <Text style={[styles.title, { fontSize: fontSize.lg }]}>{title}</Text>
        {onSeeAllPress && (
          <Pressable onPress={onSeeAllPress}>
            <Text style={[styles.seeAll, { fontSize: fontSize.sm }]}>See All</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
      >
        {items.map((item, index) => (
          <PosterCard
            key={`${item.Id}-${index}`}
            item={item}
            onPress={() => handleItemPress(item)}
            variant={variant}
            showProgress={showProgress}
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
  seeAll: {
    color: 'rgba(255,255,255,0.6)',
  },
});
