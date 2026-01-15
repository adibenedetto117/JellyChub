import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE } from './constants';

type MediaType = 'all' | 'movie' | 'tv';

interface MediaTypeFilterProps {
  value: MediaType;
  onChange: (value: MediaType) => void;
}

export function MediaTypeFilter({ value, onChange }: MediaTypeFilterProps) {
  return (
    <View style={styles.mediaFilterRow}>
      <Pressable
        onPress={() => onChange('all')}
        style={[styles.mediaFilterChip, value === 'all' && styles.mediaFilterChipActive]}
      >
        <Text style={[styles.mediaFilterText, value === 'all' && styles.mediaFilterTextActive]}>All</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('movie')}
        style={[styles.mediaFilterChip, value === 'movie' && styles.mediaFilterChipActive]}
      >
        <Ionicons name="film-outline" size={14} color={value === 'movie' ? '#fff' : colors.text.muted} />
        <Text style={[styles.mediaFilterText, value === 'movie' && styles.mediaFilterTextActive]}>Movies</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('tv')}
        style={[styles.mediaFilterChip, value === 'tv' && styles.mediaFilterChipActive]}
      >
        <Ionicons name="tv-outline" size={14} color={value === 'tv' ? '#fff' : colors.text.muted} />
        <Text style={[styles.mediaFilterText, value === 'tv' && styles.mediaFilterTextActive]}>TV</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mediaFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  mediaFilterChipActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  mediaFilterText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  mediaFilterTextActive: {
    color: '#fff',
  },
});
