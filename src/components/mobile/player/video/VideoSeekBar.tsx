import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { ChapterMarkers, CurrentChapterDisplay, ChapterNavigation, type ChapterInfo } from '@/components/shared/player';
import { TrickplayPreview, TimeOnlyPreview } from '@/components/shared/player';
import type { TrickplayInfo } from '@/types/jellyfin';

interface VideoSeekBarProps {
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
  formatTime: (ms: number) => string;
  // Optional features
  chapters?: ChapterInfo[];
  introStart?: number | null;
  introEnd?: number | null;
  creditsStart?: number | null;
  abLoop?: { a: number | null; b: number | null };
  trickplayInfo?: TrickplayInfo | null;
  trickplayResolution?: number | null;
  itemId?: string;
  mediaSourceId?: string;
  onChapterSeek?: (positionMs: number) => void;
}

export function VideoSeekBar({
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
  formatTime,
  chapters,
  introStart,
  introEnd,
  creditsStart,
  abLoop,
  trickplayInfo,
  trickplayResolution,
  itemId,
  mediaSourceId,
  onChapterSeek,
}: VideoSeekBarProps) {
  const insets = useSafeAreaInsets();
  const [seekBarLayoutWidth, setSeekBarLayoutWidth] = useState(500);

  const progressPercent = duration > 0 ? ((isSeeking ? seekPosition : position) / duration) * 100 : 0;

  const gesture = Gesture.Exclusive(
    Gesture.Pan()
      .onStart((e) => {
        const percent = Math.max(0, Math.min(1, e.x / seekBarLayoutWidth));
        const newPosition = percent * duration;
        runOnJS(onSeekStart)(newPosition);
      })
      .onUpdate((e) => {
        const percent = Math.max(0, Math.min(1, e.x / seekBarLayoutWidth));
        const newPosition = percent * duration;
        runOnJS(onSeekUpdate)(newPosition);
      })
      .onEnd(() => {
        runOnJS(onSeekEnd)(seekPosition);
      }),
    Gesture.Tap().onEnd((e) => {
      const percent = Math.max(0, Math.min(1, e.x / seekBarLayoutWidth));
      const newPosition = percent * duration;
      runOnJS(onTap)(newPosition);
    })
  );

  return (
    <View
      className="absolute bottom-0 left-0 right-0 pb-8"
      style={{
        paddingLeft: Math.max(32, insets.left + 16),
        paddingRight: Math.max(32, insets.right + 16),
      }}
    >
      {/* Chapter navigation */}
      {chapters && chapters.length > 0 && onChapterSeek && (
        <View className="flex-row items-center justify-between mb-2">
          <CurrentChapterDisplay
            chapters={chapters}
            currentPositionMs={position}
            visible={true}
          />
          <ChapterNavigation
            chapters={chapters}
            currentPositionMs={position}
            onNavigate={onChapterSeek}
            accentColor={accentColor}
          />
        </View>
      )}

      {/* Seek bar */}
      <View className="flex-row items-center mb-3">
        <Text className="text-white text-sm font-medium w-14">
          {formatTime(isSeeking ? seekPosition : position)}
        </Text>

        <View className="flex-1 mx-4">
          <GestureDetector gesture={gesture}>
            <View
              className="h-10 justify-center"
              onLayout={(e) => setSeekBarLayoutWidth(e.nativeEvent.layout.width)}
            >
              {/* Track background */}
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 }}>
                {/* Progress */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    height: 6,
                    width: `${progressPercent}%`,
                    backgroundColor: accentColor,
                    borderRadius: 3,
                  }}
                />

                {/* Intro marker */}
                {introStart !== null && introStart !== undefined && introEnd !== null && introEnd !== undefined && duration > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      height: 6,
                      left: `${(introStart / duration) * 100}%`,
                      width: `${((introEnd - introStart) / duration) * 100}%`,
                      backgroundColor: '#FFD700',
                      borderRadius: 3,
                    }}
                  />
                )}

                {/* Credits marker */}
                {creditsStart !== null && creditsStart !== undefined && duration > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      height: 6,
                      left: `${(creditsStart / duration) * 100}%`,
                      width: `${((duration - creditsStart) / duration) * 100}%`,
                      backgroundColor: '#FF8C00',
                      borderRadius: 3,
                    }}
                  />
                )}

                {/* A-B loop marker */}
                {abLoop?.a !== null && abLoop?.a !== undefined && abLoop?.b !== null && abLoop?.b !== undefined && duration > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      height: 6,
                      left: `${(abLoop.a / duration) * 100}%`,
                      width: `${((abLoop.b - abLoop.a) / duration) * 100}%`,
                      backgroundColor: '#a855f7',
                      borderRadius: 3,
                      opacity: 0.7,
                    }}
                  />
                )}

                {/* A marker */}
                {abLoop?.a !== null && abLoop?.a !== undefined && duration > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: `${(abLoop.a / duration) * 100}%`,
                      marginLeft: -6,
                      width: 12,
                      height: 14,
                      backgroundColor: '#a855f7',
                      borderRadius: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>A</Text>
                  </View>
                )}

                {/* B marker */}
                {abLoop?.b !== null && abLoop?.b !== undefined && duration > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: `${(abLoop.b / duration) * 100}%`,
                      marginLeft: -6,
                      width: 12,
                      height: 14,
                      backgroundColor: '#a855f7',
                      borderRadius: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>B</Text>
                  </View>
                )}

                {/* Chapter markers */}
                {chapters && chapters.length > 1 && (
                  <ChapterMarkers
                    chapters={chapters}
                    duration={duration}
                    accentColor={accentColor}
                  />
                )}
              </View>

              {/* Seek thumb */}
              <Animated.View
                style={{
                  position: 'absolute',
                  left: `${progressPercent}%`,
                  marginLeft: -8,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#fff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                  transform: [{ scale: isSeeking ? 1.3 : 1 }],
                }}
              />

              {/* Trickplay preview */}
              {isSeeking && trickplayInfo && itemId && mediaSourceId && trickplayResolution && (
                <TrickplayPreview
                  itemId={itemId}
                  mediaSourceId={mediaSourceId}
                  trickplayInfo={trickplayInfo}
                  resolution={trickplayResolution}
                  position={seekPosition}
                  duration={duration}
                  seekBarWidth={seekBarLayoutWidth}
                  visible={true}
                  formatTime={formatTime}
                />
              )}

              {/* Time-only preview (when no trickplay) */}
              {isSeeking && !trickplayInfo && (
                <TimeOnlyPreview
                  position={seekPosition}
                  duration={duration}
                  seekBarWidth={seekBarLayoutWidth}
                  visible={true}
                  formatTime={formatTime}
                />
              )}
            </View>
          </GestureDetector>
        </View>

        <Text className="text-white/60 text-sm w-14 text-right">
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
}
