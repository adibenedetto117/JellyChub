import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Chapter, AudiobookModalView } from '@/hooks';

interface DesktopAudiobookControlsProps {
  playerState: string;
  audiobookSpeed: number;
  sleepTimeRemaining: number | null;
  accentColor: string;
  chapters: Chapter[];
  currentChapterIndex: number;
  showChapterList: boolean;
  itemBookmarksCount: number;
  playButtonScale: SharedValue<number>;
  handlePlayPause: () => void;
  handleSkip: (seconds: number) => Promise<void>;
  handleChapterSelect: (chapter: Chapter) => Promise<void>;
  setModalView: (view: AudiobookModalView) => void;
  setShowChapterList: (show: boolean | ((prev: boolean) => boolean)) => void;
}

export function DesktopAudiobookControls({
  playerState,
  audiobookSpeed,
  sleepTimeRemaining,
  accentColor,
  chapters,
  currentChapterIndex,
  showChapterList,
  itemBookmarksCount,
  playButtonScale,
  handlePlayPause,
  handleSkip,
  handleChapterSelect,
  setModalView,
  setShowChapterList,
}: DesktopAudiobookControlsProps) {
  const playButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  return (
    <>
      <View style={styles.quickActions}>
        <Pressable
          onPress={() => setModalView('speed')}
          style={[styles.quickActionButton, audiobookSpeed !== 1 && { backgroundColor: accentColor }]}
        >
          <Text style={styles.quickActionText}>{audiobookSpeed}x</Text>
        </Pressable>

        <Pressable
          onPress={() => setModalView('sleep')}
          style={[styles.quickActionButton, sleepTimeRemaining ? { backgroundColor: accentColor } : null]}
        >
          <Ionicons name="moon" size={18} color="#fff" />
          {sleepTimeRemaining ? (
            <Text style={styles.quickActionText}>{sleepTimeRemaining}m</Text>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => setModalView('bookmarks')}
          style={[styles.quickActionButton, itemBookmarksCount > 0 && { backgroundColor: accentColor + '40' }]}
        >
          <Ionicons name="bookmark" size={18} color="#fff" />
          {itemBookmarksCount > 0 && (
            <Text style={styles.quickActionText}>{itemBookmarksCount}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setShowChapterList(prev => !prev)}
          style={[styles.quickActionButton, showChapterList && { backgroundColor: accentColor }]}
        >
          <Ionicons name="list" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.playbackControls}>
        <Pressable
          onPress={() => {
            if (currentChapterIndex > 0) {
              handleChapterSelect(chapters[currentChapterIndex - 1]);
            }
          }}
          disabled={currentChapterIndex <= 0}
          style={[styles.chapterSkipButton, currentChapterIndex <= 0 && styles.disabledButton]}
        >
          <Ionicons name="play-skip-back" size={24} color={currentChapterIndex > 0 ? '#fff' : 'rgba(255,255,255,0.3)'} />
        </Pressable>

        <Pressable onPress={() => handleSkip(-30)} style={styles.skipButton}>
          <Ionicons name="play-back" size={20} color="#fff" />
          <Text style={styles.skipText}>30</Text>
        </Pressable>

        <Pressable onPress={() => handleSkip(-10)} style={styles.skipButtonSmall}>
          <Text style={styles.skipTextSmall}>10</Text>
        </Pressable>

        <Animated.View style={playButtonAnimatedStyle}>
          <Pressable onPress={handlePlayPause} style={styles.playButton}>
            {playerState === 'loading' || playerState === 'buffering' ? (
              <ActivityIndicator size="large" color="#000" />
            ) : (
              <Ionicons
                name={playerState === 'playing' ? 'pause' : 'play'}
                size={40}
                color="#000"
                style={{ marginLeft: playerState === 'playing' ? 0 : 4 }}
              />
            )}
          </Pressable>
        </Animated.View>

        <Pressable onPress={() => handleSkip(10)} style={styles.skipButtonSmall}>
          <Text style={styles.skipTextSmall}>10</Text>
        </Pressable>

        <Pressable onPress={() => handleSkip(30)} style={styles.skipButton}>
          <Text style={styles.skipText}>30</Text>
          <Ionicons name="play-forward" size={20} color="#fff" />
        </Pressable>

        <Pressable
          onPress={() => {
            if (currentChapterIndex < chapters.length - 1) {
              handleChapterSelect(chapters[currentChapterIndex + 1]);
            }
          }}
          disabled={currentChapterIndex >= chapters.length - 1 || chapters.length === 0}
          style={[styles.chapterSkipButton, (currentChapterIndex >= chapters.length - 1 || chapters.length === 0) && styles.disabledButton]}
        >
          <Ionicons name="play-skip-forward" size={24} color={currentChapterIndex < chapters.length - 1 ? '#fff' : 'rgba(255,255,255,0.3)'} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  chapterSkipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.4,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  skipButtonSmall: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  skipTextSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
});
