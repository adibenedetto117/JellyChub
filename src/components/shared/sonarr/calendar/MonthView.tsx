import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { SonarrCalendarEpisode } from '@/api/external/sonarr';
import { colors, spacing } from '@/theme';
import type { CalendarDay } from './constants';
import { formatDate, getWeekDays } from './utils';
import { DayCell } from './DayCell';

interface MonthViewProps {
  calendarDays: CalendarDay[];
  currentDate: Date;
  screenWidth: number;
  onDayPress: (day: CalendarDay) => void;
  onEpisodePress: (episode: SonarrCalendarEpisode) => void;
}

export function MonthView({
  calendarDays,
  currentDate,
  screenWidth,
  onDayPress,
  onEpisodePress,
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
              onEpisodePress={onEpisodePress}
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
