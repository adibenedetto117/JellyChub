import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { useSettingsStore, useAuthStore } from '@/stores';
import { formatPlayerTime } from '@/utils';
import { useChromecast } from '@/hooks';
import { stopCasting, type CastMediaInfo, type CastSessionState } from '@/utils/casting';

interface CastRemoteControlProps {
  visible: boolean;
  castState: CastSessionState;
  mediaInfo: CastMediaInfo | null;
  itemId?: string;
  onDisconnect: (position: number) => void;
  onClose: () => void;
}

export function CastRemoteControl({
  visible,
  castState,
  mediaInfo,
  itemId,
  onDisconnect,
  onClose,
}: CastRemoteControlProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const activeServer = useAuthStore((s) => s.getActiveServer());
  const chromecast = useChromecast();
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(mediaInfo?.startPosition || 0);
  const [duration, setDuration] = useState(mediaInfo?.duration || 0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mediaInfo?.startPosition) {
      setCurrentPosition(mediaInfo.startPosition);
    }
    if (mediaInfo?.duration) {
      setDuration(mediaInfo.duration);
    }
  }, [mediaInfo]);

  useEffect(() => {
    if (!visible || castState.connectionState !== 'connected') {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      return;
    }

    const pollStatus = async () => {
      const position = await chromecast.getPosition();
      if (position !== null && !isSeeking) {
        setCurrentPosition(position);
      }
    };

    pollStatus();
    pollInterval.current = setInterval(pollStatus, 1000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, [visible, castState.connectionState, isSeeking, chromecast]);

  const handlePlayPause = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isPlaying) {
        await chromecast.pause();
        setIsPlaying(false);
      } else {
        await chromecast.play();
        setIsPlaying(true);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, chromecast]);

  const handleSeek = useCallback(async (positionMs: number) => {
    try {
      await chromecast.seek(positionMs);
      setCurrentPosition(positionMs);
    } catch {
    }
  }, [chromecast]);

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
    setSeekPosition(currentPosition);
  }, [currentPosition]);

  const handleSeekChange = useCallback((value: number) => {
    setSeekPosition(value);
  }, []);

  const handleSeekComplete = useCallback((value: number) => {
    handleSeek(value);
    setIsSeeking(false);
  }, [handleSeek]);

  const handleDisconnect = useCallback(async () => {
    const position = await chromecast.stop();
    onDisconnect(position || currentPosition);
  }, [currentPosition, onDisconnect, chromecast]);

  const handleSkip = useCallback((seconds: number) => {
    const newPosition = Math.max(0, Math.min(duration, currentPosition + seconds * 1000));
    handleSeek(newPosition);
  }, [currentPosition, duration, handleSeek]);

  if (!visible || castState.connectionState !== 'connected') {
    return null;
  }

  const imageUrl = mediaInfo?.imageUrl || (itemId && activeServer
    ? `${activeServer.url}/Items/${itemId}/Images/Primary?maxHeight=400${activeServer.accessToken ? `&api_key=${activeServer.accessToken}` : ''}`
    : null);

  const displayPosition = isSeeking ? seekPosition : currentPosition;

  return (
    <View className="absolute inset-0 bg-black/95">
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        className="absolute inset-0"
      />

      <View className="flex-1 items-center justify-center px-8">
        <View className="flex-row items-center mb-4">
          <Ionicons name="tv-outline" size={20} color={accentColor} />
          <Text className="text-white/80 text-sm ml-2">
            Casting to {castState.deviceName || 'Device'}
          </Text>
        </View>

        {imageUrl && (
          <View className="mb-8 rounded-xl overflow-hidden" style={{ elevation: 8 }}>
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 200, height: 300 }}
              contentFit="cover"
            />
          </View>
        )}

        <Text className="text-white text-xl font-bold text-center mb-2" numberOfLines={2}>
          {mediaInfo?.title || 'Unknown'}
        </Text>
        {mediaInfo?.subtitle && (
          <Text className="text-white/60 text-base text-center mb-8" numberOfLines={1}>
            {mediaInfo.subtitle}
          </Text>
        )}

        <View className="w-full max-w-lg mb-6">
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={duration}
            value={displayPosition}
            onSlidingStart={handleSeekStart}
            onValueChange={handleSeekChange}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor={accentColor}
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor="#fff"
          />
          <View className="flex-row justify-between px-2">
            <Text className="text-white/80 text-sm">
              {formatPlayerTime(displayPosition)}
            </Text>
            <Text className="text-white/60 text-sm">
              {formatPlayerTime(duration)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-8">
          <Pressable
            onPress={() => handleSkip(-30)}
            className="w-14 h-14 rounded-full bg-white/10 items-center justify-center active:bg-white/20"
          >
            <Ionicons name="play-back" size={24} color="#fff" />
          </Pressable>

          <Pressable
            onPress={() => handleSkip(-10)}
            className="w-16 h-16 rounded-full bg-white/10 items-center justify-center active:bg-white/20"
          >
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons
                name="refresh"
                size={26}
                color="#fff"
                style={{ transform: [{ scaleX: -1 }] }}
              />
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', position: 'absolute', top: 8 }}>10</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handlePlayPause}
            className="w-20 h-20 rounded-full items-center justify-center"
            style={{ backgroundColor: accentColor }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : isPlaying ? (
              <Ionicons name="pause" size={36} color="#fff" />
            ) : (
              <Ionicons name="play" size={36} color="#fff" />
            )}
          </Pressable>

          <Pressable
            onPress={() => handleSkip(10)}
            className="w-16 h-16 rounded-full bg-white/10 items-center justify-center active:bg-white/20"
          >
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="refresh" size={26} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', position: 'absolute', top: 8 }}>10</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleSkip(30)}
            className="w-14 h-14 rounded-full bg-white/10 items-center justify-center active:bg-white/20"
          >
            <Ionicons name="play-forward" size={24} color="#fff" />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-4 mt-12">
          <Pressable
            onPress={handleDisconnect}
            className="flex-row items-center px-6 py-3 rounded-full bg-red-500/20 active:bg-red-500/40"
          >
            <Ionicons name="stop-circle-outline" size={20} color="#ef4444" />
            <Text className="text-red-400 font-medium ml-2">Stop Casting</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            className="flex-row items-center px-6 py-3 rounded-full bg-white/10 active:bg-white/20"
          >
            <Ionicons name="chevron-down" size={20} color="#fff" />
            <Text className="text-white font-medium ml-2">Minimize</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface CastMiniControlProps {
  visible: boolean;
  castState: CastSessionState;
  mediaInfo: CastMediaInfo | null;
  onExpand: () => void;
  onDisconnect: () => void;
}

export function CastMiniControl({
  visible,
  castState,
  mediaInfo,
  onExpand,
  onDisconnect,
}: CastMiniControlProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const chromecast = useChromecast();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlayPause = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isPlaying) {
        await chromecast.pause();
        setIsPlaying(false);
      } else {
        await chromecast.play();
        setIsPlaying(true);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, chromecast]);

  if (!visible || castState.connectionState !== 'connected') {
    return null;
  }

  return (
    <Pressable
      onPress={onExpand}
      className="absolute bottom-24 left-4 right-4 h-16 rounded-xl overflow-hidden"
      style={{ backgroundColor: 'rgba(30,30,30,0.95)' }}
    >
      <View className="flex-1 flex-row items-center px-4">
        <View className="w-10 h-10 rounded-lg bg-white/10 items-center justify-center mr-3">
          <Ionicons name="tv-outline" size={20} color={accentColor} />
        </View>

        <View className="flex-1">
          <Text className="text-white font-medium" numberOfLines={1}>
            {mediaInfo?.title || 'Casting'}
          </Text>
          <Text className="text-white/60 text-sm" numberOfLines={1}>
            {castState.deviceName || 'Device'}
          </Text>
        </View>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handlePlayPause();
          }}
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : isPlaying ? (
            <Ionicons name="pause" size={20} color="#fff" />
          ) : (
            <Ionicons name="play" size={20} color="#fff" />
          )}
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onDisconnect();
          }}
          className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center"
        >
          <Ionicons name="close" size={20} color="#ef4444" />
        </Pressable>
      </View>
    </Pressable>
  );
}
