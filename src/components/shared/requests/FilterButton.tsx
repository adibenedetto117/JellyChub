import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE } from './constants';

interface FilterButtonProps {
  onPress: () => void;
  activeCount?: number;
}

export function FilterButton({ onPress, activeCount = 0 }: FilterButtonProps) {
  const hasActiveFilters = activeCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
    >
      <Ionicons name="options" size={18} color={hasActiveFilters ? '#fff' : colors.text.muted} />
      {activeCount > 0 && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>{activeCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
