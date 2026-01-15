import { View, Text, Pressable, ScrollView, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { formatPlayerTime, ticksToMs } from '@/utils';
import type { Chapter, AudiobookModalView } from '@/hooks';

interface DesktopAudiobookChapterListProps {
  chapters: Chapter[];
  isLoadingChapters: boolean;
  currentChapter: Chapter | null;
  accentColor: string;
  handleChapterSelect: (chapter: Chapter) => Promise<void>;
  onClose: () => void;
}

export function DesktopAudiobookChapterList({
  chapters,
  isLoadingChapters,
  currentChapter,
  accentColor,
  handleChapterSelect,
  onClose,
}: DesktopAudiobookChapterListProps) {
  const { t } = useTranslation();
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  return (
    <View style={styles.chapterSidebar}>
      <View style={styles.chapterSidebarHeader}>
        <Text style={styles.chapterSidebarTitle}>{t('player.chapters')}</Text>
        <Pressable onPress={onClose} style={styles.closeSidebarButton}>
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoadingChapters ? (
        <View style={styles.chapterLoadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.chapterLoadingText}>{t('player.loadingChapters')}</Text>
        </View>
      ) : chapters.length === 0 ? (
        <View style={styles.noChaptersContainer}>
          <Ionicons name="list" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.noChaptersText}>{t('player.noChapters')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.chapterScrollView} showsVerticalScrollIndicator={false}>
          {chapters.map((chapter, index) => {
            const isCurrentChapter = currentChapter?.Id === chapter.Id;
            return (
              <Pressable
                key={chapter.Id}
                onPress={() => handleChapterSelect(chapter)}
                style={[
                  styles.chapterItem,
                  isCurrentChapter && { backgroundColor: accentColor + '30' }
                ]}
              >
                <View style={[styles.chapterNumber, isCurrentChapter && { backgroundColor: accentColor }]}>
                  <Text style={styles.chapterNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.chapterInfo}>
                  <Text
                    style={[styles.chapterName, isCurrentChapter && { color: accentColor }]}
                    numberOfLines={2}
                  >
                    {hideMedia ? `Chapter ${index + 1}` : (chapter.Name || `Chapter ${index + 1}`)}
                  </Text>
                  <Text style={styles.chapterTime}>
                    {formatPlayerTime(ticksToMs(chapter.StartPositionTicks))}
                  </Text>
                </View>
                {isCurrentChapter && (
                  <Ionicons name="volume-medium" size={18} color={accentColor} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

interface Bookmark {
  id: string;
  name?: string;
  positionTicks: number;
}

interface DesktopAudiobookBookmarksModalProps {
  visible: boolean;
  itemBookmarks: Bookmark[];
  accentColor: string;
  handleAddBookmark: () => void;
  handleBookmarkPress: (positionTicks: number) => Promise<void>;
  handleRemoveBookmark: (id: string) => void;
  onClose: () => void;
}

export function DesktopAudiobookBookmarksModal({
  visible,
  itemBookmarks,
  accentColor,
  handleAddBookmark,
  handleBookmarkPress,
  handleRemoveBookmark,
  onClose,
}: DesktopAudiobookBookmarksModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('player.bookmarks')}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <Pressable
            onPress={handleAddBookmark}
            style={[styles.addBookmarkButton, { backgroundColor: accentColor }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBookmarkText}>{t('player.addBookmark')}</Text>
          </Pressable>

          <ScrollView style={styles.bookmarkList}>
            {itemBookmarks.length === 0 ? (
              <View style={styles.noBookmarksContainer}>
                <Ionicons name="bookmark" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={styles.noBookmarksText}>{t('player.noBookmarks')}</Text>
                <Text style={styles.noBookmarksSubtext}>Press B to add a bookmark</Text>
              </View>
            ) : (
              itemBookmarks.map((bookmark) => (
                <View key={bookmark.id} style={styles.bookmarkItem}>
                  <Pressable
                    style={styles.bookmarkContent}
                    onPress={() => {
                      handleBookmarkPress(bookmark.positionTicks);
                      onClose();
                    }}
                  >
                    <Ionicons name="bookmark" size={20} color={accentColor} style={styles.bookmarkIcon} />
                    <View style={styles.bookmarkInfo}>
                      <Text style={styles.bookmarkName}>{bookmark.name || 'Bookmark'}</Text>
                      <Text style={styles.bookmarkTime}>
                        {formatPlayerTime(ticksToMs(bookmark.positionTicks))}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => handleRemoveBookmark(bookmark.id)}
                    style={styles.removeBookmarkButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface SleepOption {
  label: string;
  minutes: number;
}

interface DesktopAudiobookSleepModalProps {
  visible: boolean;
  sleepTimeRemaining: number | null;
  accentColor: string;
  sleepOptions: SleepOption[];
  handleSetSleepTimer: (minutes: number) => void;
  onClose: () => void;
}

export function DesktopAudiobookSleepModal({
  visible,
  sleepTimeRemaining,
  accentColor,
  sleepOptions,
  handleSetSleepTimer,
  onClose,
}: DesktopAudiobookSleepModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.sleepModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('player.sleepTimer')}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {sleepTimeRemaining && sleepTimeRemaining > 0 && (
            <View style={[styles.currentTimerDisplay, { backgroundColor: accentColor + '30' }]}>
              <Ionicons name="moon" size={24} color={accentColor} />
              <Text style={[styles.currentTimerText, { color: accentColor }]}>
                Sleep in {sleepTimeRemaining} {sleepTimeRemaining === 1 ? 'minute' : 'minutes'}
              </Text>
            </View>
          )}

          <ScrollView style={styles.sleepOptionsList}>
            {sleepOptions.map((option) => {
              const isActive = (option.minutes === 0 && !sleepTimeRemaining) ||
                (option.minutes > 0 && sleepTimeRemaining === option.minutes);
              return (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    handleSetSleepTimer(option.minutes);
                    onClose();
                  }}
                  style={[
                    styles.sleepOption,
                    isActive && { backgroundColor: accentColor }
                  ]}
                >
                  <Text style={[styles.sleepOptionText, isActive && { color: '#fff' }]}>
                    {option.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={20} color="#fff" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface DesktopAudiobookSpeedModalProps {
  visible: boolean;
  audiobookSpeed: number;
  accentColor: string;
  speedOptions: number[];
  handleSpeedChange: (speed: number) => void;
  onClose: () => void;
}

export function DesktopAudiobookSpeedModal({
  visible,
  audiobookSpeed,
  accentColor,
  speedOptions,
  handleSpeedChange,
  onClose,
}: DesktopAudiobookSpeedModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.speedModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('player.playbackSpeed')}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.speedGrid}>
            {speedOptions.map((speed) => {
              const isActive = audiobookSpeed === speed;
              return (
                <Pressable
                  key={speed}
                  onPress={() => {
                    handleSpeedChange(speed);
                    onClose();
                  }}
                  style={[
                    styles.speedOption,
                    isActive && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                >
                  <Text style={[styles.speedOptionText, isActive && { color: '#fff', fontWeight: '700' }]}>
                    {speed}x
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.speedHint}>
            Use Up/Down arrows or {'<'} {'>'} keys to adjust
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chapterSidebar: {
    flex: 1,
    maxWidth: 400,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  chapterSidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  chapterSidebarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeSidebarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  chapterLoadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  noChaptersContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  noChaptersText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  chapterScrollView: {
    flex: 1,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  chapterNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  chapterNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  chapterTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBookmarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addBookmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bookmarkList: {
    maxHeight: 400,
  },
  noBookmarksContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noBookmarksText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  noBookmarksSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  bookmarkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkIcon: {
    marginRight: 14,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  bookmarkTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  removeBookmarkButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedModalContent: {
    maxWidth: 400,
  },
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 20,
  },
  speedOption: {
    width: 80,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  speedOptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  speedHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 20,
  },
  sleepModalContent: {
    maxWidth: 400,
  },
  currentTimerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    margin: 20,
    marginBottom: 0,
    paddingVertical: 16,
    borderRadius: 12,
  },
  currentTimerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sleepOptionsList: {
    maxHeight: 350,
    padding: 20,
  },
  sleepOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sleepOptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
});
