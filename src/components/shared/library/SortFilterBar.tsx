import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSettingsStore, useAuthStore } from '@/stores';
import { getGenres } from '@/api';
import { colors } from '@/theme';
import type { LibrarySortBy, LibrarySortOrder, LibraryCategory } from '@/stores';
import type { Genre } from '@/api';

export interface LibraryFilters {
  genres: string[];
  yearStart: number | null;
  yearEnd: number | null;
  minRating: number | null;
}

interface SortOption {
  label: string;
  value: LibrarySortBy;
  defaultOrder: LibrarySortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Name (A-Z)', value: 'SortName', defaultOrder: 'Ascending' },
  { label: 'Name (Z-A)', value: 'SortName', defaultOrder: 'Descending' },
  { label: 'Date Added (Newest)', value: 'DateCreated', defaultOrder: 'Descending' },
  { label: 'Date Added (Oldest)', value: 'DateCreated', defaultOrder: 'Ascending' },
  { label: 'Release Date', value: 'PremiereDate', defaultOrder: 'Descending' },
  { label: 'Rating', value: 'CommunityRating', defaultOrder: 'Descending' },
  { label: 'Runtime', value: 'Runtime', defaultOrder: 'Descending' },
];

const RATING_OPTIONS = [
  { label: 'Any', value: null },
  { label: '5+', value: 5 },
  { label: '6+', value: 6 },
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
  { label: '9+', value: 9 },
];

const currentYear = new Date().getFullYear();

const DECADE_SHORTCUTS = [
  { label: 'All Time', start: null, end: null },
  { label: '2020s', start: 2020, end: currentYear },
  { label: '2010s', start: 2010, end: 2019 },
  { label: '2000s', start: 2000, end: 2009 },
  { label: '90s', start: 1990, end: 1999 },
  { label: '80s', start: 1980, end: 1989 },
  { label: 'Pre-80s', start: 1900, end: 1979 },
];

const INITIAL_GENRES_SHOWN = 12;

interface Props {
  category: LibraryCategory;
  libraryId?: string;
  itemTypes?: string[];
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  totalCount: number;
}

