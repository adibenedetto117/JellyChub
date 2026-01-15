import { memo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { FlatList as FlatListType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChannelCard } from '@/components/shared/livetv';
import { FilterChip } from '@/components/shared/ui';
import { colors } from '@/theme';
import type { LiveTvChannel } from '@/types/livetv';
import type { ChannelSortOption, ChannelFilterOption } from '@/stores/liveTvStore';

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

interface ChannelListSectionProps {
  channels: LiveTvChannel[];
  isLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  channelSort: ChannelSortOption;
  channelFilter: ChannelFilterOption;
  onSortChange: (sort: ChannelSortOption) => void;
  onFilterChange: (filter: ChannelFilterOption) => void;
  favoriteChannelIds: string[];
  lastWatchedChannelId: string | null;
  onChannelPress: (channel: LiveTvChannel) => void;
  onChannelLongPress: (channel: LiveTvChannel) => void;
  onFavoritePress: (channel: LiveTvChannel) => void;
  accentColor: string;
  emptyTitle: string;
  emptySubtext: string;
  loadingText: string;
}

export const ChannelListSection = memo(function ChannelListSection({
  channels,
  isLoading,
  refreshing,
  onRefresh,
  channelSort,
  channelFilter,
  onSortChange,
  onFilterChange,
  favoriteChannelIds,
  lastWatchedChannelId,
  onChannelPress,
  onChannelLongPress,
  onFavoritePress,
  accentColor,
  emptyTitle,
  emptySubtext,
  loadingText,
}: ChannelListSectionProps) {
  const channelListRef = useRef<FlatListType<LiveTvChannel>>(null);

  const getChannelItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CHANNEL_CARD_HEIGHT,
      offset: CHANNEL_CARD_HEIGHT * index,
      index,
    }),
    []
  );

  const renderChannel = useCallback(
    ({ item }: { item: LiveTvChannel }) => (
      <ChannelCard
        channel={item}
        isFavorite={favoriteChannelIds.includes(item.Id)}
        isPlaying={lastWatchedChannelId === item.Id}
        onPress={() => onChannelPress(item)}
        onLongPress={() => onChannelLongPress(item)}
        onFavoritePress={() => onFavoritePress(item)}
        accentColor={accentColor}
      />
    ),
    [favoriteChannelIds, lastWatchedChannelId, onChannelPress, onChannelLongPress, onFavoritePress, accentColor]
  );

  const handleScrollToIndexFailed = useCallback((info: { index: number }) => {
    setTimeout(() => {
      channelListRef.current?.scrollToIndex({ index: info.index, animated: true });
    }, 100);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={accentColor} size="large" />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            icon={option.icon}
            isActive={channelFilter === option.value}
            onPress={() => onFilterChange(option.value)}
            accentColor={accentColor}
          />
        ))}
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {SORT_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onSortChange(option.value)}
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

      <View style={styles.channelListContainer}>
        <FlatList
          ref={channelListRef}
          data={channels}
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
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptySubtext}>{emptySubtext}</Text>
            </View>
          }
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
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
    paddingTop: 100,
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
