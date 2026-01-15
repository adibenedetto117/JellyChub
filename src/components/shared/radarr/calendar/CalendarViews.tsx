import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { RadarrCalendarMovie } from '@/api/external/radarr';
import { colors, spacing } from '@/theme';
import { RADARR_ORANGE } from './constants';
import type { CalendarDay } from './types';
import { formatDate, getWeekDays } from './utils';
import { DayCell } from './DayCell';

interface LoadingViewProps {
  message?: string;
}

export function LoadingView({ message = 'Loading calendar...' }: LoadingViewProps) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={RADARR_ORANGE} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

interface WeekViewProps {
  currentDate: Date;
  calendarDays: CalendarDay[];
  screenWidth: number;
  onMoviePress: (movie: RadarrCalendarMovie) => void;
}

export function WeekView({ currentDate, calendarDays, screenWidth, onMoviePress }: WeekViewProps) {
  return (
    <Animated.View
      key={`week-${formatDate(currentDate)}`}
      entering={FadeIn.duration(300)}
      style={styles.weekContainer}
    >
      <View style={styles.weekGrid}>
        {calendarDays.map((day) => (
          <DayCell
            key={formatDate(day.date)}
            day={day}
            onMoviePress={onMoviePress}
            isWeekView
            screenWidth={screenWidth}
          />
        ))}
      </View>
    </Animated.View>
  );
}

interface MonthViewProps {
  currentDate: Date;
  calendarDays: CalendarDay[];
  screenWidth: number;
  onDayPress: (day: CalendarDay) => void;
  onMoviePress: (movie: RadarrCalendarMovie) => void;
}

export function MonthView({
  currentDate,
  calendarDays,
  screenWidth,
  onDayPress,
  onMoviePress,
}: MonthViewProps) {
  return (
    <Animated.View
      key={`month-${formatDate(currentDate)}`}
      entering={FadeIn.duration(300)}
      style={styles.monthContainer}
    >
      <View style={styles.monthHeader}>
        {getWeekDays().map((day) => (
          <Text key={day} style={styles.monthHeaderDay}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {calendarDays.map((day) => (
          <Pressable
            key={formatDate(day.date)}
            onPress={() => onDayPress(day)}
          >
            <DayCell
              day={day}
              onMoviePress={onMoviePress}
              isWeekView={false}
              screenWidth={screenWidth}
            />
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  loadingText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  weekContainer: {
    flex: 1,
  },
  weekGrid: {
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  monthContainer: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  monthHeader: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  monthHeaderDay: {
    flex: 1,
    textAlign: 'center',
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
});
