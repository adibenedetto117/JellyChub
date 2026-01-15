import { View, Text } from 'react-native';
import type { BaseItem } from '@/types/jellyfin';

interface ProgressBarProps {
  progress: number;
  type: string;
  accentColor?: string;
}

export function ProgressBar({ progress, type, accentColor }: ProgressBarProps) {
  const hasProgress = progress > 0 && progress < 100;

  if (!hasProgress || type === 'artist' || type === 'series' || type === 'season') {
    return null;
  }

  return (
    <View className="mt-3 h-1 bg-surface rounded-full overflow-hidden">
      <View
        className="h-full bg-accent"
        style={{ width: `${progress}%` }}
      />
    </View>
  );
}

interface SeriesProgressBarProps {
  progress: number;
  episode: BaseItem;
  accentColor?: string;
}

export function SeriesProgressBar({ progress, episode, accentColor }: SeriesProgressBarProps) {
  const hasProgress = progress > 0 && progress < 100;

  if (!hasProgress) {
    return null;
  }

  return (
    <View className="mt-3">
      <View className="h-1 bg-surface rounded-full overflow-hidden">
        <View
          className="h-full bg-accent"
          style={{ width: `${progress}%` }}
        />
      </View>
      <Text className="text-text-tertiary text-xs mt-1">
        S{episode.ParentIndexNumber} E{episode.IndexNumber} - {episode.Name}
      </Text>
    </View>
  );
}

interface SeasonProgressBarProps {
  progress: number;
  episode: BaseItem;
  accentColor?: string;
}

export function SeasonProgressBar({ progress, episode, accentColor }: SeasonProgressBarProps) {
  const hasProgress = progress > 0 && progress < 100;

  if (!hasProgress) {
    return null;
  }

  return (
    <View className="mt-3">
      <View className="h-1 bg-surface rounded-full overflow-hidden">
        <View
          className="h-full bg-accent"
          style={{ width: `${progress}%` }}
        />
      </View>
      <Text className="text-text-tertiary text-xs mt-1">
        Episode {episode.IndexNumber} - {episode.Name}
      </Text>
    </View>
  );
}
