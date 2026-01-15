import { View, Text, Pressable, StyleSheet } from 'react-native';
import { formatPlayerTime, ticksToMs } from '@/utils';
import type { Chapter } from '@/hooks';

interface Bookmark {
  id: string;
  positionTicks: number;
}

interface DesktopAudiobookProgressProps {
  progressValue: number;
  isSeeking: boolean;
  accentColor: string;
  localProgress: { position: number; duration: number };
  remainingTime: number;
  itemBookmarks: Bookmark[];
  chapters: Chapter[];
  progressBarRef: React.RefObject<View | null>;
  getDisplayPosition: () => number;
  handleProgressBarClick: (event: any) => void;
}

export function DesktopAudiobookProgress({
  progressValue,
  isSeeking,
  accentColor,
  localProgress,
  remainingTime,
  itemBookmarks,
  chapters,
  progressBarRef,
  getDisplayPosition,
  handleProgressBarClick,
}: DesktopAudiobookProgressProps) {
  return (
    <View style={styles.progressContainer}>
      <Pressable
        ref={progressBarRef as any}
        onPress={handleProgressBarClick}
        style={styles.progressTouchArea}
      >
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressValue * 100}%`, backgroundColor: accentColor }
            ]}
          />
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
          {chapters.slice(1).map((chapter, index) => {
            const chapterPosition = ticksToMs(chapter.StartPositionTicks);
            const chapterPercent = localProgress.duration > 0
              ? (chapterPosition / localProgress.duration) * 100
              : 0;
            return (
              <View
                key={`chapter-${index}`}
                style={[styles.chapterMarker, { left: `${chapterPercent}%` }]}
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
      </Pressable>
      <View style={styles.progressLabels}>
        <Text style={styles.progressTime}>{formatPlayerTime(getDisplayPosition())}</Text>
        <Text style={styles.progressTime}>-{formatPlayerTime(remainingTime)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    marginBottom: 32,
  },
  progressTouchArea: {
    height: 24,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bookmarkMarker: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
    marginLeft: -2,
  },
  chapterMarker: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
    marginLeft: -1,
  },
  seekHandle: {
    position: 'absolute',
    top: 3,
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  progressTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
});
