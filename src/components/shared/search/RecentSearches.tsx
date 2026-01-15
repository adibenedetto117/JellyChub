import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import { colors } from '@/theme';

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
}

export interface RecentSearchesProps {
  searches: RecentSearch[];
  onSearchSelect: (query: string) => void;
  onSearchRemove: (id: string) => void;
  onClearAll: () => void;
  maxItems?: number;
}

export function RecentSearches({
  searches,
  onSearchSelect,
  onSearchRemove,
  onClearAll,
  maxItems = 10,
}: RecentSearchesProps) {
  const { t } = useTranslation();
  const accentColor = useSettingsStore((s) => s.accentColor);

  const displayedSearches = searches.slice(0, maxItems);

  if (displayedSearches.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('search.recentSearches')}</Text>
        <Pressable onPress={onClearAll} hitSlop={8}>
          <Text style={[styles.clearButton, { color: accentColor }]}>
            {t('common.clearAll')}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={displayedSearches}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSearchSelect(item.query)}
            style={styles.searchItem}
          >
            <View style={styles.searchItemLeft}>
              <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={styles.searchQuery} numberOfLines={1}>
                {item.query}
              </Text>
            </View>
            <Pressable
              onPress={() => onSearchRemove(item.id)}
              hitSlop={8}
              style={styles.removeButton}
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    marginBottom: 8,
  },
  searchItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  searchQuery: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
});
