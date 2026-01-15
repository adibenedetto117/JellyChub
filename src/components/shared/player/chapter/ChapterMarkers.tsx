import { View } from 'react-native';
import { memo } from 'react';
import { ticksToMs } from '@/utils';
import type { ChapterInfo } from './ChapterList';

interface ChapterMarkersProps {
  chapters: ChapterInfo[];
  duration: number;
  accentColor: string;
}

export const ChapterMarkers = memo(function ChapterMarkers({
  chapters,
  duration,
  accentColor,
}: ChapterMarkersProps) {
  if (!chapters.length || duration <= 0) return null;

  return (
    <>
      {chapters.slice(1).map((chapter, index) => {
        const positionMs = ticksToMs(chapter.StartPositionTicks);
        const percent = (positionMs / duration) * 100;
        if (percent <= 0 || percent >= 100) return null;

        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: `${percent}%`,
              top: 0,
              bottom: 0,
              width: 3,
              backgroundColor: 'rgba(255,255,255,0.6)',
              borderRadius: 1.5,
              marginLeft: -1.5,
            }}
          />
        );
      })}
    </>
  );
});
