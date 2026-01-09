import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useAuthStore, useSettingsStore, usePlayerStore } from '@/stores';
import { getItem, getPlaylistItems, getImageUrl } from '@/api';
import { CachedImage } from '@/components/ui/CachedImage';
import { NowPlayingBars } from '@/components/ui/NowPlayingBars';
import { TrackOptionsMenu } from '@/components/music/TrackOptionsMenu';
import { formatDuration, ticksToMs, getDisplayName, getDisplayImageUrl, getDisplayArtist, goBack } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem, AudioTrack } from '@/types/jellyfin';

export default function PlaylistScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const currentItem = usePlayerStore((s) => s.currentItem);
  const playerState = usePlayerStore((s) => s.playerState);
  const userId = currentUser?.Id ?? '';

  const [selectedTrack, setSelectedTrack] = useState<BaseItem | null>(null);
  const [showTrackOptions, setShowTrackOptions] = useState(false);

  const { data: playlist, isLoading: isLoadingPlaylist } = useQuery({
    queryKey: ['playlist-info', id],
    queryFn: () => getItem<BaseItem>(userId, id),
    enabled: !!userId && !!id,
  });

  const { data: playlistTracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ['playlist-items', id],
    queryFn: () => getPlaylistItems(id, userId),
    enabled: !!userId && !!id,
  });

  const tracks = playlistTracks?.Items ?? [];
  const totalDuration = tracks.reduce((sum, t) => sum + (t.RunTimeTicks ?? 0), 0);

  const handleGoBack = () => {
    goBack(from, '/(tabs)/music');
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    const queueItems = tracks.map((track, index) => ({
      id: track.Id,
      item: track,
      index,
    }));
    setQueue(queueItems);
    router.push(`/player/music?itemId=${tracks[0].Id}`);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    const queueItems = shuffled.map((track, index) => ({
      id: track.Id,
      item: track,
      index,
    }));
    setQueue(queueItems);
    router.push(`/player/music?itemId=${shuffled[0].Id}`);
  };

  const handleTrackPress = (track: AudioTrack, index: number) => {
    const queueItems = tracks.map((t, i) => ({
      id: t.Id,
      item: t,
      index: i,
    }));
    setQueue(queueItems);
    router.push(`/player/music?itemId=${track.Id}`);
  };

  const renderTrack = ({ item, index }: { item: AudioTrack; index: number }) => {
    const albumId = (item as any).AlbumId || item.Id;
    const imageTag = (item as any).AlbumPrimaryImageTag || item.ImageTags?.Primary;
    const rawImageUrl = imageTag
      ? getImageUrl(albumId, 'Primary', { maxWidth: 100, tag: imageTag })
      : null;
    const imageUrl = getDisplayImageUrl(albumId, rawImageUrl, hideMedia, 'Primary');
    const rawArtists = item.Artists || [(item as any).AlbumArtist || ''];
    const displayArtists = getDisplayArtist(rawArtists, hideMedia);
    const artistName = displayArtists[0] || '';
    const albumName = (item as any).Album || '';
    const displayName = getDisplayName(item, hideMedia);
    const isPlaying = currentItem?.item?.Id === item.Id;
    const isActive = isPlaying && (playerState === 'playing' || playerState === 'paused');

    return (
      <View style={styles.trackRow}>
        <Pressable
          style={styles.trackContent}
          onPress={() => handleTrackPress(item, index)}
        >
          <View style={styles.trackImage}>
            {imageUrl ? (
              <CachedImage
                uri={imageUrl}
                style={{ width: 48, height: 48 }}
                borderRadius={6}
              />
            ) : (
              <View style={styles.trackPlaceholder}>
                <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            {isActive && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={[styles.playingOverlay, { backgroundColor: accentColor + 'E6' }]}
              >
                <NowPlayingBars isPlaying={playerState === 'playing'} color="#fff" />
              </Animated.View>
            )}
          </View>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackName, isActive && { color: accentColor }]} numberOfLines={1}>{displayName}</Text>
            {(artistName || albumName) && (
              <Text style={styles.trackArtist} numberOfLines={1}>
                {artistName}{artistName && albumName ? ' • ' : ''}{albumName}
              </Text>
            )}
          </View>
          <Text style={styles.trackDuration}>
            {formatDuration(ticksToMs(item.RunTimeTicks ?? 0))}
          </Text>
        </Pressable>
        <Pressable
          style={styles.trackOptionsButton}
          onPress={() => {
            setSelectedTrack(item);
            setShowTrackOptions(true);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>
    );
  };

  const isLoading = isLoadingPlaylist || isLoadingTracks;

  // Get playlist image
  const rawPlaylistImageUrl = playlist?.ImageTags?.Primary
    ? getImageUrl(playlist.Id, 'Primary', { maxWidth: 200, tag: playlist.ImageTags.Primary })
    : null;
  const playlistImageUrl = playlist ? getDisplayImageUrl(playlist.Id, rawPlaylistImageUrl, hideMedia, 'Primary') : null;
  const playlistDisplayName = playlist ? getDisplayName(playlist, hideMedia) : 'Playlist';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: playlistDisplayName,
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerLeft: () => (
            <Pressable onPress={handleGoBack} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/search')} style={{ marginLeft: 16 }}>
              <Ionicons name="search" size={22} color="#fff" />
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.Id}
          renderItem={renderTrack}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: accentColor + '20' }]}>
                {playlistImageUrl ? (
                  <CachedImage
                    uri={playlistImageUrl}
                    style={{ width: 80, height: 80 }}
                    borderRadius={12}
                  />
                ) : (
                  <Ionicons name="list" size={36} color={accentColor} />
                )}
              </View>
              <Text style={styles.headerTitle}>{playlistDisplayName}</Text>
              <Text style={styles.headerSubtitle}>
                {tracks.length} {tracks.length === 1 ? 'song' : 'songs'} • {formatDuration(ticksToMs(totalDuration))}
              </Text>
              {tracks.length > 0 && (
                <View style={styles.headerButtons}>
                  <Pressable
                    style={[styles.playButton, { backgroundColor: accentColor }]}
                    onPress={handlePlayAll}
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={styles.playButtonText}>Play</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.shuffleButton, { backgroundColor: accentColor + '20' }]}
                    onPress={handleShuffle}
                  >
                    <Ionicons name="shuffle" size={20} color={accentColor} />
                  </Pressable>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyTitle}>Playlist is empty</Text>
              <Text style={styles.emptySubtitle}>
                Add songs to this playlist to see them here
              </Text>
            </View>
          }
        />
      )}

      {selectedTrack && (
        <TrackOptionsMenu
          track={selectedTrack}
          visible={showTrackOptions}
          onClose={() => {
            setShowTrackOptions(false);
            setSelectedTrack(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    gap: 8,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shuffleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  trackContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackOptionsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 12,
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  trackPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  trackDuration: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
