import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  Layout,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { sonarrService } from '@/services';
import type { SonarrCalendarEpisode } from '@/services/sonarrService';
import { colors, spacing, borderRadius } from '@/theme';

const SONARR_BLUE = '#35c5f4';
const SONARR_DARK = '#1a3a4a';
const SONARR_GRADIENT = ['#35c5f4', '#1a8fc9', '#0d6ea3'] as const;

type ViewMode = 'week' | 'month';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  episodes: SonarrCalendarEpisode[];
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekDays(): string[] {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

function getMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setDate(end.getDate() + (6 - end.getDay()));
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getStatusColor(episode: SonarrCalendarEpisode): string {
  if (episode.hasFile) return colors.status.success;
  if (!episode.monitored) return colors.text.tertiary;
  if (episode.grabbed) return SONARR_BLUE;
  return colors.status.warning;
}

function getStatusText(episode: SonarrCalendarEpisode): string {
  if (episode.hasFile) return 'Downloaded';
  if (!episode.monitored) return 'Unmonitored';
  if (episode.grabbed) return 'Downloading';
  return 'Missing';
}

function EpisodeCard({
  episode,
  onPress,
  compact = false,
}: {
  episode: SonarrCalendarEpisode;
  onPress: () => void;
  compact?: boolean;
}) {
  const poster = episode.series?.images?.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const statusColor = getStatusColor(episode);

  const airTime = episode.airDateUtc
    ? new Date(episode.airDateUtc).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.compactCard,
          { borderLeftColor: statusColor, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={styles.compactTitle} numberOfLines={1}>
          {episode.series?.title}
        </Text>
        <Text style={styles.compactEpisode}>
          S{String(episode.seasonNumber).padStart(2, '0')}E
          {String(episode.episodeNumber).padStart(2, '0')}
        </Text>
      </Pressable>
    );
  }

  return (
    <Animated.View entering={FadeInUp.springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.episodeCard,
          { opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.statusStripe, { backgroundColor: statusColor }]} />

        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.episodePoster} contentFit="cover" />
        ) : (
          <View style={[styles.episodePoster, styles.noPoster]}>
            <Ionicons name="tv-outline" size={20} color={colors.text.muted} />
          </View>
        )}

        <View style={styles.episodeInfo}>
          <Text style={styles.episodeSeriesTitle} numberOfLines={1}>
            {episode.series?.title}
          </Text>
          <View style={styles.episodeMetaRow}>
            <View style={styles.episodeBadge}>
              <Text style={styles.episodeBadgeText}>
                S{String(episode.seasonNumber).padStart(2, '0')}E
                {String(episode.episodeNumber).padStart(2, '0')}
              </Text>
            </View>
            {airTime && (
              <Text style={styles.episodeTime}>{airTime}</Text>
            )}
          </View>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {episode.title}
          </Text>
        </View>

        <View style={[styles.statusIndicator, { backgroundColor: `${statusColor}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function DayCell({
  day,
  onEpisodePress,
  isWeekView,
  screenWidth,
}: {
  day: CalendarDay;
  onEpisodePress: (episode: SonarrCalendarEpisode) => void;
  isWeekView: boolean;
  screenWidth: number;
}) {
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

function EpisodeDetailModal({
  visible,
  episode,
  onClose,
  onSearch,
  isSearching,
}: {
  visible: boolean;
  episode: SonarrCalendarEpisode | null;
  onClose: () => void;
  onSearch: () => void;
  isSearching: boolean;
}) {
  if (!episode) return null;

  const poster = episode.series?.images?.find((i) => i.coverType === 'poster');
  const fanart = episode.series?.images?.find((i) => i.coverType === 'fanart');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;
  const statusColor = getStatusColor(episode);
  const statusText = getStatusText(episode);

  const airDate = episode.airDateUtc
    ? new Date(episode.airDateUtc).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const airTime = episode.airDateUtc
    ? new Date(episode.airDateUtc).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.modalContent}
        >
          {fanartUrl && (
            <Image
              source={{ uri: fanartUrl }}
              style={styles.modalBackdrop}
              contentFit="cover"
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(10,10,10,0.95)', colors.background.secondary]}
            style={styles.modalGradient}
          />

          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <BlurView intensity={30} style={styles.blurButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </BlurView>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.modalTop}>
              {posterUrl && (
                <View style={styles.modalPosterContainer}>
                  <Image
                    source={{ uri: posterUrl }}
                    style={styles.modalPoster}
                    contentFit="cover"
                  />
                </View>
              )}
              <View style={styles.modalTitleSection}>
                <Text style={styles.modalSeriesTitle}>{episode.series?.title}</Text>
                <View style={styles.modalEpisodeBadge}>
                  <Text style={styles.modalEpisodeBadgeText}>
                    S{String(episode.seasonNumber).padStart(2, '0')}E
                    {String(episode.episodeNumber).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={styles.modalEpisodeTitle}>{episode.title}</Text>

                <View style={styles.modalAirInfo}>
                  <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} />
                  <Text style={styles.modalAirText}>{airDate}</Text>
                </View>
                {airTime && (
                  <View style={styles.modalAirInfo}>
                    <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.modalAirText}>{airTime}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.statusCard, { backgroundColor: `${statusColor}15` }]}>
              <View style={[styles.statusCardDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusCardText, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>

            {episode.overview && (
              <View style={styles.overviewSection}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.overviewText}>{episode.overview}</Text>
              </View>
            )}

            {episode.series?.network && (
              <View style={styles.networkInfo}>
                <Ionicons name="tv-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.networkText}>{episode.series.network}</Text>
              </View>
            )}

            {!episode.hasFile && episode.monitored && (
              <Pressable
                style={({ pressed }) => [
                  styles.searchButton,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={onSearch}
                disabled={isSearching}
              >
                <LinearGradient colors={SONARR_GRADIENT} style={styles.searchButtonGradient}>
                  {isSearching ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="search" size={20} color="#fff" />
                      <Text style={styles.searchButtonText}>Search Episode</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DayEpisodesModal({
  visible,
  date,
  episodes,
  onClose,
  onEpisodePress,
}: {
  visible: boolean;
  date: Date | null;
  episodes: SonarrCalendarEpisode[];
  onClose: () => void;
  onEpisodePress: (episode: SonarrCalendarEpisode) => void;
}) {
  if (!date) return null;

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.dayModalOverlay}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.dayModalContent}
        >
          <View style={styles.dayModalHeader}>
            <Text style={styles.dayModalTitle}>{formattedDate}</Text>
            <Pressable onPress={onClose} style={styles.dayModalClose}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.dayModalScroll}
            showsVerticalScrollIndicator={false}
          >
            {episodes.length === 0 ? (
              <View style={styles.noEpisodes}>
                <Ionicons name="calendar-outline" size={48} color={colors.text.muted} />
                <Text style={styles.noEpisodesText}>No episodes</Text>
              </View>
            ) : (
              episodes.map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  onPress={() => {
                    onClose();
                    setTimeout(() => onEpisodePress(episode), 300);
                  }}
                />
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

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
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[SONARR_BLUE, SONARR_DARK, colors.background.primary]}
          locations={[0, 0.3, 0.6]}
          style={styles.notConfiguredGradient}
        />
        <Animated.View entering={FadeIn.duration(600)} style={styles.notConfigured}>
          <View style={styles.notConfiguredIcon}>
            <LinearGradient colors={SONARR_GRADIENT} style={styles.notConfiguredIconGradient}>
              <Ionicons name="calendar" size={56} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.notConfiguredTitle}>Sonarr Not Configured</Text>
          <Text style={styles.notConfiguredSubtitle}>
            Connect your Sonarr server to view the calendar
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.configureButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => router.push('/settings/sonarr')}
          >
            <LinearGradient colors={SONARR_GRADIENT} style={styles.configureGradient}>
              <Ionicons name="settings" size={20} color="#fff" />
              <Text style={styles.configureButtonText}>Configure Sonarr</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <LinearGradient
          colors={[SONARR_BLUE, SONARR_DARK, 'transparent']}
          locations={[0, 0.5, 1]}
          style={styles.headerGradient}
        />

        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
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

          <Pressable onPress={handleToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        </View>

        <View style={styles.viewModeToggle}>
          <Pressable
            style={[
              styles.viewModeButton,
              viewMode === 'week' && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode('week')}
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
            onPress={() => setViewMode('month')}
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
          <Pressable onPress={handlePrevious} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </Pressable>
          <Text style={styles.navTitle}>
            {viewMode === 'week' ? weekRange : getMonthName(currentDate)}
          </Text>
          <Pressable onPress={handleNext} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#000" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={SONARR_BLUE} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      ) : viewMode === 'week' ? (
        <Animated.View
          key={`week-${formatDate(currentDate)}`}
          entering={FadeIn.duration(300)}
          style={styles.weekContainer}
        >
          <View style={styles.weekGrid}>
            {calendarDays.map((day, index) => (
              <DayCell
                key={formatDate(day.date)}
                day={day}
                onEpisodePress={setSelectedEpisode}
                isWeekView
                screenWidth={screenWidth}
              />
            ))}
          </View>
        </Animated.View>
      ) : (
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
                onPress={() => handleDayPress(day)}
              >
                <DayCell
                  day={day}
                  onEpisodePress={(ep) => {
                    setSelectedEpisode(ep);
                    setShowEpisodeModal(true);
                  }}
                  isWeekView={false}
                  screenWidth={screenWidth}
                />
              </Pressable>
            ))}
          </View>
        </Animated.View>
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
  compactCard: {
    backgroundColor: colors.surface.default,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    padding: spacing[2],
    marginHorizontal: spacing[1],
    marginBottom: spacing[2],
  },
  compactTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  compactEpisode: {
    color: colors.text.tertiary,
    fontSize: 9,
    marginTop: spacing[0.5],
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
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  statusStripe: {
    width: 4,
  },
  episodePoster: {
    width: 50,
    height: 75,
    backgroundColor: colors.surface.elevated,
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeInfo: {
    flex: 1,
    padding: spacing[3],
    justifyContent: 'center',
  },
  episodeSeriesTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  episodeBadge: {
    backgroundColor: SONARR_BLUE,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  episodeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  episodeTime: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  episodeTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: spacing[1],
  },
  statusIndicator: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing[4],
  },
  closeButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing[4],
    paddingTop: 0,
    paddingBottom: spacing[8],
  },
  modalTop: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  modalPosterContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  modalPoster: {
    width: 100,
    height: 150,
  },
  modalTitleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  modalSeriesTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalEpisodeBadge: {
    backgroundColor: SONARR_BLUE,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
  modalEpisodeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalEpisodeTitle: {
    color: colors.text.secondary,
    fontSize: 15,
    marginTop: spacing[2],
  },
  modalAirInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  modalAirText: {
    color: colors.text.tertiary,
    fontSize: 13,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statusCardDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusCardText: {
    fontSize: 15,
    fontWeight: '600',
  },
  overviewSection: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  overviewText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 22,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  networkText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  searchButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginTop: spacing[2],
  },
  searchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dayModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  dayModalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '70%',
  },
  dayModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  dayModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  dayModalClose: {
    padding: spacing[2],
  },
  dayModalScroll: {
    padding: spacing[4],
  },
  noEpisodes: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  noEpisodesText: {
    color: colors.text.muted,
    fontSize: 14,
  },
  notConfigured: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  notConfiguredGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  notConfiguredIcon: {
    marginBottom: spacing[6],
  },
  notConfiguredIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConfiguredTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  notConfiguredSubtitle: {
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: spacing[3],
    textAlign: 'center',
    lineHeight: 24,
  },
  configureButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginTop: spacing[8],
  },
  configureGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  configureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
