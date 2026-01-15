import { View, Pressable, StyleSheet } from 'react-native';
import { memo, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ticksToMs } from '@/utils';
import type { ChapterInfo } from './ChapterList';

interface ChapterNavigationProps {
  chapters: ChapterInfo[];
  currentPositionMs: number;
  onNavigate: (positionMs: number) => void;
  accentColor: string;
}

export const ChapterNavigation = memo(function ChapterNavigation({
  chapters,
  currentPositionMs,
  onNavigate,
  accentColor,
}: ChapterNavigationProps) {
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!chapters.length) return { prevChapter: null, nextChapter: null };

    let currentIndex = -1;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentPositionMs >= ticksToMs(chapters[i].StartPositionTicks)) {
        currentIndex = i;
        break;
      }
    }

    const currentChapterStart = currentIndex >= 0 ? ticksToMs(chapters[currentIndex].StartPositionTicks) : 0;
    const timeSinceChapterStart = currentPositionMs - currentChapterStart;

    let prev = null;
    if (timeSinceChapterStart > 3000 && currentIndex >= 0) {
      prev = chapters[currentIndex];
    } else if (currentIndex > 0) {
      prev = chapters[currentIndex - 1];
    }

    const next = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

    return { prevChapter: prev, nextChapter: next };
  }, [chapters, currentPositionMs]);

  if (!chapters.length) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => prevChapter && onNavigate(ticksToMs(prevChapter.StartPositionTicks))}
        style={[styles.button, !prevChapter && styles.buttonDisabled]}
        disabled={!prevChapter}
      >
        <Ionicons
          name="play-skip-back"
          size={18}
          color={prevChapter ? accentColor : 'rgba(255,255,255,0.3)'}
        />
      </Pressable>
      <Pressable
        onPress={() => nextChapter && onNavigate(ticksToMs(nextChapter.StartPositionTicks))}
        style={[styles.button, !nextChapter && styles.buttonDisabled]}
        disabled={!nextChapter}
      >
        <Ionicons
          name="play-skip-forward"
          size={18}
          color={nextChapter ? accentColor : 'rgba(255,255,255,0.3)'}
        />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
