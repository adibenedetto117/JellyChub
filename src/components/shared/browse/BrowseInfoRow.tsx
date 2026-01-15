import { View, Text, StyleSheet } from 'react-native';
import { memo } from 'react';

interface BrowseInfoRowProps {
  totalCount: number;
  itemLabel: string;
  sortBy?: string;
  activeFilterCount: number;
  accentColor: string;
}

const getSortLabel = (sortBy: string): string => {
  switch (sortBy) {
    case 'DateCreated':
      return 'Date Added';
    case 'PremiereDate':
      return 'Year';
    case 'CommunityRating':
      return 'Rating';
    case 'Runtime':
      return 'Runtime';
    case 'Random':
      return 'Random';
    case 'SortName':
      return 'Name';
    default:
      return sortBy;
  }
};

export const BrowseInfoRow = memo(function BrowseInfoRow({
  totalCount,
  itemLabel,
  sortBy,
  activeFilterCount,
  accentColor,
}: BrowseInfoRowProps) {
  return (
    <View style={styles.sortInfoRow}>
      <Text style={styles.sortInfoText}>
        {totalCount} {itemLabel}
        {sortBy && sortBy !== 'SortName' && ` • Sorted by ${getSortLabel(sortBy)}`}
      </Text>
      {activeFilterCount > 0 && (
        <Text style={[styles.filterActiveText, { color: accentColor }]}>
          {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  sortInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sortInfoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  filterActiveText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
