import { memo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EPGGrid } from '@/components/shared/livetv';
import { TVFocusableButton } from '@/components/tv/navigation/TVFocusableButton';
import { colors } from '@/theme';
import { tvConstants } from '@/utils/platform';
import type { LiveTvChannel, LiveTvProgram } from '@/types/livetv';
import type { ChannelFilterOption } from '@/stores/liveTvStore';

const FILTER_OPTIONS: { value: ChannelFilterOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'all', label: 'All', icon: 'grid-outline' },
  { value: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { value: 'tv', label: 'TV', icon: 'tv-outline' },
  { value: 'radio', label: 'Radio', icon: 'radio-outline' },
];

interface TVEPGSectionProps {
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

export const TVEPGSection = memo(function TVEPGSection({
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
}: TVEPGSectionProps) {
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingVertical: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
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
    marginTop: 16,
    fontSize: 18,
  },
});
