import { View, Text, StyleSheet } from 'react-native';
import { formatPlayerTime } from '@/utils';

interface TVMusicPlayerProgressProps {
  progressValue: number;
  position: number;
  duration: number;
  accentColor: string;
}

export function TVMusicPlayerProgress({
  progressValue,
  position,
  duration,
  accentColor,
}: TVMusicPlayerProgressProps) {
  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressValue * 100}%`, backgroundColor: accentColor },
          ]}
        />
      </View>
      <View style={styles.timeLabels}>
        <Text style={styles.timeText}>{formatPlayerTime(position)}</Text>
        <Text style={styles.timeText}>{formatPlayerTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  timeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
});