export function SortFilterBar({
  category,
  libraryId,
  itemTypes,
  filters,
  onFiltersChange,
  totalCount,
}: Props) {
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [genreSearch, setGenreSearch] = useState('');
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    genres: true,
    years: true,
    rating: true,
  });

  const currentUser = useAuthStore((state) => state.currentUser);
  const userId = currentUser?.Id ?? '';

  const { librarySortPreferences, setLibrarySortPreference, accentColor } =
    useSettingsStore();

  const currentSort = librarySortPreferences[category];

  const { data: genres = [], isLoading: genresLoading } = useQuery({
    queryKey: ['genres', userId, libraryId, itemTypes],
    queryFn: () => getGenres(userId, libraryId, itemTypes),
    enabled: !!userId && showFilterModal,
    staleTime: 5 * 60 * 1000,
  });

  // Filter genres by search
  const filteredGenres = useMemo(() => {
    if (!genreSearch.trim()) return genres;
    const search = genreSearch.toLowerCase();
    return genres.filter((g: Genre) => g.Name.toLowerCase().includes(search));
  }, [genres, genreSearch]);

  // Limit displayed genres unless showing all
  const displayedGenres = useMemo(() => {
    if (showAllGenres || genreSearch.trim()) return filteredGenres;
    return filteredGenres.slice(0, INITIAL_GENRES_SHOWN);
  }, [filteredGenres, showAllGenres, genreSearch]);

  const hasMoreGenres = filteredGenres.length > INITIAL_GENRES_SHOWN && !genreSearch.trim();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.genres.length > 0) count++;
    if (filters.yearStart !== null || filters.yearEnd !== null) count++;
    if (filters.minRating !== null) count++;
    return count;
  }, [filters]);

  const getSortLabel = (): string => {
    const option = SORT_OPTIONS.find(
      (o) => o.value === currentSort.sortBy && o.defaultOrder === currentSort.sortOrder
    );
    if (option) return option.label;
    const baseOption = SORT_OPTIONS.find((o) => o.value === currentSort.sortBy);
    return baseOption?.label ?? 'Sort';
  };

  const handleSortSelect = (option: SortOption) => {
    setLibrarySortPreference(category, option.value, option.defaultOrder);
    setShowSortModal(false);
  };

  const handleGenreToggle = (genreName: string) => {
    const newGenres = filters.genres.includes(genreName)
      ? filters.genres.filter((g) => g !== genreName)
      : [...filters.genres, genreName];
    onFiltersChange({ ...filters, genres: newGenres });
  };

  const handleDecadeSelect = (start: number | null, end: number | null) => {
    onFiltersChange({ ...filters, yearStart: start, yearEnd: end });
  };

  const handleRatingChange = (rating: number | null) => {
    onFiltersChange({ ...filters, minRating: rating });
  };

  const clearFilters = () => {
    onFiltersChange({
      genres: [],
      yearStart: null,
      yearEnd: null,
      minRating: null,
    });
    setGenreSearch('');
    setShowAllGenres(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getActiveDecade = () => {
    return DECADE_SHORTCUTS.find(
      (d) => d.start === filters.yearStart && d.end === filters.yearEnd
    );
  };

  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {/* Sort Button */}
          <Pressable
            onPress={() => setShowSortModal(true)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.default, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 }}
          >
            <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{getSortLabel()}</Text>
          </Pressable>

          {/* Filter Button */}
          <Pressable
            onPress={() => setShowFilterModal(true)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.default, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
          >
            <Text style={{ color: colors.text.secondary, fontSize: 13 }}>Filter</Text>
            {activeFilterCount > 0 && (
              <View style={{ marginLeft: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Text style={{ color: colors.text.muted, fontSize: 12 }}>{totalCount.toLocaleString()} items</Text>
      </View>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {filters.genres.map((genre) => (
              <Pressable
                key={genre}
                onPress={() => handleGenreToggle(genre)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${accentColor}30`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
              >
                <Text style={{ color: accentColor, fontSize: 12 }}>{genre}</Text>
                <Text style={{ color: accentColor, fontSize: 14, marginLeft: 6 }}>×</Text>
              </Pressable>
            ))}
            {(filters.yearStart !== null || filters.yearEnd !== null) && (
              <Pressable
                onPress={() => handleDecadeSelect(null, null)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${accentColor}30`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
              >
                <Text style={{ color: accentColor, fontSize: 12 }}>
                  {filters.yearStart ?? '...'} - {filters.yearEnd ?? '...'}
                </Text>
                <Text style={{ color: accentColor, fontSize: 14, marginLeft: 6 }}>×</Text>
              </Pressable>
            )}
            {filters.minRating !== null && (
              <Pressable
                onPress={() => handleRatingChange(null)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${accentColor}30`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
              >
                <Text style={{ color: accentColor, fontSize: 12 }}>{filters.minRating}+ rating</Text>
                <Text style={{ color: accentColor, fontSize: 14, marginLeft: 6 }}>×</Text>
              </Pressable>
            )}
            <Pressable onPress={clearFilters} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: colors.text.tertiary, fontSize: 12 }}>Clear all</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowSortModal(false)}>
          <Pressable style={{ backgroundColor: colors.background.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} onPress={(e) => e.stopPropagation()}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.surface.default }}>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600', textAlign: 'center' }}>Sort By</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {SORT_OPTIONS.map((option) => {
                const isSelected = currentSort.sortBy === option.value && currentSort.sortOrder === option.defaultOrder;
                return (
                  <Pressable
                    key={`${option.value}-${option.defaultOrder}`}
                    onPress={() => handleSortSelect(option)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottomWidth: 1,
                      borderBottomColor: colors.surface.default,
                      backgroundColor: isSelected ? `${accentColor}15` : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 15, color: isSelected ? accentColor : '#fff', fontWeight: isSelected ? '500' : '400' }}>{option.label}</Text>
                    {isSelected && <Text style={{ color: accentColor, fontSize: 18 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ padding: 16, paddingBottom: 32 }}>
              <Pressable onPress={() => setShowSortModal(false)} style={{ backgroundColor: colors.surface.default, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '500' }}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.surface.default }}>
            <Pressable onPress={() => setShowFilterModal(false)}>
              <Text style={{ color: accentColor, fontSize: 15 }}>Cancel</Text>
            </Pressable>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Filters</Text>
            <Pressable onPress={clearFilters}>
              <Text style={{ color: accentColor, fontSize: 15 }}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {/* Genre Section */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.surface.default }}>
              <Pressable
                onPress={() => toggleSection('genres')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Genres</Text>
                  {filters.genres.length > 0 && (
                    <View style={{ marginLeft: 8, backgroundColor: accentColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{filters.genres.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: colors.text.tertiary, fontSize: 18 }}>{expandedSections.genres ? '−' : '+'}</Text>
              </Pressable>

              {expandedSections.genres && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  {/* Genre Search */}
                  <TextInput
                    style={{
                      backgroundColor: colors.surface.default,
                      color: '#fff',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 8,
                      fontSize: 14,
                      marginBottom: 12,
                    }}
                    placeholder="Search genres..."
                    placeholderTextColor={colors.text.muted}
                    value={genreSearch}
                    onChangeText={setGenreSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {genresLoading ? (
                    <ActivityIndicator color={accentColor} style={{ marginVertical: 20 }} />
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {displayedGenres.map((genre: Genre) => {
                          const isSelected = filters.genres.includes(genre.Name);
                          return (
                            <Pressable
                              key={genre.Id}
                              onPress={() => handleGenreToggle(genre.Name)}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 8,
                                backgroundColor: isSelected ? accentColor : colors.surface.default,
                              }}
                            >
                              <Text style={{ fontSize: 13, color: isSelected ? '#fff' : colors.text.secondary, fontWeight: isSelected ? '500' : '400' }}>
                                {genre.Name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {hasMoreGenres && !showAllGenres && (
                        <Pressable
                          onPress={() => setShowAllGenres(true)}
                          style={{ marginTop: 12, paddingVertical: 8 }}
                        >
                          <Text style={{ color: accentColor, fontSize: 13, textAlign: 'center' }}>
                            Show all {genres.length} genres
                          </Text>
                        </Pressable>
                      )}

                      {showAllGenres && genres.length > INITIAL_GENRES_SHOWN && (
                        <Pressable
                          onPress={() => setShowAllGenres(false)}
                          style={{ marginTop: 12, paddingVertical: 8 }}
                        >
                          <Text style={{ color: accentColor, fontSize: 13, textAlign: 'center' }}>Show less</Text>
                        </Pressable>
                      )}

                      {filteredGenres.length === 0 && !genresLoading && (
                        <Text style={{ color: colors.text.tertiary, textAlign: 'center', paddingVertical: 16 }}>
                          {genreSearch ? 'No matching genres' : 'No genres available'}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Year Range Section */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.surface.default }}>
              <Pressable
                onPress={() => toggleSection('years')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Year Range</Text>
                  {(filters.yearStart !== null || filters.yearEnd !== null) && (
                    <View style={{ marginLeft: 8, backgroundColor: accentColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>1</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: colors.text.tertiary, fontSize: 18 }}>{expandedSections.years ? '−' : '+'}</Text>
              </Pressable>

              {expandedSections.years && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  {/* Decade Shortcuts */}
                  <Text style={{ color: colors.text.tertiary, fontSize: 12, marginBottom: 8 }}>Quick Select</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {DECADE_SHORTCUTS.map((decade) => {
                      const isSelected = getActiveDecade()?.label === decade.label;
                      return (
                        <Pressable
                          key={decade.label}
                          onPress={() => handleDecadeSelect(decade.start, decade.end)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: isSelected ? accentColor : colors.surface.default,
                          }}
                        >
                          <Text style={{ fontSize: 13, color: isSelected ? '#fff' : colors.text.secondary, fontWeight: isSelected ? '500' : '400' }}>
                            {decade.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Custom Year Range */}
                  <Text style={{ color: colors.text.tertiary, fontSize: 12, marginBottom: 8 }}>Custom Range</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text.muted, fontSize: 11, marginBottom: 4 }}>From</Text>
                      <TextInput
                        style={{
                          backgroundColor: colors.surface.default,
                          color: '#fff',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          fontSize: 14,
                          textAlign: 'center',
                        }}
                        placeholder="Any"
                        placeholderTextColor={colors.text.muted}
                        value={filters.yearStart?.toString() ?? ''}
                        onChangeText={(text) => {
                          const year = text ? parseInt(text, 10) : null;
                          if (text === '' || (year && year >= 1900 && year <= currentYear)) {
                            onFiltersChange({ ...filters, yearStart: year });
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                    </View>
                    <Text style={{ color: colors.text.tertiary, fontSize: 16, marginTop: 16 }}>—</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text.muted, fontSize: 11, marginBottom: 4 }}>To</Text>
                      <TextInput
                        style={{
                          backgroundColor: colors.surface.default,
                          color: '#fff',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          fontSize: 14,
                          textAlign: 'center',
                        }}
                        placeholder="Any"
                        placeholderTextColor={colors.text.muted}
                        value={filters.yearEnd?.toString() ?? ''}
                        onChangeText={(text) => {
                          const year = text ? parseInt(text, 10) : null;
                          if (text === '' || (year && year >= 1900 && year <= currentYear)) {
                            onFiltersChange({ ...filters, yearEnd: year });
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Minimum Rating Section */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.surface.default }}>
              <Pressable
                onPress={() => toggleSection('rating')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Minimum Rating</Text>
                  {filters.minRating !== null && (
                    <View style={{ marginLeft: 8, backgroundColor: accentColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>1</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: colors.text.tertiary, fontSize: 18 }}>{expandedSections.rating ? '−' : '+'}</Text>
              </Pressable>

              {expandedSections.rating && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {RATING_OPTIONS.map((option) => {
                      const isSelected = filters.minRating === option.value;
                      return (
                        <Pressable
                          key={option.label}
                          onPress={() => handleRatingChange(option.value)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 8,
                            backgroundColor: isSelected ? accentColor : colors.surface.default,
                          }}
                        >
                          {option.value !== null && (
                            <Text style={{ color: isSelected ? '#fff' : '#fbbf24', fontSize: 12, marginRight: 4 }}>★</Text>
                          )}
                          <Text style={{ fontSize: 14, color: isSelected ? '#fff' : colors.text.secondary, fontWeight: isSelected ? '500' : '400' }}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>

          {/* Apply Button */}
          <View style={{ padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: colors.surface.default }}>
            <Pressable
              onPress={() => setShowFilterModal(false)}
              style={{ backgroundColor: accentColor, paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
