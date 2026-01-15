import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
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
} from '@/api';
import { isTV } from '@/utils/platform';
import { ProgramModal, ChannelGroupModal } from '@/components/shared/livetv';
import { SearchButton, AnimatedGradient, TabButton } from '@/components/shared/ui';
import {
  ChannelListSection,
  EPGSection,
  RecordingsSection,
  ScheduledSection,
} from '@/components/mobile/livetv';
import { TVLiveTvScreen } from '@/components/tv/livetv';
import { colors } from '@/theme';
import type { LiveTvChannel, LiveTvProgram, RecordingInfo, TimerInfo } from '@/types/livetv';

type MainTab = 'channels' | 'recordings' | 'scheduled';
type ViewMode = 'channels' | 'guide';

export default function LiveTvScreen() {
  if (isTV) {
    return <TVLiveTvScreen />;
  }

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

  useEffect(() => {
    if (channelId && channelId !== handledChannelId) {
      setHandledChannelId(channelId);
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
          <Text style={styles.emptySubtext}>{t('liveTV.noChannelsDesc')}</Text>
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
          <SearchButton filter="TvChannel" />
        </View>
      </View>

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

      {mainTab === 'channels' && viewMode === 'channels' && (
        <ChannelListSection
          channels={filteredChannels}
          isLoading={channelsLoading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          channelSort={channelSort}
          channelFilter={channelFilter}
          onSortChange={setChannelSort}
          onFilterChange={setChannelFilter}
          favoriteChannelIds={favoriteChannelIds}
          lastWatchedChannelId={lastWatchedChannelId}
          onChannelPress={handleChannelPress}
          onChannelLongPress={handleChannelLongPress}
          onFavoritePress={handleFavoritePress}
          accentColor={accentColor}
          emptyTitle={t('liveTV.noChannels')}
          emptySubtext={t('common.noResults')}
          loadingText={t('common.loading')}
        />
      )}

      {mainTab === 'channels' && viewMode === 'guide' && (
        <EPGSection
          channels={filteredChannels}
          programs={programs}
          isLoading={channelsLoading || programsLoading}
          startTime={guideStartTime}
          endTime={guideEndTime}
          channelFilter={channelFilter}
          onFilterChange={setChannelFilter}
          favoriteChannelIds={favoriteChannelIds}
          onChannelPress={handleChannelPress}
          onProgramPress={handleProgramPress}
          accentColor={accentColor}
          loadingText={t('common.loading')}
        />
      )}

      {mainTab === 'recordings' && (
        <RecordingsSection
          recordings={recordings}
          isLoading={recordingsLoading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onPlay={handlePlayRecording}
          onDelete={handleDeleteRecording}
          accentColor={accentColor}
          emptyTitle={t('liveTV.noRecordings')}
          emptySubtext={t('liveTV.noRecordingsDesc')}
          loadingText={t('common.loading')}
        />
      )}

      {mainTab === 'scheduled' && (
        <ScheduledSection
          timers={timers}
          isLoading={timersLoading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onDelete={handleDeleteTimer}
          accentColor={accentColor}
          emptyTitle={t('liveTV.noScheduled')}
          emptySubtext={t('liveTV.noScheduledDesc')}
          loadingText={t('common.loading')}
        />
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
  mainTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    marginBottom: 8,
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
});
