import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SONARR_BLUE, RADARR_GOLD } from './constants';

export type ArrSource = 'radarr' | 'sonarr';

interface SourceBadgeProps {
  source: ArrSource;
}

export const SourceBadge = memo(function SourceBadge({ source }: SourceBadgeProps) {
  const isRadarr = source === 'radarr';
  const color = isRadarr ? RADARR_GOLD : SONARR_BLUE;
  const label = isRadarr ? 'Radarr' : 'Sonarr';

  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
});
