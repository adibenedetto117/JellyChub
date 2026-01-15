import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { colors, spacing } from '@/theme';
import { SONARR_GRADIENT } from '../constants';

export interface ManageHeaderProps {
  onCalendarPress?: () => void;
}

export function ManageHeader({ onCalendarPress }: ManageHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>
      <View style={styles.titleRow}>
        <View style={styles.sonarrIcon}>
          <LinearGradient colors={SONARR_GRADIENT} style={styles.sonarrIconGradient}>
            <Ionicons name="tv" size={16} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Sonarr</Text>
      </View>
      <Pressable
        onPress={onCalendarPress ?? (() => router.push('/settings/sonarr-calendar'))}
        style={styles.calendarBtn}
      >
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
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sonarrIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sonarrIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
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
