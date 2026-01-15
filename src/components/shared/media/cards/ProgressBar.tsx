import { View, StyleSheet } from 'react-native';

interface ProgressBarProps {
  progress: number;
  color: string;
}

export function ProgressBar({ progress, color }: ProgressBarProps) {
  return (
    <View style={styles.progressTrack} accessible={false}>
      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressFill: {
    height: '100%',
  },
});
