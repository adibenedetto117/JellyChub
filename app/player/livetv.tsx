import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore, useLiveTvStore } from '@/stores';
import { getChannel, getChannels, getLiveHlsStreamUrl, getLiveDirectStreamUrl, getLiveStreamUrl, getLiveTvPlaybackInfo, jellyfinClient } from '@/api';
import { goBack } from '@/utils';
import { colors } from '@/theme';
import type { LiveTvChannel } from '@/types/livetv';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONTROLS_TIMEOUT = 5000;

// Stream URL generators to try in order (fallbacks)
const STREAM_URL_GENERATORS = [
  getLiveHlsStreamUrl,
  getLiveDirectStreamUrl,
  getLiveStreamUrl,
];

export default function LiveTvPlayerScreen() {
  const { t } = useTranslation();
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const currentUser = useAuthStore((s) => s.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';
  const insets = useSafeAreaInsets();

  const addRecentChannel = useLiveTvStore((s) => s.addRecentChannel);
  const toggleFavoriteChannel = useLiveTvStore((s) => s.toggleFavoriteChannel);
  const favoriteChannelIds = useLiveTvStore((s) => s.favoriteChannelIds);

  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showChannelList, setShowChannelList] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState(channelId);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamUrlIndex, setStreamUrlIndex] = useState(0);
  const [isOrientationLocked, setIsOrientationLocked] = useState(true);

  const controlsOpacity = useSharedValue(1);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
      setIsBuffering(true);
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
  }, [streamUrlIndex, currentChannelId, generateStreamUrl]);

  useEffect(() => {
    if (currentChannelId && userId) {
      setStreamError(null);
      setStreamUrlIndex(0);
      setIsBuffering(true);

      // Try PlaybackInfo approach first
      const fetchStreamUrl = async () => {
        try {
          console.log('[LiveTV] Trying PlaybackInfo approach...');
          const playbackInfo = await getLiveTvPlaybackInfo(currentChannelId, userId);
          console.log('[LiveTV] PlaybackInfo response:', playbackInfo);

          if (playbackInfo?.MediaSources?.[0]) {
            const mediaSource = playbackInfo.MediaSources[0];

            // Check for direct stream URL
            if (mediaSource.SupportsDirectStream && mediaSource.DirectStreamUrl) {
              const directUrl = `${jellyfinClient.url}${mediaSource.DirectStreamUrl}`;
              console.log('[LiveTV] Using DirectStreamUrl:', directUrl);
              setStreamUrl(directUrl);
              addRecentChannel(currentChannelId);
              return;
            }

            // Check for transcoding URL
            if (mediaSource.SupportsTranscoding && mediaSource.TranscodingUrl) {
              const transcodingUrl = `${jellyfinClient.url}${mediaSource.TranscodingUrl}`;
              console.log('[LiveTV] Using TranscodingUrl:', transcodingUrl);
              setStreamUrl(transcodingUrl);
              addRecentChannel(currentChannelId);
              return;
            }
          }

          // Fallback to manual URL generation
          console.log('[LiveTV] PlaybackInfo did not provide stream URL, falling back to manual URLs');
          const url = generateStreamUrl(currentChannelId, 0);
          console.log(`[LiveTV] Trying stream URL format 0:`, url);
          if (url) {
            setStreamUrl(url);
            addRecentChannel(currentChannelId);
          } else {
            setStreamError('Failed to generate stream URL');
            setIsBuffering(false);
          }
        } catch (error) {
          console.error('[LiveTV] PlaybackInfo failed:', error);
          // Fallback to manual URL generation
          const url = generateStreamUrl(currentChannelId, 0);
          console.log(`[LiveTV] Fallback - trying stream URL format 0:`, url);
          if (url) {
            setStreamUrl(url);
            addRecentChannel(currentChannelId);
          } else {
            setStreamError('Failed to load stream');
            setIsBuffering(false);
          }
        }
      };

      fetchStreamUrl();
    }
  }, [currentChannelId, userId, addRecentChannel, generateStreamUrl]);

  useEffect(() => {
    const setup = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
      await activateKeepAwakeAsync();
    };

    setup();

    return () => {
      ScreenOrientation.unlockAsync();
      deactivateKeepAwake();
    };
  }, []);

  const player = useVideoPlayer(streamUrl ?? '', (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener('statusChange', (event) => {
      console.log('[LiveTV] Player status:', event.status, event);
      if (event.status === 'readyToPlay') {
        setIsBuffering(false);
        setStreamError(null);
      } else if (event.status === 'loading') {
        setIsBuffering(true);
      } else if (event.status === 'error') {
        console.error('[LiveTV] Player error:', event);
        setIsBuffering(false);
        // Try next stream format automatically
        if (streamUrlIndex < STREAM_URL_GENERATORS.length - 1) {
          console.log(`Stream format ${streamUrlIndex} failed, trying next...`);
          tryNextStreamUrl();
        } else {
          setStreamError('Stream playback failed - please try again');
        }
      }
    });

    // Also listen for playback errors
    const errorSub = player.addListener('playingChange', (event) => {
      console.log('[LiveTV] Playing state:', event.isPlaying);
    });

    return () => {
      statusSub.remove();
      errorSub.remove();
    };
  }, [player, streamUrlIndex, tryNextStreamUrl]);

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

  const handleBack = useCallback(() => {
    goBack('/(tabs)/home');
  }, []);

  const handleChannelChange = useCallback((channel: LiveTvChannel) => {
    setCurrentChannelId(channel.Id);
    setShowChannelList(false);
    setIsBuffering(true);
  }, []);

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
    if (isOrientationLocked) {
      await ScreenOrientation.unlockAsync();
      setIsOrientationLocked(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsOrientationLocked(true);
    }
  }, [isOrientationLocked]);

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(toggleControls)();
  });

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
    pointerEvents: controlsOpacity.value > 0.5 ? 'auto' : 'none',
  }));

  const isFavorite = favoriteChannelIds.includes(currentChannelId);
  const currentProgram = currentChannel?.CurrentProgram;

  const renderChannelItem = useCallback(
    ({ item }: { item: LiveTvChannel }) => {
      const isActive = item.Id === currentChannelId;
      return (
        <Pressable
          onPress={() => handleChannelChange(item)}
          style={[
            styles.channelItem,
            isActive && { backgroundColor: accentColor + '30' },
          ]}
        >
          <Text style={styles.channelNumber}>{item.Number ?? item.ChannelNumber}</Text>
          <View style={styles.channelItemInfo}>
            <Text style={[styles.channelItemName, isActive && { color: accentColor }]}>
              {item.Name}
            </Text>
            {item.CurrentProgram && (
              <Text style={styles.channelItemProgram} numberOfLines={1}>
                {item.CurrentProgram.Name}
              </Text>
            )}
          </View>
          {isActive && (
            <Ionicons name="play" size={16} color={accentColor} />
          )}
        </Pressable>
      );
    },
    [currentChannelId, handleChannelChange, accentColor]
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <GestureDetector gesture={tapGesture}>
        <View style={styles.videoContainer}>
          {streamUrl && !streamError && (
            <VideoView
              player={player}
              style={styles.video}
              nativeControls={false}
              contentFit="contain"
            />
          )}

          {streamError ? (
            <View style={styles.errorOverlay}>
              <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.6)" />
              <Text style={styles.errorText}>{streamError}</Text>
              <Pressable
                style={[styles.retryButton, { backgroundColor: accentColor }]}
                onPress={() => {
                  // Reset and try from the beginning
                  setStreamError(null);
                  setIsBuffering(true);
                  setStreamUrlIndex(0);
                  setStreamUrl(null);
                  setTimeout(() => {
                    const url = generateStreamUrl(currentChannelId, 0);
                    setStreamUrl(url);
                  }, 100);
                }}
              >
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : isBuffering ? (
            <View style={styles.bufferingOverlay}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.bufferingText}>{t('player.loadingStream')}</Text>
            </View>
          ) : null}
        </View>
      </GestureDetector>

      <Animated.View style={[styles.controlsContainer, controlsStyle]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.5)', 'transparent']}
          style={styles.topGradient}
        >
          <View style={[
            styles.topControls,
            {
              paddingTop: Math.max(insets.top, 16) + 8,
              paddingLeft: Math.max(insets.left, 24),
              paddingRight: Math.max(insets.right, 24),
            }
          ]}>
            <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
              <Ionicons name="arrow-back" size={26} color="#fff" />
            </Pressable>

            <View style={styles.channelInfo}>
              {currentChannel && (
                <>
                  <Text style={styles.channelName}>{currentChannel.Name}</Text>
                  {currentChannel.Number && (
                    <Text style={styles.channelNumberBadge}>
                      CH {currentChannel.Number}
                    </Text>
                  )}
                </>
              )}
            </View>

            <View style={styles.topRightControls}>
              <Pressable onPress={handleToggleOrientationLock} style={styles.controlButton} hitSlop={8}>
                <Ionicons
                  name={isOrientationLocked ? 'lock-closed' : 'lock-open'}
                  size={20}
                  color={isOrientationLocked ? accentColor : '#fff'}
                />
              </Pressable>
              <Pressable onPress={handleToggleFavorite} style={styles.controlButton} hitSlop={8}>
                <Ionicons
                  name={isFavorite ? 'star' : 'star-outline'}
                  size={22}
                  color={isFavorite ? '#FFD700' : '#fff'}
                />
              </Pressable>
              <Pressable
                onPress={() => setShowChannelList(!showChannelList)}
                style={styles.controlButton}
                hitSlop={8}
              >
                <Ionicons name="list" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
          style={styles.bottomGradient}
        >
          <View style={[
            styles.bottomControls,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              paddingLeft: Math.max(insets.left, 24),
              paddingRight: Math.max(insets.right, 24),
            }
          ]}>
            {currentProgram && (
              <View style={styles.programInfo}>
                <View style={[styles.liveBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.liveBadgeText}>{t('player.live')}</Text>
                </View>
                <Text style={styles.programTitle} numberOfLines={1}>
                  {currentProgram.Name}
                </Text>
                <Text style={styles.programTime}>
                  {new Date(currentProgram.StartDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {new Date(currentProgram.EndDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            <View style={styles.channelNavigation}>
              <Pressable onPress={handlePrevChannel} style={styles.navButton}>
                <Ionicons name="chevron-up" size={28} color="#fff" />
              </Pressable>
              <Pressable onPress={handleNextChannel} style={styles.navButton}>
                <Ionicons name="chevron-down" size={28} color="#fff" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {showChannelList && (
        <Animated.View style={styles.channelListContainer}>
          <View style={styles.channelListHeader}>
            <Text style={styles.channelListTitle}>{t('liveTV.channels')}</Text>
            <Pressable onPress={() => setShowChannelList(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          <FlatList
            data={channels}
            renderItem={renderChannelItem}
            keyExtractor={(item) => item.Id}
            style={styles.channelList}
            contentContainerStyle={styles.channelListContent}
            initialScrollIndex={Math.max(
              0,
              channels.findIndex((ch) => ch.Id === currentChannelId)
            )}
            getItemLayout={(_, index) => ({
              length: 64,
              offset: 64 * index,
              index,
            })}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bufferingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    gap: 16,
  },
  errorText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingBottom: 40,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  channelName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  channelNumberBadge: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomGradient: {
    paddingTop: 40,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  programInfo: {
    flex: 1,
    marginRight: 20,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 10,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  programTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  programTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  channelNavigation: {
    gap: 10,
  },
  navButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelListContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderLeftWidth: 1,
    borderLeftColor: colors.border.default,
  },
  channelListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  channelListTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  channelList: {
    flex: 1,
  },
  channelListContent: {
    paddingBottom: 32,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  channelNumber: {
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
    width: 40,
  },
  channelItemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  channelItemName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  channelItemProgram: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 2,
  },
});
