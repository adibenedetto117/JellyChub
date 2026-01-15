import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing } from '@/theme';
import { RADARR_GRADIENT } from '../constants';

interface ManageHeaderProps {
  onCalendarPress?: () => void;
}

export function ManageHeader({ onCalendarPress }: ManageHeaderProps) {
  const handleCalendarPress = onCalendarPress || (() => router.push('/settings/radarr-calendar'));

  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>
      <View style={styles.headerTitleRow}>
        <View style={styles.radarrIcon}>
          <LinearGradient colors={RADARR_GRADIENT} style={styles.radarrIconGradient}>
            <Ionicons name="film" size={16} color="#000" />
          </LinearGradient>
        </View>
        <Text style={styles.headerTitle}>Radarr</Text>
      </View>
      <Pressable onPress={handleCalendarPress} style={styles.calendarBtn}>
        <Ionicons name="calendar-outline" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  radarrIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
  },
  radarrIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
