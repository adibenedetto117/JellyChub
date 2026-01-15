import { Pressable, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK } from './constants';

interface FilterPillProps {
  label: string;
  isActive: boolean;
  count?: number;
  onPress: () => void;
}

export function FilterPill({ label, isActive, count, onPress }: FilterPillProps) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={isActive ? [JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK] : ['transparent', 'transparent']}
        style={[styles.filterPill, !isActive && styles.filterPillInactive]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
          {label}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={[styles.filterPillBadge, isActive && styles.filterPillBadgeActive]}>
            <Text style={styles.filterPillBadgeText}>{count}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  filterPillInactive: {
    backgroundColor: colors.surface.default,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: '#fff',
  },
  filterPillBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterPillBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterPillBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
