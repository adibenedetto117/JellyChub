import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { RadarrCalendarMovie } from '@/api/external/radarr';
import { colors, spacing, borderRadius } from '@/theme';
import { RADARR_ORANGE } from './constants';
import type { CalendarDay } from './types';
import { getWeekDays, getStatusColor } from './utils';
import { MovieCard } from './MovieCard';

interface DayCellProps {
  day: CalendarDay;
  onMoviePress: (movie: RadarrCalendarMovie) => void;
  isWeekView: boolean;
  screenWidth: number;
}

export function DayCell({ day, onMoviePress, isWeekView, screenWidth }: DayCellProps) {
  const dayNumber = day.date.getDate();
  const hasMovies = day.movies.length > 0;

  if (isWeekView) {
    const cellWidth = (screenWidth - spacing[4] * 2) / 7;

    return (
      <View style={[styles.weekDayCell, { width: cellWidth }]}>
        <View style={[
          styles.weekDayHeader,
          day.isToday && styles.todayHeader,
        ]}>
          <Text style={[
            styles.weekDayName,
            day.isToday && styles.todayText,
          ]}>
            {getWeekDays()[day.date.getDay()]}
          </Text>
          <Text style={[
            styles.weekDayNumber,
            day.isToday && styles.todayText,
            !day.isCurrentMonth && styles.otherMonthText,
          ]}>
            {dayNumber}
          </Text>
        </View>
        <ScrollView
          style={styles.weekDayContent}
          showsVerticalScrollIndicator={false}
        >
          {day.movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onPress={() => onMoviePress(movie)}
              compact
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  const cellWidth = (screenWidth - spacing[4] * 2 - spacing[1] * 6) / 7;

  return (
    <View style={[styles.monthDayCell, { width: cellWidth, height: cellWidth * 1.3 }]}>
      <View style={[
        styles.monthDayNumber,
        day.isToday && styles.todayBadge,
      ]}>
        <Text style={[
          styles.monthDayText,
          day.isToday && styles.todayText,
          !day.isCurrentMonth && styles.otherMonthText,
        ]}>
          {dayNumber}
        </Text>
      </View>
      {hasMovies && (
        <View style={styles.movieDots}>
          {day.movies.slice(0, 3).map((movie) => (
            <Pressable
              key={movie.id}
              onPress={() => onMoviePress(movie)}
              style={[
                styles.movieDot,
                { backgroundColor: getStatusColor(movie) },
              ]}
            />
          ))}
          {day.movies.length > 3 && (
            <Text style={styles.moreMovies}>+{day.movies.length - 3}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  weekDayCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.border.subtle,
  },
  weekDayHeader: {
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  todayHeader: {
    backgroundColor: `${RADARR_ORANGE}20`,
  },
  weekDayName: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  weekDayNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing[1],
  },
  todayText: {
    color: RADARR_ORANGE,
  },
  otherMonthText: {
    color: colors.text.muted,
  },
  weekDayContent: {
    flex: 1,
    paddingVertical: spacing[2],
  },
  monthDayCell: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[2],
    alignItems: 'center',
  },
  monthDayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    backgroundColor: RADARR_ORANGE,
  },
  monthDayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  movieDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  movieDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreMovies: {
    color: colors.text.muted,
    fontSize: 10,
  },
});
