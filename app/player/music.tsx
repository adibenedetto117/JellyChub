import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Dimensions, Modal, Image, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Brightness from 'expo-brightness';
import { VolumeManager } from 'react-native-volume-manager';
import { useAuthStore, usePlayerStore, useSettingsStore, useDownloadStore } from '@/stores';
import { audioService, downloadManager } from '@/services';
import {
  getItem,
  getImageUrl,
  markAsFavorite,
  jellyfinClient,
  getPlaylists,
  addToPlaylist,
} from '@/api';
import { formatPlayerTime, ticksToMs } from '@/utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const EDGE_ZONE_WIDTH = 80; // Width of the edge zones for brightness/volume gestures

interface LyricLine {
  start: number;
  text: string;
}

export default function MusicPlayerScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const activeServerId = useAuthStore((state) => state.activeServerId);
  const accentColor = useSettingsStore((s) => s.accentColor);
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
    toggleShuffle,
    cycleRepeatMode,
    setShowLyrics,
    setProgress,
    addToPlayNext,
  } = usePlayerStore();

  const [isFavorite, setIsFavorite] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [playMethod, setPlayMethod] = useState<string>('Direct Stream');
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [localProgress, setLocalProgress] = useState({ position: 0, duration: 0 });
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const lyricsScrollRef = useRef<ScrollView>(null);

  const { data: playlists } = useQuery({
    queryKey: ['playlists', userId],
    queryFn: () => getPlaylists(userId),
    enabled: !!userId && showPlaylistPicker,
  });

  const [addedToast, setAddedToast] = useState<string | null>(null);
  const playlistPickerTranslateY = useSharedValue(0);

  const addToPlaylistMutation = useMutation({
    mutationFn: ({ playlistId, itemId }: { playlistId: string; itemId: string }) =>
      addToPlaylist(playlistId, [itemId], userId),
    onSuccess: (_data, variables) => {
      const playlist = playlists?.Items?.find(p => p.Id === variables.playlistId);
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
  const hasStartedPlayback = useRef(false);
  const seekPositionRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const isSeekingRef = useRef(false);
  isSeekingRef.current = isSeeking;

  const albumScale = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const modalTranslateY = useSharedValue(0);
  const seekProgress = useSharedValue(0);

  // Brightness and volume gesture state
  const [currentBrightness, setCurrentBrightness] = useState(0.5);
  const [currentVolume, setCurrentVolume] = useState(0.5);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const brightnessIndicatorOpacity = useSharedValue(0);
  const volumeIndicatorOpacity = useSharedValue(0);
  const brightnessStartValue = useRef(0.5);
  const volumeStartValue = useRef(0.5);
  const gestureStartY = useRef(0);

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

  // Initialize brightness and volume values
  useEffect(() => {
    const initBrightnessAndVolume = async () => {
      try {
        const brightness = await Brightness.getBrightnessAsync();
        setCurrentBrightness(brightness);
        brightnessStartValue.current = brightness;
      } catch (e) {
        console.log('Could not get brightness:', e);
      }

      try {
        const volume = await VolumeManager.getVolume();
        const vol = typeof volume === 'number' ? volume : volume?.volume ?? 0.5;
        setCurrentVolume(vol);
        volumeStartValue.current = vol;
      } catch (e) {
        console.log('Could not get volume:', e);
      }
    };

    initBrightnessAndVolume();

    // Listen for volume changes
    const volumeListener = VolumeManager.addVolumeListener((result) => {
      setCurrentVolume(result.volume);
    });

    return () => {
      volumeListener?.remove();
    };
  }, []);

  const { data: queriedItem, isLoading } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId),
    enabled: !!userId && !!itemId,
  });

  // Use currentItem from store (updates on track change) or fall back to queried item
  const item = currentItem?.item ?? queriedItem;

  const getAlbumArtUrl = () => {
    if (!item) return null;

    if (item.ImageTags?.Primary) {
      return getImageUrl(item.Id, 'Primary', { maxWidth: 800, tag: item.ImageTags.Primary });
    }

    const albumId = (item as any)?.AlbumId;
    const albumArtTag = (item as any)?.AlbumPrimaryImageTag;

    if (albumId && albumArtTag) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 800, tag: albumArtTag });
    }

    if (albumId) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 800 });
    }

    return null;
  };

  const albumArtUrl = getAlbumArtUrl();

  const fetchLyrics = async () => {
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
  };

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
  }, [item, userId, playerState]);

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

  // Update current lyric index based on playback position
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

  // Scroll to current lyric when it changes
  useEffect(() => {
    if (currentLyricIndex < 0 || !lyricsScrollRef.current) return;

    const LINE_HEIGHT = 56; // Approximate height per lyric line including margin
    const SCROLL_VIEW_HEIGHT = SCREEN_HEIGHT * 0.5; // Approximate visible area
    const offset = Math.max(0, currentLyricIndex * LINE_HEIGHT - SCROLL_VIEW_HEIGHT / 2 + LINE_HEIGHT / 2);

    lyricsScrollRef.current.scrollTo({ y: offset, animated: true });
  }, [currentLyricIndex]);

  // Update favorite status and lyrics when track changes
  useEffect(() => {
    if (!item?.Id) return;

    // Update favorite status
    setIsFavorite(item.UserData?.IsFavorite ?? false);

    // Fetch lyrics for new track
    setLyrics(null);
    setCurrentLyricIndex(-1);
    fetchLyrics();
  }, [item?.Id]);

  const handleClose = () => {
    router.back();
  };

  const handleStopAndClose = async () => {
    await audioService.stop();
    router.back();
  };

  const handlePlayPause = async () => {
    playButtonScale.value = withSequence(
      withSpring(0.85, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );

    await audioService.togglePlayPause();
  };

  const handleSeek = useCallback(async (position: number) => {
    await audioService.seek(position);
  }, []);

  const handleToggleFavorite = async () => {
    if (!item) return;
    const newValue = !isFavorite;
    setIsFavorite(newValue);
    try {
      await markAsFavorite(userId, item.Id, newValue);
      queryClient.invalidateQueries({ queryKey: ['favoriteMusic'] });
    } catch (error) {
      setIsFavorite(!newValue);
    }
  };

  const handleGoToAlbum = () => {
    const albumId = (item as any)?.AlbumId;
    if (albumId) {
      setShowOptions(false);
      router.dismiss();
      setTimeout(() => {
        router.push(`/details/album/${albumId}`);
      }, 100);
    }
  };

  const handleGoToArtist = () => {
    const artistId = (item as any)?.ArtistItems?.[0]?.Id;
    if (artistId) {
      setShowOptions(false);
      router.dismiss();
      setTimeout(() => {
        router.push(`/details/artist/${artistId}`);
      }, 100);
    }
  };

  const handleAddToPlaylist = () => {
    setShowOptions(false);
    setShowPlaylistPicker(true);
  };

  const handlePlayNext = () => {
    if (!item) return;
    addToPlayNext({
      id: item.Id,
      item: item,
      index: 0, // Will be re-indexed by the store
    });
    setShowOptions(false);
    setAddedToast('Play Next');
    setTimeout(() => setAddedToast(null), 2500);
  };

  const handleDownload = async () => {
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
  };

  const handleSelectPlaylist = (playlistId: string) => {
    if (item?.Id) {
      addToPlaylistMutation.mutate({ playlistId, itemId: item.Id });
    }
  };

  const openOptions = useCallback(() => {
    setShowOptions(true);
  }, []);

  const closeOptions = useCallback(() => {
    setShowOptions(false);
  }, []);

  const closePlaylistPicker = useCallback(() => {
    setShowPlaylistPicker(false);
  }, []);

  const getDisplayPosition = () => {
    return isSeeking ? seekPositionRef.current : localProgress.position;
  };
  const progressValue = localProgress.duration > 0 ? getDisplayPosition() / localProgress.duration : 0;
  const albumArtist = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0] ?? 'Unknown Artist';
  const albumName = (item as any)?.Album ?? '';

  const albumStyle = useAnimatedStyle(() => ({
    transform: [{ scale: albumScale.value }],
  }));

  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

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

  // Brightness gesture handlers
  const handleBrightnessStart = useCallback(async (y: number) => {
    gestureStartY.current = y;
    try {
      const brightness = await Brightness.getBrightnessAsync();
      brightnessStartValue.current = brightness;
      setCurrentBrightness(brightness);
    } catch (e) {
      console.log('Could not get brightness:', e);
    }
    setShowBrightnessIndicator(true);
    brightnessIndicatorOpacity.value = withTiming(1, { duration: 150 });
  }, [brightnessIndicatorOpacity]);

  const handleBrightnessUpdate = useCallback(async (y: number) => {
    const deltaY = gestureStartY.current - y;
    const sensitivity = SCREEN_HEIGHT * 0.7;
    const change = deltaY / sensitivity;
    const newBrightness = Math.max(0, Math.min(1, brightnessStartValue.current + change));
    setCurrentBrightness(newBrightness);
    try {
      await Brightness.setBrightnessAsync(newBrightness);
    } catch (e) {
      console.log('Could not set brightness:', e);
    }
  }, []);

  const handleBrightnessEnd = useCallback(() => {
    brightnessIndicatorOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => setShowBrightnessIndicator(false), 300);
  }, [brightnessIndicatorOpacity]);

  // Volume gesture handlers
  const handleVolumeStart = useCallback(async (y: number) => {
    gestureStartY.current = y;
    try {
      const volume = await VolumeManager.getVolume();
      const vol = typeof volume === 'number' ? volume : volume?.volume ?? 0.5;
      volumeStartValue.current = vol;
      setCurrentVolume(vol);
    } catch (e) {
      console.log('Could not get volume:', e);
    }
    setShowVolumeIndicator(true);
    volumeIndicatorOpacity.value = withTiming(1, { duration: 150 });
  }, [volumeIndicatorOpacity]);

  const handleVolumeUpdate = useCallback(async (y: number) => {
    const deltaY = gestureStartY.current - y;
    const sensitivity = SCREEN_HEIGHT * 0.7;
    const change = deltaY / sensitivity;
    const newVolume = Math.max(0, Math.min(1, volumeStartValue.current + change));
    setCurrentVolume(newVolume);
    try {
      await VolumeManager.setVolume(newVolume, { showUI: false });
    } catch (e) {
      console.log('Could not set volume:', e);
    }
  }, []);

  const handleVolumeEnd = useCallback(() => {
    volumeIndicatorOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => setShowVolumeIndicator(false), 300);
  }, [volumeIndicatorOpacity]);

  // Brightness gesture (left edge only, requires long-press to activate)
  const brightnessLongPress = useMemo(() => Gesture.LongPress()
    .minDuration(300)
    .maxDistance(50)
    .onStart((e) => {
      if (e.x <= EDGE_ZONE_WIDTH) {
        runOnJS(handleBrightnessStart)(e.absoluteY);
      }
    }), [handleBrightnessStart]);

  const brightnessPan = useMemo(() => Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((e, stateManager) => {
      if (showBrightnessIndicator) {
        stateManager.activate();
      }
    })
    .onUpdate((e) => {
      if (showBrightnessIndicator) {
        runOnJS(handleBrightnessUpdate)(e.absoluteY);
      }
    })
    .onEnd(() => {
      runOnJS(handleBrightnessEnd)();
    })
    .onFinalize(() => {
      runOnJS(handleBrightnessEnd)();
    }), [handleBrightnessUpdate, handleBrightnessEnd, showBrightnessIndicator]);

  const brightnessGesture = Gesture.Simultaneous(brightnessLongPress, brightnessPan);

  // Volume gesture (right edge only, requires long-press to activate)
  const volumeLongPress = useMemo(() => Gesture.LongPress()
    .minDuration(300)
    .maxDistance(50)
    .onStart((e) => {
      if (e.x >= SCREEN_WIDTH - EDGE_ZONE_WIDTH) {
        runOnJS(handleVolumeStart)(e.absoluteY);
      }
    }), [handleVolumeStart]);

  const volumePan = useMemo(() => Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((e, stateManager) => {
      if (showVolumeIndicator) {
        stateManager.activate();
      }
    })
    .onUpdate((e) => {
      if (showVolumeIndicator) {
        runOnJS(handleVolumeUpdate)(e.absoluteY);
      }
    })
    .onEnd(() => {
      runOnJS(handleVolumeEnd)();
    })
    .onFinalize(() => {
      runOnJS(handleVolumeEnd)();
    }), [handleVolumeUpdate, handleVolumeEnd, showVolumeIndicator]);

  const volumeGesture = Gesture.Simultaneous(volumeLongPress, volumePan);

  // Dismiss gesture (center of screen - swipe down to close)
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
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const brightnessIndicatorStyle = useAnimatedStyle(() => ({
    opacity: brightnessIndicatorOpacity.value,
  }));

  const volumeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: volumeIndicatorOpacity.value,
  }));

  const modalSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const modalGesture = Gesture.Pan()
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
    });

  const playlistPickerSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistPickerTranslateY.value }],
  }));

  const playlistPickerGesture = Gesture.Pan()
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
    });

  const showLoading = isLoading || playerState === 'loading' || playerState === 'buffering';
  const showLyricsView = music.showLyrics;

  // Compose gestures: brightness/volume gestures take priority on edges, dismiss gesture otherwise
  const composedGesture = Gesture.Race(brightnessGesture, volumeGesture, dismissGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[{ flex: 1, backgroundColor: '#000' }, containerStyle]}>
        {albumArtUrl && (
          <Image
            source={{ uri: albumArtUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
            blurRadius={80}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Brightness Indicator (Left Side) */}
        {showBrightnessIndicator && (
          <Animated.View
            style={[
              brightnessIndicatorStyle,
              {
                position: 'absolute',
                left: 24,
                top: '50%',
                marginTop: -100,
                width: 48,
                height: 200,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
              },
            ]}
            pointerEvents="none"
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 24,
                padding: 12,
                alignItems: 'center',
                width: 48,
              }}
            >
              <Ionicons
                name={currentBrightness > 0.5 ? 'sunny' : 'sunny-outline'}
                size={24}
                color="#fff"
              />
              <View
                style={{
                  width: 4,
                  height: 120,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 2,
                  marginTop: 12,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${currentBrightness * 100}%`,
                    backgroundColor: '#fff',
                    borderRadius: 2,
                  }}
                />
              </View>
              <Text style={{ color: '#fff', fontSize: 12, marginTop: 8, fontWeight: '600' }}>
                {Math.round(currentBrightness * 100)}%
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Volume Indicator (Right Side) */}
        {showVolumeIndicator && (
          <Animated.View
            style={[
              volumeIndicatorStyle,
              {
                position: 'absolute',
                right: 24,
                top: '50%',
                marginTop: -100,
                width: 48,
                height: 200,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
              },
            ]}
            pointerEvents="none"
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 24,
                padding: 12,
                alignItems: 'center',
                width: 48,
              }}
            >
              <Ionicons
                name={currentVolume === 0 ? 'volume-mute' : currentVolume < 0.5 ? 'volume-low' : 'volume-high'}
                size={24}
                color="#fff"
              />
              <View
                style={{
                  width: 4,
                  height: 120,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 2,
                  marginTop: 12,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${currentVolume * 100}%`,
                    backgroundColor: accentColor,
                    borderRadius: 2,
                  }}
                />
              </View>
              <Text style={{ color: '#fff', fontSize: 12, marginTop: 8, fontWeight: '600' }}>
                {Math.round(currentVolume * 100)}%
              </Text>
            </View>
          </Animated.View>
        )}

        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
          <Pressable onPress={handleClose} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 }}>
              Now Playing
            </Text>
            {albumName ? (
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                {albumName}
              </Text>
            ) : null}
          </View>

          <Pressable onPress={openOptions} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </Pressable>
        </View>

        {showLyricsView ? (
          <ScrollView
            ref={lyricsScrollRef}
            style={{ flex: 1, paddingHorizontal: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              {lyricsLoading ? (
                <ActivityIndicator color={accentColor} size="large" />
              ) : lyrics && lyrics.length > 0 ? (
                lyrics.map((line, index) => {
                  const isCurrent = index === currentLyricIndex;
                  const isPast = index < currentLyricIndex;

                  return (
                    <Text
                      key={index}
                      style={{
                        color: isCurrent ? accentColor : isPast ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)',
                        fontSize: isCurrent ? 24 : 20,
                        fontWeight: isCurrent ? '700' : '600',
                        textAlign: 'center',
                        lineHeight: 40,
                        marginBottom: 16,
                      }}
                    >
                      {line.text}
                    </Text>
                  );
                })
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 80 }}>
                  <Ionicons name="text" size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, marginTop: 16 }}>No lyrics available</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 8 }}>Lyrics will appear here when available</Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Animated.View style={albumStyle}>
              <View
                style={{
                  width: SCREEN_WIDTH - 80,
                  height: SCREEN_WIDTH - 80,
                  borderRadius: 12,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.5,
                  shadowRadius: 30,
                  elevation: 20,
                  marginBottom: 32,
                }}
              >
                {albumArtUrl ? (
                  <Image
                    source={{ uri: albumArtUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="musical-note" size={80} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
              </View>
            </Animated.View>

            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }} numberOfLines={1}>
                  {item?.Name ?? 'Unknown Track'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 4 }} numberOfLines={1}>
                  {albumArtist}
                </Text>
              </View>
              <Pressable onPress={handleToggleFavorite} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={26}
                  color={isFavorite ? accentColor : "#fff"}
                />
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{playMethod}</Text>
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <GestureDetector gesture={seekGesture}>
              <Animated.View style={{ height: 36, justifyContent: 'center' }}>
                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                  <View
                    style={{ height: '100%', borderRadius: 2, backgroundColor: accentColor, width: `${progressValue * 100}%` }}
                  />
                </View>
                <View
                  style={{
                    position: 'absolute',
                    left: `${progressValue * 100}%`,
                    top: 8,
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' }}>
                {formatPlayerTime(getDisplayPosition())}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' }}>
                {formatPlayerTime(localProgress.duration)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
            <Pressable
              onPress={toggleShuffle}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="shuffle"
                size={24}
                color={music.shuffle ? accentColor : 'rgba(255,255,255,0.5)'}
              />
              {music.shuffle && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accentColor, marginTop: 4 }} />
              )}
            </Pressable>

            <Pressable onPress={() => audioService.skipToPrevious()} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play-skip-back" size={32} color="#fff" />
            </Pressable>

            <Animated.View style={playButtonStyle}>
              <Pressable
                onPress={handlePlayPause}
                style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
              >
                {showLoading ? (
                  <ActivityIndicator color="#000" size="large" />
                ) : (
                  <Ionicons
                    name={playerState === 'playing' ? "pause" : "play"}
                    size={36}
                    color="#000"
                    style={{ marginLeft: playerState === 'playing' ? 0 : 4 }}
                  />
                )}
              </Pressable>
            </Animated.View>

            <Pressable onPress={() => audioService.skipToNext()} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play-skip-forward" size={32} color="#fff" />
            </Pressable>

            <Pressable
              onPress={cycleRepeatMode}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                  name="repeat"
                  size={24}
                  color={music.repeatMode !== 'off' ? accentColor : 'rgba(255,255,255,0.5)'}
                />
                {music.repeatMode === 'one' && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -6,
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: accentColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>1</Text>
                  </View>
                )}
              </View>
              {music.repeatMode !== 'off' && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accentColor, marginTop: 4 }} />
              )}
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 24 }}>
            <Pressable
              onPress={() => setShowLyrics(!music.showLyrics)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: music.showLyrics ? accentColor : 'rgba(255,255,255,0.1)',
              }}
            >
              <Ionicons name="text" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>Lyrics</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={closeOptions}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <Pressable style={{ flex: 1 }} onPress={closeOptions} />
            <GestureDetector gesture={modalGesture}>
              <Animated.View style={[{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }, modalSheetStyle]}>
                <View style={{ paddingTop: 12, paddingBottom: 20, alignItems: 'center' }}>
                  <View style={{ width: 48, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
                </View>

                <View style={{ paddingHorizontal: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                    {albumArtUrl ? (
                      <Image
                        source={{ uri: albumArtUrl }}
                        style={{ width: 56, height: 56, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="musical-note" size={24} color="rgba(255,255,255,0.5)" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 18 }} numberOfLines={1}>
                        {item?.Name ?? 'Unknown'}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.6)' }} numberOfLines={1}>{albumArtist}</Text>
                    </View>
                  </View>

                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                    onPress={() => {
                      closeOptions();
                      setTimeout(handleToggleFavorite, 100);
                    }}
                  >
                    <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? accentColor : "#fff"} />
                    <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>
                      {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                    onPress={handleAddToPlaylist}
                  >
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>Add to Playlist</Text>
                  </Pressable>

                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                    onPress={handlePlayNext}
                  >
                    <Ionicons name="play-forward" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>Play Next</Text>
                  </Pressable>

                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                    onPress={handleDownload}
                    disabled={isDownloading}
                  >
                    <Ionicons
                      name={isDownloaded ? "checkmark-circle" : isDownloading ? "cloud-download" : "download-outline"}
                      size={24}
                      color={isDownloaded ? "#4CAF50" : isDownloading ? accentColor : "#fff"}
                    />
                    <Text style={{ color: isDownloaded ? "#4CAF50" : '#fff', fontSize: 16, marginLeft: 16 }}>
                      {isDownloaded ? 'Downloaded' : isDownloading ? `Downloading ${Math.round(downloadProgress)}%` : 'Download'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                    onPress={handleGoToAlbum}
                  >
                    <Ionicons name="disc-outline" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>Go to Album</Text>
                  </Pressable>

                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                    onPress={handleGoToArtist}
                  >
                    <Ionicons name="person-outline" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>Go to Artist</Text>
                  </Pressable>

                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                    onPress={() => {
                      closeOptions();
                      setTimeout(handleStopAndClose, 100);
                    }}
                  >
                    <Ionicons name="stop-circle-outline" size={24} color="#ff4444" />
                    <Text style={{ color: '#ff4444', fontSize: 16, marginLeft: 16 }}>Stop Playback</Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}>
                    <Ionicons name="radio-outline" size={24} color="rgba(255,255,255,0.5)" />
                    <View style={{ marginLeft: 16 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>Streaming Quality</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>{playMethod}</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        </GestureHandlerRootView>
      </Modal>

      <Modal
        visible={showPlaylistPicker}
        transparent
        animationType="fade"
        onRequestClose={closePlaylistPicker}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <Pressable style={{ flex: 1 }} onPress={closePlaylistPicker} />
            <GestureDetector gesture={playlistPickerGesture}>
              <Animated.View style={[{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 40 }, playlistPickerSheetStyle]}>
                <View style={{ paddingTop: 12, paddingBottom: 16, alignItems: 'center' }}>
                  <View style={{ width: 48, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
                </View>

                <View style={{ paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {albumArtUrl ? (
                      <Image
                        source={{ uri: albumArtUrl }}
                        style={{ width: 48, height: 48, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.5)" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 2 }}>Add to playlist</Text>
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }} numberOfLines={1}>
                        {item?.Name ?? 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </View>

                <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                  {!playlists ? (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                      <ActivityIndicator color={accentColor} size="large" />
                    </View>
                  ) : playlists.Items && playlists.Items.length > 0 ? (
                    playlists.Items.map((playlist) => {
                      const playlistImageUrl = playlist.ImageTags?.Primary
                        ? getImageUrl(playlist.Id, 'Primary', { maxWidth: 100, tag: playlist.ImageTags.Primary })
                        : null;
                      const isAdding = addToPlaylistMutation.isPending && addToPlaylistMutation.variables?.playlistId === playlist.Id;

                      return (
                        <Pressable
                          key={playlist.Id}
                          onPress={() => handleSelectPlaylist(playlist.Id)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent',
                          })}
                          disabled={addToPlaylistMutation.isPending}
                        >
                          <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginRight: 12 }}>
                            {playlistImageUrl ? (
                              <Image
                                source={{ uri: playlistImageUrl }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="list" size={24} color="rgba(255,255,255,0.4)" />
                              </View>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }} numberOfLines={1}>{playlist.Name}</Text>
                            {playlist.UserData?.UnplayedItemCount !== undefined && (
                              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>
                                {playlist.UserData.UnplayedItemCount} {playlist.UserData.UnplayedItemCount === 1 ? 'track' : 'tracks'}
                              </Text>
                            )}
                          </View>
                          {isAdding ? (
                            <ActivityIndicator size="small" color={accentColor} />
                          ) : (
                            <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.4)" />
                          )}
                        </Pressable>
                      );
                    })
                  ) : (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                      <Ionicons name="list" size={48} color="rgba(255,255,255,0.2)" />
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginTop: 12 }}>No playlists found</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 4 }}>Create a playlist in Jellyfin first</Text>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </GestureDetector>
          </View>
        </GestureHandlerRootView>
      </Modal>

      {addedToast && (
        <View style={{ position: 'absolute', bottom: 100, left: 24, right: 24, alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1a1a1a', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
            <Ionicons name="checkmark-circle" size={20} color={accentColor} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', marginLeft: 10 }}>Added to {addedToast}</Text>
          </View>
        </View>
      )}
      </Animated.View>
    </GestureDetector>
  );
}
