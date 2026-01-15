import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tvConstants } from '@/utils/platform';
import { formatPlayerTime } from '@/utils';

interface TVVideoSeekBarProps {
  position: number;
  duration: number;
  buffered: number;
  accentColor: string;
}

export function TVVideoSeekBar({
  position,
  duration,
  buffered,
  accentColor,
}: TVVideoSeekBarProps) {
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      />
      <View style={styles.container}>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatPlayerTime(position)}
          </Text>
          <Text style={styles.timeText}>
            {formatPlayerTime(duration)}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View
            style={[styles.progressBuffered, { width: `${bufferedPercent}%` }]}
          />
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%`, backgroundColor: accentColor },
            ]}
          />
        </View>

        <View style={styles.hintRow}>
          <Text style={styles.hintText}>
            LEFT/RIGHT to seek  |  OK to play/pause  |  BACK to exit
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  container: {
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingBottom: tvConstants.controlBarPadding,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
  },
  progressContainer: {
    height: tvConstants.progressBarHeight || 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBuffered: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  progressFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 4,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
