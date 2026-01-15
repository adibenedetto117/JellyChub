import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@/theme';
import { SONARR_BLUE, SONARR_DARK, SONARR_GRADIENT } from './constants';
import type { ViewMode } from './constants';
import { getMonthName } from './utils';

interface CalendarHeaderProps {
  viewMode: ViewMode;
  currentDate: Date;
  weekRange: string;
  onBack: () => void;
  onToday: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function CalendarHeader({
  viewMode,
  currentDate,
  weekRange,
  onBack,
  onToday,
  onViewModeChange,
  onPrevious,
  onNext,
}: CalendarHeaderProps) {
  return (
    <View style={styles.header}>
      <LinearGradient
        colors={[SONARR_BLUE, SONARR_DARK, 'transparent']}
        locations={[0, 0.5, 1]}
        style={styles.headerGradient}
      />

      <View style={styles.headerContent}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>

        <View style={styles.headerTitle}>
          <View style={styles.sonarrLogo}>
            <LinearGradient colors={SONARR_GRADIENT} style={styles.logoGradient}>
              <Ionicons name="calendar" size={20} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.brandTitle}>Calendar</Text>
            <Text style={styles.brandSubtitle}>Upcoming Episodes</Text>
          </View>
        </View>

        <Pressable onPress={onToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Today</Text>
        </Pressable>
      </View>

      <View style={styles.viewModeToggle}>
        <Pressable
          style={[
            styles.viewModeButton,
            viewMode === 'week' && styles.viewModeButtonActive,
          ]}
          onPress={() => onViewModeChange('week')}
        >
          {viewMode === 'week' ? (
            <LinearGradient colors={SONARR_GRADIENT} style={styles.viewModeGradient}>
              <Text style={styles.viewModeTextActive}>Week</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.viewModeText}>Week</Text>
          )}
        </Pressable>
        <Pressable
          style={[
            styles.viewModeButton,
            viewMode === 'month' && styles.viewModeButtonActive,
          ]}
          onPress={() => onViewModeChange('month')}
        >
          {viewMode === 'month' ? (
            <LinearGradient colors={SONARR_GRADIENT} style={styles.viewModeGradient}>
              <Text style={styles.viewModeTextActive}>Month</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.viewModeText}>Month</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.navigation}>
        <Pressable onPress={onPrevious} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.navTitle}>
          {viewMode === 'week' ? weekRange : getMonthName(currentDate)}
        </Text>
        <Pressable onPress={onNext} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#000" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing[4],
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[3],
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  sonarrLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  brandSubtitle: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 1,
  },
  todayButton: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  todayButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  viewModeToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[1],
  },
  viewModeButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  viewModeButtonActive: {
    backgroundColor: 'transparent',
  },
  viewModeGradient: {
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  viewModeText: {
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing[3],
  },
  viewModeTextActive: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  navButton: {
    padding: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: borderRadius.lg,
  },
  navTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});
