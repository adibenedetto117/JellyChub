import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, Modal, Image, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore, usePlayerStore, useSettingsStore, useDownloadStore } from '@/stores';
import { useReadingProgressStore } from '@/stores/readingProgressStore';
import { downloadManager } from '@/services';
import { getItem, getImageUrl, generatePlaySessionId, getBookDownloadUrl, reportPlaybackProgress } from '@/api';
import { formatPlayerTime, ticksToMs, msToTicks, getDisplayName, getDisplayImageUrl, getDisplayArtist, goBack } from '@/utils';
import { audioService, parseM4BChapters } from '@/services';
import { colors } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_OPTIONS = [
  { label: 'Off', minutes: 0 },
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1.5 hours', minutes: 90 },
  { label: '2 hours', minutes: 120 },
];

interface Chapter {
  Id: string;
  Name: string;
  StartPositionTicks: number;
}

type ModalView = 'none' | 'chapters' | 'bookmarks' | 'sleep' | 'speed';

export default function AudiobookPlayerScreen() {
  const { itemId, startPosition } = useLocalSearchParams<{ itemId: string; startPosition?: string }>();
  const bookmarkStartPosition = startPosition ? parseInt(startPosition, 10) : undefined;
  const currentUser = useAuthStore((state) => state.currentUser);
  const activeServerId = useAuthStore((s) => s.activeServerId);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const getDownloadedItem = useDownloadStore((s) => s.getDownloadedItem);
  const getDownloadByItemId = useDownloadStore((s) => s.getDownloadByItemId);
  const userId = currentUser?.Id ?? '';

  // Download state
  const downloaded = getDownloadedItem(itemId ?? '');
  const downloadInProgress = getDownloadByItemId(itemId ?? '');
  const isDownloading = downloadInProgress?.status === 'downloading' || downloadInProgress?.status === 'pending';

  const playerState = usePlayerStore((s) => s.playerState);
  const setPlayerState = usePlayerStore((s) => s.setPlayerState);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setPlaybackSpeed = usePlayerStore((s) => s.setPlaybackSpeed);
  const audiobookSpeed = usePlayerStore((s) => s.audiobook.playbackSpeed);
  const audiobookSleepTimerEndTime = usePlayerStore((s) => s.audiobook.sleepTimerEndTime);

  const bookmarks = useReadingProgressStore((s) => s.bookmarks);
  const addBookmark = useReadingProgressStore((s) => s.addBookmark);
  const removeBookmark = useReadingProgressStore((s) => s.removeBookmark);
  const itemBookmarks = useMemo(() =>
    bookmarks.filter(b => b.itemId === itemId),
    [bookmarks, itemId]
  );

  // Local state for progress to avoid constant re-renders from store
  const [localProgress, setLocalProgress] = useState({ position: 0, duration: 0 });

  const [playSessionId] = useState(() => generatePlaySessionId());
  const lastSaveTimeRef = useRef(0);
  const [modalView, setModalView] = useState<ModalView>('none');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const seekPositionRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isInitializingRef = useRef(true);

  const coverScale = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const modalTranslateY = useSharedValue(0);
  const seekProgress = useSharedValue(0);

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId),
    enabled: !!userId && !!itemId,
  });

  const rawCoverUrl = item?.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 800, tag: item.ImageTags.Primary })
    : null;
  const coverUrl = getDisplayImageUrl(item?.Id ?? '', rawCoverUrl, hideMedia, 'Primary');

  const displayName = item ? getDisplayName(item, hideMedia) : 'Unknown';
  const rawArtists = (item as any)?.Artists || [(item as any)?.AlbumArtist || 'Unknown Author'];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const displayAuthor = displayArtists[0] ?? 'Unknown Author';

  // Track if we've already parsed chapters for this item
  const chaptersParsedForRef = useRef<string | null>(null);

  // Load chapters from item data or parse from M4B file
  useEffect(() => {
    if (!item) return;

    // Don't re-parse if we already did for this item
    if (chaptersParsedForRef.current === item.Id) return;

    // First check if Jellyfin provides chapters
    if (item.Chapters && item.Chapters.length > 0) {
      const itemChapters: Chapter[] = item.Chapters.map((ch, index) => ({
        Id: ch.ImageTag || `chapter-${index}`,
        Name: ch.Name || `Chapter ${index + 1}`,
        StartPositionTicks: ch.StartPositionTicks ?? 0,
      }));
      setChapters(itemChapters);
      chaptersParsedForRef.current = item.Id;
      return;
    }

    // If no Jellyfin chapters, try to parse from M4B/M4A file directly
    // MP3 files don't have embedded chapters in the same format
    const container = item.MediaSources?.[0]?.Container?.toLowerCase();
    const isM4bOrM4a = container === 'm4b' || container === 'm4a' || container === 'mp4';

    if (!isM4bOrM4a) {
      console.log(`Skipping chapter parsing for container type: ${container}`);
      chaptersParsedForRef.current = item.Id;
      return;
    }

    const parseChaptersFromFile = async () => {
      setIsLoadingChapters(true);
      try {
        // Use direct download URL to get the original file (not transcoded)
        const downloadUrl = getBookDownloadUrl(item.Id);
        console.log('Attempting to parse chapters from M4B file:', downloadUrl);
        const parsedChapters = await parseM4BChapters(downloadUrl);

        if (parsedChapters.length > 0) {
          const fileChapters: Chapter[] = parsedChapters.map((ch, index) => ({
            Id: `chapter-${index}`,
            Name: ch.name,
            StartPositionTicks: ch.startMs * 10000, // Convert ms to ticks
          }));
          setChapters(fileChapters);
          console.log(`Loaded ${fileChapters.length} chapters from M4B file`);
          // Debug: log first few chapters with their positions
          fileChapters.slice(0, 5).forEach((ch, i) => {
            console.log(`  Chapter ${i + 1}: "${ch.Name}" at ${ch.StartPositionTicks} ticks (${ticksToMs(ch.StartPositionTicks)}ms)`);
          });
        }
        chaptersParsedForRef.current = item.Id;
      } catch (error) {
        console.log('Could not parse chapters from file:', error);
      } finally {
        setIsLoadingChapters(false);
      }
    };

    parseChaptersFromFile();
  }, [item?.Id, item?.Chapters]);


  useEffect(() => {
    if (item && userId && !hasLoadedRef.current) {
      const currentlyPlayingId = audioService.getCurrentItemId();
      if (currentlyPlayingId === item.Id && !bookmarkStartPosition) {
        hasLoadedRef.current = true;
        isInitializingRef.current = false;
        const { progress } = usePlayerStore.getState();
        setLocalProgress({ position: progress.position, duration: progress.duration });
        return;
      }
      hasLoadedRef.current = true;

      // Check local store first, then Jellyfin's position
      const localProgress = useReadingProgressStore.getState().getProgress(item.Id);
      const localPosition = localProgress?.position;
      const jellyfinPosition = ticksToMs(item.UserData?.PlaybackPositionTicks ?? 0);

      // Use bookmark position first, then local store, then Jellyfin
      let resumePosition = bookmarkStartPosition ?? 0;
      if (!bookmarkStartPosition) {
        // Prefer local store if it has a position (more recent)
        if (typeof localPosition === 'number' && localPosition > 0) {
          resumePosition = localPosition;
        } else if (jellyfinPosition > 0) {
          resumePosition = jellyfinPosition;
        }
      }

      const duration = ticksToMs(item.RunTimeTicks ?? 0);
      setLocalProgress({ position: resumePosition, duration });
      audioService.loadAndPlay(item, userId, resumePosition, 'audiobook');

      // Apply saved playback speed and enable store sync after player is ready
      setTimeout(() => {
        const savedSpeed = usePlayerStore.getState().audiobook.playbackSpeed;
        if (savedSpeed !== 1) {
          audioService.setPlaybackRate(savedSpeed);
        }
        isInitializingRef.current = false;
      }, 500);
    }
  }, [item?.Id, userId, bookmarkStartPosition]);

  useEffect(() => {
    coverScale.value = withSpring(playerState === 'playing' ? 1 : 0.95, { damping: 15 });
  }, [playerState]);

  // Sync local progress from store (audioService updates the store)
  const isSeekingRef = useRef(false);
  isSeekingRef.current = isSeeking;

  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe(
      (state) => state.progress,
      (progress) => {
        if (!isSeekingRef.current && !isInitializingRef.current) {
          setLocalProgress({ position: progress.position, duration: progress.duration });
        }
      }
    );

    return unsubscribe;
  }, []);

  // Handle sleep timer
  useEffect(() => {
    if (!audiobookSleepTimerEndTime) return;

    const interval = setInterval(() => {
      if (Date.now() >= audiobookSleepTimerEndTime) {
        audioService.pause();
        usePlayerStore.getState().setSleepTimer(undefined);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [audiobookSleepTimerEndTime]);

  // Save reading progress to local store and sync to server every 5 seconds
  useEffect(() => {
    if (!item) return;

    const interval = setInterval(() => {
      const { progress, playerState } = usePlayerStore.getState();
      if (progress.duration === 0) return;

      const author = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0];
      useReadingProgressStore.getState().updateProgress(item.Id, {
        itemId: item.Id,
        itemName: item.Name ?? 'Unknown',
        itemType: 'AudioBook',
        coverImageTag: item.ImageTags?.Primary,
        author,
        position: progress.position,
        total: progress.duration,
      });

      // Sync progress to Jellyfin server
      reportPlaybackProgress({
        ItemId: item.Id,
        MediaSourceId: item.Id,
        PositionTicks: msToTicks(progress.position),
        IsPaused: playerState !== 'playing',
        IsMuted: false,
        PlaySessionId: playSessionId,
      }).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [item, playSessionId]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (!item) return;
      const { progress } = usePlayerStore.getState();
      if (progress.duration === 0) return;
      const author = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0];
      useReadingProgressStore.getState().updateProgress(item.Id, {
        itemId: item.Id,
        itemName: item.Name ?? 'Unknown',
        itemType: 'AudioBook',
        coverImageTag: item.ImageTags?.Primary,
        author,
        position: progress.position,
        total: progress.duration,
      });
    };
  }, [item]);

  const handleMinimize = () => {
    goBack('/(tabs)/home');
  };

  const handleStop = async () => {
    await audioService.stop();
    goBack('/(tabs)/home');
  };

  const handleDownload = useCallback(async () => {
    if (!item || !activeServerId || downloaded || isDownloading) return;
    try {
      await downloadManager.startDownload(item, activeServerId);
    } catch (error) {
      console.error('Failed to start download:', error);
    }
  }, [item, activeServerId, downloaded, isDownloading]);

  const handlePlayPause = () => {
    playButtonScale.value = withSequence(
      withSpring(0.85, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );

    audioService.togglePlayPause();
  };

  const handleSeek = useCallback(async (position: number) => {
    const { progress } = usePlayerStore.getState();
    setLocalProgress({ position, duration: progress.duration });
    await audioService.seek(position);
  }, []);

  const startSeeking = useCallback(() => {
    const { progress, playerState: currentState } = usePlayerStore.getState();
    wasPlayingRef.current = currentState === 'playing';
    if (wasPlayingRef.current) {
      audioService.pause();
    }
    setIsSeeking(true);
    seekPositionRef.current = progress.position;
    seekProgress.value = progress.position;
  }, [seekProgress]);

  const updateSeekPosition = useCallback((x: number) => {
    const { progress } = usePlayerStore.getState();
    const barWidth = SCREEN_WIDTH - 48;
    const percent = Math.max(0, Math.min(1, x / barWidth));
    const newPosition = percent * progress.duration;
    seekPositionRef.current = newPosition;
    seekProgress.value = newPosition;
    setLocalProgress({ position: newPosition, duration: progress.duration });
  }, [seekProgress]);

  const finishSeeking = useCallback(async () => {
    const finalPosition = seekPositionRef.current;
    await handleSeek(finalPosition);
    // Wait for the player to catch up before allowing store updates
    await new Promise((r) => setTimeout(r, 600));
    setIsSeeking(false);
    if (wasPlayingRef.current) {
      audioService.play();
    }
  }, [handleSeek]);

  const seekGesture = useMemo(() => Gesture.Pan()
    .activateAfterLongPress(0)
    .minDistance(0)
    .onStart((e) => {
      runOnJS(startSeeking)();
      runOnJS(updateSeekPosition)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(updateSeekPosition)(e.x);
    })
    .onEnd(() => {
      runOnJS(finishSeeking)();
    }), [startSeeking, updateSeekPosition, finishSeeking]);

  const handleSkip = useCallback(async (seconds: number) => {
    const { progress } = usePlayerStore.getState();
    const newPosition = Math.max(0, Math.min(progress.duration, progress.position + seconds * 1000));
    setIsSeeking(true);
    setLocalProgress({ position: newPosition, duration: progress.duration });
    await audioService.seek(newPosition);
    setTimeout(() => setIsSeeking(false), 600);
  }, []);

  const handleChapterSelect = async (chapter: Chapter) => {
    const position = ticksToMs(chapter.StartPositionTicks);
    console.log(`Seeking to chapter "${chapter.Name}", StartPositionTicks: ${chapter.StartPositionTicks}, position ms: ${position}`);
    const { progress } = usePlayerStore.getState();
    setIsSeeking(true); // Prevent store updates from overwriting our position
    setLocalProgress({ position, duration: progress.duration });
    setModalView('none');
    await audioService.seek(position);
    // Wait a bit for the player to catch up before allowing store updates
    setTimeout(() => setIsSeeking(false), 600);
  };

  const handleAddBookmark = useCallback(() => {
    if (!item) return;
    const pos = localProgress.position;
    addBookmark({
      itemId: item.Id,
      bookTitle: displayName,
      positionTicks: pos * 10000,
      name: `Bookmark at ${formatPlayerTime(pos)}`,
    });
  }, [item, localProgress.position, addBookmark, displayName]);

  const handleBookmarkPress = useCallback(async (positionTicks: number) => {
    const pos = ticksToMs(positionTicks);
    setIsSeeking(true);
    setLocalProgress({ position: pos, duration: localProgress.duration });
    setModalView('none');
    await audioService.seek(pos);
    setTimeout(() => setIsSeeking(false), 600);
  }, [localProgress.duration]);

  const handleRemoveBookmark = useCallback((id: string) => {
    removeBookmark(id);
  }, [removeBookmark]);

  const handleSetSleepTimer = (minutes: number) => {
    const store = usePlayerStore.getState();
    if (minutes === 0) {
      store.setSleepTimer(undefined);
    } else {
      store.setSleepTimer(minutes);
    }
    setModalView('none');
  };

  const getCurrentChapter = (): Chapter | null => {
    if (chapters.length === 0) return null;
    const positionTicks = localProgress.position * 10000;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (positionTicks >= chapters[i].StartPositionTicks) {
        return chapters[i];
      }
    }
    return chapters[0];
  };

  const getDisplayPosition = () => {
    return isSeeking ? seekPositionRef.current : localProgress.position;
  };
  const progressValue = localProgress.duration > 0 ? getDisplayPosition() / localProgress.duration : 0;
  const remainingTime = localProgress.duration - getDisplayPosition();
  const currentChapter = getCurrentChapter();

  const sleepTimeRemaining = audiobookSleepTimerEndTime
    ? Math.max(0, Math.round((audiobookSleepTimerEndTime - Date.now()) / 60000))
    : null;

  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coverScale.value }],
  }));

  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const modalSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const dismissGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 500) {
        translateY.value = withTiming(500, { duration: 200 });
        runOnJS(handleMinimize)();
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
    });

  const modalGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        modalTranslateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 400) {
        modalTranslateY.value = withTiming(400, { duration: 200 });
        runOnJS(setModalView)('none');
      } else {
        modalTranslateY.value = withSpring(0, { damping: 20 });
      }
    });

  useEffect(() => {
    if (modalView !== 'none') {
      modalTranslateY.value = 0;
    }
  }, [modalView]);

  const renderChaptersModal = () => {
    if (isLoadingChapters) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.emptyStateText}>Loading chapters...</Text>
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
            <Text style={styles.emptyStateText}>No chapters found</Text>
            <Text style={styles.emptyStateSubtext}>This audiobook doesn't have chapter markers</Text>
          </View>
        }
      />
    );
  };

  const renderBookmarksModal = () => (
    <View style={{ minHeight: SCREEN_HEIGHT * 0.35 }}>
      <Pressable
        onPress={handleAddBookmark}
        style={[styles.addBookmarkButton, { backgroundColor: accentColor }]}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addBookmarkText}>Add Bookmark</Text>
      </Pressable>

      {itemBookmarks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyStateText}>No bookmarks yet</Text>
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

  const renderSleepModal = () => (
    <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
      {SLEEP_OPTIONS.map((option) => {
        const isActive = (option.minutes === 0 && !audiobookSleepTimerEndTime) ||
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

  const renderSpeedModal = () => (
    <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
      <View style={styles.speedGrid}>
        {SPEED_OPTIONS.map((speed) => {
          const isActive = audiobookSpeed === speed;
          return (
            <Pressable
              key={speed}
              onPress={() => {
                setPlaybackSpeed(speed);
                audioService.setPlaybackRate(speed);
                setModalView('none');
              }}
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

  return (
    <GestureDetector gesture={dismissGesture}>
      <Animated.View style={[{ flex: 1, backgroundColor: '#000' }, containerStyle]}>
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

        <SafeAreaView style={{ flex: 1 }}>
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <View style={styles.dragHandleBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleMinimize} style={styles.headerButton}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerLabel}>Now Playing</Text>
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

          {/* Cover Art */}
          <View style={styles.coverContainer}>
            <Animated.View style={coverStyle}>
              <View style={styles.coverWrapper}>
                {coverUrl ? (
                  <Image
                    source={{ uri: coverUrl }}
                    style={styles.cover}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Ionicons name="book" size={80} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
              </View>
            </Animated.View>

            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {displayName}
              </Text>
              <Text style={styles.author} numberOfLines={1}>
                {displayAuthor}
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            {/* Quick Actions */}
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
                style={styles.quickActionButton}
              >
                <Ionicons name="bookmark" size={18} color="#fff" />
              </Pressable>

              <Pressable
                onPress={() => setModalView('chapters')}
                style={styles.quickActionButton}
              >
                <Ionicons name="list" size={18} color="#fff" />
              </Pressable>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <GestureDetector gesture={seekGesture}>
                <Animated.View style={styles.progressTouchArea}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressValue * 100}%`, backgroundColor: accentColor }]} />
                    {/* Bookmark markers */}
                    {itemBookmarks.map((bookmark) => {
                      const bookmarkPosition = ticksToMs(bookmark.positionTicks);
                      const bookmarkPercent = localProgress.duration > 0
                        ? (bookmarkPosition / localProgress.duration) * 100
                        : 0;
                      return (
                        <View
                          key={bookmark.id}
                          style={{
                            position: 'absolute',
                            left: `${bookmarkPercent}%`,
                            top: 0,
                            width: 3,
                            height: '100%',
                            backgroundColor: '#FFD700',
                            borderRadius: 1,
                            marginLeft: -1.5,
                          }}
                        />
                      );
                    })}
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      left: `${progressValue * 100}%`,
                      top: 10,
                      marginLeft: -10,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: isSeeking ? '#fff' : accentColor,
                      borderWidth: 2,
                      borderColor: 'rgba(0,0,0,0.3)',
                    }}
                  />
                </Animated.View>
              </GestureDetector>
              <View style={styles.progressLabels}>
                <Text style={styles.progressTime}>{formatPlayerTime(getDisplayPosition())}</Text>
                <Text style={styles.progressTime}>-{formatPlayerTime(remainingTime)}</Text>
              </View>
            </View>

            {/* Playback Controls */}
            <View style={styles.playbackControls}>
              <Pressable onPress={() => handleSkip(-30)} style={styles.skipButton}>
                <Ionicons name="play-back" size={20} color="#fff" />
                <Text style={styles.skipText}>30</Text>
              </Pressable>

              <Pressable onPress={() => handleSkip(-10)} style={styles.skipButtonSmall}>
                <Text style={styles.skipTextSmall}>10</Text>
              </Pressable>

              <Animated.View style={playButtonStyle}>
                <Pressable onPress={handlePlayPause} style={styles.playButton}>
                  {playerState === 'loading' || playerState === 'buffering' ? (
                    <ActivityIndicator size="large" color="#000" />
                  ) : (
                    <Ionicons
                      name={playerState === 'playing' ? 'pause' : 'play'}
                      size={36}
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
            </View>
          </View>
        </SafeAreaView>

        {/* Modal */}
        <Modal
          visible={modalView !== 'none'}
          transparent
          animationType="fade"
          onRequestClose={() => setModalView('none')}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <Pressable style={{ flex: 1 }} onPress={() => setModalView('none')} />
              <Animated.View style={[styles.modalSheet, modalSheetStyle]}>
                {/* Only the handle area is swipeable to dismiss */}
                <GestureDetector gesture={modalGesture}>
                  <View>
                    <View style={styles.modalHandle}>
                      <View style={styles.modalHandleBar} />
                    </View>
                    <Text style={styles.modalTitle}>
                      {modalView === 'chapters' && 'Chapters'}
                      {modalView === 'bookmarks' && 'Bookmarks'}
                      {modalView === 'sleep' && 'Sleep Timer'}
                      {modalView === 'speed' && 'Playback Speed'}
                    </Text>
                  </View>
                </GestureDetector>

                {/* Content area - scrollable */}
                {modalView === 'chapters' && renderChaptersModal()}
                {modalView === 'bookmarks' && renderBookmarksModal()}
                {modalView === 'sleep' && renderSleepModal()}
                {modalView === 'speed' && renderSpeedModal()}
              </Animated.View>
            </View>
          </GestureHandlerRootView>
        </Modal>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
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
  coverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  coverWrapper: {
    width: SCREEN_WIDTH - 100,
    height: SCREEN_WIDTH - 100,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 32,
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
  titleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  author: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginTop: 4,
  },
  controlsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressTouchArea: {
    height: 36,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  skipButtonSmall: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipTextSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    width: (SCREEN_WIDTH - 48 - 20) / 3,
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
