import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import { StatCard } from '../StatCard';
import { RADARR_ORANGE } from '../constants';
import type { Stats, FilterType, TabType } from './types';

interface StatsRowProps {
  stats: Stats;
  onFilterPress: (filter: FilterType) => void;
  onQueuePress: () => void;
}

export function StatsRow({ stats, onFilterPress, onQueuePress }: StatsRowProps) {
  return (
    <View style={styles.statsRow}>
      <StatCard
        label="Total"
        value={stats.total}
        icon="film"
        color={RADARR_ORANGE}
        onPress={() => onFilterPress('all')}
      />
      <StatCard
        label="Have"
        value={stats.downloaded}
        icon="checkmark-circle"
        color={colors.status.success}
        onPress={() => onFilterPress('downloaded')}
      />
      <StatCard
        label="Missing"
        value={stats.missing}
        icon="time"
        color={colors.status.warning}
        onPress={() => onFilterPress('missing')}
      />
      <StatCard
        label="Queue"
        value={stats.queue}
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
