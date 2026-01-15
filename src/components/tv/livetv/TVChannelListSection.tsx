import { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TVChannelCard } from './TVChannelCard';
import { TVFocusableButton } from '@/components/tv/navigation/TVFocusableButton';
import { colors } from '@/theme';
import { tvConstants } from '@/utils/platform';
import type { LiveTvChannel } from '@/types/livetv';
import type { ChannelSortOption, ChannelFilterOption } from '@/stores/liveTvStore';

const CHANNEL_CARD_HEIGHT = 96;

const SORT_OPTIONS: { value: ChannelSortOption; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'name', label: 'Name' },
  { value: 'recent', label: 'Recent' },
];

const FILTER_OPTIONS: { value: ChannelFilterOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'all', label: 'All', icon: 'grid-outline' },
  { value: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { value: 'tv', label: 'TV', icon: 'tv-outline' },
  { value: 'radio', label: 'Radio', icon: 'radio-outline' },
];

interface TVChannelListSectionProps {
  channels: LiveTvChannel[];
  isLoading: boolean;
  channelSort: ChannelSortOption;
  channelFilter: ChannelFilterOption;
  onSortChange: (sort: ChannelSortOption) => void;
  onFilterChange: (filter: ChannelFilterOption) => void;
  favoriteChannelIds: string[];
  lastWatchedChannelId: string | null;
  onChannelPress: (channel: LiveTvChannel) => void;
  onFavoritePress: (channel: LiveTvChannel) => void;
  accentColor: string;
  emptyTitle: string;
  emptySubtext: string;
  loadingText: string;
}

export const TVChannelListSection = memo(function TVChannelListSection({
  channels,
  isLoading,
  channelSort,
  channelFilter,
  onSortChange,
  onFilterChange,
  favoriteChannelIds,
  lastWatchedChannelId,
  onChannelPress,
  onFavoritePress,
  accentColor,
  emptyTitle,
  emptySubtext,
  loadingText,
}: TVChannelListSectionProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CHANNEL_CARD_HEIGHT,
      offset: CHANNEL_CARD_HEIGHT * index,
      index,
    }),
    []
  );

  const renderChannel = useCallback(
    ({ item, index }: { item: LiveTvChannel; index: number }) => (
      <TVChannelCard
        channel={item}
        isFavorite={favoriteChannelIds.includes(item.Id)}
        isPlaying={lastWatchedChannelId === item.Id}
        onPress={() => onChannelPress(item)}
        onFavoritePress={() => onFavoritePress(item)}
        accentColor={accentColor}
        autoFocus={index === 0}
      />
    ),
    [favoriteChannelIds, lastWatchedChannelId, onChannelPress, onFavoritePress, accentColor]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={accentColor} size="large" />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => (
            <TVFocusableButton
              key={option.value}
              icon={option.icon}
              label={option.label}
              onPress={() => onFilterChange(option.value)}
              active={channelFilter === option.value}
              size="small"
            />
          ))}
        </View>

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {SORT_OPTIONS.map((option) => (
            <TVFocusableButton
              key={option.value}
              label={option.label}
              onPress={() => onSortChange(option.value)}
              active={channelSort === option.value}
              size="small"
            />
          ))}
        </View>
      </View>

      <FlatList
        data={channels}
        renderItem={renderChannel}
        keyExtractor={(item) => item.Id}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="tv-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptySubtext}>{emptySubtext}</Text>
          </View>
        }
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingVertical: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortLabel: {
    color: colors.text.tertiary,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: tvConstants.controlBarPadding - 8,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.tertiary,
    marginTop: 16,
    fontSize: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 24,
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
