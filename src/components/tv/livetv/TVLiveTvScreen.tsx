import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
import { TVFocusableButton } from '@/components/tv/navigation/TVFocusableButton';
import { TVChannelListSection } from './TVChannelListSection';
import { TVEPGSection } from './TVEPGSection';
import { TVRecordingsSection } from './TVRecordingsSection';
import { TVScheduledSection } from './TVScheduledSection';
import { ProgramModal, ChannelGroupModal } from '@/components/shared/livetv';
import { colors } from '@/theme';
import { tvConstants } from '@/utils/platform';
import type { LiveTvChannel, LiveTvProgram, RecordingInfo, TimerInfo } from '@/types/livetv';
import type { ChannelSortOption, ChannelFilterOption } from '@/stores/liveTvStore';

type MainTab = 'channels' | 'recordings' | 'scheduled';
type ViewMode = 'channels' | 'guide';

export function TVLiveTvScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { channelId } = useLocalSearchParams<{ channelId?: string }>();
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

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
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

  const { data: recordingsData, isLoading: recordingsLoading } = useQuery({
    queryKey: ['liveTvRecordings', userId],
    queryFn: () => getRecordings(userId),
    enabled: !!userId && isLiveTvEnabled && mainTab === 'recordings',
    staleTime: 1000 * 60 * 2,
  });

  const recordings = recordingsData?.Items ?? [];

  const { data: timersData, isLoading: timersLoading } = useQuery({
    queryKey: ['liveTvTimers'],
    queryFn: () => getTimers(),
    enabled: !!userId && isLiveTvEnabled && mainTab === 'scheduled',
    staleTime: 1000 * 60 * 2,
  });

  const timers = timersData?.Items ?? [];

  const handleDeleteRecording = useCallback(
    async (recording: RecordingInfo) => {
      try {
        await deleteRecording(recording.Id);
        queryClient.invalidateQueries({ queryKey: ['liveTvRecordings'] });
      } catch (error) {}
    },
    [queryClient]
  );

  const handleDeleteTimer = useCallback(
    async (timer: TimerInfo) => {
      try {
        await deleteTimer(timer.Id);
        queryClient.invalidateQueries({ queryKey: ['liveTvTimers'] });
      } catch (error) {}
    },
    [queryClient]
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

  const handleChannelPress = useCallback(
    (channel: LiveTvChannel) => {
      addRecentChannel(channel.Id);
      router.push(`/player/livetv?channelId=${channel.Id}`);
    },
    [addRecentChannel]
  );

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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('liveTV.title')}</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="tv-outline" size={80} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{t('liveTV.noChannels')}</Text>
          <Text style={styles.emptySubtext}>{t('liveTV.noChannelsDesc')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('liveTV.title')}</Text>
        <View style={styles.headerRight}>
          {mainTab === 'channels' && (
            <TVFocusableButton
              icon={viewMode === 'channels' ? 'calendar-outline' : 'list-outline'}
              onPress={() => setViewMode(viewMode === 'channels' ? 'guide' : 'channels')}
              size="small"
            />
          )}
        </View>
      </View>

      <View style={styles.mainTabBar}>
        <TVFocusableButton
          label={t('liveTV.channels')}
          onPress={() => setMainTab('channels')}
          active={mainTab === 'channels'}
          size="medium"
          autoFocus
        />
        <TVFocusableButton
          label={t('liveTV.recordings')}
          onPress={() => setMainTab('recordings')}
          active={mainTab === 'recordings'}
          size="medium"
        />
        <TVFocusableButton
          label={t('liveTV.scheduled')}
          onPress={() => setMainTab('scheduled')}
          active={mainTab === 'scheduled'}
          size="medium"
        />
      </View>

      {mainTab === 'channels' && viewMode === 'channels' && (
        <TVChannelListSection
          channels={filteredChannels}
          isLoading={channelsLoading}
          channelSort={channelSort}
          channelFilter={channelFilter}
          onSortChange={setChannelSort}
          onFilterChange={setChannelFilter}
          favoriteChannelIds={favoriteChannelIds}
          lastWatchedChannelId={lastWatchedChannelId}
          onChannelPress={handleChannelPress}
          onFavoritePress={handleFavoritePress}
          accentColor={accentColor}
          emptyTitle={t('liveTV.noChannels')}
          emptySubtext={t('common.noResults')}
          loadingText={t('common.loading')}
        />
      )}

      {mainTab === 'channels' && viewMode === 'guide' && (
        <TVEPGSection
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
        <TVRecordingsSection
          recordings={recordings}
          isLoading={recordingsLoading}
          onPlay={handlePlayRecording}
          onDelete={handleDeleteRecording}
          accentColor={accentColor}
          emptyTitle={t('liveTV.noRecordings')}
          emptySubtext={t('liveTV.noRecordingsDesc')}
          loadingText={t('common.loading')}
        />
      )}

      {mainTab === 'scheduled' && (
        <TVScheduledSection
          timers={timers}
          isLoading={timersLoading}
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
    </View>
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
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingVertical: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mainTabBar: {
    flexDirection: 'row',
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingBottom: 16,
    gap: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 28,
    fontWeight: '600',
    marginTop: 24,
  },
  emptySubtext: {
    color: colors.text.tertiary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 12,
  },
});
