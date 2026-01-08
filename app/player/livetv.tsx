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
import { useAuthStore, useSettingsStore, useLiveTvStore } from '@/stores';
import { getChannel, getChannels, getLiveHlsStreamUrl } from '@/api';
import { goBack } from '@/utils';
import { colors } from '@/theme';
import type { LiveTvChannel } from '@/types/livetv';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONTROLS_TIMEOUT = 5000;

export default function LiveTvPlayerScreen() {
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

  const controlsOpacity = useSharedValue(1);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

  useEffect(() => {
    if (currentChannelId) {
      const url = getLiveHlsStreamUrl(currentChannelId);
      setStreamUrl(url);
      addRecentChannel(currentChannelId);
    }
  }, [currentChannelId, addRecentChannel]);

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
      if (event.status === 'readyToPlay') {
        setIsBuffering(false);
      } else if (event.status === 'loading') {
        setIsBuffering(true);
      }
    });

    return () => {
      statusSub.remove();
    };
  }, [player]);

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
          {streamUrl && (
            <VideoView
              player={player}
              style={styles.video}
              nativeControls={false}
              contentFit="contain"
            />
          )}

          {isBuffering && (
            <View style={styles.bufferingOverlay}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.bufferingText}>Loading stream...</Text>
            </View>
          )}
        </View>
      </GestureDetector>

      <Animated.View style={[styles.controlsContainer, controlsStyle]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent']}
          style={styles.topGradient}
        >
          <View style={[styles.topControls, { paddingTop: insets.top }]}>
            <Pressable onPress={handleBack} style={styles.controlButton}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
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
              <Pressable onPress={handleToggleFavorite} style={styles.controlButton}>
                <Ionicons
                  name={isFavorite ? 'star' : 'star-outline'}
                  size={24}
                  color={isFavorite ? '#FFD700' : '#fff'}
                />
              </Pressable>
              <Pressable
                onPress={() => setShowChannelList(!showChannelList)}
                style={styles.controlButton}
              >
                <Ionicons name="list" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bottomGradient}
        >
          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
            {currentProgram && (
              <View style={styles.programInfo}>
                <View style={[styles.liveBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
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
            <Text style={styles.channelListTitle}>Channels</Text>
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
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingHorizontal: 16,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: {
    flex: 1,
    alignItems: 'center',
  },
  channelName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  channelNumberBadge: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 8,
  },
  bottomGradient: {
    paddingHorizontal: 16,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  programInfo: {
    flex: 1,
    marginRight: 16,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  programTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  programTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  channelNavigation: {
    gap: 8,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
