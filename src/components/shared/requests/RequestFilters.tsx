import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FilterPill } from './FilterPill';

export type RequestFilterType = 'all' | 'pending' | 'approved' | 'available';

interface RequestFiltersProps {
  filter: RequestFilterType;
  onFilterChange: (filter: RequestFilterType) => void;
  pendingCount?: number;
}

export function RequestFilters({ filter, onFilterChange, pendingCount }: RequestFiltersProps) {
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <FilterPill
          label="All"
          isActive={filter === 'all'}
          onPress={() => onFilterChange('all')}
        />
        <FilterPill
          label="Pending"
          isActive={filter === 'pending'}
          count={pendingCount}
          onPress={() => onFilterChange('pending')}
        />
        <FilterPill
          label="Approved"
          isActive={filter === 'approved'}
          onPress={() => onFilterChange('approved')}
        />
        <FilterPill
          label="Available"
          isActive={filter === 'available'}
          onPress={() => onFilterChange('available')}
        />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
});
