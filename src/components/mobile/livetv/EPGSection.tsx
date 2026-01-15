import { memo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { EPGGrid } from '@/components/shared/livetv';
import { FilterChip } from '@/components/shared/ui';
import { colors } from '@/theme';
import type { LiveTvChannel, LiveTvProgram } from '@/types/livetv';
import type { ChannelFilterOption } from '@/stores/liveTvStore';

const FILTER_OPTIONS: { value: ChannelFilterOption; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'grid-outline' },
  { value: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { value: 'tv', label: 'TV', icon: 'tv-outline' },
  { value: 'radio', label: 'Radio', icon: 'radio-outline' },
];

interface EPGSectionProps {
  channels: LiveTvChannel[];
  programs: LiveTvProgram[];
  isLoading: boolean;
  startTime: Date;
  endTime: Date;
  channelFilter: ChannelFilterOption;
  onFilterChange: (filter: ChannelFilterOption) => void;
  favoriteChannelIds: string[];
  onChannelPress: (channel: LiveTvChannel) => void;
  onProgramPress: (program: LiveTvProgram) => void;
  accentColor: string;
  loadingText: string;
}

export const EPGSection = memo(function EPGSection({
  channels,
  programs,
  isLoading,
  startTime,
  endTime,
  channelFilter,
  onFilterChange,
  favoriteChannelIds,
  onChannelPress,
  onProgramPress,
  accentColor,
  loadingText,
}: EPGSectionProps) {
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

      <View style={styles.guideContainer}>
        <EPGGrid
          channels={channels}
          programs={programs}
          startTime={startTime}
          endTime={endTime}
          onChannelPress={onChannelPress}
          onProgramPress={onProgramPress}
          accentColor={accentColor}
          favoriteChannelIds={favoriteChannelIds}
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
});
