import { View, Text, Pressable, Modal, Image, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from '@/providers';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import type { AudiobookPlayerCore } from '@/hooks';
import { MobileAudiobookInfo } from './MobileAudiobookInfo';
import { MobileAudiobookControls } from './MobileAudiobookControls';
import { MobileAudiobookProgress } from './MobileAudiobookProgress';
import {
  MobileAudiobookChapterList,
  MobileAudiobookBookmarksList,
  MobileAudiobookSleepList,
  MobileAudiobookSpeedList,
} from './MobileAudiobookChapterList';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MobileAudiobookPlayerProps {
  core: AudiobookPlayerCore;
}

export function MobileAudiobookPlayer({ core }: MobileAudiobookPlayerProps) {
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
    coverScale,
    playButtonScale,
    translateY,
    modalTranslateY,
    seekGesture,
    dismissGesture,
    modalDismissGesture,
    handlePlayPause,
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

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const modalSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  return (
    <GestureDetector gesture={dismissGesture}>
      <Animated.View style={[styles.container, containerStyle]}>
        {coverUrl && (
          <Image
            source={{ uri: coverUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            blurRadius={80}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.98)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.content}>
          <View style={styles.dragHandle}>
            <View style={styles.dragHandleBar} />
          </View>

          <View style={styles.header}>
            <Pressable onPress={handleMinimize} style={styles.headerButton}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerLabel}>{t('player.nowPlaying')}</Text>
              {currentChapter && (
                <Text style={styles.headerChapter} numberOfLines={1}>
                  {hideMedia ? `Chapter ${chapters.indexOf(currentChapter) + 1}` : (currentChapter.Name || 'Chapter')}
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleDownload}
              disabled={!!downloaded || isDownloading}
              style={styles.headerButton}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : downloaded ? (
                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
              ) : (
                <Ionicons name="download-outline" size={24} color="#fff" />
              )}
            </Pressable>
          </View>

          <MobileAudiobookInfo
            coverUrl={coverUrl}
            displayName={displayName}
            displayAuthor={displayAuthor}
            coverScale={coverScale}
          />

          <View style={styles.controlsSection}>
            <MobileAudiobookProgress
              progressValue={progressValue}
              isSeeking={isSeeking}
              accentColor={accentColor}
              localProgress={localProgress}
              remainingTime={remainingTime}
              itemBookmarks={itemBookmarks}
              seekGesture={seekGesture}
              getDisplayPosition={getDisplayPosition}
            />

            <MobileAudiobookControls
              playerState={playerState}
              audiobookSpeed={audiobookSpeed}
              sleepTimeRemaining={sleepTimeRemaining}
              accentColor={accentColor}
              playButtonScale={playButtonScale}
              handlePlayPause={handlePlayPause}
              handleSkip={handleSkip}
              setModalView={setModalView}
            />
          </View>
        </SafeAreaView>

        <Modal
          visible={modalView !== 'none'}
          transparent
          animationType="fade"
          onRequestClose={() => setModalView('none')}
        >
          <GestureHandlerRootView style={styles.modalRoot}>
            <View style={styles.modalOverlay}>
              <Pressable style={styles.modalBackdrop} onPress={() => setModalView('none')} />
              <Animated.View style={[styles.modalSheet, modalSheetStyle]}>
                <GestureDetector gesture={modalDismissGesture}>
                  <View>
                    <View style={styles.modalHandle}>
                      <View style={styles.modalHandleBar} />
                    </View>
                    <Text style={styles.modalTitle}>
                      {modalView === 'chapters' && t('player.chapters')}
                      {modalView === 'bookmarks' && t('player.bookmarks')}
                      {modalView === 'sleep' && t('player.sleepTimer')}
                      {modalView === 'speed' && t('player.playbackSpeed')}
                    </Text>
                  </View>
                </GestureDetector>

                {modalView === 'chapters' && (
                  <MobileAudiobookChapterList
                    chapters={chapters}
                    isLoadingChapters={isLoadingChapters}
                    currentChapter={currentChapter}
                    accentColor={accentColor}
                    handleChapterSelect={handleChapterSelect}
                  />
                )}
                {modalView === 'bookmarks' && (
                  <MobileAudiobookBookmarksList
                    itemBookmarks={itemBookmarks}
                    accentColor={accentColor}
                    handleAddBookmark={handleAddBookmark}
                    handleBookmarkPress={handleBookmarkPress}
                    handleRemoveBookmark={handleRemoveBookmark}
                  />
                )}
                {modalView === 'sleep' && (
                  <MobileAudiobookSleepList
                    sleepTimeRemaining={sleepTimeRemaining}
                    accentColor={accentColor}
                    sleepOptions={[...SLEEP_OPTIONS]}
                    handleSetSleepTimer={handleSetSleepTimer}
                  />
                )}
                {modalView === 'speed' && (
                  <MobileAudiobookSpeedList
                    audiobookSpeed={audiobookSpeed}
                    accentColor={accentColor}
                    speedOptions={[...SPEED_OPTIONS]}
                    handleSpeedChange={handleSpeedChange}
                  />
                )}
              </Animated.View>
            </View>
          </GestureHandlerRootView>
        </Modal>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  dragHandle: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandleBar: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerChapter: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  controlsSection: {
    paddingBottom: 16,
  },
  modalRoot: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SCREEN_HEIGHT * 0.5,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  modalHandle: {
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
  },
  modalHandleBar: {
    width: 48,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
});
