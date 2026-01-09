import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeIn, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore, useSettingsStore } from '@/stores';
import { selectMiniPlayerSettings } from '@/stores/settingsStore';
import { audioService } from '@/services';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl, getDisplayArtist } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { memo, useCallback, useMemo, useState, useEffect } from 'react';

// Isolated progress bar component - only this re-renders on progress updates
const MiniPlayerProgress = memo(function MiniPlayerProgress({ accentColor }: { accentColor: string }) {
  const progress = usePlayerStore((state) => state.progress);
  const progressPercent = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { backgroundColor: accentColor, width: `${progressPercent}%` }]} />
    </View>
  );
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 64;
const BOTTOM_NAV_HEIGHT = 56; // Base height without safe area
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger action

// Paths where MiniPlayer should be hidden
const HIDDEN_PATHS = ['/player/music', '/player/video', '/player/audiobook', '/(auth)', '/login'];

export const MiniPlayer = memo(function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  // Use compound selector with useShallow to reduce subscriptions (2 → 1)
  const { accentColor, hideMedia } = useSettingsStore(useShallow(selectMiniPlayerSettings));

  // Player store - only subscribe to what changes infrequently
  // Progress is handled by isolated MiniPlayerProgress component to avoid re-renders
  const currentItem = usePlayerStore((state) => state.currentItem);
  const playerState = usePlayerStore((state) => state.playerState);
  const mediaType = usePlayerStore((state) => state.mediaType);

  const [isDismissing, setIsDismissing] = useState(false);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (currentItem && isDismissing) {
      setIsDismissing(false);
      translateY.value = 0;
    }
  }, [currentItem, isDismissing, translateY]);

  // Memoize path checking to avoid repeated string operations
  const shouldHide = useMemo(() => {
    if (!pathname) return true;
    return HIDDEN_PATHS.some(path => pathname.includes(path));
  }, [pathname]);

  const shouldShow = currentItem && (mediaType === 'audio' || mediaType === 'audiobook') && !shouldHide;

  const item = currentItem?.item;

  const albumArtUrl = useMemo(() => {
    if (!item) return null;
    let rawUrl: string | null = null;
    if (item.ImageTags?.Primary) {
      rawUrl = getImageUrl(item.Id, 'Primary', { maxWidth: 200, tag: item.ImageTags.Primary });
    } else {
      const albumId = (item as any)?.AlbumId;
      const albumArtTag = (item as any)?.AlbumPrimaryImageTag;
      if (albumId && albumArtTag) {
        rawUrl = getImageUrl(albumId, 'Primary', { maxWidth: 200, tag: albumArtTag });
      } else if (albumId) {
        rawUrl = getImageUrl(albumId, 'Primary', { maxWidth: 200 });
      }
    }
    return getDisplayImageUrl(item.Id, rawUrl, hideMedia, 'Primary');
  }, [item, hideMedia]);

  const displayName = useMemo(() => {
    if (!item) return 'Unknown';
    return getDisplayName(item, hideMedia);
  }, [item, hideMedia]);

  const artistName = useMemo(() => {
    if (!item) return '';
    return getDisplayArtist(item, hideMedia);
  }, [item, hideMedia]);

  const isPlaying = playerState === 'playing';

  const handlePress = useCallback(() => {
    if (item) {
      if (mediaType === 'audiobook') {
        router.push(`/player/audiobook?itemId=${item.Id}`);
      } else {
        router.push(`/player/music?itemId=${item.Id}`);
      }
    }
  }, [item, router, mediaType]);

  const handlePlayPause = useCallback(async () => {
    await audioService.togglePlayPause();
  }, []);

  const stopAudio = useCallback(async () => {
    await audioService.stop();
  }, []);

  const handleSkipNext = useCallback(async () => {
    await audioService.skipToNext();
  }, []);

  const handleSkipPrev = useCallback(async () => {
    await audioService.skipToPrevious();
  }, []);

  const handleClose = useCallback(async () => {
    if (isDismissing) return;
    setIsDismissing(true);
    translateY.value = withTiming(MINI_PLAYER_HEIGHT + 20, { duration: 200 });
    setTimeout(async () => {
      await stopAudio();
    }, 200);
  }, [isDismissing, translateY, stopAudio]);

  const handlePlayPausePress = useCallback((e: any) => {
    e.stopPropagation();
    handlePlayPause();
  }, [handlePlayPause]);

  const handleClosePress = useCallback((e: any) => {
    e.stopPropagation();
    handleClose();
  }, [handleClose]);

  const translateX = useSharedValue(0);

  // Swipe gesture for skip and dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Horizontal swipe for skip
      translateX.value = event.translationX * 0.5;
      // Vertical swipe for dismiss (only down)
      if (event.translationY > 0) {
        translateY.value = event.translationY * 0.5;
      }
    })
    .onEnd((event) => {
      // Horizontal: skip prev/next
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        if (event.translationX > 0) {
          runOnJS(handleSkipPrev)();
        } else {
          runOnJS(handleSkipNext)();
        }
      }
      // Vertical: dismiss if swiped down
      if (event.translationY > SWIPE_THRESHOLD) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  if (!shouldShow) return null;

  // Position above the bottom nav
  const bottomPosition = BOTTOM_NAV_HEIGHT + insets.bottom;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        entering={FadeIn.duration(200)}
        style={[
          styles.container,
          { bottom: bottomPosition },
          animatedStyle
        ]}
      >
        {/* Progress bar at top - isolated component to avoid re-renders */}
        <MiniPlayerProgress accentColor={accentColor} />

        <Pressable onPress={handlePress} style={styles.content}>
          {/* Album Art */}
          <CachedImage
            uri={albumArtUrl}
            style={[styles.albumArt, { borderRadius: mediaType === 'audiobook' ? 4 : 6 }]}
            showSkeleton={false}
          />

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={styles.trackName} numberOfLines={1}>
              {displayName}
            </Text>
            {artistName ? (
              <Text style={styles.artistName} numberOfLines={1}>
                {artistName}
              </Text>
            ) : null}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Skip Previous */}
            <Pressable
              onPress={(e) => { e.stopPropagation(); handleSkipPrev(); }}
              style={styles.skipButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="play-skip-back" size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>

            {/* Play/Pause */}
            <Pressable
              onPress={handlePlayPausePress}
              style={[styles.playButton, { backgroundColor: accentColor }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={24}
                color="#fff"
                style={{ marginLeft: isPlaying ? 0 : 2 }}
              />
            </Pressable>

            {/* Skip Next */}
            <Pressable
              onPress={(e) => { e.stopPropagation(); handleSkipNext(); }}
              style={styles.skipButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="play-skip-forward" size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>

            {/* Close Button */}
            <Pressable
              onPress={handleClosePress}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    zIndex: 100,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: '100%',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 2,
  },
  albumArt: {
    width: 48,
    height: 48,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  trackName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  artistName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skipButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});

// Export the height for layout calculations
export const MINI_PLAYER_HEIGHT_EXPORT = MINI_PLAYER_HEIGHT;
