import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer } from 'expo-video';
import { useAuthStore, useSettingsStore, useLiveTvStore } from '@/stores';
import {
  getChannel,
  getChannels,
  getLiveHlsStreamUrl,
  getLiveDirectStreamUrl,
  getLiveStreamUrl,
  getLiveTvPlaybackInfo,
  jellyfinClient,
} from '@/api';
import { dismissModal } from '@/utils';
import type { LiveTvChannel } from '@/types/livetv';
import {
  type LiveTvPlayerCore,
  CONTROLS_TIMEOUT,
  BUFFERING_SHOW_DELAY_MS,
  BUFFERING_MIN_DISPLAY_MS,
} from './livetv/types';

export type { LiveTvPlayerCore };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const STREAM_URL_GENERATORS = [
  getLiveHlsStreamUrl,
  getLiveDirectStreamUrl,
  getLiveStreamUrl,
];

export function useLiveTvPlayerCore(): LiveTvPlayerCore {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const currentUser = useAuthStore((s) => s.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';
  const insets = useSafeAreaInsets();

  const addRecentChannel = useLiveTvStore((s) => s.addRecentChannel);
  const toggleFavoriteChannel = useLiveTvStore((s) => s.toggleFavoriteChannel);
  const favoriteChannelIds = useLiveTvStore((s) => s.favoriteChannelIds);

  const [showControls, setShowControls] = useState(true);
  const [isPlayerBuffering, setIsPlayerBuffering] = useState(true);
  const [showBufferingOverlay, setShowBufferingOverlay] = useState(true);
  const [showChannelList, setShowChannelList] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState(channelId);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamUrlIndex, setStreamUrlIndex] = useState(0);
  const [isOrientationLocked, setIsOrientationLocked] = useState(true);

  const controlsOpacity = useSharedValue(1);
  const bufferingOverlayOpacity = useSharedValue(1);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Buffering debounce refs
  const bufferingShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bufferingHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bufferingShownAtRef = useRef<number>(0);

  // Queries
  const { data: currentChannel, isLoading: channelLoading } = useQuery({
    queryKey: ['liveTvChannel', currentChannelId, userId],
    queryFn: () => getChannel(currentChannelId, userId),
    enabled: !!currentChannelId && !!userId,
  });

  const { data: channelsData } = useQuery({
    queryKey: ['liveTvChannels', userId],
    queryFn: () => getChannels(userId, { addCurrentProgram: true }),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const channels = channelsData?.Items ?? [];

  // Generate stream URL using current index
  const generateStreamUrl = useCallback((chId: string, urlIndex: number) => {
    const generator = STREAM_URL_GENERATORS[urlIndex];
    if (!generator) return null;
    try {
      return generator(chId);
    } catch {
      return null;
    }
  }, []);

  // Try next stream URL when current one fails
  const tryNextStreamUrl = useCallback(() => {
    const nextIndex = streamUrlIndex + 1;
    if (nextIndex < STREAM_URL_GENERATORS.length) {
      setStreamUrlIndex(nextIndex);
      setIsPlayerBuffering(true);
      setShowBufferingOverlay(true);
      bufferingOverlayOpacity.value = 1;
      const url = generateStreamUrl(currentChannelId, nextIndex);
      console.log(`[LiveTV] Trying stream URL format ${nextIndex}:`, url);
      if (url) {
        setStreamUrl(url);
        setStreamError(null);
      } else {
        setStreamError('All stream formats failed');
      }
    } else {
      console.log('[LiveTV] All stream formats exhausted');
      setStreamError('Stream playback failed. Check that Live TV is properly configured on your server.');
    }
  }, [streamUrlIndex, currentChannelId, generateStreamUrl, bufferingOverlayOpacity]);

  // Fetch stream URL when channel changes
  useEffect(() => {
    if (currentChannelId && userId) {
      setStreamError(null);
      setStreamUrlIndex(0);
      setIsPlayerBuffering(true);
      setShowBufferingOverlay(true);
      bufferingOverlayOpacity.value = 1;

      const fetchStreamUrl = async () => {
        try {
          console.log('[LiveTV] Trying PlaybackInfo approach...');
          const playbackInfo = await getLiveTvPlaybackInfo(currentChannelId, userId);
          console.log('[LiveTV] PlaybackInfo response:', playbackInfo);

          if (playbackInfo?.MediaSources?.[0]) {
            const mediaSource = playbackInfo.MediaSources[0];

            if (mediaSource.SupportsDirectStream && mediaSource.DirectStreamUrl) {
              const directUrl = `${jellyfinClient.url}${mediaSource.DirectStreamUrl}`;
              console.log('[LiveTV] Using DirectStreamUrl:', directUrl);
              setStreamUrl(directUrl);
              addRecentChannel(currentChannelId);
              return;
            }

            if (mediaSource.SupportsTranscoding && mediaSource.TranscodingUrl) {
              const transcodingUrl = `${jellyfinClient.url}${mediaSource.TranscodingUrl}`;
              console.log('[LiveTV] Using TranscodingUrl:', transcodingUrl);
              setStreamUrl(transcodingUrl);
              addRecentChannel(currentChannelId);
              return;
            }
          }

          console.log('[LiveTV] PlaybackInfo did not provide stream URL, falling back to manual URLs');
          const url = generateStreamUrl(currentChannelId, 0);
          console.log(`[LiveTV] Trying stream URL format 0:`, url);
          if (url) {
            setStreamUrl(url);
            addRecentChannel(currentChannelId);
          } else {
            setStreamError('Failed to generate stream URL');
            setIsPlayerBuffering(false);
          }
        } catch (error) {
          console.error('[LiveTV] PlaybackInfo failed:', error);
          const url = generateStreamUrl(currentChannelId, 0);
          console.log(`[LiveTV] Fallback - trying stream URL format 0:`, url);
          if (url) {
            setStreamUrl(url);
            addRecentChannel(currentChannelId);
          } else {
            setStreamError('Failed to load stream');
            setIsPlayerBuffering(false);
          }
        }
      };

      fetchStreamUrl();
    }
  }, [currentChannelId, userId, addRecentChannel, generateStreamUrl, bufferingOverlayOpacity]);

  // Screen orientation and keep awake (guarded for web)
  useEffect(() => {
    const setup = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch {}
      try {
        await activateKeepAwakeAsync();
      } catch {}
    };

    setup();

    return () => {
      try {
        ScreenOrientation.unlockAsync();
      } catch {}
      try {
        deactivateKeepAwake();
      } catch {}
    };
  }, []);

  // Video player
  const player = useVideoPlayer(streamUrl ?? '', (p) => {
    p.loop = false;
    p.bufferOptions = {
      preferredForwardBufferDuration: 15,
      minBufferForPlayback: 3,
      waitsToMinimizeStalling: true,
    };
    p.play();
  });

  // Player event listeners
  useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener('statusChange', (event) => {
      console.log('[LiveTV] Player status:', event.status, event);
      if (event.status === 'readyToPlay') {
        setIsPlayerBuffering(false);
        setStreamError(null);
      } else if (event.status === 'loading') {
        setIsPlayerBuffering(true);
      } else if (event.status === 'error') {
        console.error('[LiveTV] Player error:', event);
        setIsPlayerBuffering(false);
        if (streamUrlIndex < STREAM_URL_GENERATORS.length - 1) {
          console.log(`Stream format ${streamUrlIndex} failed, trying next...`);
          tryNextStreamUrl();
        } else {
          setStreamError('Stream playback failed - please try again');
        }
      }
    });

    const errorSub = player.addListener('playingChange', (event) => {
      console.log('[LiveTV] Playing state:', event.isPlaying);
      if (event.isPlaying) {
        setIsPlayerBuffering(false);
      }
    });

    return () => {
      statusSub.remove();
      errorSub.remove();
    };
  }, [player, streamUrlIndex, tryNextStreamUrl]);

  // Debounced buffering overlay effect
  useEffect(() => {
    if (bufferingShowTimeoutRef.current) {
      clearTimeout(bufferingShowTimeoutRef.current);
      bufferingShowTimeoutRef.current = undefined;
    }
    if (bufferingHideTimeoutRef.current) {
      clearTimeout(bufferingHideTimeoutRef.current);
      bufferingHideTimeoutRef.current = undefined;
    }

    if (isPlayerBuffering) {
      bufferingShowTimeoutRef.current = setTimeout(() => {
        if (isPlayerBuffering) {
          bufferingShownAtRef.current = Date.now();
          setShowBufferingOverlay(true);
          bufferingOverlayOpacity.value = withTiming(1, {
            duration: 200,
            easing: Easing.out(Easing.ease),
          });
        }
      }, BUFFERING_SHOW_DELAY_MS);
    } else {
      const shownDuration = Date.now() - bufferingShownAtRef.current;
      const remainingMinDisplay = Math.max(0, BUFFERING_MIN_DISPLAY_MS - shownDuration);

      bufferingHideTimeoutRef.current = setTimeout(() => {
        bufferingOverlayOpacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.in(Easing.ease),
        });
        setTimeout(() => {
          setShowBufferingOverlay(false);
        }, 300);
      }, remainingMinDisplay);
    }

    return () => {
      if (bufferingShowTimeoutRef.current) {
        clearTimeout(bufferingShowTimeoutRef.current);
      }
      if (bufferingHideTimeoutRef.current) {
        clearTimeout(bufferingHideTimeoutRef.current);
      }
    };
  }, [isPlayerBuffering, bufferingOverlayOpacity]);

  // Controls visibility handlers
  const hideControls = useCallback(() => {
    controlsOpacity.value = withTiming(0, { duration: 300 });
    setShowControls(false);
  }, [controlsOpacity]);

  const showControlsWithTimeout = useCallback(() => {
    controlsOpacity.value = withTiming(1, { duration: 200 });
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (!showChannelList) {
        runOnJS(hideControls)();
      }
    }, CONTROLS_TIMEOUT);
  }, [controlsOpacity, hideControls, showChannelList]);

  const toggleControls = useCallback(() => {
    if (showControls) {
      hideControls();
    } else {
      showControlsWithTimeout();
    }
  }, [showControls, hideControls, showControlsWithTimeout]);

  // Action handlers
  const handleBack = useCallback(() => {
    dismissModal();
  }, []);

  const handleChannelChange = useCallback((channel: LiveTvChannel) => {
    setCurrentChannelId(channel.Id);
    setShowChannelList(false);
    setIsPlayerBuffering(true);
    setShowBufferingOverlay(true);
    bufferingOverlayOpacity.value = 1;
  }, [bufferingOverlayOpacity]);

  const handleToggleFavorite = useCallback(() => {
    if (currentChannelId) {
      toggleFavoriteChannel(currentChannelId);
    }
  }, [currentChannelId, toggleFavoriteChannel]);

  const handleNextChannel = useCallback(() => {
    const currentIndex = channels.findIndex((ch) => ch.Id === currentChannelId);
    if (currentIndex < channels.length - 1) {
      handleChannelChange(channels[currentIndex + 1]);
    }
  }, [channels, currentChannelId, handleChannelChange]);

  const handlePrevChannel = useCallback(() => {
    const currentIndex = channels.findIndex((ch) => ch.Id === currentChannelId);
    if (currentIndex > 0) {
      handleChannelChange(channels[currentIndex - 1]);
    }
  }, [channels, currentChannelId, handleChannelChange]);

  const handleToggleOrientationLock = useCallback(async () => {
    try {
      if (isOrientationLocked) {
        await ScreenOrientation.unlockAsync();
        setIsOrientationLocked(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsOrientationLocked(true);
      }
    } catch {}
  }, [isOrientationLocked]);

  const handleRetry = useCallback(() => {
    setStreamError(null);
    setIsPlayerBuffering(true);
    setShowBufferingOverlay(true);
    bufferingOverlayOpacity.value = 1;
    setStreamUrlIndex(0);
    setStreamUrl(null);
    setTimeout(() => {
      const url = generateStreamUrl(currentChannelId, 0);
      setStreamUrl(url);
    }, 100);
  }, [currentChannelId, generateStreamUrl, bufferingOverlayOpacity]);

  // Gesture
  const tapGesture = useMemo(() =>
    Gesture.Tap().onEnd(() => {
      runOnJS(toggleControls)();
    }),
    [toggleControls]
  );

  // Derived values
  const isFavorite = favoriteChannelIds.includes(currentChannelId);
  const currentProgram = currentChannel?.CurrentProgram;

  return {
    // Channel data
    currentChannel,
    channelLoading,
    channels,
    currentChannelId,
    isFavorite,
    currentProgram,

    // Stream state
    streamUrl,
    streamError,
    player,

    // UI state
    showControls,
    showBufferingOverlay,
    showChannelList,
    isOrientationLocked,

    // Settings
    accentColor,
    insets,

    // Animations
    controlsOpacity,
    bufferingOverlayOpacity,

    // Gestures
    tapGesture,

    // Callbacks
    handleBack,
    handleChannelChange,
    handleToggleFavorite,
    handleNextChannel,
    handlePrevChannel,
    handleToggleOrientationLock,
    toggleControls,
    showControlsWithTimeout,
    setShowChannelList,
    handleRetry,
  };
}
