import { View, Text, Pressable, ScrollView, Modal, StyleSheet, Dimensions } from 'react-native';
import { memo, useState, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type SortOption = 'SortName' | 'DateCreated' | 'PremiereDate' | 'CommunityRating' | 'Runtime' | 'Random';

export interface FilterOptions {
  sortBy: SortOption;
  sortOrder: 'Ascending' | 'Descending';
  genres: string[];
  years: number[];
  decade: number | null;
  unplayedOnly: boolean;
  favoritesOnly: boolean;
}

export const DEFAULT_FILTERS: FilterOptions = {
  sortBy: 'SortName',
  sortOrder: 'Ascending',
  genres: [],
  years: [],
  decade: null,
  unplayedOnly: false,
  favoritesOnly: false,
};

interface FilterSortModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
  availableGenres: string[];
  accentColor: string;
  showRuntimeSort?: boolean;
}

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Name', value: 'SortName' },
  { label: 'Date Added', value: 'DateCreated' },
  { label: 'Year', value: 'PremiereDate' },
  { label: 'Rating', value: 'CommunityRating' },
  { label: 'Runtime', value: 'Runtime' },
  { label: 'Random', value: 'Random' },
];

const DECADES = [2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950];

function generateYearsForDecade(decade: number): number[] {
  return Array.from({ length: 10 }, (_, i) => decade + i);
}

const Chip = memo(function Chip({
  label,
  selected,
  onPress,
  accentColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: accentColor, borderColor: accentColor },
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
});

const ToggleSwitch = memo(function ToggleSwitch({
  label,
  value,
  onToggle,
  accentColor,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value && { backgroundColor: accentColor }]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </View>
    </Pressable>
  );
});

export const FilterSortModal = memo(function FilterSortModal({
  visible,
  onClose,
  filters,
  onApply,
  availableGenres,
  accentColor,
  showRuntimeSort = true,
}: FilterSortModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const handleOpen = useCallback(() => {
    setLocalFilters(filters);
  }, [filters]);

  const sortOptions = useMemo(() => {
    if (showRuntimeSort) return SORT_OPTIONS;
    return SORT_OPTIONS.filter((opt) => opt.value !== 'Runtime');
  }, [showRuntimeSort]);

  const handleSortChange = useCallback((sortBy: SortOption) => {
    setLocalFilters((prev) => {
      let sortOrder = prev.sortOrder;
      if (sortBy === 'SortName') {
        sortOrder = 'Ascending';
      } else if (['DateCreated', 'PremiereDate', 'CommunityRating', 'Runtime'].includes(sortBy)) {
        sortOrder = 'Descending';
      }
      return { ...prev, sortBy, sortOrder };
    });
  }, []);

  const toggleSortOrder = useCallback(() => {
    setLocalFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === 'Ascending' ? 'Descending' : 'Ascending',
    }));
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setLocalFilters((prev) => {
      const genres = prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre];
      return { ...prev, genres };
    });
  }, []);

  const selectDecade = useCallback((decade: number | null) => {
    setLocalFilters((prev) => ({
      ...prev,
      decade,
      years: decade ? generateYearsForDecade(decade) : [],
    }));
  }, []);

  const toggleUnplayed = useCallback(() => {
    setLocalFilters((prev) => ({ ...prev, unplayedOnly: !prev.unplayedOnly }));
  }, []);

  const toggleFavorites = useCallback(() => {
    setLocalFilters((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(localFilters);
    onClose();
  }, [localFilters, onApply, onClose]);

  const handleReset = useCallback(() => {
    setLocalFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      localFilters.genres.length > 0 ||
      localFilters.decade !== null ||
      localFilters.unplayedOnly ||
      localFilters.favoritesOnly
    );
  }, [localFilters]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Sort & Filter</Text>
              {hasActiveFilters && (
                <Pressable onPress={handleReset} style={styles.resetButton}>
                  <Text style={[styles.resetText, { color: accentColor }]}>Reset</Text>
                </Pressable>
              )}
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sort By</Text>
                <View style={styles.sortOptions}>
                  {sortOptions.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={localFilters.sortBy === option.value}
                      onPress={() => handleSortChange(option.value)}
                      accentColor={accentColor}
                    />
                  ))}
                </View>
                {localFilters.sortBy !== 'Random' && (
                  <Pressable onPress={toggleSortOrder} style={styles.sortOrderRow}>
                    <Text style={styles.sortOrderLabel}>
                      {localFilters.sortOrder === 'Ascending' ? 'Ascending' : 'Descending'}
                    </Text>
                    <Ionicons
                      name={localFilters.sortOrder === 'Ascending' ? 'arrow-up' : 'arrow-down'}
                      size={18}
                      color={accentColor}
                    />
                  </Pressable>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Filters</Text>
                <ToggleSwitch
                  label="Unplayed Only"
                  value={localFilters.unplayedOnly}
                  onToggle={toggleUnplayed}
                  accentColor={accentColor}
                />
                <ToggleSwitch
                  label="Favorites Only"
                  value={localFilters.favoritesOnly}
                  onToggle={toggleFavorites}
                  accentColor={accentColor}
                />
              </View>

              {availableGenres.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Genre{localFilters.genres.length > 0 ? ` (${localFilters.genres.length})` : ''}
                  </Text>
                  <View style={styles.chipContainer}>
                    {availableGenres.map((genre) => (
                      <Chip
                        key={genre}
                        label={genre}
                        selected={localFilters.genres.includes(genre)}
                        onPress={() => toggleGenre(genre)}
                        accentColor={accentColor}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Decade</Text>
                <View style={styles.chipContainer}>
                  <Chip
                    label="All"
                    selected={localFilters.decade === null}
                    onPress={() => selectDecade(null)}
                    accentColor={accentColor}
                  />
                  {DECADES.map((decade) => (
                    <Chip
                      key={decade}
                      label={`${decade}s`}
                      selected={localFilters.decade === decade}
                      onPress={() => selectDecade(decade)}
                      accentColor={accentColor}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleApply}
                style={[styles.applyButton, { backgroundColor: accentColor }]}
              >
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export function getActiveFilterCount(filters: FilterOptions): number {
  let count = 0;
  if (filters.genres.length > 0) count++;
  if (filters.decade !== null) count++;
  if (filters.unplayedOnly) count++;
  if (filters.favoritesOnly) count++;
  return count;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  content: {
    backgroundColor: colors.surface.default,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  resetButton: {
    padding: 8,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  sortOrderLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 15,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
