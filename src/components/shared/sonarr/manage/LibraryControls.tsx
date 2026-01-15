import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { SONARR_BLUE } from '../constants';

export type FilterType = 'all' | 'continuing' | 'ended' | 'missing' | 'unmonitored';
export type SortType = 'title' | 'dateAdded' | 'year' | 'nextAiring';

export interface LibraryControlsProps {
  filter: FilterType;
  sortBy: SortType;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
}

const filters: FilterType[] = ['all', 'continuing', 'ended', 'missing', 'unmonitored'];
const sorts: SortType[] = ['title', 'dateAdded', 'year', 'nextAiring'];

const filterLabels: Record<FilterType, string> = {
  all: 'All',
  continuing: 'Continuing',
  ended: 'Ended',
  missing: 'Missing',
  unmonitored: 'Unmonitored',
};

const sortLabels: Record<SortType, string> = {
  title: 'title',
  dateAdded: 'added',
  year: 'year',
  nextAiring: 'airing',
};

export function LibraryControls({
  filter,
  sortBy,
  onFilterChange,
  onSortChange,
}: LibraryControlsProps) {
  const handleCycleSort = () => {
    const idx = sorts.indexOf(sortBy);
    onSortChange(sorts[(idx + 1) % sorts.length]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => onFilterChange(f)}
          >
            <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
              {filterLabels[f]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        <Pressable style={styles.sortBtn} onPress={handleCycleSort}>
          <Ionicons name="swap-vertical" size={14} color={colors.text.secondary} />
          <Text style={styles.sortText}>{sortLabels[sortBy]}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[2],
  },
  filterRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    paddingBottom: spacing[2],
  },
  filterPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: `${SONARR_BLUE}20`,
    borderColor: SONARR_BLUE,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: SONARR_BLUE,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  sortText: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
});
