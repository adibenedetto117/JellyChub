import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Dimensions, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useAuthStore, usePlayerStore, useSettingsStore, useDownloadStore } from '@/stores';
import { audioService, downloadManager } from '@/services';
import {
  getItem,
  getImageUrl,
  markAsFavorite,
  jellyfinClient,
  getPlaylists,
  addToPlaylist,
  getInstantMix,
} from '@/api';
import { formatPlayerTime, ticksToMs, getDisplayName, getDisplayArtist, getDisplayImageUrl, dismissModal, navigateToDetails } from '@/utils';
import type { VideoSleepTimer } from '@/types/player';
import type { LyricLine, MusicPlayerCore } from './music/types';

export type { MusicPlayerCore };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function useMusicPlayerCore(): MusicPlayerCore {
  const { t } = useTranslation();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const activeServerId = useAuthStore((state) => state.activeServerId);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const queryClient = useQueryClient();
  const userId = currentUser?.Id ?? '';

  // Download status
  const downloadStatus = useDownloadStore((state) => {
    const download = state.downloads.find((d) => d.itemId === itemId);
    return download?.status ?? null;
  });
  const downloadProgress = useDownloadStore((state) => {
    const download = state.downloads.find((d) => d.itemId === itemId);
    return download?.progress ?? 0;
  });
  const isDownloaded = downloadStatus === 'completed';
  const isDownloading = downloadStatus === 'downloading' || downloadStatus === 'pending';

  const {
    playerState,
    progress,
    music,
    currentItem,
    cycleShuffleMode,
    cycleRepeatMode,
    setShowLyrics,
    addToPlayNext,
    setMusicSleepTimer,
    setQueue,
  } = usePlayerStore();

  // Local state
  const [isFavorite, setIsFavorite] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [localProgress, setLocalProgress] = useState({ position: 0, duration: 0 });
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Refs
  const hasStartedPlayback = useRef(false);
  const seekPositionRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const lyricsScrollRef = useRef<any>(null);
  isSeekingRef.current = isSeeking;

  // Animations
  const albumScale = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const modalTranslateY = useSharedValue(0);
  const playlistPickerTranslateY = useSharedValue(0);
  const seekProgress = useSharedValue(0);

  // Queries
  const { data: playlists } = useQuery({
    queryKey: ['playlists', userId],
    queryFn: () => getPlaylists(userId),
    enabled: !!userId && showPlaylistPicker,
  });

  const { data: queriedItem, isLoading } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId),
    enabled: !!userId && !!itemId,
  });

  // Use currentItem from store (updates on track change) or fall back to queried item
  const item = currentItem?.item ?? queriedItem;

  // Mutations
  const addToPlaylistMutation = useMutation({
    mutationFn: ({ playlistId, itemId }: { playlistId: string; itemId: string }) =>
      addToPlaylist(playlistId, [itemId], userId),
    onSuccess: (_data, variables) => {
      const playlist = playlists?.Items?.find((p: any) => p.Id === variables.playlistId);
      setShowPlaylistPicker(false);
      setAddedToast(playlist?.Name ?? 'Playlist');
      setTimeout(() => setAddedToast(null), 2500);
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlistTracks'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add to playlist');
    },
  });

  const instantMixMutation = useMutation({
    mutationFn: async () => {
      if (!item?.Id) throw new Error('No item');
      const result = await getInstantMix(item.Id, userId, 50);
      return result.Items ?? [];
    },
    onSuccess: (tracks) => {
      if (tracks.length === 0) {
        Alert.alert('No Mix Found', 'Could not generate an instant mix for this track.');
        return;
      }

      const queueItems = tracks.map((track: any, index: number) => ({
        id: track.Id,
        item: track,
        index,
      }));

      setQueue(queueItems, 0);
      audioService.loadAndPlay(tracks[0], userId);

      setShowOptions(false);
      setAddedToast('Instant Mix');
      setTimeout(() => setAddedToast(null), 2500);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to generate instant mix');
    },
  });

  // Derived values
  const getAlbumArtUrl = useCallback(() => {
    if (!item) return null;

    let rawUrl: string | null = null;

    if (item.ImageTags?.Primary) {
      rawUrl = getImageUrl(item.Id, 'Primary', { maxWidth: 800, tag: item.ImageTags.Primary });
    } else {
      const albumId = (item as any)?.AlbumId;
      const albumArtTag = (item as any)?.AlbumPrimaryImageTag;

      if (albumId && albumArtTag) {
        rawUrl = getImageUrl(albumId, 'Primary', { maxWidth: 800, tag: albumArtTag });
      } else if (albumId) {
        rawUrl = getImageUrl(albumId, 'Primary', { maxWidth: 800 });
      }
    }

    return getDisplayImageUrl(item?.Id, rawUrl, hideMedia, 'Primary');
  }, [item, hideMedia]);

  const albumArtUrl = getAlbumArtUrl();
  const displayName = item ? getDisplayName(item, hideMedia) : t('player.unknownTrack');
  const rawArtist = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0] ?? '';
  const albumArtist = getDisplayArtist([rawArtist], hideMedia)[0] ?? t('player.unknownArtist');
  const rawAlbumName = (item as any)?.Album ?? '';
  const albumName = hideMedia ? 'Album Title' : rawAlbumName;

  // Fetch lyrics
  const fetchLyrics = useCallback(async () => {
    if (!item?.Id) return;

    setLyricsLoading(true);
    try {
      const response = await jellyfinClient.api.get(`/Audio/${item.Id}/Lyrics`);
      if (response.data?.Lyrics) {
        const lines = response.data.Lyrics.map((l: any) => ({
          start: l.Start / 10000,
          text: l.Text,
        }));
        setLyrics(lines);
      }
    } catch (error) {
      console.log('No lyrics available');
      setLyrics(null);
    } finally {
      setLyricsLoading(false);
    }
  }, [item?.Id]);

  // Effects
  useEffect(() => {
    translateY.value = 0;
    hasStartedPlayback.current = false;
  }, [itemId]);

  useEffect(() => {
    if (showOptions) {
      modalTranslateY.value = 0;
    }
  }, [showOptions]);

  useEffect(() => {
    if (showPlaylistPicker) {
      playlistPickerTranslateY.value = 0;
    }
  }, [showPlaylistPicker]);

  useEffect(() => {
    if (item && !hasStartedPlayback.current) {
      const currentlyPlayingId = audioService.getCurrentItemId();
      const isCurrentlyPlaying = currentlyPlayingId === item.Id && playerState === 'playing';

      if (!isCurrentlyPlaying && currentlyPlayingId !== item.Id) {
        audioService.loadAndPlay(item, userId);
      }

      hasStartedPlayback.current = true;
      fetchLyrics();
      setIsFavorite(item.UserData?.IsFavorite ?? false);
    }
  }, [item, userId, playerState, fetchLyrics]);

  useEffect(() => {
    albumScale.value = withSpring(playerState === 'playing' ? 1 : 0.92, { damping: 15 });
  }, [playerState]);

  // Sync local progress from store
  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe(
      (state) => state.progress,
      (progress) => {
        if (!isSeekingRef.current) {
          setLocalProgress({ position: progress.position, duration: progress.duration });
        }
      }
    );

    const { progress } = usePlayerStore.getState();
    setLocalProgress({ position: progress.position, duration: progress.duration });

    return unsubscribe;
  }, []);

  // Update current lyric index
  useEffect(() => {
    if (!lyrics || lyrics.length === 0 || isSeeking) return;

    const position = localProgress.position;
    let newIndex = -1;

    for (let i = 0; i < lyrics.length; i++) {
      const lineStart = lyrics[i].start;
      const nextLineStart = i < lyrics.length - 1 ? lyrics[i + 1].start : Infinity;

      if (position >= lineStart && position < nextLineStart) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== currentLyricIndex) {
      setCurrentLyricIndex(newIndex);
    }
  }, [localProgress.position, lyrics, isSeeking, currentLyricIndex]);

  // Scroll to current lyric
  useEffect(() => {
    if (currentLyricIndex < 0 || !lyricsScrollRef.current) return;

    const LINE_HEIGHT = 56;
    const SCROLL_VIEW_HEIGHT = SCREEN_HEIGHT * 0.5;
    const offset = Math.max(0, currentLyricIndex * LINE_HEIGHT - SCROLL_VIEW_HEIGHT / 2 + LINE_HEIGHT / 2);

    lyricsScrollRef.current.scrollTo({ y: offset, animated: true });
  }, [currentLyricIndex]);

  // Update favorite and lyrics when track changes
  useEffect(() => {
    if (!item?.Id) return;

    setIsFavorite(item.UserData?.IsFavorite ?? false);
    setLyrics(null);
    setCurrentLyricIndex(-1);
    fetchLyrics();
  }, [item?.Id, fetchLyrics]);

  // Sleep timer effect
  useEffect(() => {
    if (!music.sleepTimerEndTime) return;

    const checkTimer = () => {
      if (Date.now() >= music.sleepTimerEndTime!) {
        audioService.pause();
        setMusicSleepTimer(undefined);
      }
    };

    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [music.sleepTimerEndTime, setMusicSleepTimer]);

  // Callbacks
  const handleClose = useCallback(() => {
    dismissModal();
  }, []);

  const handleStopAndClose = useCallback(async () => {
    await audioService.stop();
    dismissModal();
  }, []);

  const handlePlayPause = useCallback(async () => {
    playButtonScale.value = withSequence(
      withSpring(0.85, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );
    await audioService.togglePlayPause();
  }, [playButtonScale]);

  const handleSeek = useCallback(async (position: number) => {
    await audioService.seek(position);
  }, []);

  const handleSkipPrevious = useCallback(async () => {
    await audioService.skipToPrevious();
  }, []);

  const handleSkipNext = useCallback(async () => {
    await audioService.skipToNext();
  }, []);

  const handleToggleShuffle = useCallback(() => {
    cycleShuffleMode();
  }, [cycleShuffleMode]);

  const handleToggleRepeat = useCallback(() => {
    cycleRepeatMode();
  }, [cycleRepeatMode]);

  const handleToggleFavorite = useCallback(async () => {
    if (!item) return;
    const newValue = !isFavorite;
    setIsFavorite(newValue);
    try {
      await markAsFavorite(userId, item.Id, newValue);
      queryClient.invalidateQueries({ queryKey: ['favoriteMusic'] });
    } catch (error) {
      setIsFavorite(!newValue);
    }
  }, [item, isFavorite, userId, queryClient]);

  const handleToggleLyrics = useCallback(() => {
    setShowLyrics(!music.showLyrics);
  }, [music.showLyrics, setShowLyrics]);

  const handleGoToAlbum = useCallback(() => {
    const albumId = (item as any)?.AlbumId;
    if (albumId) {
      setShowOptions(false);
      dismissModal('/(tabs)/home');
      setTimeout(() => {
        navigateToDetails('album', albumId, '/(tabs)/music');
      }, 100);
    }
  }, [item]);

  const handleGoToArtist = useCallback(() => {
    const artistId = (item as any)?.ArtistItems?.[0]?.Id;
    if (artistId) {
      setShowOptions(false);
      dismissModal('/(tabs)/home');
      setTimeout(() => {
        navigateToDetails('artist', artistId, '/(tabs)/music');
      }, 100);
    }
  }, [item]);

  const handleAddToPlaylist = useCallback(() => {
    setShowOptions(false);
    setShowPlaylistPicker(true);
  }, []);

  const handleSelectPlaylist = useCallback((playlistId: string) => {
    if (item?.Id) {
      addToPlaylistMutation.mutate({ playlistId, itemId: item.Id });
    }
  }, [item?.Id, addToPlaylistMutation]);

  const handlePlayNext = useCallback(() => {
    if (!item) return;
    addToPlayNext({
      id: item.Id,
      item: item,
      index: 0,
    });
    setShowOptions(false);
    setAddedToast('Play Next');
    setTimeout(() => setAddedToast(null), 2500);
  }, [item, addToPlayNext]);

  const handleInstantMix = useCallback(() => {
    instantMixMutation.mutate();
  }, [instantMixMutation]);

  const handleDownload = useCallback(async () => {
    if (!item || !activeServerId) return;

    if (isDownloaded) {
      Alert.alert('Already Downloaded', 'This track is already downloaded.');
      return;
    }

    if (isDownloading) {
      Alert.alert('Download in Progress', 'This track is already being downloaded.');
      return;
    }

    setShowOptions(false);
    try {
      await downloadManager.startDownload(item, activeServerId);
      setAddedToast('Download Started');
      setTimeout(() => setAddedToast(null), 2500);
    } catch (error) {
      Alert.alert('Download Failed', 'Could not start download.');
    }
  }, [item, activeServerId, isDownloaded, isDownloading]);

  const musicSleepTimer: VideoSleepTimer | undefined = useMemo(() => {
    if (!music.sleepTimerEndTime || !music.sleepTimerMinutes) return undefined;
    return {
      type: 'duration',
      endTime: music.sleepTimerEndTime,
      durationMinutes: music.sleepTimerMinutes,
    };
  }, [music.sleepTimerEndTime, music.sleepTimerMinutes]);

  const handleSelectSleepTimer = useCallback((timer: VideoSleepTimer | undefined) => {
    if (timer) {
      setMusicSleepTimer(timer.durationMinutes);
    } else {
      setMusicSleepTimer(undefined);
    }
  }, [setMusicSleepTimer]);

  const openOptions = useCallback(() => {
    setShowOptions(true);
  }, []);

  const closeOptions = useCallback(() => {
    setShowOptions(false);
  }, []);

  const closePlaylistPicker = useCallback(() => {
    setShowPlaylistPicker(false);
  }, []);

  // Seek helpers
  const startSeeking = useCallback(() => {
    wasPlayingRef.current = playerState === 'playing';
    if (wasPlayingRef.current) {
      audioService.pause();
    }
    setIsSeeking(true);
    seekPositionRef.current = localProgress.position;
    seekProgress.value = localProgress.position;
  }, [localProgress.position, playerState, seekProgress]);

  const updateSeekPosition = useCallback((x: number) => {
    const barWidth = SCREEN_WIDTH - 48;
    const percent = Math.max(0, Math.min(1, x / barWidth));
    const newPosition = percent * localProgress.duration;
    seekPositionRef.current = newPosition;
    seekProgress.value = newPosition;
    setLocalProgress({ position: newPosition, duration: localProgress.duration });
  }, [localProgress.duration, seekProgress]);

  const finishSeeking = useCallback(async () => {
    const finalPosition = seekPositionRef.current;
    await handleSeek(finalPosition);
    await new Promise((r) => setTimeout(r, 100));
    setIsSeeking(false);
    if (wasPlayingRef.current) {
      audioService.play();
    }
  }, [handleSeek]);

  const getDisplayPosition = useCallback(() => {
    return isSeeking ? seekPositionRef.current : localProgress.position;
  }, [isSeeking, localProgress.position]);

  const progressValue = localProgress.duration > 0 ? getDisplayPosition() / localProgress.duration : 0;
  const showLoading = isLoading || playerState === 'loading' || playerState === 'buffering';
  const showLyricsView = music.showLyrics;

  // Gestures
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
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
    }), [translateY, handleClose]);

  const modalGesture = useMemo(() => Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        modalTranslateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 400) {
        modalTranslateY.value = withTiming(400, { duration: 200 });
        runOnJS(closeOptions)();
      } else {
        modalTranslateY.value = withSpring(0, { damping: 20 });
      }
    }), [modalTranslateY, closeOptions]);

  const playlistPickerGesture = useMemo(() => Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        playlistPickerTranslateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 400) {
        playlistPickerTranslateY.value = withTiming(400, { duration: 200 });
        runOnJS(closePlaylistPicker)();
      } else {
        playlistPickerTranslateY.value = withSpring(0, { damping: 20 });
      }
    }), [playlistPickerTranslateY, closePlaylistPicker]);

  // Animated style getters (to be used with useAnimatedStyle in components)
  const getContainerStyle = useCallback(() => ({
    transform: [{ translateY: translateY.value }],
  }), [translateY]);

  const getBackgroundStyle = useCallback(() => {
    const opacity = interpolate(translateY.value, [0, 300], [1, 0], 'clamp');
    return { opacity };
  }, [translateY]);

  const getAlbumStyle = useCallback(() => ({
    transform: [{ scale: albumScale.value }],
  }), [albumScale]);

  const getPlayButtonStyle = useCallback(() => ({
    transform: [{ scale: playButtonScale.value }],
  }), [playButtonScale]);

  const getModalSheetStyle = useCallback(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }), [modalTranslateY]);

  const getPlaylistPickerSheetStyle = useCallback(() => ({
    transform: [{ translateY: playlistPickerTranslateY.value }],
  }), [playlistPickerTranslateY]);

  return {
    // Data
    itemId,
    item,
    isLoading,
    albumArtUrl,
    displayName,
    albumArtist,
    albumName,

    // Playback state
    playerState,
    localProgress,
    isSeeking,
    progressValue,
    showLoading,

    // Queue state
    shuffleMode: music.shuffleMode,
    repeatMode: music.repeatMode,

    // Lyrics
    lyrics,
    lyricsLoading,
    currentLyricIndex,
    showLyricsView,
    lyricsScrollRef,

    // Favorite
    isFavorite,

    // Download state
    isDownloaded,
    isDownloading,
    downloadProgress,

    // Playlists
    playlists,
    showPlaylistPicker,
    setShowPlaylistPicker,

    // Options modal
    showOptions,
    setShowOptions,

    // Sleep timer
    musicSleepTimer,
    showSleepTimer,
    setShowSleepTimer,

    // Equalizer
    showEqualizer,
    setShowEqualizer,

    // Toast
    addedToast,

    // Settings
    accentColor,

    // Animations
    albumScale,
    playButtonScale,
    translateY,
    modalTranslateY,
    playlistPickerTranslateY,
    seekProgress,

    // Gestures
    seekGesture,
    dismissGesture,
    modalGesture,
    playlistPickerGesture,

    // Callbacks
    handlePlayPause,
    handleSeek,
    handleSkipPrevious,
    handleSkipNext,
    handleToggleShuffle,
    handleToggleRepeat,
    handleToggleFavorite,
    handleToggleLyrics,
    handleGoToAlbum,
    handleGoToArtist,
    handleAddToPlaylist,
    handleSelectPlaylist,
    handlePlayNext,
    handleInstantMix,
    handleDownload,
    handleSelectSleepTimer,
    handleClose,
    handleStopAndClose,
    openOptions,
    closeOptions,
    closePlaylistPicker,

    // Helpers
    getDisplayPosition,

    // Animated style helpers
    getContainerStyle,
    getBackgroundStyle,
    getAlbumStyle,
    getPlayButtonStyle,
    getModalSheetStyle,
    getPlaylistPickerSheetStyle,
  };
}
