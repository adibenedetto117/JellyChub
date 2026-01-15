import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack } from 'expo-router';
import { radarrService } from '@/api';
import type { RadarrCalendarMovie } from '@/api/external/radarr';
import { colors } from '@/theme';
import {
  type ViewMode,
  type CalendarDay,
  formatDate,
  getWeekRange,
  getMonthRange,
  CalendarHeader,
  NotConfiguredView,
  LoadingView,
  WeekView,
  MonthView,
  MovieDetailModal,
  DayMoviesModal,
} from '@/components/shared/radarr/calendar';
import { StyleSheet } from 'react-native';

export default function RadarrCalendarScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isConfigured = radarrService.isConfigured();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [movies, setMovies] = useState<RadarrCalendarMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<RadarrCalendarMovie | null>(null);
  const [showMovieModal, setShowMovieModal] = useState(false);
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

      const data = await radarrService.getCalendar(
        formatDate(range.start),
        formatDate(range.end)
      );
      setMovies(data);
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

  const handleSearchMovie = useCallback(async () => {
    if (!selectedMovie) return;

    setIsSearching(true);
    try {
      await radarrService.triggerMovieSearch(selectedMovie.id);
      Alert.alert('Search Started', `Searching for ${selectedMovie.title}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search movie');
    } finally {
      setIsSearching(false);
    }
  }, [selectedMovie]);

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
      const dayMovies = movies.filter((m) => {
        const releaseDate = m.digitalRelease || m.physicalRelease || m.inCinemas;
        return releaseDate?.startsWith(dateStr);
      });

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === currentDate.getMonth(),
        isToday: current.getTime() === today.getTime(),
        movies: dayMovies,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, movies, viewMode]);

  const handleDayPress = useCallback((day: CalendarDay) => {
    if (viewMode === 'month' && day.movies.length > 0) {
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

  const dayMoviesForModal = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = formatDate(selectedDay);
    return movies.filter((m) => {
      const releaseDate = m.digitalRelease || m.physicalRelease || m.inCinemas;
      return releaseDate?.startsWith(dateStr);
    });
  }, [selectedDay, movies]);

  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <NotConfiguredView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <CalendarHeader
        viewMode={viewMode}
        currentDate={currentDate}
        weekRange={weekRange}
        onViewModeChange={setViewMode}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
      />

      {isLoading ? (
        <LoadingView />
      ) : viewMode === 'week' ? (
        <WeekView
          currentDate={currentDate}
          calendarDays={calendarDays}
          screenWidth={screenWidth}
          onMoviePress={setSelectedMovie}
        />
      ) : (
        <MonthView
          currentDate={currentDate}
          calendarDays={calendarDays}
          screenWidth={screenWidth}
          onDayPress={handleDayPress}
          onMoviePress={(m) => {
            setSelectedMovie(m);
            setShowMovieModal(true);
          }}
        />
      )}

      {viewMode === 'week' && selectedMovie && (
        <MovieDetailModal
          visible={showMovieModal || !!selectedMovie}
          movie={selectedMovie}
          onClose={() => {
            setShowMovieModal(false);
            setSelectedMovie(null);
          }}
          onSearch={handleSearchMovie}
          isSearching={isSearching}
        />
      )}

      {viewMode === 'month' && (
        <>
          <DayMoviesModal
            visible={showDayModal}
            date={selectedDay}
            movies={dayMoviesForModal}
            onClose={() => {
              setShowDayModal(false);
              setSelectedDay(null);
            }}
            onMoviePress={(m) => {
              setSelectedMovie(m);
              setShowMovieModal(true);
            }}
          />
          <MovieDetailModal
            visible={showMovieModal}
            movie={selectedMovie}
            onClose={() => {
              setShowMovieModal(false);
              setSelectedMovie(null);
            }}
            onSearch={handleSearchMovie}
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
