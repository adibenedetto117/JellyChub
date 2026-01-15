import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import type { Chapter } from '@/hooks';

interface TVAudiobookInfoProps {
  coverUrl: string | null;
  displayName: string;
  displayAuthor: string;
  currentChapter: Chapter | null;
  chapters: Chapter[];
  accentColor: string;
}

export function TVAudiobookInfo({
  coverUrl,
  displayName,
  displayAuthor,
  currentChapter,
  chapters,
  accentColor,
}: TVAudiobookInfoProps) {
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  return (
    <View style={styles.mainContent}>
      <View style={styles.coverSection}>
        <View style={styles.coverWrapper}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="book" size={100} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {displayAuthor}
          </Text>
          {currentChapter && (
            <Text style={[styles.chapter, { color: accentColor }]} numberOfLines={1}>
              {hideMedia ? `Chapter ${chapters.indexOf(currentChapter) + 1}` : (currentChapter.Name || 'Chapter')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 60,
    paddingBottom: 40,
    gap: 60,
  },
  coverSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverWrapper: {
    width: '80%',
    aspectRatio: 1,
    maxWidth: 400,
    maxHeight: 400,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 30,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 40,
  },
  titleSection: {
    marginBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  author: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 20,
    marginTop: 8,
  },
  chapter: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 12,
  },
});
