import { View, Text, StyleSheet } from 'react-native';
import { memo, useMemo } from 'react';
import { ticksToMs } from '@/utils';
import type { ChapterInfo } from './ChapterList';

interface CurrentChapterDisplayProps {
  chapters: ChapterInfo[];
  currentPositionMs: number;
  visible: boolean;
}

export const CurrentChapterDisplay = memo(function CurrentChapterDisplay({
  chapters,
  currentPositionMs,
  visible,
}: CurrentChapterDisplayProps) {
  const currentChapter = useMemo(() => {
    if (!chapters.length) return null;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentPositionMs >= ticksToMs(chapters[i].StartPositionTicks)) {
        return chapters[i];
      }
    }
    return chapters[0];
  }, [chapters, currentPositionMs]);

  if (!visible || !currentChapter?.Name) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text} numberOfLines={1}>
        {currentChapter.Name}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    maxWidth: '60%',
  },
  text: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
});
