import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { formatPlayerTime, ticksToMs } from '@/utils';
import type { Chapter } from '@/hooks';

interface TVAudiobookChapterListProps {
  chapters: Chapter[];
  isLoadingChapters: boolean;
  currentChapter: Chapter | null;
  accentColor: string;
  handleChapterSelect: (chapter: Chapter) => Promise<void>;
}

export function TVAudiobookChapterList({
  chapters,
  isLoadingChapters,
  currentChapter,
  accentColor,
  handleChapterSelect,
}: TVAudiobookChapterListProps) {
  const { t } = useTranslation();
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  if (isLoadingChapters) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={styles.emptyStateText}>{t('player.loadingChapters')}</Text>
      </View>
    );
  }

  if (chapters.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="list" size={48} color="rgba(255,255,255,0.3)" />
        <Text style={styles.emptyStateText}>{t('player.noChapters')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.chapterList} showsVerticalScrollIndicator={false}>
      {chapters.map((chapter, index) => {
        const isCurrentChapter = currentChapter?.Id === chapter.Id;
        return (
          <Pressable
            key={chapter.Id}
            onPress={() => handleChapterSelect(chapter)}
            style={[
              styles.chapterItem,
              isCurrentChapter && { backgroundColor: 'rgba(255,255,255,0.1)' }
            ]}
          >
            <View style={[styles.chapterNumber, isCurrentChapter && { backgroundColor: accentColor }]}>
              <Text style={styles.chapterNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.chapterInfo}>
              <Text
                style={[styles.chapterName, isCurrentChapter && { color: accentColor }]}
                numberOfLines={1}
              >
                {hideMedia ? `Chapter ${index + 1}` : (chapter.Name || `Chapter ${index + 1}`)}
              </Text>
              <Text style={styles.chapterTime}>
                {formatPlayerTime(ticksToMs(chapter.StartPositionTicks))}
              </Text>
            </View>
            {isCurrentChapter && (
              <Ionicons name="volume-medium" size={20} color={accentColor} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginTop: 16,
  },
  chapterList: {
    maxHeight: 400,
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
    fontSize: 14,
    fontWeight: '600',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  chapterTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
});
