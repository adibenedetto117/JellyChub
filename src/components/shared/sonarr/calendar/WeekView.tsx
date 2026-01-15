import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { SonarrCalendarEpisode } from '@/api/external/sonarr';
import { spacing } from '@/theme';
import type { CalendarDay } from './constants';
import { formatDate } from './utils';
import { DayCell } from './DayCell';

interface WeekViewProps {
  calendarDays: CalendarDay[];
  currentDate: Date;
  screenWidth: number;
  onEpisodePress: (episode: SonarrCalendarEpisode) => void;
}

export function WeekView({
  calendarDays,
  currentDate,
  screenWidth,
  onEpisodePress,
}: WeekViewProps) {
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
            onEpisodePress={onEpisodePress}
            isWeekView
            screenWidth={screenWidth}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  weekContainer: {
    flex: 1,
  },
  weekGrid: {
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: spacing[4],
  },
});
