import { useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import { useChromecast } from '@/hooks';
import type { CastMediaInfo, CastSessionState } from '@/utils/casting';

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
