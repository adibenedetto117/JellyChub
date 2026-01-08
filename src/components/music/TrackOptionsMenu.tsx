import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore, usePlayerStore } from '@/stores';
import { markAsFavorite, getPlaylists, addToPlaylist, getImageUrl } from '@/api';
import { CachedImage } from '@/components/ui/CachedImage';
import { formatDuration, ticksToMs } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface TrackOptionsMenuProps {
  track: BaseItem;
  visible: boolean;
  onClose: () => void;
}

export function TrackOptionsMenu({ track, visible, onClose }: TrackOptionsMenuProps) {
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [isFavorite, setIsFavorite] = useState(track.UserData?.IsFavorite ?? false);

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const addToPlayNext = usePlayerStore((state) => state.addToPlayNext);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const queryClient = useQueryClient();
  const userId = currentUser?.Id ?? '';

  // Reset favorite state when track changes
  useEffect(() => {
    setIsFavorite(track.UserData?.IsFavorite ?? false);
  }, [track.Id]);

  const { data: playlists, isLoading: playlistsLoading } = useQuery({
    queryKey: ['playlists', userId],
    queryFn: () => getPlaylists(userId),
    enabled: !!userId && showPlaylistPicker,
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ itemId, favorite }: { itemId: string; favorite: boolean }) =>
      markAsFavorite(userId, itemId, favorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteSongs'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['playlistTracks'] });
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: ({ playlistId, itemId }: { playlistId: string; itemId: string }) =>
      addToPlaylist(playlistId, [itemId], userId),
    onSuccess: () => {
      setShowPlaylistPicker(false);
      onClose();
      Alert.alert('Added', 'Track added to playlist');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add to playlist');
    },
  });

  const handleToggleFavorite = async () => {
    const newValue = !isFavorite;
    setIsFavorite(newValue);
    try {
      await favoriteMutation.mutateAsync({ itemId: track.Id, favorite: newValue });
      onClose();
    } catch {
      setIsFavorite(!newValue);
    }
  };

  const handleAddToPlaylist = () => {
    setShowPlaylistPicker(true);
  };

  const handlePlayNext = () => {
    addToPlayNext({
      id: track.Id,
      item: track,
      index: 0,
    });
    onClose();
  };

  const handleAddToQueue = () => {
    addToQueue({
      id: track.Id,
      item: track,
      index: 0,
    });
    onClose();
  };

  const handleSelectPlaylist = (playlistId: string) => {
    addToPlaylistMutation.mutate({ playlistId, itemId: track.Id });
  };

  const handleClosePlaylistPicker = () => {
    setShowPlaylistPicker(false);
  };

  const handleClose = () => {
    setShowPlaylistPicker(false);
    onClose();
  };

  const albumId = (track as any).AlbumId || track.ParentId;
  const imageUrl = albumId
    ? getImageUrl(albumId, 'Primary', { maxWidth: 200 })
    : getImageUrl(track.Id, 'Primary', { maxWidth: 200 });
  const artistName = (track as any)?.AlbumArtist ?? (track as any)?.Artists?.[0] ?? 'Unknown Artist';
  const albumName = (track as any)?.Album ?? '';
  const duration = track.RunTimeTicks ? formatDuration(ticksToMs(track.RunTimeTicks)) : '';

  if (!visible) return null;

  // Playlist picker view
  if (showPlaylistPicker) {
    return (
      <Modal transparent visible={visible} animationType="none" onRequestClose={handleClosePlaylistPicker}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
          <Pressable style={styles.overlayPress} onPress={handleClosePlaylistPicker} />
          <Animated.View entering={SlideInDown.duration(300)} exiting={SlideOutDown.duration(200)} style={styles.playlistModal}>
            <View style={styles.playlistHeader}>
              <Pressable onPress={handleClosePlaylistPicker} style={styles.playlistBackButton}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </Pressable>
              <Text style={styles.playlistTitle}>Add to Playlist</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.playlistScroll} showsVerticalScrollIndicator={false}>
              {playlistsLoading ? (
                <View style={styles.playlistLoading}>
                  <ActivityIndicator color={accentColor} size="large" />
                </View>
              ) : playlists?.Items && playlists.Items.length > 0 ? (
                playlists.Items.map((playlist, index) => (
                  <Pressable
                    key={playlist.Id}
                    onPress={() => handleSelectPlaylist(playlist.Id)}
                    style={({ pressed }) => [
                      styles.playlistItem,
                      pressed && styles.playlistItemPressed,
                      index === playlists.Items!.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    disabled={addToPlaylistMutation.isPending}
                  >
                    <View style={[styles.playlistIcon, { backgroundColor: accentColor + '20' }]}>
                      <Ionicons name="musical-notes" size={20} color={accentColor} />
                    </View>
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistName} numberOfLines={1}>{playlist.Name}</Text>
                      {(playlist as any).ChildCount !== undefined && (
                        <Text style={styles.playlistCount}>{(playlist as any).ChildCount} tracks</Text>
                      )}
                    </View>
                    {addToPlaylistMutation.isPending &&
                      addToPlaylistMutation.variables?.playlistId === playlist.Id ? (
                        <ActivityIndicator size="small" color={accentColor} />
                      ) : (
                        <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.4)" />
                      )}
                  </Pressable>
                ))
              ) : (
                <View style={styles.playlistEmpty}>
                  <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.playlistEmptyTitle}>No Playlists</Text>
                  <Text style={styles.playlistEmptySubtitle}>Create a playlist in the Music tab</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  // Main options menu
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
        <Pressable style={styles.overlayPress} onPress={handleClose} />

        <Animated.View
          entering={SlideInDown.duration(300).springify().damping(18)}
          exiting={SlideOutDown.duration(200)}
          style={styles.sheet}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Track Info Header */}
          <View style={styles.header}>
            <View style={styles.artwork}>
              {imageUrl ? (
                <CachedImage uri={imageUrl} style={styles.artworkImage} />
              ) : (
                <View style={styles.artworkPlaceholder}>
                  <Ionicons name="musical-note" size={32} color="rgba(255,255,255,0.3)" />
                </View>
              )}
            </View>
            <View style={styles.trackInfo}>
              <Text style={styles.trackName} numberOfLines={2}>{track.Name}</Text>
              <Text style={styles.artistName} numberOfLines={1}>{artistName}</Text>
              {albumName && (
                <Text style={styles.albumName} numberOfLines={1}>{albumName}</Text>
              )}
              {duration && (
                <Text style={styles.duration}>{duration}</Text>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Options */}
          <View style={styles.options}>
            <Pressable
              onPress={handlePlayNext}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <View style={[styles.optionIcon, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="play-forward" size={20} color={accentColor} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Play Next</Text>
                <Text style={styles.optionSubtitle}>Add to front of queue</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleAddToQueue}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#6366f120' }]}>
                <Ionicons name="list" size={20} color="#6366f1" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Add to Queue</Text>
                <Text style={styles.optionSubtitle}>Add to end of queue</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleToggleFavorite}
              disabled={favoriteMutation.isPending}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <View style={[styles.optionIcon, { backgroundColor: isFavorite ? '#ef444420' : '#f9731620' }]}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite ? '#ef4444' : '#f97316'}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>
                  {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </Text>
                <Text style={styles.optionSubtitle}>
                  {isFavorite ? 'Remove from your favorites' : 'Save to your favorites'}
                </Text>
              </View>
              {favoriteMutation.isPending && (
                <ActivityIndicator size="small" color={accentColor} />
              )}
            </Pressable>

            <Pressable
              onPress={handleAddToPlaylist}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#22c55e20' }]}>
                <Ionicons name="add" size={22} color="#22c55e" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Add to Playlist</Text>
                <Text style={styles.optionSubtitle}>Add to an existing playlist</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
            </Pressable>
          </View>

          {/* Cancel Button */}
          <View style={styles.cancelContainer}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  overlayPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  artwork: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  trackName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  artistName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  albumName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  duration: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
  },
  options: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    marginLeft: 14,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  optionSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  cancelContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Playlist picker styles
  playlistModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  playlistBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  playlistScroll: {
    maxHeight: 400,
  },
  playlistLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  playlistItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 14,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  playlistCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  playlistEmpty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  playlistEmptyTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  playlistEmptySubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 4,
  },
});
