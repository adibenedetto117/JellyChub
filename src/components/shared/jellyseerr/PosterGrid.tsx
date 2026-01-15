import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { JellyseerrPosterCard } from './JellyseerrPosterCard';
import { colors } from '@/theme';
import type { JellyseerrDiscoverItem } from '@/types/jellyseerr';

interface Props {
  items: JellyseerrDiscoverItem[];
  onItemPress: (item: JellyseerrDiscoverItem) => void;
  onEndReached?: () => void;
  isFetchingMore?: boolean;
  accentColor?: string;
  numColumns?: number;
  keyExtractor?: (item: JellyseerrDiscoverItem, index: number) => string;
}

export function PosterGrid({
  items,
  onItemPress,
  onEndReached,
  isFetchingMore,
  accentColor = colors.accent.primary,
  numColumns = 3,
  keyExtractor,
}: Props) {
  const defaultKeyExtractor = (item: JellyseerrDiscoverItem, index: number) =>
    `${item.mediaType}-${item.id}-${index}`;

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor || defaultKeyExtractor}
      renderItem={({ item }) => (
        <View style={styles.itemContainer}>
          <JellyseerrPosterCard
            item={item}
            onPress={() => onItemPress(item)}
            size="medium"
          />
        </View>
      )}
      numColumns={numColumns}
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.columnWrapper}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : null
      }
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={5}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  itemContainer: {
    marginBottom: 16,
    flex: 1,
    maxWidth: '33.33%',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
