import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { SonarrCalendarEpisode } from '@/api/external/sonarr';
import { colors, spacing, borderRadius } from '@/theme';
import { SONARR_BLUE } from './constants';
import type { CalendarDay } from './constants';
import { getWeekDays, getStatusColor } from './utils';
import { EpisodeCard } from './EpisodeCard';

interface DayCellProps {
  day: CalendarDay;
  onEpisodePress: (episode: SonarrCalendarEpisode) => void;
  isWeekView: boolean;
  screenWidth: number;
}

export function DayCell({ day, onEpisodePress, isWeekView, screenWidth }: DayCellProps) {
  const dayNumber = day.date.getDate();
  const hasEpisodes = day.episodes.length > 0;

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
          {day.episodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              onPress={() => onEpisodePress(episode)}
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
      {hasEpisodes && (
        <View style={styles.episodeDots}>
          {day.episodes.slice(0, 3).map((episode) => (
            <Pressable
              key={episode.id}
              onPress={() => onEpisodePress(episode)}
              style={[
                styles.episodeDot,
                { backgroundColor: getStatusColor(episode) },
              ]}
            />
          ))}
          {day.episodes.length > 3 && (
            <Text style={styles.moreEpisodes}>+{day.episodes.length - 3}</Text>
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
    backgroundColor: `${SONARR_BLUE}20`,
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
    color: SONARR_BLUE,
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
    backgroundColor: SONARR_BLUE,
  },
  monthDayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  episodeDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  episodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreEpisodes: {
    color: colors.text.muted,
    fontSize: 10,
  },
});
