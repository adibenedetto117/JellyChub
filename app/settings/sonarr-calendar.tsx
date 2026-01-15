import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { sonarrService } from '@/api';
import type { SonarrCalendarEpisode } from '@/api/external/sonarr';
import { colors } from '@/theme';
import {
  ViewMode,
  CalendarDay,
  formatDate,
  getWeekRange,
  getMonthRange,
  CalendarHeader,
  NotConfiguredScreen,
  WeekView,
  MonthView,
  LoadingState,
  EpisodeDetailModal,
  DayEpisodesModal,
} from '@/components/shared/sonarr/calendar';

export default function SonarrCalendarScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isConfigured = sonarrService.isConfigured();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [episodes, setEpisodes] = useState<SonarrCalendarEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<SonarrCalendarEpisode | null>(null);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  const loadCalendar = useCallback(async () => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const range = viewMode === 'week'
        ? getWeekRange(currentDate)
        : getMonthRange(currentDate);

      const data = await sonarrService.getCalendar(
        formatDate(range.start),
        formatDate(range.end)
      );
      setEpisodes(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load calendar');
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, currentDate, viewMode]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const handlePrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setMonth(newDate.getMonth() - 1);
      }
      return newDate;
    });
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSearchEpisode = useCallback(async () => {
    if (!selectedEpisode) return;

    setIsSearching(true);
    try {
      await sonarrService.searchEpisode(selectedEpisode.id);
      Alert.alert('Search Started', `Searching for ${selectedEpisode.series?.title} - ${selectedEpisode.title}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search episode');
    } finally {
      setIsSearching(false);
    }
  }, [selectedEpisode]);

  const calendarDays = useMemo(() => {
    const range = viewMode === 'week'
      ? getWeekRange(currentDate)
      : getMonthRange(currentDate);

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current = new Date(range.start);
    while (current <= range.end) {
      const dateStr = formatDate(current);
      const dayEpisodes = episodes.filter((ep) => ep.airDate === dateStr);

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === currentDate.getMonth(),
        isToday: current.getTime() === today.getTime(),
        episodes: dayEpisodes,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, episodes, viewMode]);

  const handleDayPress = useCallback((day: CalendarDay) => {
    if (viewMode === 'month' && day.episodes.length > 0) {
      setSelectedDay(day.date);
      setShowDayModal(true);
    }
  }, [viewMode]);

  const weekRange = useMemo(() => {
    if (viewMode !== 'week') return '';
    const range = getWeekRange(currentDate);
    const startMonth = range.start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = range.end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = range.start.getDate();
    const endDay = range.end.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }, [currentDate, viewMode]);

  const dayEpisodesForModal = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = formatDate(selectedDay);
    return episodes.filter((ep) => ep.airDate === dateStr);
  }, [selectedDay, episodes]);

  if (!isConfigured) {
    return <NotConfiguredScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <CalendarHeader
        viewMode={viewMode}
        currentDate={currentDate}
        weekRange={weekRange}
        onBack={() => router.back()}
        onToday={handleToday}
        onViewModeChange={setViewMode}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

      {isLoading ? (
        <LoadingState />
      ) : viewMode === 'week' ? (
        <WeekView
          calendarDays={calendarDays}
          currentDate={currentDate}
          screenWidth={screenWidth}
          onEpisodePress={setSelectedEpisode}
        />
      ) : (
        <MonthView
          calendarDays={calendarDays}
          currentDate={currentDate}
          screenWidth={screenWidth}
          onDayPress={handleDayPress}
          onEpisodePress={(ep) => {
            setSelectedEpisode(ep);
            setShowEpisodeModal(true);
          }}
        />
      )}

      {viewMode === 'week' && selectedEpisode && (
        <EpisodeDetailModal
          visible={showEpisodeModal || !!selectedEpisode}
          episode={selectedEpisode}
          onClose={() => {
            setShowEpisodeModal(false);
            setSelectedEpisode(null);
          }}
          onSearch={handleSearchEpisode}
          isSearching={isSearching}
        />
      )}

      {viewMode === 'month' && (
        <>
          <DayEpisodesModal
            visible={showDayModal}
            date={selectedDay}
            episodes={dayEpisodesForModal}
            onClose={() => {
              setShowDayModal(false);
              setSelectedDay(null);
            }}
            onEpisodePress={(ep) => {
              setSelectedEpisode(ep);
              setShowEpisodeModal(true);
            }}
          />
          <EpisodeDetailModal
            visible={showEpisodeModal}
            episode={selectedEpisode}
            onClose={() => {
              setShowEpisodeModal(false);
              setSelectedEpisode(null);
            }}
            onSearch={handleSearchEpisode}
            isSearching={isSearching}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});
