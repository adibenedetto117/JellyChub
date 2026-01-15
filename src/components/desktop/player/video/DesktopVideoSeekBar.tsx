import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VideoSeekBar } from '@/components/mobile/player/video';
import { type ChapterInfo } from '@/components/shared/player';
import { formatPlayerTime } from '@/utils';

interface DesktopVideoSeekBarProps {
  position: number;
  duration: number;
  buffered: number;
  accentColor: string;
  isSeeking: boolean;
  seekPosition: number;
  onSeekStart: (position: number) => void;
  onSeekUpdate: (position: number) => void;
  onSeekEnd: (position: number) => void;
  onTap: (position: number) => void;
  chapters?: ChapterInfo[];
  itemId: string;
  mediaSourceId?: string;
  onChapterSeek: (positionMs: number) => void;
}

export function DesktopVideoSeekBar({
  position,
  duration,
  buffered,
  accentColor,
  isSeeking,
  seekPosition,
  onSeekStart,
  onSeekUpdate,
  onSeekEnd,
  onTap,
  chapters,
  itemId,
  mediaSourceId,
  onChapterSeek,
}: DesktopVideoSeekBarProps) {
  return (
    <View style={styles.bottomControls}>
      <VideoSeekBar
        position={position}
        duration={duration}
        buffered={buffered}
        accentColor={accentColor}
        isSeeking={isSeeking}
        seekPosition={seekPosition}
        onSeekStart={onSeekStart}
        onSeekUpdate={onSeekUpdate}
        onSeekEnd={onSeekEnd}
        onTap={onTap}
        formatTime={formatPlayerTime}
        chapters={chapters}
        itemId={itemId}
        mediaSourceId={mediaSourceId}
        onChapterSeek={onChapterSeek}
      />

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatPlayerTime(position)}</Text>
        <Text style={styles.timeText}>{formatPlayerTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
