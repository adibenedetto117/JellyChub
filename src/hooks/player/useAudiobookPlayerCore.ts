import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useAuthStore, usePlayerStore, useSettingsStore, useDownloadStore } from '@/stores';
import { useReadingProgressStore } from '@/stores/readingProgressStore';
import { downloadManager } from '@/services';
import { getItem, getImageUrl, generatePlaySessionId, getBookDownloadUrl, reportPlaybackProgress } from '@/api';
import { formatPlayerTime, ticksToMs, msToTicks, getDisplayName, getDisplayImageUrl, getDisplayArtist, dismissModal } from '@/utils';
import { audioService, parseM4BChapters } from '@/services';
import {
  type Chapter,
  type AudiobookModalView,
  type AudiobookPlayerCore,
  SPEED_OPTIONS,
  SLEEP_OPTIONS,
} from './audiobook/types';

export type { Chapter, AudiobookModalView, AudiobookPlayerCore };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function useAudiobookPlayerCore(): AudiobookPlayerCore {
  const { t } = useTranslation();
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
  const audiobookSpeed = usePlayerStore((s) => s.audiobook.playbackSpeed);
  const audiobookSleepTimerEndTime = usePlayerStore((s) => s.audiobook.sleepTimerEndTime);

  const bookmarks = useReadingProgressStore((s) => s.bookmarks);
  const addBookmark = useReadingProgressStore((s) => s.addBookmark);
  const removeBookmark = useReadingProgressStore((s) => s.removeBookmark);
  const itemBookmarks = useMemo(() =>
    bookmarks.filter(b => b.itemId === itemId),
    [bookmarks, itemId]
  );

  // Local state
  const [localProgress, setLocalProgress] = useState({ position: 0, duration: 0 });
  const [playSessionId] = useState(() => generatePlaySessionId());
  const [modalView, setModalView] = useState<AudiobookModalView>('none');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  // Refs
  const seekPositionRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isInitializingRef = useRef(true);
  const chaptersParsedForRef = useRef<string | null>(null);
  const isSeekingRef = useRef(false);
  const currentPositionRef = useRef(0);
  const lastValidDisplayNameRef = useRef<string>('');
  const lastValidDisplayAuthorRef = useRef<string>('');
  isSeekingRef.current = isSeeking;

  // Animations
  const coverScale = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const modalTranslateY = useSharedValue(0);
  const seekProgress = useSharedValue(0);

  // Query
  const { data: item, isLoading } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId),
    enabled: !!userId && !!itemId,
  });

  // Derived values
  const rawCoverUrl = item?.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 800, tag: item.ImageTags.Primary })
    : null;
  const coverUrl = getDisplayImageUrl(item?.Id ?? '', rawCoverUrl, hideMedia, 'Primary');
  const rawDisplayName = item ? getDisplayName(item, hideMedia) : t('player.unknownTrack');
  const rawArtists = (item as any)?.Artists || [(item as any)?.AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const rawDisplayAuthor = displayArtists[0] ?? t('player.unknownArtist');

  if (rawDisplayName && rawDisplayName !== t('player.unknownTrack')) {
    lastValidDisplayNameRef.current = rawDisplayName;
  }
  if (rawDisplayAuthor && rawDisplayAuthor !== t('player.unknownArtist')) {
    lastValidDisplayAuthorRef.current = rawDisplayAuthor;
  }

  const displayName = lastValidDisplayNameRef.current || rawDisplayName;
  const displayAuthor = lastValidDisplayAuthorRef.current || rawDisplayAuthor;

  // Load chapters from item data or parse from M4B file
  useEffect(() => {
    if (!item) return;
    if (chaptersParsedForRef.current === item.Id) return;

    if (item.Chapters && item.Chapters.length > 0) {
      const itemChapters: Chapter[] = item.Chapters.map((ch: any, index: number) => ({
        Id: ch.ImageTag || `chapter-${index}`,
        Name: ch.Name || `Chapter ${index + 1}`,
        StartPositionTicks: ch.StartPositionTicks ?? 0,
      }));
      setChapters(itemChapters);
      chaptersParsedForRef.current = item.Id;
      return;
    }

    const container = item.MediaSources?.[0]?.Container?.toLowerCase();
    const isM4bOrM4a = container === 'm4b' || container === 'm4a' || container === 'mp4';

    if (!isM4bOrM4a) {
      chaptersParsedForRef.current = item.Id;
      return;
    }

    const parseChaptersFromFile = async () => {
      setIsLoadingChapters(true);
      try {
        const downloadUrl = getBookDownloadUrl(item.Id);
        const parsedChapters = await parseM4BChapters(downloadUrl);

        if (parsedChapters.length > 0) {
          const fileChapters: Chapter[] = parsedChapters.map((ch, index) => ({
            Id: `chapter-${index}`,
            Name: ch.name,
            StartPositionTicks: ch.startMs * 10000,
          }));
          setChapters(fileChapters);
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

  // Initial playback setup
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

      const localProgressData = useReadingProgressStore.getState().getProgress(item.Id);
      const localPosition = localProgressData?.position;
      const jellyfinPosition = ticksToMs(item.UserData?.PlaybackPositionTicks ?? 0);

      let resumePosition = bookmarkStartPosition ?? 0;
      if (!bookmarkStartPosition) {
        if (typeof localPosition === 'number' && localPosition > 0) {
          resumePosition = localPosition;
        } else if (jellyfinPosition > 0) {
          resumePosition = jellyfinPosition;
        }
      }

      const duration = ticksToMs(item.RunTimeTicks ?? 0);
      setLocalProgress({ position: resumePosition, duration });
      audioService.loadAndPlay(item, userId, resumePosition, 'audiobook');

      setTimeout(() => {
        const savedSpeed = usePlayerStore.getState().audiobook.playbackSpeed;
        if (savedSpeed !== 1) {
          audioService.setPlaybackRate(savedSpeed);
        }
        isInitializingRef.current = false;
      }, 500);
    }
  }, [item?.Id, userId, bookmarkStartPosition]);

  // Cover animation
  useEffect(() => {
    coverScale.value = withSpring(playerState === 'playing' ? 1 : 0.95, { damping: 15 });
  }, [playerState]);

  // Sync local progress from store
  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe(
      (state) => state.progress,
      (progress) => {
        if (!isSeekingRef.current && !isInitializingRef.current) {
          const validPosition = progress.position > 0 ? progress.position : currentPositionRef.current;
          if (progress.position > 0) {
            currentPositionRef.current = progress.position;
          }
          setLocalProgress({ position: validPosition, duration: progress.duration });
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

  // Save reading progress every 5 seconds
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

  // Callbacks
  const handleMinimize = useCallback(() => {
    dismissModal();
  }, []);

  const handleStop = useCallback(async () => {
    await audioService.stop();
    dismissModal();
  }, []);

  const handleDownload = useCallback(async () => {
    if (!item || !activeServerId || downloaded || isDownloading) return;
    try {
      await downloadManager.startDownload(item, activeServerId);
    } catch (error) {
      console.error('Failed to start download:', error);
    }
  }, [item, activeServerId, downloaded, isDownloading]);

  const handlePlayPause = useCallback(() => {
    playButtonScale.value = withSequence(
      withSpring(0.85, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );
    audioService.togglePlayPause();
  }, [playButtonScale]);

  const handleSeek = useCallback(async (position: number) => {
    const { progress } = usePlayerStore.getState();
    currentPositionRef.current = position;
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
    currentPositionRef.current = newPosition;
    seekProgress.value = newPosition;
    setLocalProgress({ position: newPosition, duration: progress.duration });
  }, [seekProgress]);

  const finishSeeking = useCallback(async () => {
    const finalPosition = seekPositionRef.current;
    await handleSeek(finalPosition);
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
    const currentPos = progress.position > 0 ? progress.position : currentPositionRef.current;
    const newPosition = Math.max(0, Math.min(progress.duration, currentPos + seconds * 1000));
    setIsSeeking(true);
    currentPositionRef.current = newPosition;
    setLocalProgress({ position: newPosition, duration: progress.duration });
    await audioService.seek(newPosition);
    setTimeout(() => setIsSeeking(false), 600);
  }, []);

  const handleChapterSelect = useCallback(async (chapter: Chapter) => {
    const position = ticksToMs(chapter.StartPositionTicks);
    const { progress } = usePlayerStore.getState();
    setIsSeeking(true);
    currentPositionRef.current = position;
    setLocalProgress({ position, duration: progress.duration });
    setModalView('none');
    await audioService.seek(position);
    setTimeout(() => setIsSeeking(false), 600);
  }, []);

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
    currentPositionRef.current = pos;
    setLocalProgress({ position: pos, duration: localProgress.duration });
    setModalView('none');
    await audioService.seek(pos);
    setTimeout(() => setIsSeeking(false), 600);
  }, [localProgress.duration]);

  const handleRemoveBookmark = useCallback((id: string) => {
    removeBookmark(id);
  }, [removeBookmark]);

  const handleSetSleepTimer = useCallback((minutes: number) => {
    const store = usePlayerStore.getState();
    if (minutes === 0) {
      store.setSleepTimer(undefined);
    } else {
      store.setSleepTimer(minutes);
    }
    setModalView('none');
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    audioService.setPlaybackRate(speed);
    usePlayerStore.getState().setPlaybackSpeed(speed);
    setModalView('none');
  }, []);

  // Helpers
  const getCurrentChapter = useCallback((): Chapter | null => {
    if (chapters.length === 0) return null;
    const positionTicks = localProgress.position * 10000;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (positionTicks >= chapters[i].StartPositionTicks) {
        return chapters[i];
      }
    }
    return chapters[0];
  }, [chapters, localProgress.position]);

  const getDisplayPosition = useCallback(() => {
    return isSeeking ? seekPositionRef.current : localProgress.position;
  }, [isSeeking, localProgress.position]);

  const progressValue = localProgress.duration > 0 ? getDisplayPosition() / localProgress.duration : 0;
  const remainingTime = localProgress.duration - getDisplayPosition();
  const currentChapter = getCurrentChapter();

  const sleepTimeRemaining = audiobookSleepTimerEndTime
    ? Math.max(0, Math.round((audiobookSleepTimerEndTime - Date.now()) / 60000))
    : null;

  // Dismiss gesture
  const dismissGesture = useMemo(() => Gesture.Pan()
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
    }), [translateY, handleMinimize]);

  // Modal dismiss gesture
  const modalDismissGesture = useMemo(() => Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      if (e.translationY > 0) {
        modalTranslateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 500) {
        modalTranslateY.value = withTiming(500, { duration: 200 });
        runOnJS(setModalView)('none');
      } else {
        modalTranslateY.value = withSpring(0, { damping: 20 });
      }
    }), [modalTranslateY]);

  return {
    // Data
    itemId,
    item,
    isLoading,
    coverUrl,
    displayName,
    displayAuthor,

    // Playback state
    playerState,
    localProgress,
    isSeeking,
    progressValue,
    remainingTime,

    // Chapters & bookmarks
    chapters,
    isLoadingChapters,
    currentChapter,
    itemBookmarks,

    // Settings
    audiobookSpeed,
    sleepTimeRemaining,
    accentColor,

    // Download state
    downloaded,
    isDownloading,

    // Modal state
    modalView,
    setModalView,

    // Animations
    coverScale,
    playButtonScale,
    translateY,
    modalTranslateY,
    seekProgress,

    // Gestures
    seekGesture,
    dismissGesture,
    modalDismissGesture,

    // Callbacks
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
    handleStop,

    // Helpers
    getDisplayPosition,

    // Constants
    SPEED_OPTIONS,
    SLEEP_OPTIONS,
  };
}
