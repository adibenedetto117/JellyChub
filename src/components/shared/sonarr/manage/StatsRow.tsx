import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import { StatCard } from '../SonarrUIComponents';
import { SONARR_BLUE } from '../constants';

export interface Stats {
  totalSeries: number;
  episodesDownloaded: number;
  missingEpisodes: number;
  queueCount: number;
}

export interface StatsRowProps {
  stats: Stats;
  onTotalPress?: () => void;
  onMissingPress?: () => void;
  onQueuePress?: () => void;
}

export function StatsRow({ stats, onTotalPress, onMissingPress, onQueuePress }: StatsRowProps) {
  return (
    <View style={styles.statsRow}>
      <StatCard
        label="Total"
        value={stats.totalSeries}
        icon="tv"
        color={SONARR_BLUE}
        onPress={onTotalPress}
      />
      <StatCard
        label="Have"
        value={stats.episodesDownloaded}
        icon="checkmark-circle"
        color={colors.status.success}
        onPress={onTotalPress}
      />
      <StatCard
        label="Missing"
        value={stats.missingEpisodes}
        icon="time"
        color={colors.status.warning}
        onPress={onMissingPress}
      />
      <StatCard
        label="Queue"
        value={stats.queueCount}
        icon="cloud-download"
        color={colors.status.info}
        onPress={onQueuePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
});
