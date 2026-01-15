import { View, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@/theme';
import { SONARR_GRADIENT } from '../constants';

export interface SearchRowProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  placeholder?: string;
}

export function SearchRow({
  value,
  onChangeText,
  onSearch,
  isSearching,
  placeholder = 'Search TV shows...',
}: SearchRowProps) {
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
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <LinearGradient colors={SONARR_GRADIENT} style={styles.searchBtnGradient}>
            <Ionicons name="search" size={18} color="#fff" />
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
