import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { formatPlayerTime, ticksToMs } from '@/utils';
import type { Chapter } from '@/hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Bookmark {
  id: string;
  name?: string;
  positionTicks: number;
}

interface MobileAudiobookChapterListProps {
  chapters: Chapter[];
  isLoadingChapters: boolean;
  currentChapter: Chapter | null;
  accentColor: string;
  handleChapterSelect: (chapter: Chapter) => Promise<void>;
}

export function MobileAudiobookChapterList({
  chapters,
  isLoadingChapters,
  currentChapter,
  accentColor,
  handleChapterSelect,
}: MobileAudiobookChapterListProps) {
  const { t } = useTranslation();
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  if (isLoadingChapters) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={styles.emptyStateText}>{t('player.loadingChapters')}</Text>
        <Text style={styles.emptyStateSubtext}>Parsing chapter data from file</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={chapters}
      keyExtractor={(c) => c.Id}
      style={{ maxHeight: SCREEN_HEIGHT * 0.55, flexGrow: 0 }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
      renderItem={({ item: chapter, index }) => {
        const isCurrentChapter = currentChapter?.Id === chapter.Id;
        return (
          <Pressable
            onPress={() => handleChapterSelect(chapter)}
            style={[
              styles.modalItem,
              isCurrentChapter && { backgroundColor: 'rgba(255,255,255,0.1)' }
            ]}
          >
            <View style={styles.chapterNumber}>
              <Text style={[styles.chapterNumberText, isCurrentChapter && { color: accentColor }]}>
                {index + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalItemTitle, isCurrentChapter && { color: accentColor }]} numberOfLines={1}>
                {hideMedia ? `Chapter ${index + 1}` : (chapter.Name || `Chapter ${index + 1}`)}
              </Text>
              <Text style={styles.modalItemSubtitle}>
                {formatPlayerTime(ticksToMs(chapter.StartPositionTicks))}
              </Text>
            </View>
            {isCurrentChapter && (
              <Ionicons name="volume-medium" size={20} color={accentColor} />
            )}
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="list" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyStateText}>{t('player.noChapters')}</Text>
          <Text style={styles.emptyStateSubtext}>This audiobook doesn't have chapter markers</Text>
        </View>
      }
    />
  );
}

interface MobileAudiobookBookmarksListProps {
  itemBookmarks: Bookmark[];
  accentColor: string;
  handleAddBookmark: () => void;
  handleBookmarkPress: (positionTicks: number) => Promise<void>;
  handleRemoveBookmark: (id: string) => void;
}

export function MobileAudiobookBookmarksList({
  itemBookmarks,
  accentColor,
  handleAddBookmark,
  handleBookmarkPress,
  handleRemoveBookmark,
}: MobileAudiobookBookmarksListProps) {
  const { t } = useTranslation();

  return (
    <View style={{ minHeight: SCREEN_HEIGHT * 0.35 }}>
      <Pressable
        onPress={handleAddBookmark}
        style={[styles.addBookmarkButton, { backgroundColor: accentColor }]}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addBookmarkText}>{t('player.addBookmark')}</Text>
      </Pressable>

      {itemBookmarks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyStateText}>{t('player.noBookmarks')}</Text>
          <Text style={styles.emptyStateSubtext}>Tap the button above to add one</Text>
        </View>
      ) : (
        <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.4 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {itemBookmarks.map((bookmark) => (
            <View key={bookmark.id} style={styles.modalItem}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => handleBookmarkPress(bookmark.positionTicks)}
              >
                <Text style={styles.modalItemTitle}>{bookmark.name || 'Bookmark'}</Text>
                <Text style={styles.modalItemSubtitle}>
                  {formatPlayerTime(ticksToMs(bookmark.positionTicks))}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleRemoveBookmark(bookmark.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.5)" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

interface SleepOption {
  label: string;
  minutes: number;
}

interface MobileAudiobookSleepListProps {
  sleepTimeRemaining: number | null;
  accentColor: string;
  sleepOptions: SleepOption[];
  handleSetSleepTimer: (minutes: number) => void;
}

export function MobileAudiobookSleepList({
  sleepTimeRemaining,
  accentColor,
  sleepOptions,
  handleSetSleepTimer,
}: MobileAudiobookSleepListProps) {
  return (
    <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
      {sleepOptions.map((option) => {
        const isActive = (option.minutes === 0 && !sleepTimeRemaining) ||
          (option.minutes > 0 && sleepTimeRemaining === option.minutes);
        return (
          <Pressable
            key={option.label}
            onPress={() => handleSetSleepTimer(option.minutes)}
            style={[styles.sleepOption, isActive && { backgroundColor: accentColor }]}
          >
            <Text style={[styles.sleepOptionText, isActive && { color: '#fff' }]}>
              {option.label}
            </Text>
            {isActive && <Ionicons name="checkmark" size={20} color="#fff" />}
          </Pressable>
        );
      })}

      {sleepTimeRemaining && sleepTimeRemaining > 0 && (
        <View style={styles.sleepStatus}>
          <Ionicons name="moon" size={20} color={accentColor} />
          <Text style={styles.sleepStatusText}>
            Sleep in {sleepTimeRemaining} {sleepTimeRemaining === 1 ? 'minute' : 'minutes'}
          </Text>
        </View>
      )}
    </View>
  );
}

interface MobileAudiobookSpeedListProps {
  audiobookSpeed: number;
  accentColor: string;
  speedOptions: number[];
  handleSpeedChange: (speed: number) => void;
}

export function MobileAudiobookSpeedList({
  audiobookSpeed,
  accentColor,
  speedOptions,
  handleSpeedChange,
}: MobileAudiobookSpeedListProps) {
  return (
    <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
      <View style={styles.speedGrid}>
        {speedOptions.map((speed) => {
          const isActive = audiobookSpeed === speed;
          return (
            <Pressable
              key={speed}
              onPress={() => handleSpeedChange(speed)}
              style={[
                styles.speedOption,
                isActive && { backgroundColor: accentColor, borderColor: accentColor }
              ]}
            >
              <Text style={[styles.speedOptionText, isActive && { color: '#fff' }]}>
                {speed}x
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    marginTop: 4,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalItemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalItemSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  chapterNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  chapterNumberText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  addBookmarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addBookmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sleepOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sleepOptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
  },
  sleepStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  sleepStatusText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  speedOption: {
    width: '30%',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  speedOptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
});
