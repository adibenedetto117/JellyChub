import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Image, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue, withSpring, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { AudiobookPlayerCore, Chapter } from '@/hooks';
import { useSettingsStore } from '@/stores';
import { DesktopAudiobookInfo } from './DesktopAudiobookInfo';
import { DesktopAudiobookControls } from './DesktopAudiobookControls';
import { DesktopAudiobookProgress } from './DesktopAudiobookProgress';
import {
  DesktopAudiobookChapterList,
  DesktopAudiobookBookmarksModal,
  DesktopAudiobookSleepModal,
  DesktopAudiobookSpeedModal,
} from './DesktopAudiobookChapterList';

interface DesktopAudiobookPlayerProps {
  core: AudiobookPlayerCore;
}

export function DesktopAudiobookPlayer({ core }: DesktopAudiobookPlayerProps) {
  const { t } = useTranslation();
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  const {
    coverUrl,
    displayName,
    displayAuthor,
    playerState,
    localProgress,
    isSeeking,
    progressValue,
    remainingTime,
    chapters,
    isLoadingChapters,
    currentChapter,
    itemBookmarks,
    audiobookSpeed,
    sleepTimeRemaining,
    accentColor,
    downloaded,
    isDownloading,
    modalView,
    setModalView,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleChapterSelect,
    handleAddBookmark,
    handleBookmarkPress,
    handleRemoveBookmark,
    handleSetSleepTimer,
    handleSpeedChange,
    handleDownload,
    handleMinimize,
    getDisplayPosition,
    SPEED_OPTIONS,
    SLEEP_OPTIONS,
  } = core;

  const [showControls, setShowControls] = useState(true);
  const [showChapterList, setShowChapterList] = useState(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useSharedValue(1);
  const coverScale = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const progressBarRef = useRef<View | null>(null);

  useEffect(() => {
    coverScale.value = withSpring(playerState === 'playing' ? 1 : 0.95, { damping: 15 });
  }, [playerState, coverScale]);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    setShowControls(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });

    if (playerState === 'playing' && !showChapterList && modalView === 'none') {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
        controlsOpacity.value = withTiming(0, { duration: 300 });
      }, 4000);
    }
  }, [playerState, showChapterList, modalView, controlsOpacity]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          playButtonScale.value = withSequence(
            withSpring(0.85, { damping: 10 }),
            withSpring(1, { damping: 8 })
          );
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            if (currentChapter && chapters.length > 0) {
              const currentIndex = chapters.findIndex(c => c.Id === currentChapter.Id);
              if (currentIndex > 0) {
                handleChapterSelect(chapters[currentIndex - 1]);
              }
            }
          } else {
            handleSkip(e.ctrlKey || e.metaKey ? -30 : -10);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            if (currentChapter && chapters.length > 0) {
              const currentIndex = chapters.findIndex(c => c.Id === currentChapter.Id);
              if (currentIndex < chapters.length - 1) {
                handleChapterSelect(chapters[currentIndex + 1]);
              }
            }
          } else {
            handleSkip(e.ctrlKey || e.metaKey ? 30 : 10);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          const currentSpeedIndex = SPEED_OPTIONS.indexOf(audiobookSpeed as typeof SPEED_OPTIONS[number]);
          if (currentSpeedIndex < SPEED_OPTIONS.length - 1) {
            handleSpeedChange(SPEED_OPTIONS[currentSpeedIndex + 1]);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          const currSpeedIdx = SPEED_OPTIONS.indexOf(audiobookSpeed as typeof SPEED_OPTIONS[number]);
          if (currSpeedIdx > 0) {
            handleSpeedChange(SPEED_OPTIONS[currSpeedIdx - 1]);
          }
          break;
        case 'b':
          e.preventDefault();
          handleAddBookmark();
          break;
        case 'c':
          e.preventDefault();
          setShowChapterList(prev => !prev);
          break;
        case 's':
          e.preventDefault();
          setModalView(modalView === 'speed' ? 'none' : 'speed');
          break;
        case 't':
          e.preventDefault();
          setModalView(modalView === 'sleep' ? 'none' : 'sleep');
          break;
        case 'Escape':
          if (modalView !== 'none') {
            setModalView('none');
          } else if (showChapterList) {
            setShowChapterList(false);
          } else {
            handleMinimize();
          }
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) * 10;
          handleSeek((localProgress.duration * percent) / 100);
          break;
        case ',':
          e.preventDefault();
          handleSkip(-5);
          break;
        case '.':
          e.preventDefault();
          handleSkip(5);
          break;
        case '<':
          e.preventDefault();
          const slowerIndex = SPEED_OPTIONS.indexOf(audiobookSpeed as typeof SPEED_OPTIONS[number]);
          if (slowerIndex > 0) {
            handleSpeedChange(SPEED_OPTIONS[slowerIndex - 1]);
          }
          break;
        case '>':
          e.preventDefault();
          const fasterIndex = SPEED_OPTIONS.indexOf(audiobookSpeed as typeof SPEED_OPTIONS[number]);
          if (fasterIndex < SPEED_OPTIONS.length - 1) {
            handleSpeedChange(SPEED_OPTIONS[fasterIndex + 1]);
          }
          break;
        case '[':
          e.preventDefault();
          if (currentChapter && chapters.length > 0) {
            const idx = chapters.findIndex(c => c.Id === currentChapter.Id);
            if (idx > 0) {
              handleChapterSelect(chapters[idx - 1]);
            }
          }
          break;
        case ']':
          e.preventDefault();
          if (currentChapter && chapters.length > 0) {
            const idx = chapters.findIndex(c => c.Id === currentChapter.Id);
            if (idx < chapters.length - 1) {
              handleChapterSelect(chapters[idx + 1]);
            }
          }
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePlayPause,
    handleSkip,
    handleSeek,
    handleMinimize,
    handleChapterSelect,
    handleAddBookmark,
    handleSpeedChange,
    localProgress,
    audiobookSpeed,
    chapters,
    currentChapter,
    modalView,
    showChapterList,
    setModalView,
    SPEED_OPTIONS,
    playButtonScale,
    resetControlsTimeout,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = () => resetControlsTimeout();
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [resetControlsTimeout]);

  const handleProgressBarClick = useCallback((event: any) => {
    if (!progressBarRef.current) return;

    const rect = (event.target as HTMLElement)?.getBoundingClientRect?.();
    if (!rect) return;

    const x = event.nativeEvent?.pageX || event.pageX || 0;
    const relativeX = x - rect.left;
    const percent = Math.max(0, Math.min(1, relativeX / rect.width));
    const newPosition = percent * localProgress.duration;

    handleSeek(newPosition);
  }, [localProgress.duration, handleSeek]);

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const currentChapterIndex = useMemo(() => {
    if (!currentChapter || chapters.length === 0) return -1;
    return chapters.findIndex(c => c.Id === currentChapter.Id);
  }, [currentChapter, chapters]);

  return (
    <View style={styles.container}>
      {coverUrl && (
        <Image
          source={{ uri: coverUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          blurRadius={100}
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.mainContent}>
        <View style={[styles.leftPanel, showChapterList && styles.leftPanelWithSidebar]}>
          <Animated.View style={[styles.header, controlsStyle]}>
            <Pressable onPress={handleMinimize} style={styles.backButton}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerLabel}>{t('player.nowPlaying')}</Text>
              {currentChapter && (
                <Text style={styles.headerChapter} numberOfLines={1}>
                  {hideMedia ? `Chapter ${currentChapterIndex + 1}` : (currentChapter.Name || `Chapter ${currentChapterIndex + 1}`)}
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={handleDownload}
                disabled={!!downloaded || isDownloading}
                style={styles.headerButton}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : downloaded ? (
                  <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                ) : (
                  <Ionicons name="download-outline" size={22} color="#fff" />
                )}
              </Pressable>
            </View>
          </Animated.View>

          <DesktopAudiobookInfo
            coverUrl={coverUrl}
            displayName={displayName}
            displayAuthor={displayAuthor}
            coverScale={coverScale}
          />

          <Animated.View style={[styles.controlsContainer, controlsStyle]}>
            <DesktopAudiobookControls
              playerState={playerState}
              audiobookSpeed={audiobookSpeed}
              sleepTimeRemaining={sleepTimeRemaining}
              accentColor={accentColor}
              chapters={chapters}
              currentChapterIndex={currentChapterIndex}
              showChapterList={showChapterList}
              itemBookmarksCount={itemBookmarks.length}
              playButtonScale={playButtonScale}
              handlePlayPause={handlePlayPause}
              handleSkip={handleSkip}
              handleChapterSelect={handleChapterSelect}
              setModalView={setModalView}
              setShowChapterList={setShowChapterList}
            />

            <DesktopAudiobookProgress
              progressValue={progressValue}
              isSeeking={isSeeking}
              accentColor={accentColor}
              localProgress={localProgress}
              remainingTime={remainingTime}
              itemBookmarks={itemBookmarks}
              chapters={chapters}
              progressBarRef={progressBarRef}
              getDisplayPosition={getDisplayPosition}
              handleProgressBarClick={handleProgressBarClick}
            />
          </Animated.View>

          <View style={styles.shortcutsHint}>
            <Text style={styles.shortcutsText}>
              Space: Play/Pause | Arrows: Seek/Speed | B: Bookmark | C: Chapters | S: Speed | T: Timer | [ ]: Chapter Skip
            </Text>
          </View>
        </View>

        {showChapterList && (
          <DesktopAudiobookChapterList
            chapters={chapters}
            isLoadingChapters={isLoadingChapters}
            currentChapter={currentChapter}
            accentColor={accentColor}
            handleChapterSelect={handleChapterSelect}
            onClose={() => setShowChapterList(false)}
          />
        )}
      </View>

      <DesktopAudiobookBookmarksModal
        visible={modalView === 'bookmarks'}
        itemBookmarks={itemBookmarks}
        accentColor={accentColor}
        handleAddBookmark={handleAddBookmark}
        handleBookmarkPress={handleBookmarkPress}
        handleRemoveBookmark={handleRemoveBookmark}
        onClose={() => setModalView('none')}
      />

      <DesktopAudiobookSpeedModal
        visible={modalView === 'speed'}
        audiobookSpeed={audiobookSpeed}
        accentColor={accentColor}
        speedOptions={[...SPEED_OPTIONS]}
        handleSpeedChange={handleSpeedChange}
        onClose={() => setModalView('none')}
      />

      <DesktopAudiobookSleepModal
        visible={modalView === 'sleep'}
        sleepTimeRemaining={sleepTimeRemaining}
        accentColor={accentColor}
        sleepOptions={[...SLEEP_OPTIONS]}
        handleSetSleepTimer={handleSetSleepTimer}
        onClose={() => setModalView('none')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 1,
    paddingHorizontal: 48,
    paddingVertical: 24,
  },
  leftPanelWithSidebar: {
    flex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerChapter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    maxWidth: 300,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsContainer: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  shortcutsHint: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  shortcutsText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});

export default DesktopAudiobookPlayer;
