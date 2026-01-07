import { View, Text, Pressable, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { usePlayerStore, useSettingsStore } from '@/stores';
import { audioService } from '@/services';
import { getImageUrl } from '@/api';
import { getDisplayName, getDisplayImageUrl } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { useCallback, useMemo, useState, useEffect } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  const currentItem = usePlayerStore((state) => state.currentItem);
  const playerState = usePlayerStore((state) => state.playerState);
  const progress = usePlayerStore((state) => state.progress);
  const mediaType = usePlayerStore((state) => state.mediaType);

  const [isDismissing, setIsDismissing] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (currentItem && isDismissing) {
      setIsDismissing(false);
      scale.value = 1;
      opacity.value = 1;
    }
  }, [currentItem, isDismissing, scale, opacity]);

  const isOnMusicPlayer = pathname?.includes('/player/music') ?? false;
  const isOnVideoPlayer = pathname?.includes('/player/video') ?? false;
  const isOnAudiobookPlayer = pathname?.includes('/player/audiobook') ?? false;
  const isOnAuth = pathname?.includes('/(auth)') || pathname?.includes('/login') || false;

  const shouldHide = isOnMusicPlayer || isOnVideoPlayer || isOnAudiobookPlayer || isOnAuth || !pathname;
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

  const progressPercent = useMemo(() => {
    return progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;
  }, [progress.position, progress.duration]);
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

  const handleClose = useCallback(async () => {
    if (isDismissing) return;
    setIsDismissing(true);
    scale.value = withSpring(0, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(0, { duration: 150 });
    await stopAudio();
  }, [isDismissing, scale, opacity, stopAudio]);

  const handlePlayPausePress = useCallback((e: any) => {
    e.stopPropagation();
    handlePlayPause();
  }, [handlePlayPause]);

  const handleClosePress = useCallback((e: any) => {
    e.stopPropagation();
    handleClose();
  }, [handleClose]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -80 }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!shouldShow) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: insets.top + 8,
          alignSelf: 'center',
          left: '50%',
          width: 160,
          height: 40,
          zIndex: 100,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a1a',
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 3,
          paddingRight: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 10,
          overflow: 'hidden',
        }}
      >
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 2,
          backgroundColor: accentColor,
          width: `${progressPercent}%`,
          borderRadius: 1,
        }}
      />

      <CachedImage
        uri={albumArtUrl}
        style={{ width: 34, height: 34 }}
        borderRadius={mediaType === 'audiobook' ? 4 : 17}
        showSkeleton={false}
      />

      <View style={{ flex: 1, marginLeft: 6, marginRight: 2 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      <Pressable
        onPress={handlePlayPausePress}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={16}
          color="#fff"
          style={{ marginLeft: isPlaying ? 0 : 2 }}
        />
      </Pressable>

      <Pressable
        onPress={handleClosePress}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
      </Pressable>
      </Pressable>
    </Animated.View>
  );
}
