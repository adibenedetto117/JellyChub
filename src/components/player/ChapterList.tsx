import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { memo, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, useAuthStore } from '@/stores';
import { ticksToMs, formatPlayerTime } from '@/utils';

export interface ChapterInfo {
  StartPositionTicks: number;
  Name?: string;
  ImageTag?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  chapters: ChapterInfo[];
  currentPositionMs: number;
  onSelectChapter: (positionMs: number) => void;
  itemId?: string;
}

function ChapterIcon({ size = 20 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.8, height: size * 0.6, borderWidth: 2, borderColor: '#fff', borderRadius: 2 }}>
        <View style={{ position: 'absolute', left: '33%', top: 0, bottom: 0, width: 1, backgroundColor: '#fff' }} />
        <View style={{ position: 'absolute', left: '66%', top: 0, bottom: 0, width: 1, backgroundColor: '#fff' }} />
      </View>
    </View>
  );
}

export const ChapterList = memo(function ChapterList({
  visible,
  onClose,
  chapters,
  currentPositionMs,
  onSelectChapter,
  itemId,
}: Props) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const activeServer = useAuthStore((s) => s.getActiveServer());
  const serverUrl = activeServer?.url;

  const currentChapterIndex = useMemo(() => {
    if (!chapters.length) return -1;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentPositionMs >= ticksToMs(chapters[i].StartPositionTicks)) {
        return i;
      }
    }
    return 0;
  }, [chapters, currentPositionMs]);

  const handleSelect = (chapter: ChapterInfo) => {
    onSelectChapter(ticksToMs(chapter.StartPositionTicks));
    onClose();
  };

  const getChapterImageUrl = (chapter: ChapterInfo, index: number) => {
    if (!serverUrl || !itemId || !chapter.ImageTag) return null;
    const apiKey = activeServer?.accessToken;
    return `${serverUrl}/Items/${itemId}/Images/Chapter/${index}?tag=${chapter.ImageTag}&maxWidth=200${apiKey ? `&api_key=${apiKey}` : ''}`;
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modal}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <ChapterIcon size={18} />
          </View>
          <Text style={styles.headerTitle}>Chapters</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeX}>
              <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
            </View>
          </Pressable>
        </View>

        <ScrollView style={styles.chapterList} showsVerticalScrollIndicator={false}>
          {chapters.map((chapter, index) => {
            const isCurrent = index === currentChapterIndex;
            const positionMs = ticksToMs(chapter.StartPositionTicks);
            const imageUrl = getChapterImageUrl(chapter, index);

            return (
              <Pressable
                key={index}
                onPress={() => handleSelect(chapter)}
                style={[
                  styles.chapterItem,
                  isCurrent && { backgroundColor: accentColor + '20' },
                ]}
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.chapterImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.chapterImage, styles.chapterImagePlaceholder]}>
                    <Ionicons name="film-outline" size={20} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                <View style={styles.chapterInfo}>
                  <Text
                    style={[styles.chapterName, isCurrent && { color: accentColor }]}
                    numberOfLines={2}
                  >
                    {chapter.Name || `Chapter ${index + 1}`}
                  </Text>
                  <Text style={styles.chapterTime}>
                    {formatPlayerTime(positionMs)}
                  </Text>
                </View>
                {isCurrent && (
                  <View style={[styles.nowPlaying, { backgroundColor: accentColor }]}>
                    <Ionicons name="play" size={10} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}

          {chapters.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No chapters available</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
});

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

interface CurrentChapterDisplayProps {
  chapters: ChapterInfo[];
  currentPositionMs: number;
  visible: boolean;
}

export const CurrentChapterDisplay = memo(function CurrentChapterDisplay({
  chapters,
  currentPositionMs,
  visible,
}: CurrentChapterDisplayProps) {
  const currentChapter = useMemo(() => {
    if (!chapters.length) return null;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentPositionMs >= ticksToMs(chapters[i].StartPositionTicks)) {
        return chapters[i];
      }
    }
    return chapters[0];
  }, [chapters, currentPositionMs]);

  if (!visible || !currentChapter?.Name) return null;

  return (
    <View style={styles.currentChapterContainer}>
      <Text style={styles.currentChapterText} numberOfLines={1}>
        {currentChapter.Name}
      </Text>
    </View>
  );
});

interface ChapterNavigationProps {
  chapters: ChapterInfo[];
  currentPositionMs: number;
  onNavigate: (positionMs: number) => void;
  accentColor: string;
}

export const ChapterNavigation = memo(function ChapterNavigation({
  chapters,
  currentPositionMs,
  onNavigate,
  accentColor,
}: ChapterNavigationProps) {
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!chapters.length) return { prevChapter: null, nextChapter: null };

    let currentIndex = -1;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentPositionMs >= ticksToMs(chapters[i].StartPositionTicks)) {
        currentIndex = i;
        break;
      }
    }

    const currentChapterStart = currentIndex >= 0 ? ticksToMs(chapters[currentIndex].StartPositionTicks) : 0;
    const timeSinceChapterStart = currentPositionMs - currentChapterStart;

    let prev = null;
    if (timeSinceChapterStart > 3000 && currentIndex >= 0) {
      prev = chapters[currentIndex];
    } else if (currentIndex > 0) {
      prev = chapters[currentIndex - 1];
    }

    const next = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

    return { prevChapter: prev, nextChapter: next };
  }, [chapters, currentPositionMs]);

  if (!chapters.length) return null;

  return (
    <View style={styles.navigationContainer}>
      <Pressable
        onPress={() => prevChapter && onNavigate(ticksToMs(prevChapter.StartPositionTicks))}
        style={[styles.navButton, !prevChapter && styles.navButtonDisabled]}
        disabled={!prevChapter}
      >
        <Ionicons
          name="play-skip-back"
          size={18}
          color={prevChapter ? accentColor : 'rgba(255,255,255,0.3)'}
        />
      </Pressable>
      <Pressable
        onPress={() => nextChapter && onNavigate(ticksToMs(nextChapter.StartPositionTicks))}
        style={[styles.navButton, !nextChapter && styles.navButtonDisabled]}
        disabled={!nextChapter}
      >
        <Ionicons
          name="play-skip-forward"
          size={18}
          color={nextChapter ? accentColor : 'rgba(255,255,255,0.3)'}
        />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modal: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLine: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  chapterList: {
    maxHeight: 500,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  chapterImage: {
    width: 80,
    height: 45,
    borderRadius: 6,
    marginRight: 14,
  },
  chapterImagePlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  nowPlaying: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
  },
  currentChapterContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    maxWidth: '60%',
  },
  currentChapterText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
});
