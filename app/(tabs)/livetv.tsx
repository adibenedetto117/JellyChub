import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import type { FlatList as FlatListType } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore, useLiveTvStore } from '@/stores';
import {
  getChannels,
  getPrograms,
  getLiveTvInfo,
  setChannelFavorite,
  getRecordings,
  getTimers,
  deleteTimer,
  deleteRecording,
  createTimer,
  getImageUrl,
} from '@/api';
import { ChannelCard, EPGGrid, ProgramModal, ChannelGroupModal } from '@/components/livetv';
import { SearchButton, AnimatedGradient } from '@/components/ui';
import { colors } from '@/theme';
import type { LiveTvChannel, LiveTvProgram, RecordingInfo, TimerInfo } from '@/types/livetv';
import type { ChannelSortOption, ChannelFilterOption } from '@/stores/liveTvStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Channel card height for getItemLayout (padding: 12*2 + logoHeight: 40 + marginVertical: 4*2 = 72)
const CHANNEL_CARD_HEIGHT = 72;

const SORT_OPTIONS: { value: ChannelSortOption; label: string }[] = [
  { value: 'number', label: 'Channel Number' },
  { value: 'name', label: 'Name' },
  { value: 'recent', label: 'Recently Watched' },
];

const FILTER_OPTIONS: { value: ChannelFilterOption; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'grid-outline' },
  { value: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { value: 'tv', label: 'TV', icon: 'tv-outline' },
  { value: 'radio', label: 'Radio', icon: 'radio-outline' },
];

type MainTab = 'channels' | 'recordings' | 'scheduled';
type ViewMode = 'channels' | 'guide';

// Tab button component
const TabButton = memo(function TabButton({
  label,
  isActive,
  onPress,
  accentColor,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabButton,
        isActive && { borderBottomColor: accentColor, borderBottomWidth: 2 },
      ]}
    >
      <Text
        style={[
          styles.tabButtonText,
          isActive && { color: accentColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// Recording card component
const RecordingCard = memo(function RecordingCard({
  recording,
  onPress,
  onDelete,
  accentColor,
}: {
  recording: RecordingInfo;
  onPress: () => void;
  onDelete: () => void;
  accentColor: string;
}) {
  const imageUrl = recording.ImageTags?.Primary
    ? getImageUrl(recording.Id, 'Primary', { maxWidth: 200 })
    : null;

  const startTime = recording.StartDate
    ? new Date(recording.StartDate).toLocaleString()
    : '';
  const status = recording.Status || 'Completed';
  const isInProgress = status === 'InProgress';

  return (
    <Pressable onPress={onPress} style={styles.recordingCard}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.recordingImage}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.recordingImage, styles.recordingImagePlaceholder]}>
          <Ionicons name="videocam" size={32} color={colors.text.tertiary} />
        </View>
      )}
      <View style={styles.recordingInfo}>
        <Text style={styles.recordingTitle} numberOfLines={2}>
          {recording.Name}
        </Text>
        {recording.ChannelName && (
          <Text style={styles.recordingChannel}>{recording.ChannelName}</Text>
        )}
        <Text style={styles.recordingTime}>{startTime}</Text>
        <View style={styles.recordingStatus}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isInProgress ? accentColor : colors.text.tertiary },
            ]}
          />
          <Text style={styles.statusText}>
            {isInProgress ? 'Recording' : status}
          </Text>
        </View>
      </View>
      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color={colors.status.error} />
      </Pressable>
    </Pressable>
  );
});

