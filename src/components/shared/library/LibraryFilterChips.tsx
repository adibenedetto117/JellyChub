import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import { ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';

export interface FilterOption {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface LibraryFilterChipsProps {
  filters: FilterOption[];
  activeFilter: string;
  onFilterChange: (key: string) => void;
  accentColor: string;
  horizontalPadding: number;
}

export const LibraryFilterChips = memo(function LibraryFilterChips({
  filters,
  activeFilter,
  onFilterChange,
  accentColor,
  horizontalPadding,
}: LibraryFilterChipsProps) {
  if (filters.length <= 1) return null;

  return (
    <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.filterWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterContainer, { paddingHorizontal: horizontalPadding, paddingRight: 48 }]}
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => onFilterChange(filter.key)}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: accentColor },
              ]}
            >
              <Ionicons
                name={filter.icon}
                size={16}
                color={isActive ? '#fff' : 'rgba(255,255,255,0.7)'}
              />
              <Text style={[styles.filterChipText, isActive && { color: '#fff' }]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <LinearGradient
        colors={['transparent', '#0a0a0a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.filterFade}
        pointerEvents="none"
      />
    </Animated.View>
  );
});

export const DEFAULT_LIBRARY_FILTERS: FilterOption[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'movies', label: 'Movies', icon: 'film-outline' },
  { key: 'tvshows', label: 'Shows', icon: 'tv-outline' },
  { key: 'music', label: 'Music', icon: 'musical-notes-outline' },
  { key: 'books', label: 'Books', icon: 'book-outline' },
];

const styles = StyleSheet.create({
  filterWrapper: {
    position: 'relative',
  },
  filterContainer: {
    gap: 10,
    paddingBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  filterFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
});
