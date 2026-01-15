import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SearchButton } from '@/components/shared/ui';

function getIoniconName(iconName: string): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    film: 'film-outline',
    tv: 'tv-outline',
    'musical-notes': 'musical-notes-outline',
    videocam: 'videocam-outline',
    book: 'book-outline',
    headset: 'headset-outline',
    home: 'home-outline',
    folder: 'folder-outline',
    list: 'list-outline',
    library: 'library-outline',
  };
  return iconMap[iconName] ?? 'library-outline';
}

interface LibraryDetailHeaderProps {
  title: string;
  iconName: string;
  accentColor: string;
  activeFilterCount: number;
  onBack: () => void;
  onFilterPress: () => void;
}

export const LibraryDetailHeader = memo(function LibraryDetailHeader({
  title,
  iconName,
  accentColor,
  activeFilterCount,
  onBack,
  onFilterPress,
}: LibraryDetailHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <View style={[styles.libraryIcon, { backgroundColor: accentColor }]}>
          <Ionicons name={getIoniconName(iconName)} size={18} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.headerRight}>
        <Pressable onPress={onFilterPress} style={styles.filterButton}>
          <Ionicons name="options-outline" size={22} color="#fff" />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
        <SearchButton />
      </View>
    </View>
  );
});

interface SortInfoRowProps {
  totalCount: number;
  sortBy: string;
  activeFilterCount: number;
  accentColor: string;
}

export const SortInfoRow = memo(function SortInfoRow({
  totalCount,
  sortBy,
  activeFilterCount,
  accentColor,
}: SortInfoRowProps) {
  const getSortLabel = () => {
    switch (sortBy) {
      case 'DateCreated': return 'Date Added';
      case 'PremiereDate': return 'Year';
      case 'CommunityRating': return 'Rating';
      case 'Runtime': return 'Runtime';
      case 'Random': return 'Random';
      default: return 'Name';
    }
  };

  return (
    <View style={styles.sortInfoRow}>
      <Text style={styles.sortInfoText}>
        {totalCount} items
        {sortBy !== 'SortName' && ` • Sorted by ${getSortLabel()}`}
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
    gap: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  libraryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