// Timer card component
const TimerCard = memo(function TimerCard({
  timer,
  onDelete,
  accentColor,
}: {
  timer: TimerInfo;
  onDelete: () => void;
  accentColor: string;
}) {
  const startTime = timer.StartDate
    ? new Date(timer.StartDate).toLocaleString()
    : '';
  const status = timer.Status || 'Scheduled';

  return (
    <View style={styles.timerCard}>
      <View style={styles.timerIcon}>
        <Ionicons name="timer-outline" size={28} color={accentColor} />
      </View>
      <View style={styles.timerInfo}>
        <Text style={styles.timerTitle} numberOfLines={2}>
          {timer.Name}
        </Text>
        {timer.ChannelName && (
          <Text style={styles.timerChannel}>{timer.ChannelName}</Text>
        )}
        <Text style={styles.timerTime}>{startTime}</Text>
        <Text style={styles.timerStatus}>{status}</Text>
      </View>
      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <Ionicons name="close-circle-outline" size={24} color={colors.status.error} />
      </Pressable>
    </View>
  );
});

const FilterChip = memo(function FilterChip({
  label,
  icon,
  isActive,
  onPress,
  accentColor,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        isActive && { backgroundColor: accentColor + '30', borderColor: accentColor },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={isActive ? accentColor : colors.text.secondary}
      />
      <Text
        style={[
          styles.filterChipText,
          isActive && { color: accentColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

export default function LiveTvScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { channelId } = useLocalSearchParams<{ channelId?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('channels');
  const [viewMode, setViewMode] = useState<ViewMode>('channels');
  const [selectedProgram, setSelectedProgram] = useState<LiveTvProgram | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedChannelForGroup, setSelectedChannelForGroup] = useState<string | undefined>();
  const [handledChannelId, setHandledChannelId] = useState<string | null>(null);
  const channelListRef = useRef<FlatListType<LiveTvChannel>>(null);

  const currentUser = useAuthStore((s) => s.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';

  const channelSort = useLiveTvStore((s) => s.channelSort);
  const channelFilter = useLiveTvStore((s) => s.channelFilter);
  const setChannelSort = useLiveTvStore((s) => s.setChannelSort);
  const setChannelFilter = useLiveTvStore((s) => s.setChannelFilter);
  const favoriteChannelIds = useLiveTvStore((s) => s.favoriteChannelIds);
  const recentChannelIds = useLiveTvStore((s) => s.recentChannelIds);
  const toggleFavoriteChannel = useLiveTvStore((s) => s.toggleFavoriteChannel);
  const addRecentChannel = useLiveTvStore((s) => s.addRecentChannel);
  const addChannelToGroup = useLiveTvStore((s) => s.addChannelToGroup);
  const lastWatchedChannelId = useLiveTvStore((s) => s.lastWatchedChannelId);

  const { data: liveTvInfo } = useQuery({
    queryKey: ['liveTvInfo'],
    queryFn: getLiveTvInfo,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const isLiveTvEnabled = liveTvInfo?.IsEnabled ?? false;

  const {
    data: channelsData,
    isLoading: channelsLoading,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ['liveTvChannels', userId],
    queryFn: () =>
      getChannels(userId, {
        addCurrentProgram: true,
        enableUserData: true,
      }),
    enabled: !!userId && isLiveTvEnabled,
    staleTime: 1000 * 60 * 2,
  });

  const channels = channelsData?.Items ?? [];

  // Handle channelId from search navigation - auto-play the channel immediately
  useEffect(() => {
    if (channelId && channelId !== handledChannelId) {
      setHandledChannelId(channelId);
      // Navigate directly to the player - don't wait for channels to load
      router.push(`/player/livetv?channelId=${channelId}`);
    }
  }, [channelId, handledChannelId]);

  const guideStartTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now;
  }, []);

  const guideEndTime = useMemo(() => {
    const end = new Date(guideStartTime);
    end.setHours(end.getHours() + 6);
    return end;
  }, [guideStartTime]);

  const { data: programsData, isLoading: programsLoading } = useQuery({
    queryKey: ['liveTvPrograms', userId, guideStartTime.toISOString(), guideEndTime.toISOString()],
    queryFn: () =>
      getPrograms(userId, {
        minStartDate: guideStartTime.toISOString(),
        maxEndDate: guideEndTime.toISOString(),
        enableImages: true,
      }),
    enabled: !!userId && isLiveTvEnabled && viewMode === 'guide',
    staleTime: 1000 * 60 * 2,
  });

  const programs = programsData?.Items ?? [];

  // Recordings query
  const {
    data: recordingsData,
    isLoading: recordingsLoading,
    refetch: refetchRecordings,
  } = useQuery({
    queryKey: ['liveTvRecordings', userId],
    queryFn: () => getRecordings(userId),
    enabled: !!userId && isLiveTvEnabled && mainTab === 'recordings',
    staleTime: 1000 * 60 * 2,
  });

  const recordings = recordingsData?.Items ?? [];

  // Timers query
  const {
    data: timersData,
    isLoading: timersLoading,
    refetch: refetchTimers,
  } = useQuery({
    queryKey: ['liveTvTimers'],
    queryFn: () => getTimers(),
    enabled: !!userId && isLiveTvEnabled && mainTab === 'scheduled',
    staleTime: 1000 * 60 * 2,
  });

  const timers = timersData?.Items ?? [];

  // Delete recording handler
  const handleDeleteRecording = useCallback(
    (recording: RecordingInfo) => {
      Alert.alert(
        t('liveTV.deleteRecording'),
        t('liveTV.deleteRecordingConfirm', { name: recording.Name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteRecording(recording.Id);
                queryClient.invalidateQueries({ queryKey: ['liveTvRecordings'] });
              } catch (error) {
                Alert.alert(t('common.error'), t('liveTV.deleteRecordingError'));
              }
            },
          },
        ]
      );
    },
    [t, queryClient]
  );

  // Delete timer handler
  const handleDeleteTimer = useCallback(
    (timer: TimerInfo) => {
      Alert.alert(
        t('liveTV.cancelTimer'),
        t('liveTV.cancelTimerConfirm', { name: timer.Name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('liveTV.cancelRecording'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTimer(timer.Id);
                queryClient.invalidateQueries({ queryKey: ['liveTvTimers'] });
              } catch (error) {
                Alert.alert(t('common.error'), t('liveTV.cancelTimerError'));
              }
            },
          },
        ]
      );
    },
    [t, queryClient]
  );

  // Play recording handler
  const handlePlayRecording = useCallback((recording: RecordingInfo) => {
    router.push(`/player/video?itemId=${recording.Id}&from=${encodeURIComponent('/(tabs)/livetv')}`);
  }, []);

  const filteredChannels = useMemo(() => {
    let result = [...channels];

    if (channelFilter === 'favorites') {
      result = result.filter(
        (ch) => favoriteChannelIds.includes(ch.Id) || ch.UserData?.IsFavorite
      );
    } else if (channelFilter === 'tv') {
      result = result.filter((ch) => ch.ChannelType !== 'Radio');
    } else if (channelFilter === 'radio') {
      result = result.filter((ch) => ch.ChannelType === 'Radio');
    }

    if (channelSort === 'number') {
      result.sort((a, b) => {
        const numA = parseInt(a.Number ?? a.ChannelNumber ?? '9999', 10);
        const numB = parseInt(b.Number ?? b.ChannelNumber ?? '9999', 10);
        return numA - numB;
      });
    } else if (channelSort === 'name') {
      result.sort((a, b) => a.Name.localeCompare(b.Name));
    } else if (channelSort === 'recent') {
      result.sort((a, b) => {
        const indexA = recentChannelIds.indexOf(a.Id);
        const indexB = recentChannelIds.indexOf(b.Id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    return result;
  }, [channels, channelFilter, channelSort, favoriteChannelIds, recentChannelIds]);

  // getItemLayout for efficient scrollToIndex
  const getChannelItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CHANNEL_CARD_HEIGHT,
      offset: CHANNEL_CARD_HEIGHT * index,
      index,
    }),
    []
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (mainTab === 'channels') {
      await refetchChannels();
    } else if (mainTab === 'recordings') {
      await refetchRecordings();
    } else if (mainTab === 'scheduled') {
      await refetchTimers();
    }
    setRefreshing(false);
  }, [mainTab, refetchChannels, refetchRecordings, refetchTimers]);

  const handleChannelPress = useCallback(
    (channel: LiveTvChannel) => {
      addRecentChannel(channel.Id);
      router.push(`/player/livetv?channelId=${channel.Id}`);
    },
    [addRecentChannel]
  );

  const handleChannelLongPress = useCallback((channel: LiveTvChannel) => {
    setSelectedChannelForGroup(channel.Id);
    setShowGroupModal(true);
  }, []);

  const handleFavoritePress = useCallback(
    async (channel: LiveTvChannel) => {
      toggleFavoriteChannel(channel.Id);
      try {
        const isFavorite = favoriteChannelIds.includes(channel.Id);
        await setChannelFavorite(channel.Id, userId, !isFavorite);
      } catch (error) {
        toggleFavoriteChannel(channel.Id);
      }
    },
    [userId, toggleFavoriteChannel, favoriteChannelIds]
  );

  const handleProgramPress = useCallback((program: LiveTvProgram) => {
    setSelectedProgram(program);
  }, []);

  const handleWatchProgram = useCallback(() => {
    if (selectedProgram) {
      addRecentChannel(selectedProgram.ChannelId);
      setSelectedProgram(null);
      router.push(`/player/livetv?channelId=${selectedProgram.ChannelId}`);
    }
  }, [selectedProgram, addRecentChannel]);

  const handleSelectGroup = useCallback(
    (groupName: string) => {
      if (selectedChannelForGroup) {
        addChannelToGroup(groupName, selectedChannelForGroup);
      }
      setSelectedChannelForGroup(undefined);
    },
    [selectedChannelForGroup, addChannelToGroup]
  );

  const renderChannel = useCallback(
    ({ item }: { item: LiveTvChannel }) => (
      <ChannelCard
        channel={item}
        isFavorite={favoriteChannelIds.includes(item.Id)}
        isPlaying={lastWatchedChannelId === item.Id}
        onPress={() => handleChannelPress(item)}
        onLongPress={() => handleChannelLongPress(item)}
        onFavoritePress={() => handleFavoritePress(item)}
        accentColor={accentColor}
      />
    ),
    [
      favoriteChannelIds,
      lastWatchedChannelId,
      handleChannelPress,
      handleChannelLongPress,
      handleFavoritePress,
      accentColor,
    ]
  );

  if (!isLiveTvEnabled && !channelsLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AnimatedGradient intensity="subtle" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('liveTV.title')}</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="tv-outline" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{t('liveTV.noChannels')}</Text>
          <Text style={styles.emptySubtext}>
            {t('liveTV.noChannelsDesc')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedGradient intensity="subtle" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('liveTV.title')}</Text>
        <View style={styles.headerRight}>
          {mainTab === 'channels' && (
            <Pressable
              onPress={() => setViewMode(viewMode === 'channels' ? 'guide' : 'channels')}
              style={styles.viewModeButton}
            >
              <Ionicons
                name={viewMode === 'channels' ? 'calendar-outline' : 'list-outline'}
                size={22}
                color="#fff"
              />
            </Pressable>
          )}
          <SearchButton />
        </View>
      </View>

      {/* Main tab bar */}
      <View style={styles.mainTabBar}>
        <TabButton
          label={t('liveTV.channels')}
          isActive={mainTab === 'channels'}
          onPress={() => setMainTab('channels')}
          accentColor={accentColor}
        />
        <TabButton
          label={t('liveTV.recordings')}
          isActive={mainTab === 'recordings'}
          onPress={() => setMainTab('recordings')}
          accentColor={accentColor}
        />
        <TabButton
          label={t('liveTV.scheduled')}
          isActive={mainTab === 'scheduled'}
          onPress={() => setMainTab('scheduled')}
          accentColor={accentColor}
        />
      </View>

      {/* Channels tab content */}
      {mainTab === 'channels' && (
        <>
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                icon={option.icon}
                isActive={channelFilter === option.value}
                onPress={() => setChannelFilter(option.value)}
                accentColor={accentColor}
              />
            ))}
          </View>

          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setChannelSort(option.value)}
                style={[
                  styles.sortOption,
                  channelSort === option.value && { backgroundColor: accentColor + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    channelSort === option.value && { color: accentColor },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {channelsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={accentColor} size="large" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : viewMode === 'channels' ? (
            <View style={styles.channelListContainer}>
              <FlatList
                ref={channelListRef}
                data={filteredChannels}
                renderItem={renderChannel}
                keyExtractor={(item) => item.Id}
                getItemLayout={getChannelItemLayout}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={accentColor}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="tv-outline" size={48} color={colors.text.tertiary} />
                    <Text style={styles.emptyTitle}>{t('liveTV.noChannels')}</Text>
                    <Text style={styles.emptySubtext}>
                      {t('common.noResults')}
                    </Text>
                  </View>
                }
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={5}
                onScrollToIndexFailed={(info) => {
                  // Fallback for when item hasn't been rendered yet
                  setTimeout(() => {
                    channelListRef.current?.scrollToIndex({ index: info.index, animated: true });
                  }, 100);
                }}
              />
            </View>
          ) : (
            <View style={styles.guideContainer}>
              {programsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={accentColor} size="large" />
                  <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
              ) : (
                <EPGGrid
                  channels={filteredChannels}
                  programs={programs}
                  startTime={guideStartTime}
                  endTime={guideEndTime}
                  onChannelPress={handleChannelPress}
                  onProgramPress={handleProgramPress}
                  accentColor={accentColor}
                  favoriteChannelIds={favoriteChannelIds}
                />
              )}
            </View>
          )}
        </>
      )}

      {/* Recordings tab content */}
      {mainTab === 'recordings' && (
        recordingsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={accentColor} size="large" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          <FlatList
            data={recordings}
            renderItem={({ item }) => (
              <RecordingCard
                recording={item}
                onPress={() => handlePlayRecording(item)}
                onDelete={() => handleDeleteRecording(item)}
                accentColor={accentColor}
              />
            )}
            keyExtractor={(item) => item.Id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accentColor}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="videocam-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>{t('liveTV.noRecordings')}</Text>
                <Text style={styles.emptySubtext}>
                  {t('liveTV.noRecordingsDesc')}
                </Text>
              </View>
            }
          />
        )
      )}

      {/* Scheduled tab content */}
      {mainTab === 'scheduled' && (
        timersLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={accentColor} size="large" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          <FlatList
            data={timers}
            renderItem={({ item }) => (
              <TimerCard
                timer={item}
                onDelete={() => handleDeleteTimer(item)}
                accentColor={accentColor}
              />
            )}
            keyExtractor={(item) => item.Id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accentColor}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="timer-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>{t('liveTV.noScheduled')}</Text>
                <Text style={styles.emptySubtext}>
                  {t('liveTV.noScheduledDesc')}
                </Text>
              </View>
            }
          />
        )
      )}

      <ProgramModal
        program={selectedProgram}
        visible={!!selectedProgram}
        onClose={() => setSelectedProgram(null)}
        onWatchNow={handleWatchProgram}
        accentColor={accentColor}
      />

      <ChannelGroupModal
        visible={showGroupModal}
        onClose={() => {
          setShowGroupModal(false);
          setSelectedChannelForGroup(undefined);
        }}
        onSelectGroup={handleSelectGroup}
        channelId={selectedChannelForGroup}
        accentColor={accentColor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface.default,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  filterChipText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sortLabel: {
    color: colors.text.tertiary,
    fontSize: 13,
  },
  sortOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sortOptionText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100,
  },
  channelListContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  guideContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.tertiary,
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  // Tab bar styles
  mainTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Recording card styles
  recordingCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  recordingImage: {
    width: 100,
    height: 75,
  },
  recordingImagePlaceholder: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingInfo: {
    flex: 1,
    padding: 12,
  },
  recordingTitle: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  recordingChannel: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  recordingTime: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  deleteButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Timer card styles
  timerCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  timerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timerInfo: {
    flex: 1,
  },
  timerTitle: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  timerChannel: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  timerTime: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
  timerStatus: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 2,
  },
});
