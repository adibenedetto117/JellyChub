import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchBar } from './SearchBar';

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  searchBarStyle?: 'bar' | 'compact';
}

export function Header({ title, showSearch = true, searchBarStyle = 'bar' }: HeaderProps) {
  const insets = useSafeAreaInsets();

  if (searchBarStyle === 'bar' && showSearch) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.titleWithBar}>{title}</Text>
        <View style={styles.searchBarRow}>
          <SearchBar />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.rowContainer, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{title}</Text>
      {showSearch && <SearchBar compact />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  titleWithBar: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  searchBarRow: {
    flexDirection: 'row',
  },
});
