import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface SyncProgressProps {
  progress: number;
  total: number;
  currentLibraryName?: string;
}

export function SyncProgress({ progress, total, currentLibraryName }: SyncProgressProps) {
  const percentage = total > 0 ? (progress / total) * 100 : 0;

  return (
    <View style={styles.syncProgress}>
      <View style={styles.syncProgressBar}>
        <View style={[styles.syncProgressFill, { width: `${percentage}%` }]} />
      </View>
      {currentLibraryName && (
        <Text style={styles.syncProgressText}>Scanning: {currentLibraryName}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  syncProgress: {
    marginTop: 8,
    paddingHorizontal: 14,
  },
  syncProgressBar: {
    height: 4,
    backgroundColor: colors.surface.default,
    borderRadius: 2,
    overflow: 'hidden',
  },
  syncProgressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  syncProgressText: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 6,
  },
});
