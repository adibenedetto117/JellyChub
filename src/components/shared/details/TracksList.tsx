import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { NowPlayingBars } from '@/components/shared/ui/NowPlayingBars';
import { DownloadIcon } from './DownloadIcon';
import { formatDuration, ticksToMs } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface TracksListProps {
  tracks: { Items: BaseItem[] } | undefined;
  isLoading: boolean;
  accentColor: string;
  hideMedia: boolean;
  isBatchDownloading: boolean;
  currentItemId: string | undefined;
  playerState: string;
  setQueue: (items: { id: string; item: BaseItem; index: number }[], startIndex?: number) => void;
  onTrackOptions: (track: BaseItem) => void;
  onDownloadAlbum: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function TracksList({
  tracks,
  isLoading,
  accentColor,
  hideMedia,
  isBatchDownloading,
  currentItemId,
  playerState,
  setQueue,
  onTrackOptions,
  onDownloadAlbum,
  t,
}: TracksListProps) {
  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white text-lg font-semibold">
          {tracks ? t('details.tracksCount', { count: tracks.Items.length }) : t('details.tracks')}
        </Text>
        {tracks && tracks.Items.length > 0 && (
          <Pressable
            onPress={onDownloadAlbum}
            disabled={isBatchDownloading}
            className="flex-row items-center px-3 py-2 rounded-lg"
            style={{ backgroundColor: accentColor + '20' }}
          >
            {isBatchDownloading ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <>
                <DownloadIcon size={16} color={accentColor} />
                <Text style={{ color: accentColor }} className="text-sm font-medium ml-2">
                  {t('details.downloadAlbum')}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator color={accentColor} size="large" />
        </View>
      ) : tracks && tracks.Items.length > 0 ? (
        tracks.Items.map((track, index) => {
          const isPlaying = currentItemId === track.Id;
          const isActive = isPlaying && (playerState === 'playing' || playerState === 'paused');
          const trackDisplayName = hideMedia ? `Track ${index + 1}` : track.Name;
          return (
            <View
              key={track.Id}
              className="py-4 flex-row items-center border-b border-white/10"
            >
              <Pressable
                className="flex-row items-center flex-1"
                onPress={() => {
                  const queueItems = tracks.Items.map((t, i) => ({
                    id: t.Id,
                    item: t,
                    index: i,
                  }));
                  setQueue(queueItems, index);
                  router.push(`/player/music?itemId=${track.Id}`);
                }}
              >
                <View className="w-10 items-center justify-center">
                  {isActive ? (
                    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
                      <NowPlayingBars isPlaying={playerState === 'playing'} color={accentColor} size="small" />
                    </Animated.View>
                  ) : (
                    <Text className="text-text-tertiary text-center">{index + 1}</Text>
                  )}
                </View>
                <Text style={isActive ? { color: accentColor } : undefined} className={isActive ? 'flex-1' : 'text-white flex-1'} numberOfLines={1}>{trackDisplayName}</Text>
                <Text className="text-text-tertiary text-sm ml-3">
                  {formatDuration(ticksToMs(track.RunTimeTicks ?? 0))}
                </Text>
              </Pressable>
              <Pressable
                className="w-10 h-10 items-center justify-center ml-2"
                onPress={() => onTrackOptions(track)}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.5)" />
              </Pressable>
            </View>
          );
        })
      ) : (
        <Text className="text-text-tertiary text-center py-4">{t('details.noTracksFound')}</Text>
      )}
    </View>
  );
}
