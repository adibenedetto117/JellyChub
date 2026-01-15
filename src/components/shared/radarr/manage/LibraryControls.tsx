import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { RADARR_ORANGE } from '../constants';
import type { FilterType, SortType } from './types';

interface LibraryControlsProps {
  filter: FilterType;
  sortBy: SortType;
  sortAsc: boolean;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onSortDirectionToggle: () => void;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'downloaded', label: 'Downloaded' },
  { key: 'missing', label: 'Missing' },
  { key: 'unmonitored', label: 'Unmonitored' },
];

const SORTS: SortType[] = ['title', 'added', 'year', 'size'];

export function LibraryControls({
  filter,
  sortBy,
  sortAsc,
  onFilterChange,
  onSortChange,
  onSortDirectionToggle,
}: LibraryControlsProps) {
  const handleSortCycle = () => {
    const idx = SORTS.indexOf(sortBy);
    onSortChange(SORTS[(idx + 1) % SORTS.length]);
  };

  return (
    <View style={styles.libraryControls}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
            onPress={() => onFilterChange(f.key)}
          >
            <Text style={[styles.filterPillText, filter === f.key && styles.filterPillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        <Pressable style={styles.sortBtn} onPress={handleSortCycle}>
          <Ionicons name="swap-vertical" size={14} color={colors.text.secondary} />
          <Text style={styles.sortText}>{sortBy}</Text>
        </Pressable>
        <Pressable onPress={onSortDirectionToggle} hitSlop={8}>
          <Ionicons
            name={sortAsc ? 'arrow-up' : 'arrow-down'}
            size={14}
            color={colors.text.secondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  libraryControls: {
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
    backgroundColor: `${RADARR_ORANGE}20`,
    borderColor: RADARR_ORANGE,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: RADARR_ORANGE,
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
