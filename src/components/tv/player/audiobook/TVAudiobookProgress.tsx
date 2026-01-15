import { View, Text, StyleSheet } from 'react-native';
import { formatPlayerTime } from '@/utils';

interface TVAudiobookProgressProps {
  progressValue: number;
  accentColor: string;
  remainingTime: number;
  getDisplayPosition: () => number;
}

export function TVAudiobookProgress({
  progressValue,
  accentColor,
  remainingTime,
  getDisplayPosition,
}: TVAudiobookProgressProps) {
  return (
    <View style={styles.progressSection}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressValue * 100}%`, backgroundColor: accentColor }]} />
      </View>
      <View style={styles.timeLabels}>
        <Text style={styles.timeText}>{formatPlayerTime(getDisplayPosition())}</Text>
        <Text style={styles.timeText}>-{formatPlayerTime(remainingTime)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressSection: {
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
