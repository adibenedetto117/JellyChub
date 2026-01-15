import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { formatPlayerTime, ticksToMs } from '@/utils';
import type { AudiobookPlayerCore } from '@/hooks';

interface Bookmark {
  id: string;
  positionTicks: number;
}

interface MobileAudiobookProgressProps {
  progressValue: number;
  isSeeking: boolean;
  accentColor: string;
  localProgress: { position: number; duration: number };
  remainingTime: number;
  itemBookmarks: Bookmark[];
  seekGesture: AudiobookPlayerCore['seekGesture'];
  getDisplayPosition: () => number;
}

export function MobileAudiobookProgress({
  progressValue,
  isSeeking,
  accentColor,
  localProgress,
  remainingTime,
  itemBookmarks,
  seekGesture,
  getDisplayPosition,
}: MobileAudiobookProgressProps) {
  return (
    <View style={styles.progressContainer}>
      <GestureDetector gesture={seekGesture}>
        <Animated.View style={styles.progressTouchArea}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressValue * 100}%`, backgroundColor: accentColor }]} />
            {itemBookmarks.map((bookmark) => {
              const bookmarkPosition = ticksToMs(bookmark.positionTicks);
              const bookmarkPercent = localProgress.duration > 0
                ? (bookmarkPosition / localProgress.duration) * 100
                : 0;
              return (
                <View
                  key={bookmark.id}
                  style={[styles.bookmarkMarker, { left: `${bookmarkPercent}%` }]}
                />
              );
            })}
          </View>
          <View
            style={[
              styles.seekHandle,
              {
                left: `${progressValue * 100}%`,
                backgroundColor: isSeeking ? '#fff' : accentColor,
              }
            ]}
          />
        </Animated.View>
      </GestureDetector>
      <View style={styles.progressLabels}>
        <Text style={styles.progressTime}>{formatPlayerTime(getDisplayPosition())}</Text>
        <Text style={styles.progressTime}>-{formatPlayerTime(remainingTime)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  progressTouchArea: {
    height: 36,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  bookmarkMarker: {
    position: 'absolute',
    top: 0,
    width: 3,
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 1,
    marginLeft: -1.5,
  },
  seekHandle: {
    position: 'absolute',
    top: 10,
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
});
