import { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore, useLiveTvStore } from '@/stores';
import {
  getChannels,
  getPrograms,
  getLiveTvInfo,
  setChannelFavorite,
} from '@/api';
import { ChannelCard, EPGGrid, ProgramModal, ChannelGroupModal } from '@/components/livetv';
import { SearchButton, AnimatedGradient } from '@/components/ui';
import { colors } from '@/theme';
import type { LiveTvChannel, LiveTvProgram } from '@/types/livetv';
import type { ChannelSortOption, ChannelFilterOption } from '@/stores/liveTvStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

type ViewMode = 'channels' | 'guide';

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
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('channels');
  const [selectedProgram, setSelectedProgram] = useState<LiveTvProgram | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedChannelForGroup, setSelectedChannelForGroup] = useState<string | undefined>();

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
    await refetchChannels();
    setRefreshing(false);
  }, [refetchChannels]);

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
          <Text style={styles.headerTitle}>Live TV</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="tv-outline" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>Live TV Not Available</Text>
          <Text style={styles.emptySubtext}>
            Live TV is not enabled on this server or no tuners are configured.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedGradient intensity="subtle" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live TV</Text>
        <View style={styles.headerRight}>
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
          <SearchButton />
        </View>
      </View>

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
          <Text style={styles.loadingText}>Loading channels...</Text>
        </View>
      ) : viewMode === 'channels' ? (
        <FlatList
          data={filteredChannels}
          renderItem={renderChannel}
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
              <Ionicons name="tv-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No Channels Found</Text>
              <Text style={styles.emptySubtext}>
                {channelFilter === 'favorites'
                  ? 'You have no favorite channels yet'
                  : 'No channels match the current filter'}
              </Text>
            </View>
          }
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      ) : (
        <View style={styles.guideContainer}>
          {programsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={accentColor} size="large" />
              <Text style={styles.loadingText}>Loading guide...</Text>
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
});
