import { View, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { RADARR_GRADIENT } from '../constants';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  onSearch,
  isSearching,
  placeholder = 'Search movies...',
}: SearchBarProps) {
  return (
    <View style={styles.searchRow}>
      <View style={styles.searchInputWrap}>
        <Ionicons name="search" size={18} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.text.muted} />
          </Pressable>
        )}
      </View>
      <Pressable style={styles.searchBtn} onPress={onSearch} disabled={isSearching}>
        {isSearching ? (
          <ActivityIndicator color="#000" size="small" />
        ) : (
          <LinearGradient colors={RADARR_GRADIENT} style={styles.searchBtnGradient}>
            <Ionicons name="search" size={18} color="#000" />
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    color: '#fff',
    fontSize: 15,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  searchBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
