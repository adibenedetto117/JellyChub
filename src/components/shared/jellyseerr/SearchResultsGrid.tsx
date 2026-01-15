import { View, Text, FlatList, StyleSheet } from 'react-native';
import { JellyseerrPosterCard } from './JellyseerrPosterCard';
import { Skeleton } from '@/components/shared/ui/Skeleton';
import { colors } from '@/theme';
import type { JellyseerrDiscoverItem } from '@/types/jellyseerr';

interface Props {
  items: JellyseerrDiscoverItem[];
  onItemPress: (item: JellyseerrDiscoverItem) => void;
  isLoading?: boolean;
  emptyComponent?: React.ReactNode;
}

export function SearchResultsGrid({ items, onItemPress, isLoading, emptyComponent }: Props) {
  if (isLoading) {
    return (
      <View style={styles.skeletonContainer}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton width={100} height={150} borderRadius={12} />
          </View>
        ))}
      </View>
    );
  }

  if (items.length === 0 && emptyComponent) {
    return <>{emptyComponent}</>;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => `${item.mediaType}-${item.id}`}
      numColumns={3}
      columnWrapperStyle={styles.columnWrapper}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.gridItem}>
          <JellyseerrPosterCard
            item={item}
            onPress={() => onItemPress(item)}
            size="small"
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skeletonItem: {
    marginRight: 12,
    marginBottom: 12,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
    maxWidth: '33%',
  },
});
