import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SearchButton, type SearchFilterType } from '@/components/shared/ui';
import { colors } from '@/theme';

interface BrowseHeaderProps {
  title: string;
  searchFilter: SearchFilterType;
  onFilterPress?: () => void;
  activeFilterCount?: number;
  accentColor: string;
  showFilterButton?: boolean;
}

export const BrowseHeader = memo(function BrowseHeader({
  title,
  searchFilter,
  onFilterPress,
  activeFilterCount = 0,
  accentColor,
  showFilterButton = true,
}: BrowseHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.headerRight}>
        {showFilterButton && onFilterPress && (
          <Pressable onPress={onFilterPress} style={styles.filterButton}>
            <Ionicons name="options-outline" size={22} color="#fff" />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        )}
        <SearchButton filter={searchFilter} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
