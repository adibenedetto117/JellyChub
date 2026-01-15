import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { NowPlayingBars } from '@/components/shared/ui/NowPlayingBars';
import { getImageUrl, getDisplayImageUrl, formatDuration, ticksToMs } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface PlaylistTracksListProps {
  tracks: { Items: BaseItem[] } | undefined;
  isLoading: boolean;
  error: unknown;
  accentColor: string;
  hideMedia: boolean;
  currentItemId: string | undefined;
  playerState: string;
  onTrackOptions: (track: BaseItem) => void;
  t: (key: string) => string;
}

export function PlaylistTracksList({
  tracks,
  isLoading,
  error,
  accentColor,
  hideMedia,
  currentItemId,
  playerState,
  onTrackOptions,
  t,
}: PlaylistTracksListProps) {
  if (error) {
    return (
      <View className="mt-6 py-4">
        <Text className="text-red-500 text-center">Error loading tracks: {(error as any)?.message || 'Unknown error'}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="mt-6 py-8 items-center">
        <ActivityIndicator color={accentColor} size="large" />
      </View>
    );
  }

  if (!tracks || tracks.Items.length === 0) {
    return (
      <View className="mt-6">
        <Text className="text-text-tertiary text-center py-4">{t('details.playlistEmpty')}</Text>
      </View>
    );
  }

  return (
    <View className="mt-6">
      {tracks.Items.map((track, index) => {
        const albumId = (track as any).AlbumId || track.Id;
        const imageTag = (track as any).AlbumPrimaryImageTag || track.ImageTags?.Primary;
        const rawTrackImageUrl = imageTag
          ? getImageUrl(albumId, 'Primary', { maxWidth: 100, tag: imageTag })
          : null;
        const trackImageUrl = getDisplayImageUrl(track.Id, rawTrackImageUrl, hideMedia, 'Primary');
        const rawArtistName = (track as any).Artists?.[0] || (track as any).AlbumArtist || '';
        const rawAlbumName = (track as any).Album || '';
        const artistName = hideMedia ? 'Artist' : rawArtistName;
        const albumName = hideMedia ? 'Album' : rawAlbumName;
        const trackDisplayName = hideMedia ? `Track ${index + 1}` : track.Name;
        const isPlaying = currentItemId === track.Id;
        const isActive = isPlaying && (playerState === 'playing' || playerState === 'paused');

        return (
          <View
            key={track.Id}
            className="py-3 flex-row items-center border-b border-white/10"
          >
            <Pressable
              className="flex-row items-center flex-1"
              onPress={() => router.push(`/player/music?itemId=${track.Id}`)}
            >
              <View className="w-12 h-12 rounded-lg overflow-hidden bg-surface mr-3 relative">
                {trackImageUrl ? (
                  <CachedImage
                    uri={trackImageUrl}
                    style={{ width: 48, height: 48 }}
                    borderRadius={8}
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-surface-elevated">
                    <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                {isActive && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: accentColor + 'E6', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                  >
                    <NowPlayingBars isPlaying={playerState === 'playing'} color="#fff" />
                  </Animated.View>
                )}
              </View>
              <View className="flex-1">
                <Text style={isActive ? { color: accentColor } : undefined} className={isActive ? 'font-medium' : 'text-white font-medium'} numberOfLines={1}>{trackDisplayName}</Text>
                {(rawArtistName || rawAlbumName) && (
                  <Text className="text-text-tertiary text-sm mt-0.5" numberOfLines={1}>
                    {artistName}{rawArtistName && rawAlbumName ? ' • ' : ''}{rawAlbumName ? albumName : ''}
                  </Text>
                )}
              </View>
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
      })}
    </View>
  );
}
